const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Catalog of resources plans can put limits on (PLT-002 "Plan Resources").
// Adding a new resource later only means inserting a row here - plans that
// reference it are configured entirely through the admin UI, never in code.
const RESOURCES = [
  { key: 'organizations', label: 'Organizations', unit: null, category: 'Core' },
  { key: 'branches', label: 'Branches', unit: null, category: 'Core' },
  { key: 'members', label: 'Members', unit: null, category: 'Core' },
  { key: 'organization_users', label: 'Organization Users', unit: null, category: 'Core' },
  { key: 'storage', label: 'Storage', unit: 'GB', category: 'Platform' },
  { key: 'workout_programs', label: 'Workout Programs', unit: null, category: 'Training' },
  { key: 'diet_plans', label: 'Diet Plans', unit: null, category: 'Training' },
  { key: 'invoices', label: 'Invoices', unit: 'per month', category: 'Billing' },
  { key: 'api_calls', label: 'API Calls', unit: 'per month', category: 'Platform' },
  { key: 'custom_domains', label: 'Custom Domains', unit: null, category: 'Branding' },
  { key: 'file_upload_size', label: 'File Upload Size', unit: 'MB', category: 'Platform' },
  { key: 'notification_limit', label: 'Notification Limit', unit: 'per month', category: 'Platform' },
  { key: 'trainers', label: 'Trainers', unit: null, category: 'Training' },
  { key: 'dietitians', label: 'Dietitians', unit: null, category: 'Training' },
  { key: 'membership_plans', label: 'Membership Plans', unit: null, category: 'Core' },
  { key: 'exercises', label: 'Exercises', unit: null, category: 'Training' },
  { key: 'attendance_records', label: 'Attendance Records', unit: 'per month', category: 'Operations' },
  { key: 'expense_records', label: 'Expense Records', unit: 'per month', category: 'Billing' },
];

// Catalog of features plans can gate (PLT-002 "Feature Access").
const FEATURES = [
  { key: 'dashboard', label: 'Dashboard', category: 'Core' },
  { key: 'members', label: 'Members', category: 'Core' },
  { key: 'memberships', label: 'Memberships', category: 'Core' },
  { key: 'training_studio', label: 'Training Studio', category: 'Training' },
  { key: 'exercise_library', label: 'Exercise Library', category: 'Training' },
  { key: 'workout_builder', label: 'Workout Builder', category: 'Training' },
  { key: 'workout_programs', label: 'Workout Programs', category: 'Training' },
  { key: 'nutrition', label: 'Nutrition', category: 'Training' },
  { key: 'attendance', label: 'Attendance', category: 'Operations' },
  { key: 'access_control', label: 'Access Control', category: 'Operations' },
  { key: 'qr_attendance', label: 'QR Attendance', category: 'Operations' },
  { key: 'biometric_devices', label: 'Biometric Integration', category: 'Operations' },
  { key: 'billing', label: 'Billing', category: 'Commercial' },
  { key: 'invoices', label: 'Invoices', category: 'Commercial' },
  { key: 'payments', label: 'Payments', category: 'Commercial' },
  { key: 'expenses', label: 'Expenses', category: 'Commercial' },
  { key: 'reports', label: 'Reports', category: 'Insights' },
  { key: 'advanced_reports', label: 'Advanced Reports', category: 'Insights' },
  { key: 'analytics', label: 'Analytics', category: 'Insights' },
  { key: 'notifications', label: 'Notifications', category: 'Growth' },
  { key: 'automation', label: 'Automation', category: 'Growth' },
  { key: 'marketplace', label: 'Marketplace', category: 'Growth' },
  { key: 'public_api', label: 'Public API', category: 'Platform' },
  { key: 'mobile_app', label: 'Mobile App', category: 'Platform' },
  { key: 'custom_branding', label: 'Custom Branding', category: 'Branding' },
  { key: 'white_label', label: 'White Label', category: 'Branding' },
  { key: 'webhooks', label: 'Webhooks', category: 'Platform' },
  { key: 'ai_features', label: 'AI Features', category: 'Growth' },
];

