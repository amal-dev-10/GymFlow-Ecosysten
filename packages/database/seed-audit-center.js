// Demo + system data for PLT-010 Audit Center. Seeds the category catalog,
// 5 system saved searches, a default retention setting, example alert
// rules, a spread of ApiActivityLog rows, and a rich set of historical
// AuditLog rows covering categories the app doesn't organically generate
// yet (Members, Attendance, Training Studio, Nutrition, Payments, Expenses,
// Reports, Monitoring) plus a real correlated event chain and diff
// examples. Idempotent: categories/searches/settings/rules matched by
// their unique key/name; AuditLog/ApiActivityLog rows are seed-only
// historical data and are safe to re-run (checked via a marker search).

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const now = Date.now();
const d = (offsetDays) => new Date(now + offsetDays * DAY);
const h = (offsetHours) => new Date(now + offsetHours * HOUR);

const CATEGORIES = [
  { key: 'Authentication', icon: 'KeyRound', order: 0, description: 'Sign-in, sign-out, OTP and session events.' },
  { key: 'Organizations', icon: 'Building2', order: 1, description: 'Customer organization lifecycle.' },
  { key: 'Subscriptions', icon: 'Repeat', order: 2, description: 'Plan assignment, upgrades and billing cycles.' },
  { key: 'Platform Users', icon: 'Users', order: 3, description: 'GymFlow staff account lifecycle.' },
  { key: 'Members', icon: 'UserRound', order: 4, description: 'Gym member records.' },
  { key: 'Attendance', icon: 'CalendarCheck', order: 5, description: 'Check-ins, check-outs and attendance imports.' },
  { key: 'Training Studio', icon: 'Dumbbell', order: 6, description: 'Workout programs and exercise assignments.' },
  { key: 'Nutrition', icon: 'Apple', order: 7, description: 'Diet plans and nutrition tracking.' },
  { key: 'Billing', icon: 'Receipt', order: 8, description: 'Invoices and billing configuration.' },
  { key: 'Payments', icon: 'CreditCard', order: 9, description: 'Payment capture, refunds and failures.' },
  { key: 'Expenses', icon: 'Wallet', order: 10, description: 'Operational expense tracking.' },
  { key: 'Reports', icon: 'FileBarChart', order: 11, description: 'Generated and exported reports.' },
  { key: 'Feature Flags', icon: 'Flag', order: 12, description: 'Feature and limit engine changes.' },
  { key: 'Support', icon: 'LifeBuoy', order: 13, description: 'Support ticket lifecycle.' },
  { key: 'Monitoring', icon: 'Activity', order: 14, description: 'System health and service incidents.' },
  { key: 'API', icon: 'Webhook', order: 15, description: 'API request telemetry.' },
  { key: 'Developer', icon: 'Terminal', order: 16, description: 'Developer tools and API management.' },
  { key: 'Security', icon: 'ShieldAlert', order: 17, description: 'Security-sensitive events.' },
  { key: 'System', icon: 'Server', order: 18, description: 'Platform-wide system events.' },
  { key: 'Configuration', icon: 'Settings', order: 19, description: 'Global settings and platform configuration changes.' },
  { key: 'Notifications', icon: 'Bell', order: 20, description: 'Notification templates, campaigns and sends.' },
  { key: 'Automation', icon: 'Workflow', order: 21, description: 'Background jobs, workflows and scheduled automation.' },
];

const SAVED_SEARCHES = [
  { name: 'Security Events', filters: { category: 'Security' } },
  { name: 'Billing Events', filters: { category: 'Billing' } },
  { name: 'Failed Logins', filters: { eventType: 'LOGIN_FAILED' } },
  { name: 'Feature Changes', filters: { category: 'Feature Flags' } },
  { name: 'Support Investigations', filters: { category: 'Support' } },
];

const ALERT_RULES = [
  { name: 'Critical Event Alert', description: 'Fires when any Critical-severity event occurs.', triggerType: 'CRITICAL_EVENT', conditions: { threshold: 1, windowMinutes: 60 }, isEnabled: true },
  { name: 'Repeated Login Failures', description: 'Fires on 5+ failed logins within 15 minutes.', triggerType: 'REPEATED_LOGIN_FAILURES', conditions: { threshold: 5, windowMinutes: 15 }, isEnabled: true },
  { name: 'High API Error Rate', description: 'Fires when 20+ requests return 5xx within an hour.', triggerType: 'HIGH_API_ERRORS', conditions: { threshold: 20, windowMinutes: 60 }, isEnabled: false },
  { name: 'Permission Change Watch', description: 'Fires on any role permission change.', triggerType: 'PERMISSION_CHANGES', conditions: { threshold: 1, windowMinutes: 1440 }, isEnabled: true },
];

