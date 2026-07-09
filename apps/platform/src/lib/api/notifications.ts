import { apiClient } from './client';
import type {
  NotificationChannelDTO,
  NotificationTemplateDTO,
  NotificationCampaignDTO,
  NotificationDTO,
  NotificationsDashboardDTO,
  PaginatedResponse,
  VariableDTO,
  AudienceFilter,
  NotificationListFilters,
  QuickSendPayload,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  CreateCampaignPayload,
  UpdateCampaignPayload,
} from '@/types/notifications';

const BASE = '/v1/platform/notifications';

function cleanParams<T extends object>(filters: T) {
  const params: Record<string, unknown> = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) params[k] = v;
  });
  return params;
}

export const platformNotificationsApi = {
  getDashboard: async (): Promise<NotificationsDashboardDTO> => (await apiClient.get(`${BASE}/dashboard`)).data,

  getVariables: async (): Promise<VariableDTO[]> => (await apiClient.get(`${BASE}/variables`)).data,
  resolveAudience: async (audienceType: string, audienceFilter?: AudienceFilter): Promise<{ count: number }> =>
    (await apiClient.post(`${BASE}/resolve-audience`, { audienceType, audienceFilter })).data,

  listChannels: async (): Promise<NotificationChannelDTO[]> => (await apiClient.get(`${BASE}/channels`)).data,
  updateChannel: async (key: string, isActive: boolean): Promise<NotificationChannelDTO> => (await apiClient.put(`${BASE}/channels/${key}`, { isActive })).data,

  listTemplates: async (filters: { category?: string; channel?: string; status?: string; search?: string } = {}): Promise<NotificationTemplateDTO[]> =>
    (await apiClient.get(`${BASE}/templates`, { params: cleanParams(filters) })).data,
  getTemplate: async (id: string): Promise<NotificationTemplateDTO> => (await apiClient.get(`${BASE}/templates/${id}`)).data,
  createTemplate: async (payload: CreateTemplatePayload): Promise<NotificationTemplateDTO> => (await apiClient.post(`${BASE}/templates`, payload)).data,
  updateTemplate: async (id: string, payload: UpdateTemplatePayload): Promise<NotificationTemplateDTO> => (await apiClient.put(`${BASE}/templates/${id}`, payload)).data,
  archiveTemplate: async (id: string): Promise<NotificationTemplateDTO> => (await apiClient.post(`${BASE}/templates/${id}/archive`)).data,
  previewTemplate: async (id: string, sampleValues?: Record<string, string>): Promise<{ subject: string; body: string }> =>
    (await apiClient.post(`${BASE}/templates/${id}/preview`, { sampleValues })).data,

  listCampaigns: async (filters: { status?: string; channel?: string; search?: string } = {}): Promise<NotificationCampaignDTO[]> =>
    (await apiClient.get(`${BASE}/campaigns`, { params: cleanParams(filters) })).data,
  getCampaign: async (id: string): Promise<NotificationCampaignDTO> => (await apiClient.get(`${BASE}/campaigns/${id}`)).data,
  createCampaign: async (payload: CreateCampaignPayload): Promise<NotificationCampaignDTO> => (await apiClient.post(`${BASE}/campaigns`, payload)).data,
  updateCampaign: async (id: string, payload: UpdateCampaignPayload): Promise<NotificationCampaignDTO> => (await apiClient.put(`${BASE}/campaigns/${id}`, payload)).data,
  cancelCampaign: async (id: string): Promise<NotificationCampaignDTO> => (await apiClient.post(`${BASE}/campaigns/${id}/cancel`)).data,
  sendCampaignNow: async (id: string): Promise<NotificationCampaignDTO> => (await apiClient.post(`${BASE}/campaigns/${id}/send-now`)).data,

  listSchedules: async (): Promise<NotificationCampaignDTO[]> => (await apiClient.get(`${BASE}/schedules`)).data,

  quickSend: async (payload: QuickSendPayload): Promise<{ sentCount: number }> => (await apiClient.post(`${BASE}/quick-send`, payload)).data,
  listNotifications: async (filters: NotificationListFilters = {}): Promise<PaginatedResponse<NotificationDTO>> =>
    (await apiClient.get(BASE, { params: cleanParams(filters) })).data,
  getNotification: async (id: string): Promise<NotificationDTO> => (await apiClient.get(`${BASE}/${id}`)).data,
  cancelNotification: async (id: string): Promise<NotificationDTO> => (await apiClient.post(`${BASE}/${id}/cancel`)).data,
};
