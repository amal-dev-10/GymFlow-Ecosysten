import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PlatformAuthorizationService } from '../platform-roles/platform-authorization.service';

// Every field a Global Settings category can hold, with its hardcoded
// fallback value. A PlatformSetting row only exists once a value has been
// saved away from this default (see getCategory/getAllSettings) - this is
// what makes "Reset to Defaults" a clean deleteMany rather than a rewrite,
// and what lets every read resolve fully even before the first save.
export const DEFAULTS: Record<string, Record<string, any>> = {
  general: {
    platformName: 'GymFlow',
    platformLogoUrl: null,
    supportEmail: 'support@gymflow.io',
    supportPhone: '',
    website: 'https://gymflow.io',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
  },
  branding: {
    logoUrl: null,
    faviconUrl: null,
    primaryColor: '#6366f1',
    accentColor: '#8b5cf6',
    emailBrandingEnabled: true,
    emailFooterText: 'GymFlow Platform',
  },
  localization: {
    defaultLanguage: 'en',
    supportedLanguages: ['en'],
    defaultCountry: 'US',
    supportedCountries: ['US'],
    currency: 'USD',
  },
  authentication: {
    sessionTimeoutMinutes: 60,
    passwordMinLength: 8,
    passwordRequireSymbol: true,
    passwordRequireNumber: true,
    passwordRequireUppercase: true,
    mfaRequired: false,
    loginAttemptThreshold: 5,
    accountLockDurationMinutes: 30,
  },
  security: {
    ipWhitelist: [] as string[],
    corsOrigins: [] as string[],
    apiRateLimitPerMinute: 120,
    securityHeadersEnabled: true,
  },
  notifications: {
    emailProvider: 'none',
    smsProvider: 'none',
    pushEnabled: false,
    whatsappEnabled: false,
    // Added for PLT-014 Notifications Center - extends this existing
    // category rather than a parallel settings store, so "where do
    // notification provider/policy settings live" stays a single answer.
    retryMaxAttempts: 3,
    retryDelaySeconds: 60,
    rateLimitPerMinute: 100,
    rateLimitPerHour: 1000,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  },
  storage: {
    defaultStorageLimitMb: 5120,
    maxUploadSizeMb: 25,
    allowedFileTypes: ['image/png', 'image/jpeg', 'application/pdf'] as string[],
  },
  email: {
    provider: 'none',
    fromName: 'GymFlow',
    fromAddress: 'no-reply@gymflow.io',
    replyToAddress: '',
  },
  mobile_apps: {
    androidLatestVersion: '1.0.0',
    iosLatestVersion: '1.0.0',
    minimumSupportedVersion: '1.0.0',
    forceUpdate: false,
    maintenanceMode: false,
    maintenanceMessage: '',
    playStoreUrl: '',
    appStoreUrl: '',
    releaseNotes: '',
    // --- Public landing-page "Get the app" section (marketing site) ---
    landingEnabled: true,
    landingHeadline: 'Run your gym from your pocket',
    landingSubtitle: 'Check in members, collect payments, and track your gym in real time with the GymFlow Staff app.',
    // One feature per line; the public endpoint splits these into a list.
    landingFeatures: 'Scan member QR codes for instant check-in\nCollect dues and log payments on the go\nTrack attendance, revenue and renewals live',
  },
  system: {
    cacheLastClearedAt: null,
    featureToggleDefaults: {} as Record<string, boolean>,
  },
  // Added for PLT-018 Automation & Background Jobs - a new category (not
  // touching any existing one), same single-settings-store reasoning as
  // PLT-014 extending the 'notifications' category in place.
  automation: {
    retryMaxAttempts: 3,
    timeoutSeconds: 300,
    concurrencyLimit: 5,
    queueLimitPerQueue: 1000,
  },
};

export const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  branding: 'Branding',
  localization: 'Localization',
  authentication: 'Authentication',
  security: 'Security',
  notifications: 'Notifications',
  storage: 'Storage',
  email: 'Email',
  mobile_apps: 'Mobile Apps',
  system: 'System',
  automation: 'Automation',
};

@Injectable()
export class PlatformGlobalSettingsService {
  constructor(
    private prisma: DatabaseService,
    private auditLogs: AuditLogsService,
    private authz: PlatformAuthorizationService,
  ) {}

  private assertCategory(category: string) {
    if (!DEFAULTS[category]) {
      throw new BadRequestException(`Unknown settings category "${category}".`);
    }
  }

  private categoryLabel(category: string) {
    return CATEGORY_LABELS[category] || category;
  }

