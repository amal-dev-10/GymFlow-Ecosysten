// Demo data for PLT-004 Organization Management (Platform Administration).
// Seeds a spread of customer organizations across statuses, plans, countries,
// subscription states and activity so the KPI cards, filters, insights and
// health scoring on the platform Organizations index have real data to render.
// Idempotent: every demo org uses a `demo-` slug prefix and is skipped if present.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const d = (offsetDays) => new Date(now + offsetDays * DAY);

async function ensurePlan(code, data) {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { internalCode: code } });
  if (existing) return existing;
  return prisma.subscriptionPlan.create({ data: { internalCode: code, ...data } });
}

async function ownerRole() {
  let role = await prisma.role.findFirst({ where: { name: 'Organization Owner', organizationId: null } });
  if (!role) {
    role = await prisma.role.create({
      data: { name: 'Organization Owner', description: 'Full organization access.', category: 'Management', organizationId: null, gymScope: 'all' },
    });
  }
  return role;
}

let phoneCounter = 9100000000;
const nextPhone = () => String(++phoneCounter);

async function main() {
  console.log('--- Platform Orgs Demo Seed Started ---');

  const starter = await prisma.subscriptionPlan.findFirst({ where: { internalCode: 'starter' } });
  const growth = await prisma.subscriptionPlan.findFirst({ where: { internalCode: 'growth' } });

  const professional = await ensurePlan('professional', {
    name: 'Professional',
    description: 'For growing multi-branch operators.',
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    price: 149,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    workspaceExperienceDefault: 'PROFESSIONAL',
    versionHistory: { create: [{ version: 1, changeType: 'CREATED', summary: 'Seeded by platform-orgs demo.' }] },
  });

  const enterprise = await ensurePlan('enterprise', {
    name: 'Enterprise',
    description: 'For large chains needing white-label and advanced controls.',
    status: 'ACTIVE',
    visibility: 'PRIVATE',
    price: 999,
    currency: 'USD',
    billingCycle: 'ENTERPRISE',
    workspaceExperienceDefault: 'EXPERT',
    versionHistory: { create: [{ version: 1, changeType: 'CREATED', summary: 'Seeded by platform-orgs demo.' }] },
  });

  // Professional/Enterprise were created above with no resource limits or
  // feature access of their own — every usage bar for an org on these plans
  // would render as "unlimited" by omission, which is misleading rather than
  // a deliberate plan decision. Populate real tiers so health scoring and the
  // Usage tab reflect actual configured limits.
  const PROFESSIONAL_LIMITS = [
    { resourceKey: 'organizations', limitType: 'LIMITED', limitValue: 1 },
    { resourceKey: 'branches', limitType: 'LIMITED', limitValue: 10, warningThresholdValue: 8 },
    { resourceKey: 'members', limitType: 'LIMITED', limitValue: 500, warningThresholdValue: 450 },
    { resourceKey: 'organization_users', limitType: 'LIMITED', limitValue: 15, warningThresholdValue: 12 },
    { resourceKey: 'storage', limitType: 'LIMITED', limitValue: 50, warningThresholdValue: 40 },
    { resourceKey: 'workout_programs', limitType: 'UNLIMITED', limitValue: null },
    { resourceKey: 'diet_plans', limitType: 'UNLIMITED', limitValue: null },
    { resourceKey: 'invoices', limitType: 'UNLIMITED', limitValue: null },
    { resourceKey: 'api_calls', limitType: 'LIMITED', limitValue: 50000, warningThresholdValue: 45000 },
    { resourceKey: 'custom_domains', limitType: 'LIMITED', limitValue: 1 },
    { resourceKey: 'file_upload_size', limitType: 'LIMITED', limitValue: 100 },
    { resourceKey: 'notification_limit', limitType: 'LIMITED', limitValue: 5000 },
    { resourceKey: 'trainers', limitType: 'LIMITED', limitValue: 10 },
    { resourceKey: 'dietitians', limitType: 'LIMITED', limitValue: 5 },
    { resourceKey: 'membership_plans', limitType: 'UNLIMITED', limitValue: null },
    { resourceKey: 'exercises', limitType: 'UNLIMITED', limitValue: null },
    { resourceKey: 'attendance_records', limitType: 'UNLIMITED', limitValue: null },
    { resourceKey: 'expense_records', limitType: 'UNLIMITED', limitValue: null },
  ];
  const allResources = await prisma.resourceDefinition.findMany({ select: { key: true } });
  const allFeatures = await prisma.featureDefinition.findMany({ select: { key: true } });

  const ENTERPRISE_LIMITS = allResources.map((r) => ({ resourceKey: r.key, limitType: r.key === 'organizations' ? 'LIMITED' : 'UNLIMITED', limitValue: r.key === 'organizations' ? 1 : null }));

  const PROFESSIONAL_FEATURES = allFeatures.map((f) => ({
    featureKey: f.key,
    state: ['white_label', 'custom_branding'].includes(f.key) ? 'DISABLED' : f.key === 'ai_features' ? 'BETA' : 'ENABLED',
  }));
  const ENTERPRISE_FEATURES = allFeatures.map((f) => ({ featureKey: f.key, state: f.key === 'ai_features' ? 'BETA' : 'ENABLED' }));

  for (const [plan, limits, features] of [
    [professional, PROFESSIONAL_LIMITS, PROFESSIONAL_FEATURES],
    [enterprise, ENTERPRISE_LIMITS, ENTERPRISE_FEATURES],
  ]) {
    for (const limit of limits) {
      await prisma.planResourceLimit.upsert({
        where: { planId_resourceKey: { planId: plan.id, resourceKey: limit.resourceKey } },
        update: {},
        create: { planId: plan.id, ...limit },
      });
    }
    for (const access of features) {
      await prisma.planFeatureAccess.upsert({
        where: { planId_featureKey: { planId: plan.id, featureKey: access.featureKey } },
        update: {},
        create: { planId: plan.id, ...access },
      });
    }
  }
  console.log(`Populated resource limits + feature access for Professional and Enterprise plans.`);

  const role = await ownerRole();
  const planByKey = { starter, growth, professional, enterprise };

  // [name, country, timezone, businessType, planKey, subStatus, platformStatus,
  //  createdOffsetDays, lastActiveOffsetDays, gyms, members, trialOffset, payment, experienceOverride]
  const ORGS = [
    ['FitZone Studios', 'United States', 'America/New_York', 'Gym', 'professional', 'Active', 'ACTIVE', -210, -1, 3, 340, null, 'paid', null],
    ['Iron Temple Gyms', 'United States', 'America/Los_Angeles', 'Gym', 'enterprise', 'Active', 'ACTIVE', -420, -1, 9, 1850, null, 'paid', 'EXPERT'],
    ['PulseFit Wellness', 'United Kingdom', 'Europe/London', 'Wellness', 'professional', 'Active', 'ACTIVE', -95, -3, 2, 210, null, 'paid', null],
    ['Nordic Strength Co', 'Germany', 'Europe/Berlin', 'Gym', 'growth', 'Trialing', 'ACTIVE', -6, -1, 1, 34, 4, 'none', null],
    ['Sydney Barbell Club', 'Australia', 'Australia/Sydney', 'CrossFit', 'growth', 'Active', 'ACTIVE', -140, -2, 1, 88, null, 'paid', null],
    ['Maple Movement', 'Canada', 'America/Toronto', 'Studio', 'starter', 'Active', 'ACTIVE', -3, -1, 1, 12, null, 'paid', null],
    ['Desert Fitness LLC', 'United Arab Emirates', 'Asia/Dubai', 'Gym', 'professional', 'Past_Due', 'ACTIVE', -260, -14, 2, 190, null, 'failed', null],
    ['Lion City Athletics', 'Singapore', 'Asia/Singapore', 'Athletics', 'enterprise', 'Active', 'ACTIVE', -380, -1, 6, 1120, null, 'paid', null],
    ['Bay Area Boxing', 'United States', 'America/Los_Angeles', 'Boxing', 'growth', 'Canceled', 'ACTIVE', -300, -60, 1, 45, null, 'none', null],
    ['Highland Health Hub', 'United Kingdom', 'Europe/London', 'Wellness', 'professional', 'Active', 'SUSPENDED', -190, -22, 2, 160, null, 'failed', null],
    ['Tokyo Training Lab', 'Japan', 'Asia/Tokyo', 'Studio', 'growth', 'Trialing', 'ACTIVE', -2, 0, 1, 19, 2, 'none', null],
    ['Old School Gym', 'United States', 'America/Chicago', 'Gym', 'starter', 'Active', 'ARCHIVED', -520, -120, 1, 8, null, 'none', null],
    ['Alpine Peak Fitness', 'Germany', 'Europe/Berlin', 'Gym', 'professional', 'Active', 'ACTIVE', -70, -1, 2, 205, null, 'paid', null],
    ['Coastal CrossFit', 'Australia', 'Australia/Brisbane', 'CrossFit', 'growth', 'Active', 'ACTIVE', -45, -8, 1, 76, null, 'paid', null],
  ];

  for (const [name, country, timezone, businessType, planKey, subStatus, platformStatus, createdOff, activeOff, gymCount, memberCount, trialOff, payment, expOverride] of ORGS) {
    const slug = 'demo-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (await prisma.organization.findUnique({ where: { slug } })) {
      console.log(`  skip existing ${slug}`);
      continue;
    }

    const plan = planByKey[planKey];
    const createdAt = d(createdOff);

    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        businessType,
        country,
        timezone,
        currency: 'USD',
        email: `owner@${slug.replace('demo-', '')}.com`,
        phone: nextPhone(),
        platformStatus,
        suspendedAt: platformStatus === 'SUSPENDED' ? d(-10) : null,
        suspendReason: platformStatus === 'SUSPENDED' ? 'Repeated failed payments — flagged by Finance.' : null,
        archivedAt: platformStatus === 'ARCHIVED' ? d(-30) : null,
        lastActiveAt: d(activeOff),
        createdAt,
      },
    });

    // Owner user + membership
    const owner = await prisma.user.create({
      data: {
        fullName: `${name.split(' ')[0]} Owner`,
        phoneNumber: nextPhone(),
        email: `admin+${slug}@gymflow.test`,
        isVerified: true,
      },
    });
    await prisma.organizationUser.create({ data: { userId: owner.id, organizationId: org.id, roleId: role.id, isActive: true } });

    // Branches (gyms)
    const gyms = [];
    for (let i = 0; i < gymCount; i++) {
      gyms.push(await prisma.gym.create({ data: { organizationId: org.id, name: `${name} — Branch ${i + 1}`, capacity: 200 } }));
    }

    // Members (bulk)
    if (memberCount > 0) {
      const homeGymId = gyms[0].id;
      const rows = [];
      for (let i = 0; i < memberCount; i++) {
        rows.push({ organizationId: org.id, homeGymId, firstName: `Member${i + 1}`, lastName: name.split(' ')[0], phoneNumber: nextPhone() });
      }
      await prisma.member.createMany({ data: rows });
    }

    // Subscription
    const sub = await prisma.organizationSubscription.create({
      data: {
        organizationId: org.id,
        planId: plan.id,
        status: subStatus,
        startDate: createdAt,
        endDate: subStatus === 'Canceled' ? d(-15) : d(20),
        trialStartDate: trialOff != null ? createdAt : null,
        trialEndDate: trialOff != null ? d(trialOff) : null,
        workspaceExperienceOverride: expOverride,
      },
    });

    // Invoices / payment health
    if (payment === 'paid') {
      const inv = await prisma.subscriptionInvoice.create({
        data: { subscriptionId: sub.id, amount: plan.price, status: 'Paid', dueDate: d(-5), paidAt: d(-4) },
      });
      await prisma.subscriptionPayment.create({ data: { invoiceId: inv.id, amount: plan.price, status: 'Success', paymentMethod: 'Stripe' } });
    } else if (payment === 'failed') {
      const inv = await prisma.subscriptionInvoice.create({
        data: { subscriptionId: sub.id, amount: plan.price, status: 'Unpaid', dueDate: d(-8) },
      });
      await prisma.subscriptionPayment.create({ data: { invoiceId: inv.id, amount: plan.price, status: 'Failed', paymentMethod: 'Stripe' } });
    }

    console.log(`  created ${name} (${platformStatus}/${subStatus}, ${memberCount} members)`);
  }

  console.log('--- Platform Orgs Demo Seed Complete ---');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
