// Demo data for PLT-007 Platform Users. Seeds the department catalog and a
// spread of internal GymFlow staff across roles/departments/statuses so the
// dashboard KPIs, table, filters, sessions and activity timeline all have
// real data. Idempotent: users are matched by phone number, departments by name.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;
const now = Date.now();
const d = (offsetDays) => new Date(now + offsetDays * DAY);
const m = (offsetMinutes) => new Date(now + offsetMinutes * MIN);

const DEPARTMENTS = [
  { name: 'Support', isSystem: true, description: 'Frontline customer support and ticket resolution.' },
  { name: 'Engineering', isSystem: true, description: 'Platform and product engineering.' },
  { name: 'Finance', isSystem: true, description: 'Billing, invoicing and revenue operations.' },
  { name: 'Sales', isSystem: true, description: 'New business and account expansion.' },
  { name: 'Marketing', isSystem: true, description: 'Growth, content and demand generation.' },
  { name: 'Operations', isSystem: true, description: 'Platform operations and internal tooling.' },
  { name: 'Customer Success', isSystem: true, description: 'Onboarding and long-term account health.' },
  { name: 'Executive', isSystem: true, description: 'Leadership and company-wide decisions.' },
];

let phoneCounter = 9200000000;
const nextPhone = () => String(++phoneCounter);

async function ensureUser(fullName, email) {
  const email2 = email;
  let user = await prisma.user.findUnique({ where: { email: email2 } });
  if (user) return user;
  return prisma.user.create({ data: { fullName, email: email2, phoneNumber: nextPhone(), isVerified: true } });
}

async function logLogin(userId, name, offsetMinutes, device, browser, ip) {
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'Login Success',
      user: name,
      details: `User ${name} logged in successfully via OTP verification.`,
      eventType: 'LOGIN_SUCCESS',
      eventCategory: 'Authentication',
      entityType: 'User',
      entityId: userId,
      metadata: { sessionId: Math.random().toString(36).slice(2, 12), device, browser, organizationName: 'None' },
      ipAddress: ip,
      createdAt: m(offsetMinutes),
    },
  });
}

