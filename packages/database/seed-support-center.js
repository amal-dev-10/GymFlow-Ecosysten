// Demo + system data for PLT-011 Customer Support Center. Seeds SLA
// policies for all 4 priorities, a spread of tickets across every
// status/priority/category, message threads (customer + agent + internal
// notes + an @mention example), escalation examples, knowledge base
// articles, and CSAT scores on resolved tickets. Idempotent: SLA policies
// upserted by priority, KB articles matched by title, tickets checked via
// a marker (createdByName = SEED_MARKER) so re-running never duplicates.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const now = Date.now();
const d = (offsetDays) => new Date(now + offsetDays * DAY);

const SEED_MARKER = 'PLT-011 Demo Seed';

const SLA_POLICIES = [
  { priority: 'LOW', firstResponseMinutes: 1440, resolutionMinutes: 7200 },
  { priority: 'MEDIUM', firstResponseMinutes: 480, resolutionMinutes: 4320 },
  { priority: 'HIGH', firstResponseMinutes: 120, resolutionMinutes: 1440 },
  { priority: 'URGENT', firstResponseMinutes: 30, resolutionMinutes: 240 },
];

const KB_ARTICLES = [
  { title: 'Getting Started with GymFlow', category: 'General', type: 'Article', tags: ['onboarding'], body: 'A walkthrough of setting up your first branch, inviting staff and importing members.' },
  { title: 'How to Reset a Member\'s Password', category: 'Authentication', type: 'FAQ', tags: ['auth', 'password'], body: 'Members can reset their password from the login screen via OTP. Staff cannot reset it on their behalf.' },
  { title: 'Understanding Your Invoice', category: 'Billing', type: 'FAQ', tags: ['billing', 'invoice'], body: 'Invoices are generated on your billing anniversary. Proration applies on mid-cycle plan changes.' },
  { title: 'Troubleshooting QR Attendance Check-In Failures', category: 'Attendance', type: 'Troubleshooting', tags: ['attendance', 'qr'], body: '1. Confirm the device is online. 2. Confirm the member\'s QR code has not expired. 3. Check the gym\'s attendance device pairing.' },
  { title: 'API Rate Limits Explained', category: 'API', type: 'Article', tags: ['api', 'limits'], body: 'The Platform API enforces a rate limit of 120 requests/minute per organization on the Professional plan and above.' },
  { title: 'Diagnosing Slow Report Generation', category: 'Reports', type: 'Troubleshooting', tags: ['reports', 'performance'], body: 'Large date ranges on the Revenue Report can take longer to generate. Recommend narrowing the range or exporting asynchronously.' },
  { title: 'Assigning Workout Programs in Training Studio', category: 'Training Studio', type: 'FAQ', tags: ['training'], body: 'Trainers can assign a program from the member profile\'s Training tab, or bulk-assign from a program\'s detail page.' },
  { title: 'Escalation Playbook: When to Involve Engineering', category: 'General', type: 'Internal', tags: ['internal', 'escalation'], body: 'Escalate to Engineering when: the issue reproduces consistently, affects more than one organization, or involves a 5xx API response.' },
  { title: 'Nutrition Plan Sync Delays', category: 'Nutrition', type: 'Troubleshooting', tags: ['nutrition', 'sync'], body: 'Nutrition plan changes can take up to 2 minutes to sync to the member mobile app. Advise the customer to pull-to-refresh.' },
];