const API_PATHS = [
  { method: 'GET', path: '/v1/platform/organizations', okStatus: 200 },
  { method: 'GET', path: '/v1/platform/roles', okStatus: 200 },
  { method: 'GET', path: '/v1/platform/audit', okStatus: 200 },
  { method: 'GET', path: '/v1/auth/me', okStatus: 200 },
  { method: 'POST', path: '/v1/platform/organizations/:id/suspend', okStatus: 201 },
  { method: 'GET', path: '/v1/platform/users', okStatus: 200 },
  { method: 'PUT', path: '/v1/platform/roles/:id/permissions', okStatus: 200 },
  { method: 'GET', path: '/v1/platform/feature-engine/dashboard', okStatus: 200 },
];

async function seedCategories() {
  for (const c of CATEGORIES) {
    await prisma.auditEventCategory.upsert({ where: { key: c.key }, update: {}, create: { ...c, label: c.key } });
  }
  console.log(`Seeded ${CATEGORIES.length} audit event categories.`);
}

async function seedSavedSearches() {
  let created = 0;
  for (const s of SAVED_SEARCHES) {
    const existing = await prisma.auditSavedSearch.findFirst({ where: { name: s.name, isSystem: true } });
    if (existing) continue;
    await prisma.auditSavedSearch.create({ data: { name: s.name, filters: s.filters, isSystem: true, ownerName: null } });
    created++;
  }
  console.log(`Seeded ${created} new system saved searches (${SAVED_SEARCHES.length} total).`);
}

async function seedRetentionSetting() {
  const existing = await prisma.auditRetentionSetting.findFirst();
  if (existing) {
    console.log('Retention setting already exists, skipping.');
    return;
  }
  await prisma.auditRetentionSetting.create({ data: { defaultRetentionDays: 90, archiveEnabled: false, updatedByName: 'System' } });
  console.log('Seeded default retention setting (90 days).');
}

async function seedAlertRules() {
  let created = 0;
  for (const r of ALERT_RULES) {
    const existing = await prisma.auditAlertRule.findFirst({ where: { name: r.name } });
    if (existing) continue;
    await prisma.auditAlertRule.create({ data: { ...r, createdByName: 'Amal Dev Owner' } });
    created++;
  }
  console.log(`Seeded ${created} new alert rules (${ALERT_RULES.length} total).`);
}

async function seedApiActivity() {
  const marker = await prisma.apiActivityLog.count();
  if (marker > 0) {
    console.log('API activity rows already present, skipping.');
    return;
  }
  const rows = [];
  for (let i = 0; i < 80; i++) {
    const p = API_PATHS[i % API_PATHS.length];
    const isError = i % 11 === 0;
    rows.push({
      method: p.method,
      path: p.path,
      statusCode: isError ? (i % 2 === 0 ? 500 : 404) : p.okStatus,
      responseTimeMs: 40 + Math.floor(Math.random() * 400),
      actorName: 'Amal Dev Owner',
      ipAddress: '203.0.113.10',
      createdAt: h(-Math.floor(Math.random() * 47)),
    });
  }
  await prisma.apiActivityLog.createMany({ data: rows });
  console.log(`Seeded ${rows.length} API activity rows.`);
}

async function log(rows) {
  const marker = await prisma.auditLog.findFirst({ where: { eventType: 'SEED_MARKER_PLT010' } });
  if (marker) return 0;
  await prisma.auditLog.createMany({ data: rows });
  return rows.length;
}

