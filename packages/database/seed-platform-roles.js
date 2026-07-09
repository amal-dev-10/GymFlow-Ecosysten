// Demo + system data for PLT-008 Platform Roles & Permissions. Seeds the full
// permission catalog (categories, actions, permissions), permission groups,
// the 9 built-in system roles with their grants/restrictions/inheritance, 5
// role templates, a couple of Temporary Access grants, and back-fills
// PlatformUserRoleAssignment for every PlatformAdminUser seeded by
// seed-platform-users.js (mapped from their legacy PlatformRole enum value).
// Idempotent: categories/actions/permissions/groups/roles/templates are all
// matched by their unique key/slug/name.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const d = (offsetDays) => new Date(now + offsetDays * DAY);

// ---------------------------------------------------------------------------
// Catalogs
// ---------------------------------------------------------------------------

const ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete', isSensitive: true },
  { key: 'approve', label: 'Approve' },
  { key: 'export', label: 'Export' },
  { key: 'import', label: 'Import' },
  { key: 'assign', label: 'Assign' },
  { key: 'suspend', label: 'Suspend', isSensitive: true },
  { key: 'activate', label: 'Activate' },
  { key: 'impersonate', label: 'Impersonate', isSensitive: true },
  { key: 'manage', label: 'Manage' },
  { key: 'override', label: 'Override', isSensitive: true },
  { key: 'configure', label: 'Configure' },
];

const CATEGORIES = [
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', order: 0 },
  { key: 'organizations', label: 'Organizations', icon: 'Building2', order: 1 },
  { key: 'subscriptions', label: 'Subscriptions', icon: 'Repeat', order: 2 },
  { key: 'plans', label: 'Plans', icon: 'Layers', order: 3 },
  { key: 'platform_users', label: 'Platform Users', icon: 'Users', order: 4 },
  { key: 'roles', label: 'Roles', icon: 'ShieldCheck', order: 5 },
  { key: 'billing', label: 'Billing', icon: 'Receipt', order: 6 },
  { key: 'revenue', label: 'Revenue', icon: 'DollarSign', order: 7 },
  { key: 'support', label: 'Support', icon: 'LifeBuoy', order: 8 },
  { key: 'monitoring', label: 'Monitoring', icon: 'Activity', order: 9 },
  { key: 'audit_logs', label: 'Audit Logs', icon: 'History', order: 10 },
  { key: 'feature_flags', label: 'Feature Flags', icon: 'Flag', order: 11 },
  { key: 'global_settings', label: 'Global Settings', icon: 'Settings', order: 12 },
  { key: 'developer_tools', label: 'Developer Tools', icon: 'Terminal', order: 13 },
  { key: 'announcements', label: 'Announcements', icon: 'Megaphone', order: 14 },
  { key: 'api_management', label: 'API Management', icon: 'Webhook', order: 15 },
  { key: 'notifications', label: 'Notifications', icon: 'Bell', order: 16 },
  { key: 'automation', label: 'Automation', icon: 'Workflow', order: 17 },
];

