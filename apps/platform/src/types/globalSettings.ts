export type SettingsCategory =
  | 'general'
  | 'branding'
  | 'localization'
  | 'authentication'
  | 'security'
  | 'notifications'
  | 'storage'
  | 'email'
  | 'mobile_apps'
  | 'system'
  | 'automation';

export type CategoryValues = Record<string, any>;
export type AllSettingsDTO = Record<SettingsCategory, CategoryValues>;

export interface SettingsDashboardDTO {
  totalFields: number;
  totalCustomized: number;
  customizedByCategory: Record<string, number>;
  lastUpdatedAt: string | null;
  lastUpdatedBy: string | null;
  lastUpdatedCategory: string | null;
  recentChanges: {
    id: string;
    category: string;
    categoryLabel: string;
    changeNote: string | null;
    changedByName: string | null;
    createdAt: string;
  }[];
}

export interface SettingsVersionDTO {
  id: string;
  category: string;
  snapshot: CategoryValues;
  changeNote: string | null;
  changedByUserId: string | null;
  changedByName: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ImportResultDTO {
  results: { category: string; applied: boolean; reason?: string }[];
}

export interface BrandingUploadResponse {
  url: string;
  originalName: string;
  size: number;
}

export interface MobileVersionCheckDTO {
  androidLatestVersion: string;
  iosLatestVersion: string;
  minimumSupportedVersion: string;
  forceUpdate: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  playStoreUrl: string;
  appStoreUrl: string;
  releaseNotes: string;
}

export const CATEGORY_LABELS: Record<SettingsCategory, string> = {
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
