// Demo data for PLT-015 Global Settings. Seeds a realistic subset of
// PlatformSetting overrides (deliberately different from the hardcoded
// DEFAULTS in platform-global-settings.service.ts) across all 10 categories,
// plus a short PlatformSettingVersion history so the Dashboard and Version
// History tabs have real content on first load. Idempotent: settings are
// upserted on their (category, key) unique constraint; version history is
// only seeded once (checked via existing row count).

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const d = (offsetDays) => new Date(now + offsetDays * DAY);

const SEED_ACTOR = 'System Seed';

const SETTINGS = {
  general: {
    platformName: 'GymFlow',
    supportEmail: 'support@gymflow.io',
    supportPhone: '+1 (415) 555-0134',
    website: 'https://gymflow.io',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
  branding: {
    primaryColor: '#6366f1',
    accentColor: '#8b5cf6',
    emailBrandingEnabled: true,
    emailFooterText: 'GymFlow - Run Your Gym Better',
  },
  localization: {
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'es', 'fr'],
    defaultCountry: 'US',
    supportedCountries: ['US', 'IN', 'GB', 'CA', 'AU'],
    currency: 'USD',
  },
  authentication: {
    sessionTimeoutMinutes: 45,
    passwordMinLength: 10,
    loginAttemptThreshold: 5,
    accountLockDurationMinutes: 30,
  },
  security: {
    apiRateLimitPerMinute: 180,
    securityHeadersEnabled: true,
  },
  notifications: {
    emailProvider: 'sendgrid',
    smsProvider: 'twilio',
    pushEnabled: true,
  },
  storage: {
    defaultStorageLimitMb: 10240,
    maxUploadSizeMb: 25,
    allowedFileTypes: ['image/png', 'image/jpeg', 'application/pdf', 'video/mp4'],
  },
  email: {
    provider: 'sendgrid',
    fromName: 'GymFlow',
    fromAddress: 'no-reply@gymflow.io',
    replyToAddress: 'support@gymflow.io',
  },
  mobile_apps: {
    androidLatestVersion: '4.2.0',
    iosLatestVersion: '4.2.1',
    minimumSupportedVersion: '3.8.0',
    forceUpdate: false,
    maintenanceMode: false,
    maintenanceMessage: '',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=io.gymflow.app',
    appStoreUrl: 'https://apps.apple.com/app/gymflow/id0000000000',
    releaseNotes: 'v4.2.0: Faster check-ins, redesigned class calendar, and bug fixes.',
  },
  system: {
    featureToggleDefaults: { newBillingUI: true, betaWorkoutBuilder: false },
  },
};

async function seedSettings() {
  let created = 0;
  for (const [category, fields] of Object.entries(SETTINGS)) {
    for (const [key, value] of Object.entries(fields)) {
      await prisma.platformSetting.upsert({
        where: { category_key: { category, key } },
        update: {},
        create: { category, key, value, updatedByName: SEED_ACTOR },
      });
      created++;
    }
  }
  console.log(`Seeded ${created} settings across ${Object.keys(SETTINGS).length} categories.`);
}

async function seedVersionHistory() {
  const existing = await prisma.platformSettingVersion.count();
  if (existing > 0) {
    console.log('Version history already seeded, skipping.');
    return;
  }

  const history = [
    {
      category: 'general',
      changeNote: 'Initial platform setup',
      changedByName: 'Priya Sharma',
      createdAt: d(-60),
      snapshot: { ...SETTINGS.general, supportPhone: '', timeFormat: '24h' },
    },
    {
      category: 'general',
      changeNote: 'Switched support contact to US number, 12h clock',
      changedByName: 'Priya Sharma',
      createdAt: d(-14),
      snapshot: SETTINGS.general,
    },
    {
      category: 'authentication',
      changeNote: 'Tightened lockout policy after a credential-stuffing attempt',
      changedByName: 'Marcus Webb',
      createdAt: d(-7),
      snapshot: SETTINGS.authentication,
    },
    {
      category: 'mobile_apps',
      changeNote: 'Published v4.2.0',
      changedByName: 'Dev Team',
      createdAt: d(-2),
      snapshot: SETTINGS.mobile_apps,
    },
  ];

  for (const h of history) {
    await prisma.platformSettingVersion.create({ data: h });
  }
  console.log(`Seeded ${history.length} settings version history entries.`);
}

async function main() {
  console.log('--- PLT-015 Global Settings Seed Started ---');
  await seedSettings();
  await seedVersionHistory();
  console.log('--- PLT-015 Global Settings Seed Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