// key is auto-derived as `${category}.${slug}`
const PERMISSIONS = {
  dashboard: [{ slug: 'view', action: 'view', label: 'View Dashboard', resourceLabel: 'Dashboard' }],
  organizations: [
    { slug: 'view', action: 'view', label: 'View Organizations', resourceLabel: 'Organizations' },
    { slug: 'create', action: 'create', label: 'Create Organizations', resourceLabel: 'Organizations' },
    { slug: 'update', action: 'update', label: 'Update Organizations', resourceLabel: 'Organizations' },
    { slug: 'suspend', action: 'suspend', label: 'Suspend Organizations', resourceLabel: 'Organizations', isSensitive: true },
    { slug: 'archive', action: 'delete', label: 'Archive Organizations', resourceLabel: 'Organizations', isSensitive: true },
    { slug: 'impersonate', action: 'impersonate', label: 'Impersonate Organizations', resourceLabel: 'Organizations', isSensitive: true },
    { slug: 'export', action: 'export', label: 'Export Organizations', resourceLabel: 'Organizations' },
  ],
  subscriptions: [
    { slug: 'view', action: 'view', label: 'View Subscriptions', resourceLabel: 'Subscriptions' },
    { slug: 'assign_plans', action: 'assign', label: 'Assign Plans', resourceLabel: 'Subscriptions' },
    { slug: 'cancel', action: 'manage', label: 'Cancel Subscription', resourceLabel: 'Subscriptions', isSensitive: true },
    { slug: 'upgrade_plan', action: 'update', label: 'Upgrade Plan', resourceLabel: 'Subscriptions' },
    { slug: 'downgrade_plan', action: 'update', label: 'Downgrade Plan', resourceLabel: 'Subscriptions' },
    { slug: 'apply_coupon', action: 'configure', label: 'Apply Coupon', resourceLabel: 'Subscriptions' },
  ],
  plans: [
    { slug: 'view', action: 'view', label: 'View Plans', resourceLabel: 'Plans' },
    { slug: 'create', action: 'create', label: 'Create Plans', resourceLabel: 'Plans' },
    { slug: 'update', action: 'update', label: 'Update Plans', resourceLabel: 'Plans' },
    { slug: 'delete', action: 'delete', label: 'Delete Plans', resourceLabel: 'Plans', isSensitive: true },
    { slug: 'configure', action: 'configure', label: 'Configure Plan Features & Limits', resourceLabel: 'Plans' },
  ],
  platform_users: [
    { slug: 'view', action: 'view', label: 'View Platform Users', resourceLabel: 'Platform Users' },
    { slug: 'invite', action: 'create', label: 'Invite Users', resourceLabel: 'Platform Users' },
    { slug: 'update', action: 'update', label: 'Update Platform Users', resourceLabel: 'Platform Users' },
    { slug: 'suspend', action: 'suspend', label: 'Suspend Users', resourceLabel: 'Platform Users', isSensitive: true },
    { slug: 'reset_password', action: 'manage', label: 'Reset Password', resourceLabel: 'Platform Users' },
    { slug: 'reset_mfa', action: 'manage', label: 'Reset MFA', resourceLabel: 'Platform Users' },
    { slug: 'terminate_sessions', action: 'manage', label: 'Terminate Sessions', resourceLabel: 'Platform Users' },
    { slug: 'delete', action: 'delete', label: 'Delete Platform Users', resourceLabel: 'Platform Users', isSensitive: true },
  ],
  roles: [
    { slug: 'view', action: 'view', label: 'View Roles', resourceLabel: 'Roles' },
    { slug: 'create', action: 'create', label: 'Create Roles', resourceLabel: 'Roles' },
    { slug: 'update', action: 'update', label: 'Update Roles', resourceLabel: 'Roles' },
    { slug: 'delete', action: 'delete', label: 'Delete Roles', resourceLabel: 'Roles', isSensitive: true },
    { slug: 'assign', action: 'assign', label: 'Assign Roles', resourceLabel: 'Roles' },
    { slug: 'manage_permissions', action: 'manage', label: 'Manage Permissions', resourceLabel: 'Roles', isSensitive: true },
  ],
  billing: [
    { slug: 'view', action: 'view', label: 'View Billing', resourceLabel: 'Billing' },
    { slug: 'issue_refund', action: 'approve', label: 'Issue Refund', resourceLabel: 'Billing', isSensitive: true },
    { slug: 'export', action: 'export', label: 'Export Revenue', resourceLabel: 'Billing' },
    { slug: 'generate_invoice', action: 'create', label: 'Generate Invoice', resourceLabel: 'Billing' },
    { slug: 'manage_taxes', action: 'configure', label: 'Manage Tax Settings', resourceLabel: 'Billing', isSensitive: true },
    { slug: 'manage_gateways', action: 'configure', label: 'Manage Payment Gateways', resourceLabel: 'Billing', isSensitive: true },
  ],
  revenue: [
    { slug: 'view', action: 'view', label: 'View Revenue', resourceLabel: 'Revenue' },
    { slug: 'export', action: 'export', label: 'Export Revenue Reports', resourceLabel: 'Revenue' },
  ],
  support: [
    { slug: 'view_tickets', action: 'view', label: 'View Tickets', resourceLabel: 'Support' },
    { slug: 'assign_tickets', action: 'assign', label: 'Assign Tickets', resourceLabel: 'Support' },
    { slug: 'close_tickets', action: 'update', label: 'Close Tickets', resourceLabel: 'Support' },
    { slug: 'delete_tickets', action: 'delete', label: 'Delete Tickets', resourceLabel: 'Support', isSensitive: true },
    { slug: 'escalate', action: 'manage', label: 'Escalate Tickets', resourceLabel: 'Support' },
    { slug: 'manage_sla', action: 'configure', label: 'Manage SLA Policies', resourceLabel: 'Support', isSensitive: true },
    { slug: 'manage_kb', action: 'manage', label: 'Manage Knowledge Base', resourceLabel: 'Support' },
    { slug: 'merge_tickets', action: 'manage', label: 'Merge Tickets', resourceLabel: 'Support' },
  ],
  monitoring: [
    { slug: 'view', action: 'view', label: 'View Monitoring', resourceLabel: 'Monitoring' },
    { slug: 'restart_services', action: 'manage', label: 'Restart Services', resourceLabel: 'Monitoring', isSensitive: true },
    { slug: 'run_diagnostics', action: 'manage', label: 'Run Diagnostics', resourceLabel: 'Monitoring' },
  ],
  audit_logs: [
    { slug: 'view', action: 'view', label: 'View Audit Logs', resourceLabel: 'Audit Logs' },
    { slug: 'export', action: 'export', label: 'Export Audit Logs', resourceLabel: 'Audit Logs' },
    { slug: 'view_security', action: 'view', label: 'View Security Events', resourceLabel: 'Audit Logs' },
    { slug: 'view_api', action: 'view', label: 'View API Activity', resourceLabel: 'Audit Logs' },
    { slug: 'manage_retention', action: 'configure', label: 'Manage Retention Policies', resourceLabel: 'Audit Logs', isSensitive: true },
    { slug: 'manage_alerts', action: 'manage', label: 'Manage Audit Alerts', resourceLabel: 'Audit Logs' },
    { slug: 'manage_settings', action: 'configure', label: 'Manage Audit Settings', resourceLabel: 'Audit Logs' },
  ],
  feature_flags: [
    { slug: 'view', action: 'view', label: 'View Feature Flags', resourceLabel: 'Feature Flags' },
    { slug: 'configure', action: 'configure', label: 'Configure Feature Flags', resourceLabel: 'Feature Flags', isSensitive: true },
  ],
  global_settings: [
    { slug: 'view', action: 'view', label: 'View Global Settings', resourceLabel: 'Global Settings' },
    { slug: 'configure', action: 'configure', label: 'Configure Global Settings', resourceLabel: 'Global Settings', isSensitive: true },
    { slug: 'manage_system', action: 'configure', label: 'Manage System Settings', resourceLabel: 'Global Settings', isSensitive: true },
  ],
  developer_tools: [
    { slug: 'view', action: 'view', label: 'View Developer Tools', resourceLabel: 'Developer Tools' },
    { slug: 'access', action: 'manage', label: 'Access Developer Tools', resourceLabel: 'Developer Tools', isSensitive: true },
  ],
  announcements: [
    { slug: 'view', action: 'view', label: 'View Announcements', resourceLabel: 'Announcements' },
    { slug: 'create', action: 'create', label: 'Create Announcements', resourceLabel: 'Announcements' },
    { slug: 'update', action: 'update', label: 'Update Announcements', resourceLabel: 'Announcements' },
    { slug: 'delete', action: 'delete', label: 'Delete Announcements', resourceLabel: 'Announcements' },
  ],
  api_management: [
    { slug: 'view', action: 'view', label: 'View API Management', resourceLabel: 'API Management' },
    { slug: 'manage_keys', action: 'manage', label: 'Manage API Keys', resourceLabel: 'API Management', isSensitive: true },
    { slug: 'configure', action: 'configure', label: 'Configure API Management', resourceLabel: 'API Management', isSensitive: true },
  ],
  notifications: [
    { slug: 'view', action: 'view', label: 'View Notifications', resourceLabel: 'Notifications' },
    { slug: 'create', action: 'create', label: 'Compose Notifications', resourceLabel: 'Notifications' },
    { slug: 'manage_templates', action: 'manage', label: 'Manage Notification Templates', resourceLabel: 'Notifications' },
    { slug: 'manage_campaigns', action: 'manage', label: 'Manage Notification Campaigns', resourceLabel: 'Notifications' },
    { slug: 'send', action: 'manage', label: 'Send Notifications', resourceLabel: 'Notifications', isSensitive: true },
  ],
  automation: [
    { slug: 'view', action: 'view', label: 'View Automation & Jobs', resourceLabel: 'Automation' },
    { slug: 'manage_jobs', action: 'manage', label: 'Manage Job Definitions', resourceLabel: 'Automation', isSensitive: true },
    { slug: 'run_now', action: 'manage', label: 'Run Jobs Manually', resourceLabel: 'Automation' },
    { slug: 'manage_failures', action: 'manage', label: 'Retry or Ignore Failed Jobs', resourceLabel: 'Automation' },
  ],
};

