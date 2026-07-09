import { apiClient } from './client';
import type {
  AuditListFilters,
  AuditListResponse,
  AuditEventDetailDTO,
  AuditEventRowDTO,
  AuditDashboardDTO,
  AuditCategoryDTO,
  SecurityEventsResponse,
  ApiActivityResponse,
  AuditSavedSearchDTO,
  AuditRetentionSettingDTO,
  RetentionPreviewDTO,
  AuditAlertRuleDTO,
  AlertPreviewDTO,
  AuditExportJobDTO,
} from '@/types/audit';

const BASE = '/v1/platform/audit';

function cleanParams<T extends object>(filters: T) {
  const params: Record<string, unknown> = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) params[k] = v;
  });
  return params;
}

export const platformAuditApi = {
  getDashboard: async (): Promise<AuditDashboardDTO> => (await apiClient.get(`${BASE}/dashboard`)).data,
  listCategories: async (): Promise<AuditCategoryDTO[]> => (await apiClient.get(`${BASE}/categories`)).data,
  setCategoryEnabled: async (key: string, isEnabled: boolean): Promise<AuditCategoryDTO> => (await apiClient.put(`${BASE}/categories/${encodeURIComponent(key)}`, { isEnabled })).data,

  list: async (filters: AuditListFilters = {}): Promise<AuditListResponse> => (await apiClient.get(BASE, { params: cleanParams(filters) })).data,
  getDetails: async (id: string): Promise<AuditEventDetailDTO> => (await apiClient.get(`${BASE}/${id}`)).data,
  getRelatedEvents: async (correlationId: string): Promise<AuditEventRowDTO[]> => (await apiClient.get(`${BASE}/related/${correlationId}`)).data,

  getSecurityEvents: async (filters: AuditListFilters = {}): Promise<SecurityEventsResponse> => (await apiClient.get(`${BASE}/security-events`, { params: cleanParams(filters) })).data,
  getApiActivity: async (filters: { page?: number; limit?: number; path?: string; statusCode?: number } = {}): Promise<ApiActivityResponse> =>
    (await apiClient.get(`${BASE}/api-activity`, { params: cleanParams(filters) })).data,

  listSavedSearches: async (): Promise<AuditSavedSearchDTO[]> => (await apiClient.get(`${BASE}/saved-searches`)).data,
  createSavedSearch: async (payload: { name: string; filters: AuditListFilters }): Promise<AuditSavedSearchDTO> => (await apiClient.post(`${BASE}/saved-searches`, payload)).data,
  updateSavedSearch: async (id: string, payload: { name?: string; filters?: AuditListFilters }): Promise<AuditSavedSearchDTO> => (await apiClient.put(`${BASE}/saved-searches/${id}`, payload)).data,
  removeSavedSearch: async (id: string): Promise<{ ok: true }> => (await apiClient.delete(`${BASE}/saved-searches/${id}`)).data,

  getRetentionSetting: async (): Promise<AuditRetentionSettingDTO> => (await apiClient.get(`${BASE}/retention`)).data,
  updateRetentionSetting: async (payload: { defaultRetentionDays?: number | null; archiveEnabled?: boolean; categoryOverrides?: Record<string, number> }): Promise<AuditRetentionSettingDTO> =>
    (await apiClient.put(`${BASE}/retention`, payload)).data,
  previewRetention: async (days: number | null): Promise<RetentionPreviewDTO> => (await apiClient.get(`${BASE}/retention/preview`, { params: days ? { days } : {} })).data,

  listAlertRules: async (): Promise<AuditAlertRuleDTO[]> => (await apiClient.get(`${BASE}/alerts`)).data,
  createAlertRule: async (payload: { name: string; description?: string; triggerType: string; conditions: { threshold: number; windowMinutes: number }; isEnabled?: boolean }): Promise<AuditAlertRuleDTO> =>
    (await apiClient.post(`${BASE}/alerts`, payload)).data,
  updateAlertRule: async (id: string, payload: Partial<{ name: string; description: string; triggerType: string; conditions: { threshold: number; windowMinutes: number }; isEnabled: boolean }>): Promise<AuditAlertRuleDTO> =>
    (await apiClient.put(`${BASE}/alerts/${id}`, payload)).data,
  removeAlertRule: async (id: string): Promise<{ ok: true }> => (await apiClient.delete(`${BASE}/alerts/${id}`)).data,
  previewAlertRule: async (id: string): Promise<AlertPreviewDTO> => (await apiClient.get(`${BASE}/alerts/${id}/preview`)).data,

  listExportJobs: async (): Promise<AuditExportJobDTO[]> => (await apiClient.get(`${BASE}/export-jobs`)).data,
  recordExport: async (payload: { format: string; filters?: AuditListFilters; rowCount: number }): Promise<AuditExportJobDTO> => (await apiClient.post(`${BASE}/export`, payload)).data,
};
