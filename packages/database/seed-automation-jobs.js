// Demo data for PLT-018 Automation & Background Jobs. Seeds the
// AutomationQueue catalog, ~14 AutomationJob definitions (10 mapped to the
// spec's canonical workflowType names, ~4 generic infra jobs), and a spread
// of historical AutomationJobRun rows per job (mixed Completed/Failed, one
// manual trigger, one retry, one ignored failure). Two jobs are seeded with
// nextRunAt already in the past so the real lazy sweep
// (PlatformAutomationService.processDueJobs()) genuinely catches and
// processes them on the very first API call - not fabricated activity.
// Idempotent: queues upserted by key; jobs/runs skipped entirely if any
// job already exists.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;
const now = Date.now();
const d = (offsetDays) => new Date(now + offsetDays * DAY);
const h = (offsetHours) => new Date(now + offsetHours * HOUR);
const m = (offsetMinutes) => new Date(now + offsetMinutes * MIN);

const QUEUES = [
  { key: 'default', label: 'Default', icon: 'Layers', order: 0 },
  { key: 'notifications', label: 'Notifications', icon: 'Bell', order: 1 },
  { key: 'billing', label: 'Billing', icon: 'Receipt', order: 2 },
  { key: 'reports', label: 'Reports', icon: 'FileBarChart', order: 3 },
  { key: 'cleanup', label: 'Cleanup', icon: 'Trash2', order: 4 },
];

const FAILURE_REASONS = ['Timed out waiting for upstream service', 'Unhandled exception in job handler', 'Database connection pool exhausted', 'Downstream dependency unavailable'];

const JOBS = [
  { name: 'Membership Expiry Check', category: 'Membership', workflowType: 'Membership Expiry', scheduleType: 'DAILY', queueKey: 'default', description: 'Flags memberships that have reached their expiry date.' },
  { name: 'Membership Renewal Processor', category: 'Membership', workflowType: 'Membership Renewal', scheduleType: 'DAILY', queueKey: 'billing', description: 'Processes upcoming membership renewals.' },
  { name: 'Trial Expiry Sweep', category: 'Subscription', workflowType: 'Trial Expiry', scheduleType: 'DAILY', queueKey: 'default', description: 'Identifies organizations whose trial period has ended.' },
  { name: 'Monthly Invoice Generation', category: 'Billing', workflowType: 'Invoice Generation', scheduleType: 'MONTHLY', queueKey: 'billing', description: 'Generates invoices for the upcoming billing cycle.' },
  { name: 'Payment Reminder Dispatch', category: 'Billing', workflowType: 'Payment Reminder', scheduleType: 'DAILY', queueKey: 'billing', description: 'Sends reminders for upcoming or overdue payments.' },
  { name: 'Workout Reminder Push', category: 'Workout', workflowType: 'Workout Reminder', scheduleType: 'DAILY', queueKey: 'notifications', description: 'Reminds members of scheduled workouts.' },
  { name: 'Diet Plan Reminder', category: 'Nutrition', workflowType: 'Diet Reminder', scheduleType: 'DAILY', queueKey: 'notifications', description: 'Reminds members to log meals against their diet plan.' },
  { name: 'Attendance Sync Job', category: 'Attendance', workflowType: 'Attendance Sync', scheduleType: 'HOURLY', queueKey: 'default', description: 'Reconciles check-in device data with attendance records.' },
  { name: 'Database Cleanup', category: 'Storage', workflowType: 'Database Cleanup', scheduleType: 'WEEKLY', queueKey: 'cleanup', description: 'Purges soft-deleted rows past their retention window.' },
  { name: 'Storage Cleanup', category: 'Storage', workflowType: 'Storage Cleanup', scheduleType: 'WEEKLY', queueKey: 'cleanup', description: 'Removes orphaned uploaded files with no owning record.' },
  { name: 'Nightly Report Rollup', category: 'Reports', workflowType: null, scheduleType: 'DAILY', queueKey: 'reports', description: 'Aggregates the previous day\'s activity into summary reports.' },
  { name: 'Platform Health Snapshot', category: 'Platform', workflowType: null, scheduleType: 'HOURLY', queueKey: 'default', description: 'Records a point-in-time snapshot of platform health metrics.' },
  { name: 'Orphaned File Sweep', category: 'Storage', workflowType: null, scheduleType: 'CUSTOM_CRON', cronExpression: '0 3 * * 0', queueKey: 'cleanup', description: 'Weekly deep sweep for unreferenced storage objects.' },
  { name: 'Notification Digest Batch', category: 'Notifications', workflowType: null, scheduleType: 'EVERY_MINUTE', queueKey: 'notifications', description: 'Batches queued in-app notifications for delivery.' },
];

function simulateOutcome() {
  const failed = Math.random() < 0.12;
  const durationMs = Math.round(200 + Math.random() * 4800);
  if (failed) {
    const reason = FAILURE_REASONS[Math.floor(Math.random() * FAILURE_REASONS.length)];
    return { status: 'Failed', durationMs, failureReason: reason, log: `Run failed after ${durationMs}ms: ${reason}` };
  }
  return { status: 'Completed', durationMs, failureReason: null, log: `Run completed successfully in ${durationMs}ms.` };
}

