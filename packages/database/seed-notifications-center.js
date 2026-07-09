// Demo data for PLT-014 Notifications Center. Seeds the NotificationChannel
// catalog, a spread of NotificationTemplate rows across all 10 template
// categories, and a handful of NotificationCampaign rows in mixed statuses
// (Sent, Scheduled, Recurring, Cancelled) with real fanned-out Notification
// rows targeting actual seeded Organizations/Members/Employees/
// PlatformAdminUsers - constructed directly here (not via the NestJS
// service, which isn't invocable from a plain node script, same convention
// as every other seed-*.js in this repo) but mirroring exactly what
// PlatformNotificationsService's real send flow would produce. Idempotent:
// channels/templates upserted by unique key; campaigns/notifications are
// skipped entirely if any campaign already exists.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const now = Date.now();
const d = (offsetDays) => new Date(now + offsetDays * DAY);
const h = (offsetHours) => new Date(now + offsetHours * HOUR);

const CHANNELS = [
  { key: 'in_app', label: 'In-App', icon: 'Bell', order: 0, isActive: true },
  { key: 'push', label: 'Push', icon: 'Smartphone', order: 1, isActive: true },
  { key: 'email', label: 'Email', icon: 'Mail', order: 2, isActive: true },
  { key: 'sms', label: 'SMS', icon: 'MessageSquare', order: 3, isActive: true },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle', order: 4, isActive: false },
];

const TEMPLATES = [
  { title: 'OTP Verification Code', category: 'Authentication', channel: 'sms', body: 'Your GymFlow verification code is {{amount}}. Do not share this code.' },
  { title: 'New Device Login', category: 'Authentication', channel: 'email', subject: 'New sign-in to your account', body: 'Hi {{memberName}}, we noticed a new sign-in to your GymFlow account at {{organizationName}}.' },
  { title: 'Membership Expiring Soon', category: 'Membership', channel: 'email', subject: 'Your membership expires soon', body: 'Hi {{memberName}}, your {{membershipPlan}} membership at {{organizationName}} expires on {{expiryDate}}. Renew now to avoid interruption.' },
  { title: 'Membership Renewed', category: 'Membership', channel: 'in_app', body: 'Your {{membershipPlan}} membership has been renewed through {{expiryDate}}.' },
  { title: 'Welcome New Member', category: 'Membership', channel: 'email', subject: 'Welcome to {{organizationName}}!', body: 'Hi {{memberName}}, welcome to {{organizationName}} - {{branch}}! Your {{membershipPlan}} plan is now active.' },
  { title: 'Check-In Confirmation', category: 'Attendance', channel: 'push', body: 'Checked in at {{branch}}. Have a great workout, {{memberName}}!' },
  { title: 'Missed You Reminder', category: 'Attendance', channel: 'push', body: 'We miss you, {{memberName}}! It has been a while since your last visit to {{branch}}.' },
  { title: 'New Workout Assigned', category: 'Workout', channel: 'push', body: '{{trainer}} assigned you a new workout: {{workoutName}}.' },
  { title: 'Workout Completed', category: 'Workout', channel: 'in_app', body: 'Great job completing {{workoutName}}! Your trainer {{trainer}} has been notified.' },
  { title: 'Diet Plan Updated', category: 'Diet', channel: 'push', body: '{{trainer}} updated your diet plan. Check the app for details.' },
  { title: 'Payment Received', category: 'Payments', channel: 'sms', body: 'Payment of {{amount}} received for your {{membershipPlan}} plan. Thank you!' },
  { title: 'Payment Failed', category: 'Payments', channel: 'email', subject: 'Payment failed', body: 'Hi {{memberName}}, we could not process your payment of {{amount}}. Please update your payment method.' },
  { title: 'Invoice Generated', category: 'Invoices', channel: 'email', subject: 'Your invoice from {{organizationName}}', body: 'Hi {{memberName}}, your invoice for {{amount}} is ready. View it in the app.' },
  { title: 'Organization Suspended', category: 'Organization', channel: 'email', subject: 'Account suspended', body: 'Your organization {{organizationName}} has been suspended. Contact support for assistance.' },
  { title: 'Platform Maintenance Notice', category: 'Platform', channel: 'in_app', body: 'GymFlow will undergo scheduled maintenance. Some features may be temporarily unavailable.' },
  { title: 'New Feature Announcement', category: 'Marketing', channel: 'email', subject: 'New in GymFlow', body: 'Hi {{memberName}}, check out our latest feature to help you reach your goals faster!' },
];