  // 'system' requires the narrower 'global_settings.manage_system' key
  // (granted to Developer) instead of the general 'global_settings.configure'
  // (granted to Operations/Super Admin) - checked here rather than via a
  // route-level decorator so there's a single PUT :category route with no
  // static-vs-dynamic path ambiguity.
  async assertCanEdit(category: string, userId: string) {
    const requiredKey = category === 'system' ? 'global_settings.manage_system' : 'global_settings.configure';
    const platformAdmin = await this.prisma.platformAdminUser.findUnique({ where: { userId } });
    if (!platformAdmin) throw new ForbiddenException('User does not have Platform Administration access.');
    const allowed = await this.authz.hasPermission(platformAdmin.id, requiredKey);
    if (!allowed) throw new ForbiddenException(`This action requires the "${requiredKey}" permission.`);
  }

  async getAllSettings() {
    const rows = await this.prisma.platformSetting.findMany();
    const result: Record<string, Record<string, any>> = {};
    for (const category of Object.keys(DEFAULTS)) {
      result[category] = { ...DEFAULTS[category] };
    }
    for (const row of rows) {
      if (!result[row.category]) continue;
      result[row.category][row.key] = row.value;
    }
    return result;
  }

  async getCategory(category: string) {
    this.assertCategory(category);
    const rows = await this.prisma.platformSetting.findMany({ where: { category } });
    const values = { ...DEFAULTS[category] };
    for (const row of rows) values[row.key] = row.value as any;
    return values;
  }