const PERMISSION_GROUPS = [
  { name: 'Organization Management', category: 'Organization Management', description: 'Full lifecycle control over customer organizations.', match: (k) => k.startsWith('organizations.') },
  { name: 'Commercial', category: 'Commercial', description: 'Subscriptions, plans, billing and revenue.', match: (k) => k.startsWith('subscriptions.') || k.startsWith('plans.') || k.startsWith('billing.') || k.startsWith('revenue.') },
  { name: 'Platform Operations', category: 'Platform Operations', description: 'Internal staff management and announcements.', match: (k) => k.startsWith('platform_users.') || k.startsWith('announcements.') },
  { name: 'Security', category: 'Security', description: 'Roles, permissions and audit oversight.', match: (k) => k.startsWith('roles.') || k.startsWith('audit_logs.') },
  { name: 'Infrastructure', category: 'Infrastructure', description: 'Monitoring, global settings and API management.', match: (k) => k.startsWith('monitoring.') || k.startsWith('global_settings.') || k.startsWith('api_management.') },
  { name: 'Support', category: 'Support', description: 'Ticket handling for the support desk.', match: (k) => k.startsWith('support.') },
  { name: 'Developer', category: 'Developer', description: 'Developer tools and feature flag access.', match: (k) => k.startsWith('developer_tools.') || k.startsWith('feature_flags.') },
  { name: 'Analytics', category: 'Analytics', description: 'Dashboard and revenue visibility.', match: (k) => k.startsWith('dashboard.') || k === 'revenue.view' },
];