async function seedHistoricalEvents() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true }, take: 6 });
  const org = (i) => orgs[i % orgs.length];
  const marker = await prisma.auditLog.findFirst({ where: { eventType: 'SEED_MARKER_PLT010' } });
  if (marker) {
    console.log('Historical audit events already seeded, skipping.');
    return;
  }

  const rows = [];

  // --- Marker row (idempotency check for this function only) ---
  rows.push({ action: 'Audit Center Seed Marker', user: 'System', details: 'Internal marker row for seed idempotency - not a real event.', eventType: 'SEED_MARKER_PLT010', eventCategory: 'System', severity: 'Information', createdAt: d(-60) });

  // --- Categories the app doesn't organically generate yet ---
  const flavor = [
    { category: 'Members', action: 'Member Created', details: (o) => `Registered a new member at "${o.name}".`, eventType: 'MEMBER_CREATED', severity: 'Low' },
    { category: 'Members', action: 'Member Deactivated', details: (o) => `Deactivated a member at "${o.name}".`, eventType: 'MEMBER_DEACTIVATED', severity: 'Medium' },
    { category: 'Attendance', action: 'Attendance Imported', details: (o) => `Imported 214 attendance records for "${o.name}".`, eventType: 'ATTENDANCE_IMPORTED', severity: 'Low' },
    { category: 'Attendance', action: 'Attendance Check-In', details: (o) => `Member checked in at "${o.name}" via biometric device.`, eventType: 'ATTENDANCE_CHECKIN', severity: 'Information' },
    { category: 'Training Studio', action: 'Workout Assigned', details: (o) => `Assigned a 12-week strength program to a member at "${o.name}".`, eventType: 'WORKOUT_ASSIGNED', severity: 'Low' },
    { category: 'Training Studio', action: 'Exercise Library Updated', details: (o) => `Added 6 new exercises to the shared library at "${o.name}".`, eventType: 'EXERCISE_LIBRARY_UPDATED', severity: 'Low' },
    { category: 'Nutrition', action: 'Diet Plan Created', details: (o) => `Created a nutrition plan for a member at "${o.name}".`, eventType: 'DIET_PLAN_CREATED', severity: 'Low' },
    { category: 'Payments', action: 'Payment Received', details: (o) => `Received a membership payment at "${o.name}".`, eventType: 'PAYMENT_RECEIVED', severity: 'Information' },
    { category: 'Payments', action: 'Payment Failed', details: (o) => `A card payment failed at "${o.name}" (insufficient funds).`, eventType: 'PAYMENT_FAILED', severity: 'High' },
    { category: 'Expenses', action: 'Expense Logged', details: (o) => `Logged an equipment maintenance expense at "${o.name}".`, eventType: 'EXPENSE_LOGGED', severity: 'Low' },
    { category: 'Reports', action: 'Report Exported', details: (o) => `Exported a monthly revenue report for "${o.name}".`, eventType: 'REPORT_EXPORTED', severity: 'Low' },
    { category: 'Monitoring', action: 'Deployment Completed', details: () => 'Deployed apps/api v0.4.2 to production.', eventType: 'DEPLOYMENT_COMPLETED', severity: 'Information' },
    { category: 'Monitoring', action: 'Service Degraded', details: () => 'The Redis cache layer reported elevated latency for 4 minutes.', eventType: 'SERVICE_DEGRADED', severity: 'High' },
    { category: 'API', action: 'API Key Generated', details: () => 'Generated a new developer API key for integration testing.', eventType: 'API_KEY_GENERATED', severity: 'Medium' },
  ];

  for (let i = 0; i < 36; i++) {
    const f = flavor[i % flavor.length];
    const o = org(i);
    rows.push({
      organizationId: f.category === 'Monitoring' || f.category === 'API' ? null : o?.id,
      action: f.action,
      user: 'Amal Dev Owner',
      details: f.details(o || { name: 'GymFlow' }),
      eventType: f.eventType,
      eventCategory: f.category,
      severity: f.severity,
      ipAddress: '203.0.113.10',
      createdAt: h(-Math.floor(Math.random() * 200)),
    });
  }

  // --- Correlated chain: the spec's own example ---
  const chainOrg = orgs[0];
  if (chainOrg) {
    const correlationId = 'seed-chain-subscription-upgrade';
    const chainAt = (offsetMin) => new Date(d(-3).getTime() + offsetMin * 60 * 1000);
    rows.push(
      { organizationId: chainOrg.id, action: 'Subscription Upgraded', user: 'Amal Dev Owner', details: `Upgraded "${chainOrg.name}" to the Professional plan.`, eventType: 'SUBSCRIPTION_UPGRADED', eventCategory: 'Subscriptions', severity: 'Medium', correlationId, createdAt: chainAt(0) },
      { organizationId: chainOrg.id, action: 'Invoice Generated', user: 'System', details: `Generated an invoice for "${chainOrg.name}"'s plan upgrade.`, eventType: 'INVOICE_GENERATED', eventCategory: 'Billing', severity: 'Low', correlationId, createdAt: chainAt(1) },
      { organizationId: chainOrg.id, action: 'Payment Processed', user: 'System', details: `Processed payment for "${chainOrg.name}"'s upgrade invoice.`, eventType: 'PAYMENT_PROCESSED', eventCategory: 'Payments', severity: 'Information', correlationId, createdAt: chainAt(2) },
      { organizationId: chainOrg.id, action: 'Plan Activated', user: 'System', details: `Activated the Professional plan for "${chainOrg.name}".`, eventType: 'PLAN_ACTIVATED', eventCategory: 'Subscriptions', severity: 'Low', correlationId, createdAt: chainAt(3) },
      { organizationId: chainOrg.id, action: 'Feature Limits Updated', user: 'System', details: `Updated resource limits for "${chainOrg.name}" to match the Professional plan.`, eventType: 'FEATURE_LIMITS_UPDATED', eventCategory: 'Feature Flags', severity: 'Low', correlationId, createdAt: chainAt(4) },
    );
  }

  // --- Diff Viewer examples (metadata.before/after) ---
  const diffOrg = orgs[1] || orgs[0];
  rows.push(
    {
      action: 'Role Updated', user: 'Amal Dev Owner', details: 'Updated the Support Engineer role.', eventType: 'PLATFORM_ROLE_UPDATED', eventCategory: 'Roles & Permissions', severity: 'Medium',
      metadata: { before: { description: 'Frontline support agent.', status: 'Active' }, after: { description: 'Frontline support: tickets, user assistance and organization visibility.', status: 'Active' } },
      createdAt: h(-30),
    },
    {
      action: 'Plan Changed', user: 'Amal Dev Owner', details: `Changed "${diffOrg?.name || 'an organization'}"'s plan from Starter to Professional.`, eventType: 'PLAN_CHANGED', eventCategory: 'Subscriptions', severity: 'Medium', organizationId: diffOrg?.id,
      metadata: { before: { plan: 'Starter', price: 29 }, after: { plan: 'Professional', price: 79 } },
      createdAt: h(-52),
    },
    {
      action: 'Feature Enabled', user: 'Amal Dev Owner', details: 'Enabled the Nutrition Tracking feature for the Professional plan.', eventType: 'FEATURE_CHANGED', eventCategory: 'Feature Flags', severity: 'Low',
      metadata: { before: { state: 'DISABLED' }, after: { state: 'ENABLED' } },
      createdAt: h(-70),
    },
    {
      action: 'Organization Status Changed', user: 'Amal Dev Owner', details: `Suspended "${diffOrg?.name || 'an organization'}" for a billing dispute.`, eventType: 'ORG_STATUS_CHANGED', eventCategory: 'Organizations', severity: 'High', organizationId: diffOrg?.id,
      metadata: { before: { status: 'ACTIVE' }, after: { status: 'SUSPENDED' } },
      createdAt: h(-90),
    },
  );

  // --- Security-flavored events for the Security Events tab / dashboard ---
  for (let i = 0; i < 6; i++) {
    rows.push({ action: 'Login Failed', user: 'unknown@gymflow.test', details: 'Failed OTP verification attempt.', eventType: 'LOGIN_FAILED', eventCategory: 'Authentication', severity: 'High', ipAddress: '198.51.100.23', createdAt: h(-2 - i * 0.3) });
  }
  rows.push(
    { action: 'MFA Reset', user: 'Amal Dev Owner', details: 'Reset multi-factor authentication for a locked-out platform user.', eventType: 'PLATFORM_MFA_RESET', eventCategory: 'Security', severity: 'High', createdAt: h(-14) },
    { action: 'Suspicious Activity Detected', user: 'System', details: 'Multiple failed logins from an unrecognized IP within a short window.', eventType: 'SUSPICIOUS_ACTIVITY', eventCategory: 'Security', severity: 'Critical', ipAddress: '198.51.100.23', createdAt: h(-2) },
  );

  const created = await log(rows);
  console.log(`Seeded ${created} historical audit events (categories, correlated chain, diffs, security).`);
}

async function main() {
  console.log('--- PLT-010 Audit Center Seed Started ---');
  await seedCategories();
  await seedSavedSearches();
  await seedRetentionSetting();
  await seedAlertRules();
  await seedApiActivity();
  await seedHistoricalEvents();
  console.log('--- PLT-010 Audit Center Seed Complete ---');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
