import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ListJobsDto } from './dto/list-jobs.dto';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { ListRunsDto } from './dto/list-runs.dto';

const SCHEDULE_TYPES = ['EVERY_MINUTE', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM_CRON'];

// Documented, honest simulation - no real job runner (BullMQ, Redis,
// RabbitMQ, Kafka, node-cron, cloud scheduler, etc.) is wired anywhere in
// this codebase. A future integration replaces simulateRun() and the
// AutomationQueue catalog is what makes that a provider swap, not a UI change.
const SIMULATED_FAILURE_RATE = 0.1;
const FAILURE_REASONS = ['Timed out waiting for upstream service', 'Unhandled exception in job handler', 'Database connection pool exhausted', 'Downstream dependency unavailable'];
const MAX_SWEEP = 200;

@Injectable()
export class PlatformAutomationService {
  constructor(
    private prisma: DatabaseService,
    private auditLogs: AuditLogsService,
  ) {}

  // No cron parsing library exists in this codebase (same convention as
  // every other module this session - zero-dependency exports, catalog
  // tables instead of message queues). CUSTOM_CRON's expression is stored/
  // displayed as reference metadata only; it advances on a fixed hourly
  // re-check rather than true cron evaluation.
  private computeNextRun(from: Date, scheduleType: string): Date {
    const next = new Date(from);
    switch (scheduleType) {
      case 'EVERY_MINUTE':
        next.setMinutes(next.getMinutes() + 1);
        return next;
      case 'HOURLY':
      case 'CUSTOM_CRON':
        next.setHours(next.getHours() + 1);
        return next;
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        return next;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        return next;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        return next;
      default:
        next.setHours(next.getHours() + 1);
        return next;
    }
  }

  private simulateRun(): { status: string; durationMs: number; failureReason: string | null; log: string } {
    const failed = Math.random() < SIMULATED_FAILURE_RATE;
    const durationMs = Math.round(200 + Math.random() * 4800);
    if (failed) {
      const reason = FAILURE_REASONS[Math.floor(Math.random() * FAILURE_REASONS.length)];
      return { status: 'Failed', durationMs, failureReason: reason, log: `Run failed after ${durationMs}ms: ${reason}` };
    }
    return { status: 'Completed', durationMs, failureReason: null, log: `Run completed successfully in ${durationMs}ms.` };
  }

  // Lazy sweep - no cron anywhere in this codebase, same convention as
  // PlatformAuthorizationService.expireStaleAssignments() and
  // PlatformNotificationsService.processDueCampaigns(). Called at the top
  // of every read endpoint below so Active jobs actually advance without a
  // background worker.
  private async processDueJobs() {
    const now = new Date();
    const due = await this.prisma.automationJob.findMany({
      where: { status: 'Active', nextRunAt: { lte: now } },
      take: MAX_SWEEP,
    });
    for (const job of due) {
      const outcome = this.simulateRun();
      await this.prisma.automationJobRun.create({
        data: {
          jobId: job.id,
          queueKey: job.queueKey,
          status: outcome.status,
          triggeredBy: 'SCHEDULE',
          startedAt: now,
          completedAt: now,
          durationMs: outcome.durationMs,
          failureReason: outcome.failureReason,
          log: outcome.log,
        },
      });
      await this.prisma.automationJob.update({
        where: { id: job.id },
        data: {
          lastRunAt: now,
          lastRunStatus: outcome.status,
          lastRunDurationMs: outcome.durationMs,
          nextRunAt: this.computeNextRun(job.nextRunAt || now, job.scheduleType),
        },
      });
    }
  }

  // --- DASHBOARD ---
  async getDashboard() {
    await this.processDueJobs();
    const [activeJobs, scheduledJobs, runningRuns, completedRuns, failedRuns, queuedRuns, avgAgg] = await Promise.all([
      this.prisma.automationJob.count({ where: { status: 'Active' } }),
      this.prisma.automationJob.count({ where: { status: 'Active', nextRunAt: { not: null } } }),
      this.prisma.automationJobRun.count({ where: { status: 'Running' } }),
      this.prisma.automationJobRun.count({ where: { status: 'Completed' } }),
      this.prisma.automationJobRun.count({ where: { status: 'Failed' } }),
      this.prisma.automationJobRun.count({ where: { status: 'Queued' } }),
      this.prisma.automationJobRun.aggregate({ where: { status: 'Completed', durationMs: { not: null } }, _avg: { durationMs: true } }),
    ]);
    return {
      activeJobs,
      scheduledJobs,
      runningJobs: runningRuns,
      completedJobs: completedRuns,
      failedJobs: failedRuns,
      queuedJobs: queuedRuns,
      avgExecutionTimeMs: Math.round(avgAgg._avg.durationMs || 0),
    };
  }

  // --- JOBS ---
  async listJobs(filters: ListJobsDto & { workflowTypeNotNull?: boolean }) {
    await this.processDueJobs();
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));
    const where: any = {};
    if (filters.search) where.name = { contains: filters.search, mode: 'insensitive' };
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.scheduleType) where.scheduleType = filters.scheduleType;
    if (filters.queueKey) where.queueKey = filters.queueKey;
    if (filters.workflowTypeNotNull) where.workflowType = { not: null };

    const [data, total] = await Promise.all([
      this.prisma.automationJob.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.automationJob.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async listWorkflows() {
    return this.listJobs({ workflowTypeNotNull: true, limit: 100 });
  }

  async getJob(id: string) {
    const job = await this.prisma.automationJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found.');
    return job;
  }

  async createJob(dto: CreateJobDto, userId: string, userName: string) {
    if (!SCHEDULE_TYPES.includes(dto.scheduleType)) throw new BadRequestException(`Unknown schedule type "${dto.scheduleType}".`);
    const now = new Date();
    const job = await this.prisma.automationJob.create({
      data: {
        name: dto.name,
        category: dto.category,
        workflowType: dto.workflowType || null,
        description: dto.description || null,
        scheduleType: dto.scheduleType,
        cronExpression: dto.scheduleType === 'CUSTOM_CRON' ? dto.cronExpression || null : null,
        queueKey: dto.queueKey,
        status: 'Active',
        nextRunAt: this.computeNextRun(now, dto.scheduleType),
        createdByName: userName,
      },
    });
    await this.auditLogs.logEvent({ userId, action: 'Created Job', user: userName, details: `Created job "${job.name}".`, eventType: 'JOB_CREATED', eventCategory: 'Automation', entityType: 'AutomationJob', entityId: job.id });
    return job;
  }

  async updateJob(id: string, dto: UpdateJobDto, userId: string, userName: string) {
    const existing = await this.getJob(id);
    const scheduleType = dto.scheduleType || existing.scheduleType;
    if (dto.scheduleType && !SCHEDULE_TYPES.includes(dto.scheduleType)) throw new BadRequestException(`Unknown schedule type "${dto.scheduleType}".`);
    const scheduleChanged = dto.scheduleType && dto.scheduleType !== existing.scheduleType;
    const job = await this.prisma.automationJob.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        workflowType: dto.workflowType,
        description: dto.description,
        scheduleType: dto.scheduleType,
        cronExpression: scheduleType === 'CUSTOM_CRON' ? dto.cronExpression ?? existing.cronExpression : null,
        queueKey: dto.queueKey,
        nextRunAt: scheduleChanged ? this.computeNextRun(new Date(), scheduleType) : undefined,
      },
    });
    await this.auditLogs.logEvent({ userId, action: 'Updated Job', user: userName, details: `Updated job "${job.name}".`, eventType: 'JOB_UPDATED', eventCategory: 'Automation', entityType: 'AutomationJob', entityId: id });
    return job;
  }

  private async setJobStatus(id: string, status: string, actionLabel: string, userId: string, userName: string) {
    const job = await this.prisma.automationJob.update({ where: { id }, data: { status } });
    await this.auditLogs.logEvent({ userId, action: actionLabel, user: userName, details: `${actionLabel} "${job.name}".`, eventType: `JOB_${status.toUpperCase()}`, eventCategory: 'Automation', entityType: 'AutomationJob', entityId: id });
    return job;
  }

  pauseJob(id: string, userId: string, userName: string) {
    return this.setJobStatus(id, 'Paused', 'Paused Job', userId, userName);
  }

  resumeJob(id: string, userId: string, userName: string) {
    return this.setJobStatus(id, 'Active', 'Resumed Job', userId, userName);
  }

  disableJob(id: string, userId: string, userName: string) {
    return this.setJobStatus(id, 'Disabled', 'Disabled Job', userId, userName);
  }

  async runJobNow(id: string, userId: string, userName: string) {
    const job = await this.getJob(id);
    const now = new Date();
    const outcome = this.simulateRun();
    const run = await this.prisma.automationJobRun.create({
      data: {
        jobId: job.id,
        queueKey: job.queueKey,
        status: outcome.status,
        triggeredBy: 'MANUAL',
        startedAt: now,
        completedAt: now,
        durationMs: outcome.durationMs,
        failureReason: outcome.failureReason,
        log: outcome.log,
      },
    });
    // Manual runs update lastRun* only - nextRunAt (the schedule) is
    // untouched so a manual trigger never desyncs the recurring cadence.
    await this.prisma.automationJob.update({ where: { id }, data: { lastRunAt: now, lastRunStatus: outcome.status, lastRunDurationMs: outcome.durationMs } });
    await this.auditLogs.logEvent({ userId, action: 'Ran Job Manually', user: userName, details: `Manually ran "${job.name}" - ${outcome.status}.`, eventType: 'JOB_RUN_MANUAL', eventCategory: 'Automation', entityType: 'AutomationJob', entityId: id, metadata: { runId: run.id, status: outcome.status } });
    return run;
  }

  // --- SCHEDULES ---
  async listSchedules() {
    await this.processDueJobs();
    return this.prisma.automationJob.findMany({ where: { status: 'Active' }, orderBy: { nextRunAt: 'asc' } });
  }

  // --- QUEUES ---
  async listQueues() {
    await this.processDueJobs();
    const [queues, rollups, retryRollups] = await Promise.all([
      this.prisma.automationQueue.findMany({ orderBy: { order: 'asc' } }),
      this.prisma.automationJobRun.groupBy({ by: ['queueKey', 'status'], _count: true }),
      this.prisma.automationJobRun.groupBy({ by: ['queueKey'], where: { triggeredBy: 'RETRY' }, _count: true }),
    ]);
    return queues.map((q) => {
      const forQueue = rollups.filter((r) => r.queueKey === q.key);
      const countFor = (status: string) => forQueue.find((r) => r.status === status)?._count || 0;
      const retryCount = retryRollups.find((r) => r.queueKey === q.key)?._count || 0;
      return {
        ...q,
        pending: countFor('Queued'),
        processing: countFor('Running'),
        completed: countFor('Completed'),
        failed: countFor('Failed'),
        retryCount,
      };
    });
  }

  async updateQueue(key: string, isActive: boolean, userId: string, userName: string) {
    const queue = await this.prisma.automationQueue.update({ where: { key }, data: { isActive } });
    await this.auditLogs.logEvent({ userId, action: `${isActive ? 'Enabled' : 'Disabled'} Queue`, user: userName, details: `${queue.label} queue ${isActive ? 'enabled' : 'disabled'}.`, eventType: 'QUEUE_UPDATED', eventCategory: 'Automation', entityType: 'AutomationQueue', entityId: key });
    return queue;
  }

  // --- EXECUTION HISTORY / FAILED JOBS ---
  async listExecutionHistory(filters: ListRunsDto) {
    await this.processDueJobs();
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.jobId) where.jobId = filters.jobId;
    if (filters.queueKey) where.queueKey = filters.queueKey;
    if (filters.search) where.job = { name: { contains: filters.search, mode: 'insensitive' } };
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    const [data, total] = await Promise.all([
      this.prisma.automationJobRun.findMany({ where, include: { job: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.automationJobRun.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async listFailedJobs(filters: ListRunsDto) {
    await this.processDueJobs();
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));
    const where: any = { status: 'Failed', ignoredAt: null };
    if (filters.jobId) where.jobId = filters.jobId;
    if (filters.queueKey) where.queueKey = filters.queueKey;
    if (filters.search) where.job = { name: { contains: filters.search, mode: 'insensitive' } };
    const [data, total] = await Promise.all([
      this.prisma.automationJobRun.findMany({ where, include: { job: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.automationJobRun.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async retryRun(id: string, userId: string, userName: string) {
    const run = await this.prisma.automationJobRun.findUnique({ where: { id }, include: { job: true } });
    if (!run) throw new NotFoundException('Run not found.');
    if (run.status !== 'Failed') throw new BadRequestException('Only failed runs can be retried.');
    const now = new Date();
    const outcome = this.simulateRun();
    const newRun = await this.prisma.automationJobRun.create({
      data: {
        jobId: run.jobId,
        queueKey: run.queueKey,
        status: outcome.status,
        triggeredBy: 'RETRY',
        startedAt: now,
        completedAt: now,
        durationMs: outcome.durationMs,
        failureReason: outcome.failureReason,
        log: outcome.log,
      },
    });
    await this.prisma.automationJob.update({ where: { id: run.jobId }, data: { lastRunAt: now, lastRunStatus: outcome.status, lastRunDurationMs: outcome.durationMs } });
    await this.auditLogs.logEvent({ userId, action: 'Retried Job Run', user: userName, details: `Retried failed run for "${run.job.name}" - ${outcome.status}.`, eventType: 'JOB_RUN_RETRIED', eventCategory: 'Automation', entityType: 'AutomationJobRun', entityId: id, metadata: { newRunId: newRun.id, status: outcome.status } });
    return newRun;
  }

  async ignoreRun(id: string, userId: string, userName: string) {
    const run = await this.prisma.automationJobRun.findUnique({ where: { id }, include: { job: true } });
    if (!run) throw new NotFoundException('Run not found.');
    const updated = await this.prisma.automationJobRun.update({ where: { id }, data: { ignoredAt: new Date() } });
    await this.auditLogs.logEvent({ userId, action: 'Ignored Failed Run', user: userName, details: `Ignored a failed run for "${run.job.name}".`, eventType: 'JOB_RUN_IGNORED', eventCategory: 'Automation', entityType: 'AutomationJobRun', entityId: id });
    return updated;
  }
}