// System roles: name, slug, description, colorTag, allow[] (permission keys),
// deny[] ({ key, note }) restrictions, inherits[] (slugs).
const SYSTEM_ROLES = [
  {
    name: 'Super Administrator',
    slug: 'super-administrator',
    description: 'Unrestricted access to every Platform module and action.',
    colorTag: 'amber',
    allowAll: true,
  },
  {
    name: 'Platform Administrator',
    slug: 'platform-administrator',
    description: 'Broad day-to-day administration of organizations, users and plans.',
    colorTag: 'indigo',
    inherits: ['support-engineer', 'operations'],
    allow: [
      'dashboard.view', 'organizations.view', 'organizations.create', 'organizations.update', 'organizations.export',
      'platform_users.view', 'platform_users.invite', 'platform_users.update', 'platform_users.suspend', 'platform_users.reset_password', 'platform_users.reset_mfa',
      'plans.view', 'plans.create', 'plans.update', 'subscriptions.view', 'subscriptions.assign_plans', 'subscriptions.upgrade_plan', 'subscriptions.downgrade_plan',
      'roles.view', 'roles.assign', 'audit_logs.view', 'audit_logs.view_security', 'audit_logs.export', 'audit_logs.manage_retention', 'audit_logs.manage_alerts', 'audit_logs.manage_settings',
      'announcements.view', 'announcements.create', 'announcements.update', 'announcements.delete', 'global_settings.view',
      'support.view_tickets', 'support.assign_tickets', 'support.escalate', 'support.manage_sla', 'support.manage_kb',
      'billing.view', 'billing.generate_invoice', 'revenue.view',
    ],
  },
  {
    name: 'Support Manager',
    slug: 'support-manager',
    description: 'Manages the entire support desk: tickets, escalations, SLA policy and the knowledge base.',
    colorTag: 'blue',
    allow: [
      'dashboard.view', 'organizations.view', 'platform_users.view', 'subscriptions.view',
      'support.view_tickets', 'support.assign_tickets', 'support.close_tickets', 'support.delete_tickets', 'support.escalate', 'support.manage_sla', 'support.manage_kb', 'support.merge_tickets',
      'audit_logs.view', 'audit_logs.view_security', 'notifications.view',
    ],
  },
  {
    name: 'Support Engineer',
    slug: 'support-engineer',
    description: 'Frontline support: tickets, user assistance and organization visibility.',
    colorTag: 'sky',
    allow: [
      'dashboard.view', 'organizations.view', 'platform_users.view', 'platform_users.reset_password', 'platform_users.reset_mfa', 'platform_users.terminate_sessions',
      'support.view_tickets', 'support.assign_tickets', 'support.close_tickets', 'support.escalate', 'monitoring.view', 'audit_logs.view', 'audit_logs.view_security', 'notifications.view',
    ],
    deny: [{ key: 'billing.view', note: 'Support cannot view revenue.' }],
  },
  {
    name: 'Customer Success',
    slug: 'customer-success',
    description: 'Onboarding and long-term account health for customer organizations.',
    colorTag: 'teal',
    allow: ['dashboard.view', 'organizations.view', 'platform_users.view', 'subscriptions.view', 'support.view_tickets', 'support.assign_tickets'],
  },
  {
    name: 'Finance',
    slug: 'finance',
    description: 'Billing, invoicing and revenue operations.',
    colorTag: 'emerald',
    allow: [
      'dashboard.view', 'billing.view', 'billing.issue_refund', 'billing.export', 'billing.generate_invoice', 'billing.manage_taxes', 'billing.manage_gateways', 'revenue.view', 'revenue.export',
      'subscriptions.view', 'subscriptions.assign_plans', 'subscriptions.upgrade_plan', 'subscriptions.downgrade_plan', 'subscriptions.apply_coupon',
      'plans.view', 'organizations.view', 'organizations.export', 'audit_logs.view', 'support.view_tickets',
    ],
    deny: [{ key: 'organizations.impersonate', note: 'Finance cannot impersonate.' }],
  },
  {
    name: 'Sales',
    slug: 'sales',
    description: 'New business and account expansion.',
    colorTag: 'violet',
    allow: ['dashboard.view', 'organizations.view', 'organizations.create', 'organizations.export', 'plans.view', 'subscriptions.view', 'subscriptions.assign_plans', 'subscriptions.apply_coupon'],
    deny: [{ key: 'organizations.suspend', note: 'Sales cannot suspend organizations.' }],
  },
  {
    name: 'Operations',
    slug: 'operations',
    description: 'Platform operations, uptime and internal tooling.',
    colorTag: 'indigo',
    allow: [
      'dashboard.view', 'monitoring.view', 'monitoring.run_diagnostics', 'global_settings.view', 'global_settings.configure', 'organizations.view', 'platform_users.view', 'audit_logs.view', 'audit_logs.view_security', 'support.view_tickets',
      'notifications.view', 'notifications.create', 'notifications.manage_templates', 'notifications.manage_campaigns', 'notifications.send',
      'automation.view', 'automation.run_now', 'automation.manage_failures',
    ],
  },
  {
    name: 'Developer',
    slug: 'developer',
    description: 'Engineering access to developer tools, feature flags and API management.',
    colorTag: 'cyan',
    allow: [
      'dashboard.view', 'developer_tools.view', 'developer_tools.access', 'feature_flags.view', 'feature_flags.configure',
      'api_management.view', 'api_management.manage_keys', 'api_management.configure', 'audit_logs.view', 'audit_logs.view_api', 'monitoring.view',
      'global_settings.view', 'global_settings.manage_system',
      'automation.view', 'automation.manage_jobs', 'automation.run_now', 'automation.manage_failures',
      'support.view_tickets', 'support.escalate',
    ],
    deny: [{ key: 'billing.view', note: 'Developer cannot access billing.' }],
  },
  {
    name: 'Read Only',
    slug: 'read-only',
    description: 'View-only access across every Platform module. No mutating actions.',
    colorTag: 'slate',
    allowByAction: 'view',
  },
];

