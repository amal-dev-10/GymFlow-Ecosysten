import { apiClient } from './client';
import type {
  AllSettingsDTO,
  CategoryValues,
  SettingsCategory,
  SettingsDashboardDTO,
  SettingsVersionDTO,
  PaginatedResponse,
  ImportResultDTO,
  BrandingUploadResponse,
  MobileVersionCheckDTO,
} from '@/types/globalSettings';

const BASE = '/v1/platform/settings';

export const platformGlobalSettingsApi = {
  getDashboard: async (): Promise<SettingsDashboardDTO> => (await apiClient.get(`${BASE}/dashboard`)).data,
  getAll: async (): Promise<AllSettingsDTO> => (await apiClient.get(BASE)).data,
  getCategory: async (category: SettingsCategory): Promise<CategoryValues> => (await apiClient.get(`${BASE}/${category}`)).data,
  updateCategory: async (category: SettingsCategory, values: CategoryValues, changeNote?: string): Promise<CategoryValues> =>
    (await apiClient.put(`${BASE}/${category}`, { values, changeNote })).data,
  restoreDefaults: async (category: SettingsCategory): Promise<CategoryValues> => (await apiClient.post(`${BASE}/${category}/restore-defaults`)).data,

  exportAll: async (): Promise<AllSettingsDTO> => (await apiClient.get(`${BASE}/export`)).data,
  importAll: async (settings: Record<string, CategoryValues>): Promise<ImportResultDTO> => (await apiClient.post(`${BASE}/import`, { settings })).data,

  getVersionHistory: async (category?: string, page = 1, limit = 25): Promise<PaginatedResponse<SettingsVersionDTO>> =>
    (await apiClient.get(`${BASE}/versions`, { params: { category: category || undefined, page, limit } })).data,
  restoreVersion: async (versionId: string): Promise<CategoryValues> => (await apiClient.post(`${BASE}/versions/${versionId}/restore`)).data,

  uploadBrandingAsset: async (file: File): Promise<BrandingUploadResponse> => {
    const form = new FormData();
    form.append('file', file);
    return (await apiClient.post(`${BASE}/branding/upload`, form)).data;
  },

  // Public endpoint lives under a disjoint path prefix (settings-public, not
  // settings) so it never collides with the authenticated GET /:category
  // route - see platform-global-settings.controller.ts's doc comment.
  getMobileVersionCheck: async (): Promise<MobileVersionCheckDTO> => (await apiClient.get(`${BASE}-public/mobile-version-check`)).data,
};
