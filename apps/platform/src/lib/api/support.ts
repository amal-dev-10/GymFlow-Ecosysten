import { apiClient } from './client';
import type {
  TicketListFilters,
  TicketListResponse,
  TicketWorkspaceDTO,
  TicketMessageDTO,
  TicketAttachmentDTO,
  EscalationDTO,
  SupportDashboardDTO,
  SlaPolicyDTO,
  SlaDashboardDTO,
  KbArticleDTO,
  SupportNotificationsDTO,
} from '@/types/support';

const BASE = '/v1/platform/support';

function cleanParams<T extends object>(filters: T) {
  const params: Record<string, unknown> = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) params[k] = v;
  });
  return params;
}

export const platformSupportApi = {
  getDashboard: async (): Promise<SupportDashboardDTO> => (await apiClient.get(`${BASE}/dashboard`)).data,
  getNotifications: async (): Promise<SupportNotificationsDTO> => (await apiClient.get(`${BASE}/notifications`)).data,

  listTickets: async (filters: TicketListFilters = {}): Promise<TicketListResponse> => (await apiClient.get(`${BASE}/tickets`, { params: cleanParams(filters) })).data,
  createTicket: async (payload: { organizationId: string; subject: string; description?: string; priority?: string; category?: string; assignedEngineerId?: string }): Promise<TicketWorkspaceDTO> =>
    (await apiClient.post(`${BASE}/tickets`, payload)).data,
  getTicketWorkspace: async (id: string): Promise<TicketWorkspaceDTO> => (await apiClient.get(`${BASE}/tickets/${id}`)).data,
  updateTicket: async (id: string, payload: Partial<{ subject: string; description: string; status: string; priority: string; category: string }>): Promise<TicketWorkspaceDTO> =>
    (await apiClient.put(`${BASE}/tickets/${id}`, payload)).data,
  removeTicket: async (id: string): Promise<{ ok: true }> => (await apiClient.delete(`${BASE}/tickets/${id}`)).data,
  assignEngineer: async (id: string, assignedEngineerId: string): Promise<TicketWorkspaceDTO> => (await apiClient.put(`${BASE}/tickets/${id}/assign`, { assignedEngineerId })).data,

  postMessage: async (id: string, payload: { body: string; isInternal?: boolean; mentions?: string[] }): Promise<TicketMessageDTO> => (await apiClient.post(`${BASE}/tickets/${id}/messages`, payload)).data,
  uploadAttachment: async (id: string, file: File, messageId?: string): Promise<TicketAttachmentDTO> => {
    const form = new FormData();
    form.append('file', file);
    if (messageId) form.append('messageId', messageId);
    return (await apiClient.post(`${BASE}/tickets/${id}/attachments`, form)).data;
  },

  createEscalation: async (id: string, payload: { toLevel: string; reason: string; ownerName?: string }): Promise<EscalationDTO> => (await apiClient.post(`${BASE}/tickets/${id}/escalations`, payload)).data,
  resolveEscalation: async (escalationId: string, resolution: string): Promise<{ ok: true }> => (await apiClient.post(`${BASE}/escalations/${escalationId}/resolve`, { resolution })).data,
  listEscalations: async (query: { status?: string; page?: number; limit?: number } = {}): Promise<{ data: EscalationDTO[]; total: number; page: number; limit: number; totalPages: number }> =>
    (await apiClient.get(`${BASE}/escalations`, { params: cleanParams(query) })).data,

  recordCsat: async (id: string, score: number, comment?: string): Promise<{ ok: true }> => (await apiClient.post(`${BASE}/tickets/${id}/csat`, { score, comment })).data,

  bulkAction: async (payload: { ticketIds: string[]; action: 'assign' | 'close' | 'escalate' | 'delete'; assignedEngineerId?: string; escalateToLevel?: string; reason?: string }): Promise<{ ok: true; affected: number }> =>
    (await apiClient.post(`${BASE}/bulk`, payload)).data,

  listSlaPolicies: async (): Promise<SlaPolicyDTO[]> => (await apiClient.get(`${BASE}/sla/policies`)).data,
  updateSlaPolicy: async (payload: { priority: string; firstResponseMinutes: number; resolutionMinutes: number }): Promise<SlaPolicyDTO> => (await apiClient.put(`${BASE}/sla/policies`, payload)).data,
  getSlaDashboard: async (): Promise<SlaDashboardDTO> => (await apiClient.get(`${BASE}/sla/dashboard`)).data,

  listKbArticles: async (query: { search?: string; category?: string; type?: string } = {}): Promise<KbArticleDTO[]> => (await apiClient.get(`${BASE}/kb`, { params: cleanParams(query) })).data,
  getKbArticle: async (id: string): Promise<KbArticleDTO> => (await apiClient.get(`${BASE}/kb/${id}`)).data,
  createKbArticle: async (payload: { title: string; category: string; body: string; type: string; tags?: string[]; isPublished?: boolean }): Promise<KbArticleDTO> => (await apiClient.post(`${BASE}/kb`, payload)).data,
  updateKbArticle: async (id: string, payload: Partial<{ title: string; category: string; body: string; type: string; tags: string[]; isPublished: boolean }>): Promise<KbArticleDTO> =>
    (await apiClient.put(`${BASE}/kb/${id}`, payload)).data,
  removeKbArticle: async (id: string): Promise<{ ok: true }> => (await apiClient.delete(`${BASE}/kb/${id}`)).data,
};