const ROLE_TEMPLATES = [
  {
    name: 'Support Manager',
    category: 'Support',
    description: 'Support Engineer permissions plus ticket deletion and user suspension.',
    permissionKeys: ['dashboard.view', 'organizations.view', 'platform_users.view', 'platform_users.suspend', 'platform_users.reset_password', 'support.view_tickets', 'support.assign_tickets', 'support.close_tickets', 'support.delete_tickets'],
    groupNames: ['Support'],
  },
  {
    name: 'Sales Executive',
    category: 'Commercial',
    description: 'Organization creation and subscription assignment for new business.',
    permissionKeys: ['dashboard.view', 'organizations.view', 'organizations.create', 'plans.view', 'subscriptions.view', 'subscriptions.assign_plans', 'subscriptions.apply_coupon'],
    groupNames: ['Commercial'],
  },
  {
    name: 'Finance Manager',
    category: 'Commercial',
    description: 'Full billing and revenue operations with refund approval.',
    permissionKeys: ['dashboard.view', 'billing.view', 'billing.issue_refund', 'billing.export', 'revenue.view', 'revenue.export', 'subscriptions.view'],
    groupNames: ['Commercial'],
  },
  {
    name: 'Operations Lead',
    category: 'Platform Operations',
    description: 'Monitoring, diagnostics and platform-wide settings visibility.',
    permissionKeys: ['dashboard.view', 'monitoring.view', 'monitoring.restart_services', 'monitoring.run_diagnostics', 'global_settings.view', 'audit_logs.view'],
    groupNames: ['Infrastructure'],
  },
  {
    name: 'Developer',
    category: 'Developer',
    description: 'Developer tools, feature flags and API management access.',
    permissionKeys: ['dashboard.view', 'developer_tools.view', 'developer_tools.access', 'feature_flags.view', 'feature_flags.configure', 'api_management.view', 'api_management.manage_keys'],
    groupNames: ['Developer'],
  },
];