const NOTIFICATION_TYPES = ['System', 'Organization', 'Member', 'Employee', 'Platform', 'Marketing'];
const FAILURE_REASONS = ['Invalid recipient address', 'Provider timeout', 'Recipient unreachable', 'Delivery rejected by provider'];

function simulateOutcome() {
  const failed = Math.random() < 0.08;
  if (failed) return { status: 'Failed', deliveredAt: null, readAt: null, failureReason: FAILURE_REASONS[Math.floor(Math.random() * FAILURE_REASONS.length)] };
  const read = Math.random() < 0.55;
  const deliveredAt = new Date(now - Math.random() * 3 * DAY);
  return { status: read ? 'Read' : 'Delivered', deliveredAt, readAt: read ? new Date(deliveredAt.getTime() + Math.random() * HOUR) : null, failureReason: null };
}

async function seedChannels() {
  for (const c of CHANNELS) {
    await prisma.notificationChannel.upsert({ where: { key: c.key }, update: {}, create: c });
  }
  console.log(`Seeded ${CHANNELS.length} notification channels.`);
}

async function seedTemplates() {
  let created = 0;
  for (const t of TEMPLATES) {
    const existing = await prisma.notificationTemplate.findFirst({ where: { title: t.title } });
    if (existing) continue;
    const variables = [...new Set((t.body.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || []).map((m) => m.replace(/[{}]/g, '').trim()))];
    await prisma.notificationTemplate.create({ data: { ...t, variables, status: 'Active', createdByName: 'System Seed' } });
    created++;
  }
  console.log(`Seeded ${created} new notification templates (${TEMPLATES.length} total).`);
}