async function main() {
  console.log('--- Platform Users Demo Seed Started ---');

  for (const dep of DEPARTMENTS) {
    await prisma.platformDepartment.upsert({ where: { name: dep.name }, update: {}, create: dep });
  }
  console.log(`Seeded ${DEPARTMENTS.length} departments.`);

  // Keep the existing SUPER_ADMIN (used for login in this environment) but
  // give it a department + MFA so it renders richly in the table too.
  const existingSuperAdmin = await prisma.platformAdminUser.findFirst({ where: { role: 'SUPER_ADMIN' }, include: { user: true } });
  if (existingSuperAdmin && !existingSuperAdmin.department) {
    await prisma.platformAdminUser.update({
      where: { id: existingSuperAdmin.id },
      data: { department: 'Executive', mfaEnabled: true, mfaEnabledAt: d(-200), mfaRecoveryCodesRemaining: 8 },
    });
    await logLogin(existingSuperAdmin.userId, existingSuperAdmin.user.fullName, -2, 'Desktop', 'Chrome', '203.0.113.10');
  }

  const STAFF = [
    { name: 'Priya Nair', email: 'priya.nair@gymflow.test', role: 'OPERATIONS', department: 'Operations', status: 'ACTIVE', mfa: true, createdOffset: -300, lastLoginOffset: -12 },
    { name: 'Diego Alvarez', email: 'diego.alvarez@gymflow.test', role: 'DEVELOPER', department: 'Engineering', status: 'ACTIVE', mfa: true, createdOffset: -260, lastLoginOffset: -4 },
    { name: 'Sam Okoye', email: 'sam.okoye@gymflow.test', role: 'SUPPORT', department: 'Support', status: 'ACTIVE', mfa: false, createdOffset: -220, lastLoginOffset: -180 },
    { name: 'Wei Zhang', email: 'wei.zhang@gymflow.test', role: 'CUSTOMER_SUCCESS', department: 'Customer Success', status: 'ACTIVE', mfa: true, createdOffset: -190, lastLoginOffset: -1440 },
    { name: 'Laura Bianchi', email: 'laura.bianchi@gymflow.test', role: 'MARKETING', department: 'Marketing', status: 'ACTIVE', mfa: false, createdOffset: -150, lastLoginOffset: -2880 },
    { name: 'Carlos Mendes', email: 'carlos.mendes@gymflow.test', role: 'FINANCE', department: 'Finance', status: 'ACTIVE', mfa: true, createdOffset: -400, lastLoginOffset: -60 },
    { name: 'Nina Petrova', email: 'nina.petrova@gymflow.test', role: 'SALES', department: 'Sales', status: 'PENDING_INVITATION', mfa: false, createdOffset: -2, invited: true },
    { name: 'Marcus Vance', email: 'marcus.vance@gymflow.test', role: 'SUPPORT', department: 'Support', status: 'SUSPENDED', mfa: false, createdOffset: -500, lastLoginOffset: -10080, suspendReason: 'Under review following a security policy violation.' },
    { name: 'Tom Reilly', email: 'tom.reilly@gymflow.test', role: 'DEVELOPER', department: 'Engineering', status: 'LOCKED', mfa: true, createdOffset: -120, failedAttempts: 5 },
    { name: 'Aisha Rahman', email: 'aisha.rahman@gymflow.test', role: 'OPERATIONS', department: 'Operations', status: 'DISABLED', mfa: false, createdOffset: -600, lastLoginOffset: -20160 },
  ];

  let created = 0;
  for (const s of STAFF) {
    const user = await ensureUser(s.name, s.email);
    const existing = await prisma.platformAdminUser.findUnique({ where: { userId: user.id } });
    if (existing) {
      console.log(`  skip existing ${s.name}`);
      continue;
    }

    const data = {
      userId: user.id,
      role: s.role,
      department: s.department,
      status: s.status,
      isActive: s.status === 'ACTIVE',
      mfaEnabled: s.mfa,
      mfaEnabledAt: s.mfa ? d(s.createdOffset + 5) : null,
      mfaRecoveryCodesRemaining: s.mfa ? 10 : null,
      createdAt: d(s.createdOffset),
    };

    if (s.invited) {
      data.invitedAt = d(s.createdOffset);
      data.invitedByName = 'Amal Dev Owner';
      data.invitationExpiresAt = d(s.createdOffset + 7);
    } else {
      data.invitedAt = d(s.createdOffset);
      data.invitedByName = 'Amal Dev Owner';
      data.acceptedAt = d(s.createdOffset + 1);
    }

    if (s.status === 'SUSPENDED') {
      data.suspendedAt = d(-10);
      data.suspendReason = s.suspendReason;
    }
    if (s.status === 'DISABLED') {
      data.deactivatedAt = d(-30);
    }
    if (s.status === 'LOCKED') {
      data.failedLoginAttempts = s.failedAttempts || 5;
      data.lockedUntil = m(30);
    }

    const platformUser = await prisma.platformAdminUser.create({ data });
    created++;

    if (s.lastLoginOffset != null) {
      await logLogin(user.id, s.name, s.lastLoginOffset, s.lastLoginOffset > -30 ? 'Mobile' : 'Desktop', 'Chrome', '198.51.100.' + (created + 10));
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'Platform User Invited',
        user: 'Amal Dev Owner',
        details: `Invited ${s.name} to the Platform as ${s.role.replace('_', ' ')} (${s.department}).`,
        eventType: 'PLATFORM_USER_INVITED',
        eventCategory: 'Platform Users',
        entityType: 'PlatformAdminUser',
        entityId: platformUser.id,
        createdAt: d(s.createdOffset),
      },
    });

    if (s.status === 'SUSPENDED') {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'Platform User Suspended',
          user: 'Amal Dev Owner',
          details: `Suspended ${s.name}: ${s.suspendReason}`,
          eventType: 'PLATFORM_USER_SUSPENDED',
          eventCategory: 'Platform Users',
          entityType: 'PlatformAdminUser',
          entityId: platformUser.id,
          createdAt: d(-10),
        },
      });
    }
  }
  console.log(`Created ${created} platform users.`);

  // Assign a couple of support/customer-success staff to real demo orgs.
  const sam = await prisma.platformAdminUser.findFirst({ where: { user: { email: 'sam.okoye@gymflow.test' } } });
  const wei = await prisma.platformAdminUser.findFirst({ where: { user: { email: 'wei.zhang@gymflow.test' } } });
  const orgAssignments = [
    { platformUser: sam, orgSlug: 'demo-desert-fitness-llc', accessLevel: 'Manage' },
    { platformUser: sam, orgSlug: 'demo-highland-health-hub', accessLevel: 'View' },
    { platformUser: wei, orgSlug: 'demo-fitzone-studios', accessLevel: 'Full' },
    { platformUser: wei, orgSlug: 'demo-lion-city-athletics', accessLevel: 'Manage' },
  ];
  let assigned = 0;
  for (const a of orgAssignments) {
    if (!a.platformUser) continue;
    const org = await prisma.organization.findUnique({ where: { slug: a.orgSlug } });
    if (!org) continue;
    const existing = await prisma.platformUserOrgAssignment.findUnique({ where: { platformUserId_organizationId: { platformUserId: a.platformUser.id, organizationId: org.id } } });
    if (existing) continue;
    await prisma.platformUserOrgAssignment.create({
      data: { platformUserId: a.platformUser.id, organizationId: org.id, accessLevel: a.accessLevel, assignedByName: 'Amal Dev Owner' },
    });
    assigned++;
  }
  console.log(`Created ${assigned} organization assignments.`);

  console.log('--- Platform Users Demo Seed Complete ---');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