function computeNextRun(from, scheduleType) {
  const next = new Date(from);
  if (scheduleType === 'EVERY_MINUTE') next.setMinutes(next.getMinutes() + 1);
  else if (scheduleType === 'HOURLY' || scheduleType === 'CUSTOM_CRON') next.setHours(next.getHours() + 1);
  else if (scheduleType === 'DAILY') next.setDate(next.getDate() + 1);
  else if (scheduleType === 'WEEKLY') next.setDate(next.getDate() + 7);
  else if (scheduleType === 'MONTHLY') next.setMonth(next.getMonth() + 1);
  return next;
}

async function seedQueues() {
  for (const q of QUEUES) {
    await prisma.automationQueue.upsert({ where: { key: q.key }, update: {}, create: { ...q, isActive: true } });
  }
  console.log(`Seeded ${QUEUES.length} automation queues.`);
}

async function seedJobsAndRuns() {
  const existing = await prisma.automationJob.count();
  if (existing > 0) {
    console.log('Jobs already seeded, skipping.');
    return;
  }

  let totalRuns = 0;
  for (let i = 0; i < JOBS.length; i++) {
    const def = JOBS[i];
    // First two jobs are deliberately overdue so the real lazy sweep
    // (processDueJobs) has genuine work to do on first read.
    const overdue = i < 2;
    const nextRunAt = overdue ? m(-3) : computeNextRun(d(Math.random() * 2), def.scheduleType);

    const job = await prisma.automationJob.create({
      data: {
        name: def.name,
        category: def.category,
        workflowType: def.workflowType,
        description: def.description,
        scheduleType: def.scheduleType,
        cronExpression: def.cronExpression || null,
        queueKey: def.queueKey,
        status: 'Active',
        nextRunAt,
        createdByName: 'System Seed',
      },
    });

    // 3-6 historical runs per job.
    const runCount = 3 + Math.floor(Math.random() * 4);
    let lastRun = null;
    for (let r = runCount; r >= 1; r--) {
      const at = h(-r * (4 + Math.random() * 20));
      const outcome = simulateOutcome();
      const run = await prisma.automationJobRun.create({
        data: {
          jobId: job.id,
          queueKey: job.queueKey,
          status: outcome.status,
          triggeredBy: 'SCHEDULE',
          startedAt: at,
          completedAt: at,
          durationMs: outcome.durationMs,
          failureReason: outcome.failureReason,
          log: outcome.log,
          createdAt: at,
        },
      });
      lastRun = { at, outcome, id: run.id };
      totalRuns++;
    }

    if (lastRun) {
      await prisma.automationJob.update({
        where: { id: job.id },
        data: { lastRunAt: lastRun.at, lastRunStatus: lastRun.outcome.status, lastRunDurationMs: lastRun.outcome.durationMs },
      });
    }
  }

  // A couple of extra, explicitly-flavored runs for realism: one manual
  // trigger, one retry, one ignored failure.
  const membershipJob = await prisma.automationJob.findFirst({ where: { workflowType: 'Membership Expiry' } });
  if (membershipJob) {
    await prisma.automationJobRun.create({
      data: { jobId: membershipJob.id, queueKey: membershipJob.queueKey, status: 'Completed', triggeredBy: 'MANUAL', startedAt: h(-1), completedAt: h(-1), durationMs: 820, log: 'Manually triggered by an operator; completed successfully in 820ms.', createdAt: h(-1) },
    });
    totalRuns++;
  }

  const invoiceJob = await prisma.automationJob.findFirst({ where: { workflowType: 'Invoice Generation' } });
  if (invoiceJob) {
    const failedRun = await prisma.automationJobRun.create({
      data: { jobId: invoiceJob.id, queueKey: invoiceJob.queueKey, status: 'Failed', triggeredBy: 'SCHEDULE', startedAt: h(-30), completedAt: h(-30), durationMs: 4210, failureReason: 'Downstream dependency unavailable', log: 'Run failed after 4210ms: Downstream dependency unavailable', createdAt: h(-30) },
    });
    await prisma.automationJobRun.create({
      data: { jobId: invoiceJob.id, queueKey: invoiceJob.queueKey, status: 'Completed', triggeredBy: 'RETRY', startedAt: h(-29), completedAt: h(-29), durationMs: 1340, log: 'Retried by an operator; completed successfully in 1340ms.', createdAt: h(-29) },
    });
    totalRuns += 2;
    void failedRun;
  }

  const paymentJob = await prisma.automationJob.findFirst({ where: { workflowType: 'Payment Reminder' } });
  if (paymentJob) {
    await prisma.automationJobRun.create({
      data: { jobId: paymentJob.id, queueKey: paymentJob.queueKey, status: 'Failed', triggeredBy: 'SCHEDULE', startedAt: h(-50), completedAt: h(-50), durationMs: 3100, failureReason: 'Unhandled exception in job handler', log: 'Run failed after 3100ms: Unhandled exception in job handler', ignoredAt: h(-2), createdAt: h(-50) },
    });
    totalRuns++;
  }

  console.log(`Seeded ${JOBS.length} jobs and ${totalRuns} job runs.`);
}

async function main() {
  console.log('--- PLT-018 Automation & Background Jobs Seed Started ---');
  await seedQueues();
  await seedJobsAndRuns();
  console.log('--- PLT-018 Automation & Background Jobs Seed Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