async function main() {
  console.log('--- Plan Catalog Seed Started ---');

  for (const resource of RESOURCES) {
    await prisma.resourceDefinition.upsert({
      where: { key: resource.key },
      update: { label: resource.label, unit: resource.unit, category: resource.category },
      create: resource,
    });
  }
  console.log(`Seeded ${RESOURCES.length} resource definitions.`);

  for (const feature of FEATURES) {
    await prisma.featureDefinition.upsert({
      where: { key: feature.key },
      update: { label: feature.label, category: feature.category },
      create: feature,
    });
  }
  console.log(`Seeded ${FEATURES.length} feature definitions.`);

  let starter = await prisma.subscriptionPlan.findFirst({ where: { internalCode: 'starter' } });
  if (!starter) {
    starter = await prisma.subscriptionPlan.create({
      data: {
        name: 'Starter',
        internalCode: 'starter',
        description: 'Default free plan automatically assigned to new organizations.',
        status: 'ACTIVE',
        visibility: 'PUBLIC',
        price: 0,
        currency: 'USD',
        billingCycle: 'FREE',
        isDefault: true,
        resourceLimits: {
          create: [
            { resourceKey: 'organizations', limitType: 'LIMITED', limitValue: 1 },
            { resourceKey: 'branches', limitType: 'LIMITED', limitValue: 3, warningThresholdValue: 2 },
            { resourceKey: 'members', limitType: 'LIMITED', limitValue: 20, warningThresholdValue: 18, autoUpgradeRecommend: true, displayUpgradeBanner: true },
            { resourceKey: 'organization_users', limitType: 'LIMITED', limitValue: 5, warningThresholdValue: 4 },
            { resourceKey: 'storage', limitType: 'LIMITED', limitValue: 1, warningThresholdValue: 1 },
            { resourceKey: 'workout_programs', limitType: 'LIMITED', limitValue: 5, warningThresholdValue: 4 },
            { resourceKey: 'diet_plans', limitType: 'DISABLED', limitValue: null },
            { resourceKey: 'invoices', limitType: 'LIMITED', limitValue: 20, warningThresholdValue: 18 },
            { resourceKey: 'api_calls', limitType: 'DISABLED', limitValue: null },
            { resourceKey: 'custom_domains', limitType: 'DISABLED', limitValue: null },
            { resourceKey: 'file_upload_size', limitType: 'LIMITED', limitValue: 10 },
            { resourceKey: 'notification_limit', limitType: 'LIMITED', limitValue: 100 },
            { resourceKey: 'trainers', limitType: 'LIMITED', limitValue: 2, warningThresholdValue: 2 },
            { resourceKey: 'dietitians', limitType: 'DISABLED', limitValue: null },
            { resourceKey: 'membership_plans', limitType: 'LIMITED', limitValue: 5, warningThresholdValue: 4 },
            { resourceKey: 'exercises', limitType: 'LIMITED', limitValue: 100, warningThresholdValue: 90 },
            { resourceKey: 'attendance_records', limitType: 'UNLIMITED', limitValue: null },
            { resourceKey: 'expense_records', limitType: 'DISABLED', limitValue: null },
          ],
        },
        featureAccess: {
          create: [
            { featureKey: 'dashboard', state: 'ENABLED' },
            { featureKey: 'members', state: 'ENABLED' },
            { featureKey: 'memberships', state: 'ENABLED' },
            { featureKey: 'training_studio', state: 'ENABLED' },
            { featureKey: 'exercise_library', state: 'ENABLED' },
            { featureKey: 'workout_builder', state: 'ENABLED' },
            { featureKey: 'workout_programs', state: 'ENABLED' },
            { featureKey: 'nutrition', state: 'DISABLED' },
            { featureKey: 'attendance', state: 'ENABLED' },
            { featureKey: 'access_control', state: 'DISABLED' },
            { featureKey: 'qr_attendance', state: 'DISABLED' },
            { featureKey: 'biometric_devices', state: 'DISABLED' },
            { featureKey: 'billing', state: 'ENABLED' },
            { featureKey: 'invoices', state: 'ENABLED' },
            { featureKey: 'payments', state: 'ENABLED' },
            { featureKey: 'expenses', state: 'DISABLED' },
            { featureKey: 'reports', state: 'ENABLED' },
            { featureKey: 'advanced_reports', state: 'DISABLED' },
            { featureKey: 'analytics', state: 'DISABLED' },
            { featureKey: 'notifications', state: 'ENABLED' },
            { featureKey: 'automation', state: 'DISABLED' },
            { featureKey: 'marketplace', state: 'DISABLED' },
            { featureKey: 'public_api', state: 'DISABLED' },
            { featureKey: 'mobile_app', state: 'ENABLED' },
            { featureKey: 'custom_branding', state: 'DISABLED' },
            { featureKey: 'white_label', state: 'DISABLED' },
            { featureKey: 'webhooks', state: 'DISABLED' },
            { featureKey: 'ai_features', state: 'BETA' },
          ],
        },
        versionHistory: {
          create: [{ version: 1, changeType: 'CREATED', summary: 'Plan created by seed script.' }],
        },
      },
    });
    console.log(`Created default plan "${starter.name}" (${starter.id}).`);
  } else {
    console.log(`Default plan "${starter.name}" already exists (${starter.id}).`);
  }

  // Feature dependency graph (Engine "Feature Dependencies"): Workout Programs
  // only makes sense once Training Studio + Exercise Library are available.
  const DEPENDENCIES = [
    { featureKey: 'workout_programs', requiresFeatureKey: 'training_studio' },
    { featureKey: 'workout_programs', requiresFeatureKey: 'exercise_library' },
    { featureKey: 'workout_builder', requiresFeatureKey: 'exercise_library' },
    { featureKey: 'qr_attendance', requiresFeatureKey: 'attendance' },
    { featureKey: 'biometric_devices', requiresFeatureKey: 'attendance' },
    { featureKey: 'advanced_reports', requiresFeatureKey: 'reports' },
    { featureKey: 'white_label', requiresFeatureKey: 'custom_branding' },
  ];
  for (const dep of DEPENDENCIES) {
    await prisma.featureDependency.upsert({
      where: { featureKey_requiresFeatureKey: dep },
      update: {},
      create: dep,
    });
  }
  console.log(`Seeded ${DEPENDENCIES.length} feature dependencies.`);

  // Backfill every other existing plan so newly-added resources/features
  // always have an explicit row (Engine principle: nothing is implicitly on
  // or off - every plan/resource/feature combination is a configured rule).
  const allPlans = await prisma.subscriptionPlan.findMany({ select: { id: true } });
  for (const plan of allPlans) {
    const existingLimits = await prisma.planResourceLimit.findMany({ where: { planId: plan.id }, select: { resourceKey: true } });
    const existingLimitKeys = new Set(existingLimits.map((r) => r.resourceKey));
    const missingResources = RESOURCES.filter((r) => !existingLimitKeys.has(r.key));
    if (missingResources.length) {
      await prisma.planResourceLimit.createMany({
        data: missingResources.map((r) => ({ planId: plan.id, resourceKey: r.key, limitType: 'DISABLED', limitValue: null })),
        skipDuplicates: true,
      });
    }

    const existingAccess = await prisma.planFeatureAccess.findMany({ where: { planId: plan.id }, select: { featureKey: true } });
    const existingFeatureKeys = new Set(existingAccess.map((f) => f.featureKey));
    const missingFeatures = FEATURES.filter((f) => !existingFeatureKeys.has(f.key));
    if (missingFeatures.length) {
      await prisma.planFeatureAccess.createMany({
        data: missingFeatures.map((f) => ({ planId: plan.id, featureKey: f.key, state: 'DISABLED' })),
        skipDuplicates: true,
      });
    }
  }
  console.log(`Backfilled catalog rows across ${allPlans.length} plan(s).`);

  console.log('--- Plan Catalog Seed Complete ---');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
