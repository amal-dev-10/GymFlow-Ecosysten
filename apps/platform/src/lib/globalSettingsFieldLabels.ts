// Mirrors DEFAULTS' keys in apps/api/src/modules/platform-global-settings/platform-global-settings.service.ts
// with human-readable labels, used only by the settings search box to find
// which category/tab a field lives in - not the source of truth for values.
export const FIELD_LABELS: Record<string, Record<string, string>> = {
  general: {
    platformName: 'Platform Name',
    platformLogoUrl: 'Platform Logo',
    supportEmail: 'Support Email',
    supportPhone: 'Support Phone',
    website: 'Website',
    timezone: 'Timezone',
    dateFormat: 'Date Format',
    timeFormat: 'Time Format',
  },
  branding: {
    logoUrl: 'Logo',
    faviconUrl: 'Favicon',
    primaryColor: 'Primary Color',
    accentColor: 'Accent Color',
    emailBrandingEnabled: 'Email Branding',
    emailFooterText: 'Email Footer Text',
  },
  localization: {
    defaultLanguage: 'Default Language',
    supportedLanguages: 'Supported Languages',
    defaultCountry: 'Default Country',
    supportedCountries: 'Supported Countries',
    currency: 'Currency',
  },
  authentication: {
    sessionTimeoutMinutes: 'Session Timeout',
    passwordMinLength: 'Password Minimum Length',
    passwordRequireSymbol: 'Password Requires Symbol',
    passwordRequireNumber: 'Password Requires Number',
    passwordRequireUppercase: 'Password Requires Uppercase',
    mfaRequired: 'MFA Requirement',
    loginAttemptThreshold: 'Login Attempts',
    accountLockDurationMinutes: 'Account Lock Duration',
  },
  security: {
    ipWhitelist: 'IP Whitelist',
    corsOrigins: 'CORS Origins',
    apiRateLimitPerMinute: 'API Rate Limit',
    securityHeadersEnabled: 'Security Headers',
  },
  notifications: {
    emailProvider: 'Email Provider',
    smsProvider: 'SMS Provider',
    pushEnabled: 'Push Notifications',
    whatsappEnabled: 'WhatsApp (Future)',
  },
  storage: {
    defaultStorageLimitMb: 'Default Storage Limit',
    maxUploadSizeMb: 'Max Upload Size',
    allowedFileTypes: 'Allowed File Types',
  },
  email: {
    provider: 'Email Provider',
    fromName: 'From Name',
    fromAddress: 'From Address',
    replyToAddress: 'Reply-To Address',
  },
  mobile_apps: {
    androidLatestVersion: 'Android Latest Version',
    iosLatestVersion: 'iOS Latest Version',
    minimumSupportedVersion: 'Minimum Supported Version',
    forceUpdate: 'Force Update',
    maintenanceMode: 'Maintenance Mode',
    maintenanceMessage: 'Maintenance Message',
    playStoreUrl: 'Play Store URL',
    appStoreUrl: 'App Store URL',
    releaseNotes: 'Release Notes',
  },
  system: {
    cacheLastClearedAt: 'Cache',
    featureToggleDefaults: 'Feature Toggle Defaults',
  },
};