async function seedCampaignsAndNotifications() {
  const existingCampaigns = await prisma.notificationCampaign.count();
  if (existingCampaigns > 0) {
    console.log('Campaigns already seeded, skipping.');
    return;
  }

  const organizations = await prisma.organization.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, take: 16 });
  const members = await prisma.member.findMany({ where: { deletedAt: null }, select: { id: true, firstName: true, lastName: true, organizationId: true }, take: 300 });
  const employees = await prisma.employee.findMany({ where: { deletedAt: null }, include: { user: true }, take: 50 });
  const platformAdmins = await prisma.platformAdminUser.findMany({ where: { isActive: true }, include: { user: true }, take: 20 });

  if (organizations.length === 0) {
    console.log('No organizations found, skipping campaign/notification seeding.');
    return;
  }

  const templates = await prisma.notificationTemplate.findMany();
  const templateByCategory = (cat) => templates.find((t) => t.category === cat) || templates[0];

  const membersByOrg = (orgId) => members.filter((m) => m.organizationId === orgId);

  async function makeSentCampaign({ name, notificationType, channel, template, audienceType, recipients, daysAgo, priority }) {
    const campaign = await prisma.notificationCampaign.create({
      data: {
        name,
        notificationType,
        channel,
        templateId: template.id,
        audienceType,
        priority: priority || 'Normal',
        status: 'Sent',
        scheduleType: 'NOW',
        scheduledFor: d(-daysAgo),
        sentAt: d(-daysAgo),
        createdByName: 'System Seed',
      },
    });
    const rows = recipients.map((r) => {
      const outcome = simulateOutcome();
      return {
        campaignId: campaign.id,
        title: template.title,
        body: template.body,
        notificationType,
        channel,
        priority: priority || 'Normal',
        status: outcome.status,
        recipientType: r.recipientType,
        recipientId: r.recipientId,
        recipientName: r.recipientName,
        organizationId: r.organizationId,
        scheduledFor: d(-daysAgo),
        sentAt: d(-daysAgo),
        deliveredAt: outcome.deliveredAt,
        readAt: outcome.readAt,
        failureReason: outcome.failureReason,
      };
    });
    if (rows.length) await prisma.notification.createMany({ data: rows });
    return { campaign, count: rows.length };
  }

  let totalNotifications = 0;

  // 1. Membership expiry reminder - sent to members of the first 3 orgs
  {
    const template = templateByCategory('Membership');
    const targetOrgs = organizations.slice(0, 3);
    const recipients = targetOrgs.flatMap((o) => membersByOrg(o.id).slice(0, 25).map((m) => ({ recipientType: 'MEMBER', recipientId: m.id, recipientName: `${m.firstName} ${m.lastName}`.trim(), organizationId: o.id })));
    const { count } = await makeSentCampaign({ name: 'Membership Expiry Reminder - Batch 1', notificationType: 'Member', channel: 'email', template, audienceType: 'SELECTED_ORGANIZATIONS', recipients, daysAgo: 5 });
    totalNotifications += count;
  }

  // 2. Payment received confirmations
  {
    const template = templateByCategory('Payments');
    const recipients = members.slice(0, 60).map((m) => ({ recipientType: 'MEMBER', recipientId: m.id, recipientName: `${m.firstName} ${m.lastName}`.trim(), organizationId: m.organizationId }));
    const { count } = await makeSentCampaign({ name: 'Payment Confirmation Blast', notificationType: 'Member', channel: 'sms', template, audienceType: 'MEMBERS', recipients, daysAgo: 1 });
    totalNotifications += count;
  }

  // 3. New feature announcement to all members (marketing)
  {
    const template = templateByCategory('Marketing');
    const recipients = members.slice(0, 150).map((m) => ({ recipientType: 'MEMBER', recipientId: m.id, recipientName: `${m.firstName} ${m.lastName}`.trim(), organizationId: m.organizationId }));
    const { count } = await makeSentCampaign({ name: 'New Feature Announcement', notificationType: 'Marketing', channel: 'email', template, audienceType: 'ALL_ORGANIZATIONS', recipients, daysAgo: 10, priority: 'Low' });
    totalNotifications += count;
  }

  // 4. Platform maintenance notice to platform users
  {
    const template = templateByCategory('Platform');
    const recipients = platformAdmins.map((a) => ({ recipientType: 'PLATFORM_USER', recipientId: a.userId, recipientName: a.user.fullName, organizationId: null }));
    const { count } = await makeSentCampaign({ name: 'Scheduled Maintenance Notice', notificationType: 'Platform', channel: 'in_app', template, audienceType: 'PLATFORM_USERS', recipients, daysAgo: 3, priority: 'High' });
    totalNotifications += count;
  }

  // 5. New workout assigned to employees' members (employee-targeted campaign)
  {
    const template = templateByCategory('Workout');
    const recipients = employees.map((e) => ({ recipientType: 'EMPLOYEE', recipientId: e.userId, recipientName: e.user.fullName, organizationId: e.organizationId }));
    const { count } = await makeSentCampaign({ name: 'Trainer Workout Digest', notificationType: 'Employee', channel: 'push', template, audienceType: 'EMPLOYEES', recipients, daysAgo: 2 });
    totalNotifications += count;
  }

  // 6. Payment failed - urgent, smaller batch, includes a couple of Failed outcomes naturally
  {
    const template = templateByCategory('Payments');
    const recipients = members.slice(60, 75).map((m) => ({ recipientType: 'MEMBER', recipientId: m.id, recipientName: `${m.firstName} ${m.lastName}`.trim(), organizationId: m.organizationId }));
    const { count } = await makeSentCampaign({ name: 'Payment Failure Follow-up', notificationType: 'Member', channel: 'email', template, audienceType: 'MEMBERS', recipients, daysAgo: 0, priority: 'Urgent' });
    totalNotifications += count;
  }

  // 7. A Cancelled campaign (created then cancelled before it ever sent)
  {
    const template = templateByCategory('Organization');
    const cancelled = await prisma.notificationCampaign.create({
      data: {
        name: 'Q3 Organization Policy Update (Cancelled)',
        notificationType: 'Organization',
        channel: 'email',
        templateId: template.id,
        audienceType: 'ALL_ORGANIZATIONS',
        priority: 'Normal',
        status: 'Cancelled',
        scheduleType: 'SCHEDULED',
        scheduledFor: d(-2),
        cancelledAt: d(-3),
        createdByName: 'System Seed',
      },
    });
    console.log(`Seeded cancelled campaign "${cancelled.name}".`);
  }

  // 8. A one-shot Scheduled campaign due in the near future, with pending Notification rows
  {
    const template = templateByCategory('Membership');
    const targetOrg = organizations[organizations.length - 1];
    const recipients = membersByOrg(targetOrg.id).slice(0, 15).map((m) => ({ recipientType: 'MEMBER', recipientId: m.id, recipientName: `${m.firstName} ${m.lastName}`.trim(), organizationId: targetOrg.id }));
    const scheduledFor = h(6);
    const campaign = await prisma.notificationCampaign.create({
      data: {
        name: 'Upcoming Renewal Reminder',
        notificationType: 'Member',
        channel: 'email',
        templateId: template.id,
        audienceType: 'SELECTED_ORGANIZATIONS',
        audienceFilter: { organizationIds: [targetOrg.id] },
        priority: 'Normal',
        status: 'Scheduled',
        scheduleType: 'SCHEDULED',
        scheduledFor,
        nextRunAt: scheduledFor,
        createdByName: 'System Seed',
      },
    });
    const rows = recipients.map((r) => ({
      campaignId: campaign.id, title: template.title, body: template.body, notificationType: 'Member', channel: 'email', priority: 'Normal',
      status: 'Scheduled', recipientType: r.recipientType, recipientId: r.recipientId, recipientName: r.recipientName, organizationId: r.organizationId, scheduledFor,
    }));
    if (rows.length) await prisma.notification.createMany({ data: rows });
    totalNotifications += rows.length;
    console.log(`Seeded scheduled campaign "${campaign.name}" with ${rows.length} pending recipient(s), due in 6 hours.`);
  }

  // 9. A Recurring weekly campaign, already fanned out for its first (already-sent) occurrence
  {
    const template = templateByCategory('Attendance');
    const recipients = members.slice(150, 200).map((m) => ({ recipientType: 'MEMBER', recipientId: m.id, recipientName: `${m.firstName} ${m.lastName}`.trim(), organizationId: m.organizationId }));
    const firstRun = d(-7);
    const campaign = await prisma.notificationCampaign.create({
      data: {
        name: 'Weekly Attendance Digest',
        notificationType: 'Member',
        channel: 'push',
        templateId: template.id,
        audienceType: 'MEMBERS',
        priority: 'Low',
        status: 'Scheduled',
        scheduleType: 'RECURRING',
        recurringFrequency: 'WEEKLY',
        scheduledFor: firstRun,
        nextRunAt: d(2),
        sentAt: firstRun,
        createdByName: 'System Seed',
      },
    });
    const rows = recipients.map((r) => {
      const outcome = simulateOutcome();
      return {
        campaignId: campaign.id, title: template.title, body: template.body, notificationType: 'Member', channel: 'push', priority: 'Low',
        status: outcome.status, recipientType: r.recipientType, recipientId: r.recipientId, recipientName: r.recipientName, organizationId: r.organizationId,
        scheduledFor: firstRun, sentAt: firstRun, deliveredAt: outcome.deliveredAt, readAt: outcome.readAt, failureReason: outcome.failureReason,
      };
    });
    if (rows.length) await prisma.notification.createMany({ data: rows });
    totalNotifications += rows.length;
    console.log(`Seeded recurring campaign "${campaign.name}" (next run in 2 days) with ${rows.length} historical recipient(s).`);
  }

  // 10. A handful of ungrouped Quick Sends (campaignId null)
  {
    const template = templateByCategory('Authentication');
    const recipients = platformAdmins.slice(0, 5).map((a) => ({ recipientType: 'PLATFORM_USER', recipientId: a.userId, recipientName: a.user.fullName, organizationId: null }));
    const rows = recipients.map((r) => {
      const outcome = simulateOutcome();
      return {
        campaignId: null, title: 'New Device Login', body: template.body, notificationType: 'System', channel: 'email', priority: 'High',
        status: outcome.status, recipientType: r.recipientType, recipientId: r.recipientId, recipientName: r.recipientName, organizationId: r.organizationId,
        scheduledFor: h(-2), sentAt: h(-2), deliveredAt: outcome.deliveredAt, readAt: outcome.readAt, failureReason: outcome.failureReason,
      };
    });
    if (rows.length) await prisma.notification.createMany({ data: rows });
    totalNotifications += rows.length;
    console.log(`Seeded ${rows.length} ungrouped quick-send notification(s).`);
  }

  console.log(`Seeded campaigns and ${totalNotifications} fanned-out notifications total.`);
}

async function main() {
  console.log('--- PLT-014 Notifications Center Seed Started ---');
  await seedChannels();
  await seedTemplates();
  await seedCampaignsAndNotifications();
  console.log('--- PLT-014 Notifications Center Seed Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