  async updateCategory(category: string, values: Record<string, any>, userId: string, userName: string, changeNote?: string) {
    this.assertCategory(category);
    await this.assertCanEdit(category, userId);
    const knownKeys = Object.keys(DEFAULTS[category]);
    const entries = Object.entries(values || {}).filter(([key]) => knownKeys.includes(key));
    if (entries.length === 0) {
      throw new BadRequestException('No recognized settings keys provided for this category.');
    }

    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.platformSetting.upsert({
          where: { category_key: { category, key } },
          update: { value: value as any, updatedByUserId: userId || null, updatedByName: userName },
          create: { category, key, value: value as any, updatedByUserId: userId || null, updatedByName: userName },
        }),
      ),
    );

    const resulting = await this.getCategory(category);
    await this.prisma.platformSettingVersion.create({
      data: {
        category,
        snapshot: resulting as any,
        changeNote: changeNote || null,
        changedByUserId: userId || null,
        changedByName: userName,
      },
    });
    await this.auditLogs.logEvent({
      userId,
      action: `Updated ${this.categoryLabel(category)} Settings`,
      user: userName,
      details: `Changed ${entries.length} setting(s) in ${this.categoryLabel(category)}${changeNote ? ` - ${changeNote}` : ''}.`,
      eventType: 'GLOBAL_SETTINGS_UPDATED',
      eventCategory: 'Configuration',
      entityType: 'PlatformSetting',
      entityId: category,
      metadata: { category, changedKeys: entries.map(([k]) => k) },
    });
    return resulting;
  }

  async restoreDefaults(category: string, userId: string, userName: string) {
    this.assertCategory(category);
    await this.assertCanEdit(category, userId);
    await this.prisma.platformSetting.deleteMany({ where: { category } });
    const resulting = { ...DEFAULTS[category] };
    await this.prisma.platformSettingVersion.create({
      data: {
        category,
        snapshot: resulting as any,
        changeNote: 'Restored to defaults',
        changedByUserId: userId || null,
        changedByName: userName,
      },
    });
    await this.auditLogs.logEvent({
      userId,
      action: `Reset ${this.categoryLabel(category)} Settings to Defaults`,
      user: userName,
      details: `${this.categoryLabel(category)} settings were reset to platform defaults.`,
      eventType: 'GLOBAL_SETTINGS_RESET',
      eventCategory: 'Configuration',
      entityType: 'PlatformSetting',
      entityId: category,
    });
    return resulting;
  }

  async restoreVersion(versionId: string, userId: string, userName: string) {
    const version = await this.prisma.platformSettingVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new NotFoundException('Settings version not found.');
    return this.updateCategory(
      version.category,
      version.snapshot as any,
      userId,
      userName,
      `Restored from version saved ${version.createdAt.toISOString()}`,
    );
  }

  async getVersionHistory(category?: string, page = 1, limit = 25) {
    const where = category ? { category } : {};
    const [data, total] = await Promise.all([
      this.prisma.platformSettingVersion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.platformSettingVersion.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async exportAll() {
    return this.getAllSettings();
  }

  async canManageSystem(userId: string): Promise<boolean> {
    const platformAdmin = await this.prisma.platformAdminUser.findUnique({ where: { userId } });
    if (!platformAdmin) return false;
    return this.authz.hasPermission(platformAdmin.id, 'global_settings.manage_system');
  }

  async importAll(payload: Record<string, Record<string, any>>, userId: string, userName: string) {
    const canSystem = await this.canManageSystem(userId);
    const results: { category: string; applied: boolean; reason?: string }[] = [];
    for (const category of Object.keys(payload || {})) {
      if (!DEFAULTS[category]) {
        results.push({ category, applied: false, reason: 'Unknown category' });
        continue;
      }
      if (category === 'system' && !canSystem) {
        results.push({ category, applied: false, reason: 'Missing global_settings.manage_system permission' });
        continue;
      }
      await this.updateCategory(category, payload[category], userId, userName, 'Imported from file');
      results.push({ category, applied: true });
    }
    await this.auditLogs.logEvent({
      userId,
      action: 'Imported Global Settings',
      user: userName,
      details: `Imported settings for ${results.filter((r) => r.applied).length} of ${results.length} categorie(s).`,
      eventType: 'GLOBAL_SETTINGS_IMPORTED',
      eventCategory: 'Configuration',
      entityType: 'PlatformSetting',
      metadata: { results },
    });
    return { results };
  }

  async getDashboardSummary() {
    const rows = await this.prisma.platformSetting.findMany();
    const customizedByCategory: Record<string, number> = {};
    for (const row of rows) {
      customizedByCategory[row.category] = (customizedByCategory[row.category] || 0) + 1;
    }
    const totalFields = Object.values(DEFAULTS).reduce((sum, cat) => sum + Object.keys(cat).length, 0);
    const lastChange = await this.prisma.platformSettingVersion.findFirst({ orderBy: { createdAt: 'desc' } });
    const recentChanges = await this.prisma.platformSettingVersion.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    return {
      totalFields,
      totalCustomized: rows.length,
      customizedByCategory,
      lastUpdatedAt: lastChange?.createdAt || null,
      lastUpdatedBy: lastChange?.changedByName || null,
      lastUpdatedCategory: lastChange?.category || null,
      recentChanges: recentChanges.map((v) => ({
        id: v.id,
        category: v.category,
        categoryLabel: this.categoryLabel(v.category),
        changeNote: v.changeNote,
        changedByName: v.changedByName,
        createdAt: v.createdAt,
      })),
    };
  }

  // Public shape - no auth guard on the controller route calling this, so
  // only Mobile Apps fields belong here, never anything sensitive.
  async getMobileVersionCheck() {
    return this.getCategory('mobile_apps');
  }

  // Public shape for the marketing landing page's "Get the app" section.
  // Projects only the download/marketing subset of Mobile Apps - never the
  // force-update/maintenance flags or version internals.
  async getPublicMobileApp() {
    const m = await this.getCategory('mobile_apps');
    const features = String(m.landingFeatures || '')
      .split('\n')
      .map((s: string) => s.trim())
      .filter(Boolean);
    return {
      enabled: m.landingEnabled !== false,
      headline: m.landingHeadline || '',
      subtitle: m.landingSubtitle || '',
      features,
      playStoreUrl: m.playStoreUrl || '',
      appStoreUrl: m.appStoreUrl || '',
    };
  }

  // Public shape - no auth guard on the controller route calling this. Only
  // the identity/contact subset of General + Branding belongs here (logo,
  // name, support contact, brand colors) - never security/notification/email
  // provider settings from those or any other category.
  async getPublicBrand() {
    const [general, branding] = await Promise.all([this.getCategory('general'), this.getCategory('branding')]);
    return {
      platformName: general.platformName,
      logoUrl: branding.logoUrl || general.platformLogoUrl || null,
      faviconUrl: branding.faviconUrl || null,
      supportEmail: general.supportEmail || null,
      supportPhone: general.supportPhone || null,
      website: general.website || null,
      primaryColor: branding.primaryColor,
      accentColor: branding.accentColor,
    };
  }

  // Called from AuthService's lockout logic instead of the values it used
  // to hardcode (5 attempts / 30 minutes) - the only settings category this
  // module wires into a live enforcement path in this pass.
  async getLoginPolicy(): Promise<{ loginAttemptThreshold: number; accountLockDurationMinutes: number }> {
    const values = await this.getCategory('authentication');
    const threshold = Number(values.loginAttemptThreshold);
    const duration = Number(values.accountLockDurationMinutes);
    return {
      loginAttemptThreshold: Number.isFinite(threshold) && threshold > 0 ? threshold : DEFAULTS.authentication.loginAttemptThreshold,
      accountLockDurationMinutes: Number.isFinite(duration) && duration > 0 ? duration : DEFAULTS.authentication.accountLockDurationMinutes,
    };
  }
}