async function main() {
  console.log('--- PLT-011 Customer Support Center Seed Started ---');

  // --- SLA Policies ---
  for (const p of SLA_POLICIES) {
    await prisma.supportSlaPolicy.upsert({ where: { priority: p.priority }, update: {}, create: p });
  }
  console.log(`Seeded ${SLA_POLICIES.length} SLA policies.`);

  // --- Knowledge Base ---
  let kbCreated = 0;
  for (const a of KB_ARTICLES) {
    const existing = await prisma.knowledgeBaseArticle.findFirst({ where: { title: a.title } });
    if (existing) continue;
    const slug = `${a.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${kbCreated}`;
    await prisma.knowledgeBaseArticle.create({ data: { ...a, slug, isPublished: true, createdByName: 'Amal Dev Owner', viewCount: Math.floor(Math.random() * 80) } });
    kbCreated++;
  }
  console.log(`Seeded ${kbCreated} new knowledge base articles (${KB_ARTICLES.length} total).`);

  // --- Tickets ---
  const existingSeedTicket = await prisma.supportTicket.findFirst({ where: { createdByName: SEED_MARKER } });
  if (existingSeedTicket) {
    console.log('Demo tickets already seeded, skipping.');
    console.log('--- PLT-011 Customer Support Center Seed Complete ---');
    return;
  }

  const orgs = await prisma.organization.findMany({ select: { id: true, name: true }, take: 8 });
  const staff = await prisma.platformAdminUser.findMany({ where: { role: { in: ['SUPPORT', 'CUSTOMER_SUCCESS', 'OPERATIONS'] } }, include: { user: true } });
  const engineer = (i) => staff[i % staff.length];
  const org = (i) => orgs[i % orgs.length];

  // Each entry: offsetDaysCreated, hoursToFirstResponse (null = no response yet), hoursToResolve (null = not resolved), status, priority, category, subject
  const TICKETS = [
    { created: -0.2, category: 'Billing', priority: 'HIGH', status: 'NEW', subject: 'Duplicate charge on this month\'s invoice' },
    { created: -0.5, category: 'Authentication', priority: 'MEDIUM', status: 'NEW', subject: 'Staff member locked out after failed OTP attempts' },
    { created: -2, respond: 1, category: 'Subscription', priority: 'MEDIUM', status: 'OPEN', subject: 'Need to upgrade plan mid-cycle' },
    { created: -3, respond: 0.5, category: 'Members', priority: 'LOW', status: 'OPEN', subject: 'Bulk member import shows wrong join dates' },
    { created: -1, respond: 0.3, category: 'API', priority: 'URGENT', status: 'OPEN', subject: 'Webhook deliveries failing with 500' },
    { created: -4, respond: 2, category: 'Training Studio', priority: 'MEDIUM', status: 'IN_PROGRESS', subject: 'Cannot assign workout program to multiple members' },
    { created: -5, respond: 1.5, category: 'Attendance', priority: 'HIGH', status: 'IN_PROGRESS', subject: 'QR check-in failing intermittently at Branch 2' },
    { created: -6, respond: 3, category: 'Performance', priority: 'MEDIUM', status: 'IN_PROGRESS', subject: 'Dashboard loading slowly during peak hours' },
    { created: -3, respond: 1, category: 'Nutrition', priority: 'LOW', status: 'WAITING_FOR_CUSTOMER', subject: 'Nutrition plan not syncing to member app' },
    { created: -4, respond: 0.5, category: 'Reports', priority: 'MEDIUM', status: 'WAITING_FOR_CUSTOMER', subject: 'Revenue report totals don\'t match Stripe export' },
    { created: -7, respond: 0.4, category: 'Bug Report', priority: 'URGENT', status: 'ESCALATED', subject: 'Attendance import corrupts existing records' },
    { created: -10, respond: 2, resolve: 20, csat: 5, csatComment: 'Fixed same day, great support!', category: 'Feature Request', priority: 'LOW', status: 'RESOLVED', subject: 'Request: CSV export for member list' },
    { created: -12, respond: 1, resolve: 30, csat: 4, csatComment: 'Took a bit long but got there.', category: 'Billing', priority: 'HIGH', status: 'RESOLVED', subject: 'Coupon not applying at checkout' },
    { created: -20, respond: 3, resolve: 48, category: 'General', priority: 'LOW', status: 'CLOSED', subject: 'General onboarding questions' },
    { created: -15, respond: 1, resolve: 5, category: 'Feature Request', priority: 'LOW', status: 'CANCELLED', subject: 'Request for a feature already shipped' },
  ];

  let created = 0;
  const ticketRefs = [];
  for (let i = 0; i < TICKETS.length; i++) {
    const t = TICKETS[i];
    const o = org(i);
    const eng = engineer(i);
    const createdAt = d(t.created);
    const firstRespondedAt = t.respond != null ? new Date(createdAt.getTime() + t.respond * HOUR) : null;
    const resolvedAt = t.resolve != null ? new Date(createdAt.getTime() + t.resolve * HOUR) : null;

    const ticket = await prisma.supportTicket.create({
      data: {
        organizationId: o.id,
        subject: t.subject,
        description: `${t.subject} - reported via the customer support channel.`,
        status: t.status,
        priority: t.priority,
        category: t.category,
        assignedEngineerId: t.status === 'NEW' ? null : eng.id,
        assignedEngineer: t.status === 'NEW' ? null : eng.user.fullName,
        satisfactionScore: t.csat || null,
        satisfactionComment: t.csatComment || null,
        createdByName: SEED_MARKER,
        createdAt,
        updatedAt: resolvedAt || firstRespondedAt || createdAt,
        firstRespondedAt,
        resolvedAt,
      },
    });
    ticketRefs.push({ ticket, org: o, engineer: eng });
    created++;

    // Message thread
    if (t.respond != null) {
      await prisma.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          authorType: 'Customer',
          authorName: 'Customer Contact',
          body: t.subject + '. Can someone take a look?',
          isInternal: false,
          createdAt,
        },
      });
      await prisma.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          authorType: 'Agent',
          authorName: eng.user.fullName,
          authorUserId: eng.userId,
          body: `Thanks for reaching out - looking into this for ${o.name} now.`,
          isInternal: false,
          createdAt: firstRespondedAt,
        },
      });
    }
    if (t.status === 'IN_PROGRESS' || t.status === 'ESCALATED') {
      const mentionTarget = engineer(i + 1);
      await prisma.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          authorType: 'Agent',
          authorName: eng.user.fullName,
          authorUserId: eng.userId,
          body: `@${mentionTarget.user.fullName} can you take a look at the backend logs for this one?`,
          isInternal: true,
          mentions: [mentionTarget.user.fullName],
          createdAt: new Date((firstRespondedAt || createdAt).getTime() + HOUR),
        },
      });
    }
    if (resolvedAt) {
      await prisma.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          authorType: 'Agent',
          authorName: eng.user.fullName,
          authorUserId: eng.userId,
          body: 'This has been resolved. Please let us know if you run into it again.',
          isInternal: false,
          createdAt: resolvedAt,
        },
      });
    }
  }
  console.log(`Seeded ${created} demo tickets with message threads.`);

  // --- Escalations (two examples showing ladder progression) ---
  const escalated = ticketRefs.find((r) => r.ticket.status === 'ESCALATED');
  if (escalated) {
    const step1At = new Date(escalated.ticket.createdAt.getTime() + 2 * HOUR);
    const step2At = new Date(escalated.ticket.createdAt.getTime() + 6 * HOUR);
    await prisma.supportEscalation.create({
      data: {
        ticketId: escalated.ticket.id,
        fromLevel: 'Support',
        toLevel: 'Engineering',
        reason: 'Data corruption affects multiple organizations - needs a hotfix.',
        ownerName: 'Diego Alvarez',
        status: 'Resolved',
        resolution: 'Root cause identified: race condition in the import worker. Patch deployed.',
        createdByName: escalated.engineer.user.fullName,
        createdAt: step1At,
        resolvedAt: step2At,
      },
    });
    await prisma.supportEscalation.create({
      data: {
        ticketId: escalated.ticket.id,
        fromLevel: 'Engineering',
        toLevel: 'Operations',
        reason: 'Need to confirm no other organizations were affected by the same race condition.',
        ownerName: 'Priya Nair',
        status: 'Open',
        createdByName: 'Diego Alvarez',
        createdAt: step2At,
      },
    });
    console.log('Seeded 2 escalation ladder examples.');
  }

  console.log('--- PLT-011 Customer Support Center Seed Complete ---');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