// Legacy PlatformRole enum -> new PlatformRoleDefinition slug. MARKETING has
// no direct spec counterpart; mapped to Sales as the closest commercial fit.
const LEGACY_ROLE_TO_SLUG = {
  SUPER_ADMIN: 'super-administrator',
  OPERATIONS: 'operations',
  FINANCE: 'finance',
  SALES: 'sales',
  SUPPORT: 'support-engineer',
  DEVELOPER: 'developer',
  MARKETING: 'sales',
  CUSTOMER_SUCCESS: 'customer-success',
};

async function logRoleEvent(action, eventType, details, entityId, offsetDays = 0) {
  await prisma.auditLog.create({
    data: {
      action,
      user: 'System Migration',
      details,
      eventType,
      eventCategory: 'Roles & Permissions',
      entityType: 'PlatformRoleDefinition',
      entityId,
      createdAt: d(offsetDays),
    },
  });
}

async function main() {
  console.log('--- PLT-008 Platform Roles & Permissions Seed Started ---');

  for (const a of ACTIONS) {
    await prisma.platformPermissionAction.upsert({ where: { key: a.key }, update: {}, create: a });
  }
  console.log(`Seeded ${ACTIONS.length} permission actions.`);

  for (const c of CATEGORIES) {
    await prisma.platformPermissionCategory.upsert({ where: { key: c.key }, update: {}, create: c });
  }
  console.log(`Seeded ${CATEGORIES.length} permission categories.`);

  const permissionIdByKey = {};
  const actionByKey = {};
  let permCount = 0;
  for (const [categoryKey, perms] of Object.entries(PERMISSIONS)) {
    for (const p of perms) {
      const key = `${categoryKey}.${p.slug}`;
      const row = await prisma.platformPermission.upsert({
        where: { key },
        update: {},
        create: {
          key,
          categoryKey,
          actionKey: p.action,
          resourceLabel: p.resourceLabel,
          label: p.label,
          isSensitive: !!p.isSensitive,
        },
      });
      permissionIdByKey[key] = row.id;
      actionByKey[key] = p.action;
      permCount++;
    }
  }
  console.log(`Seeded ${permCount} permissions.`);

  const allKeys = Object.keys(permissionIdByKey);
  const groupIdByName = {};
  let groupCount = 0;
  for (const g of PERMISSION_GROUPS) {
    const row = await prisma.platformPermissionGroup.upsert({
      where: { name: g.name },
      update: {},
      create: { name: g.name, description: g.description, category: g.category, isSystem: true },
    });
    groupIdByName[g.name] = row.id;
    const memberKeys = allKeys.filter(g.match);
    for (const key of memberKeys) {
      await prisma.platformPermissionGroupItem.upsert({
        where: { groupId_permissionId: { groupId: row.id, permissionId: permissionIdByKey[key] } },
        update: {},
        create: { groupId: row.id, permissionId: permissionIdByKey[key] },
      });
    }
    groupCount++;
  }
  console.log(`Seeded ${groupCount} permission groups.`);

  const roleIdBySlug = {};
  let roleCount = 0;
  for (const r of SYSTEM_ROLES) {
    const existing = await prisma.platformRoleDefinition.findUnique({ where: { slug: r.slug } });
    const row = await prisma.platformRoleDefinition.upsert({
      where: { slug: r.slug },
      update: {},
      create: { name: r.name, slug: r.slug, description: r.description, isSystem: true, colorTag: r.colorTag, createdByName: 'System' },
    });
    roleIdBySlug[r.slug] = row.id;
    if (!existing) {
      roleCount++;
      await logRoleEvent('Role Created', 'PLATFORM_ROLE_CREATED', `System role "${r.name}" was created during PLT-008 setup.`, row.id, -30);
    }
  }
  console.log(`Seeded ${roleCount} new system roles (${SYSTEM_ROLES.length} total).`);

  // Permission grants per role
  for (const r of SYSTEM_ROLES) {
    const roleId = roleIdBySlug[r.slug];
    let allowKeys = [];
    if (r.allowAll) allowKeys = allKeys;
    else if (r.allowByAction) allowKeys = allKeys.filter((k) => actionByKey[k] === r.allowByAction);
    else allowKeys = r.allow || [];

    for (const key of allowKeys) {
      if (!permissionIdByKey[key]) continue;
      await prisma.platformRolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permissionIdByKey[key] } },
        update: {},
        create: { roleId, permissionId: permissionIdByKey[key], effect: 'ALLOW' },
      });
    }
    for (const denial of r.deny || []) {
      if (!permissionIdByKey[denial.key]) continue;
      await prisma.platformRolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permissionIdByKey[denial.key] } },
        update: {},
        create: { roleId, permissionId: permissionIdByKey[denial.key], effect: 'DENY', note: denial.note },
      });
    }
  }
  console.log('Seeded role permission grants and restrictions.');

  // Inheritance
  for (const r of SYSTEM_ROLES) {
    if (!r.inherits) continue;
    for (const parentSlug of r.inherits) {
      await prisma.platformRoleInheritance.upsert({
        where: { roleId_inheritsRoleId: { roleId: roleIdBySlug[r.slug], inheritsRoleId: roleIdBySlug[parentSlug] } },
        update: {},
        create: { roleId: roleIdBySlug[r.slug], inheritsRoleId: roleIdBySlug[parentSlug] },
      });
    }
  }
  console.log('Seeded role inheritance.');

  // Templates
  let templateCount = 0;
  for (const t of ROLE_TEMPLATES) {
    const groupIds = (t.groupNames || []).map((n) => groupIdByName[n]).filter(Boolean);
    const existing = await prisma.platformRoleTemplate.findUnique({ where: { name: t.name } });
    await prisma.platformRoleTemplate.upsert({
      where: { name: t.name },
      update: {},
      create: { name: t.name, description: t.description, category: t.category, permissionKeys: t.permissionKeys, groupIds, isSystem: true },
    });
    if (!existing) templateCount++;
  }
  console.log(`Seeded ${templateCount} new role templates (${ROLE_TEMPLATES.length} total).`);

  // Back-fill role assignments for every existing PlatformAdminUser based on
  // their legacy PlatformRole enum value.
  const platformUsers = await prisma.platformAdminUser.findMany({ include: { user: true } });
  let assignCount = 0;
  for (const pu of platformUsers) {
    const slug = LEGACY_ROLE_TO_SLUG[pu.role];
    if (!slug || !roleIdBySlug[slug]) continue;
    const existing = await prisma.platformUserRoleAssignment.findFirst({ where: { platformUserId: pu.id, roleId: roleIdBySlug[slug] } });
    if (existing) continue;
    await prisma.platformUserRoleAssignment.create({
      data: {
        platformUserId: pu.id,
        roleId: roleIdBySlug[slug],
        assignedByName: 'System Migration',
        assignedAt: pu.createdAt,
        status: 'Active',
      },
    });
    assignCount++;
    await logRoleEvent('Role Assigned', 'PLATFORM_ROLE_ASSIGNED', `${pu.user.fullName} was assigned the ${SYSTEM_ROLES.find((r) => r.slug === slug).name} role (migrated from legacy ${pu.role}).`, roleIdBySlug[slug], -30);
  }
  console.log(`Back-filled ${assignCount} role assignments from legacy roles.`);

  // Demo Temporary Access grants: one active (expires soon), one already past
  // its expiry so the lazy expiration check has something real to flip.
  const diego = platformUsers.find((p) => p.user.email === 'diego.alvarez@gymflow.test');
  const nina = platformUsers.find((p) => p.user.email === 'nina.petrova@gymflow.test');
  const tempGrants = [
    diego && { platformUser: diego, roleSlug: 'developer', reason: 'Investigating a production incident on the billing webhook.', approverName: 'Amal Dev Owner', expiresInDays: 2 },
    nina && { platformUser: nina, roleSlug: 'finance', reason: 'Covering for Finance during a coupon migration.', approverName: 'Carlos Mendes', expiresInDays: -1 },
  ].filter(Boolean);

  let tempCount = 0;
  for (const g of tempGrants) {
    const existing = await prisma.platformUserRoleAssignment.findFirst({ where: { platformUserId: g.platformUser.id, roleId: roleIdBySlug[g.roleSlug], isTemporary: true } });
    if (existing) continue;
    const grant = await prisma.platformUserRoleAssignment.create({
      data: {
        platformUserId: g.platformUser.id,
        roleId: roleIdBySlug[g.roleSlug],
        isTemporary: true,
        reason: g.reason,
        approverName: g.approverName,
        expiresAt: d(g.expiresInDays),
        assignedByName: g.approverName,
        assignedAt: d(-1),
        status: 'Active',
      },
    });
    tempCount++;
    await logRoleEvent(
      'Temporary Access Granted',
      'PLATFORM_TEMP_ACCESS_GRANTED',
      `${g.platformUser.user.fullName} was granted temporary "${SYSTEM_ROLES.find((r) => r.slug === g.roleSlug).name}" access. Reason: ${g.reason}`,
      grant.id,
      -1,
    );
  }
  console.log(`Seeded ${tempCount} temporary access grants.`);

  console.log('--- PLT-008 Platform Roles & Permissions Seed Complete ---');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
