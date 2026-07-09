import { apiClient } from './client';
import type {
  PlatformUserListResponse,
  PlatformUserListFilters,
  PlatformUserStatsDTO,
  PlatformUserProfileDTO,
  DepartmentBreakdown,
  PlatformDepartmentDTO,
  InvitePlatformUserInput,
  BulkPlatformUserActionInput,
} from '@/types/platformUsers';

const BASE = '/v1/platform/users';

export const platformUsersApi = {
  list: async (filters: PlatformUserListFilters = {}): Promise<PlatformUserListResponse> => {
    const params: Record<string, unknown> = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) params[k] = v;
    });
    return (await apiClient.get(BASE, { params })).data;
  },
  getStats: async (): Promise<PlatformUserStatsDTO> => (await apiClient.get(`${BASE}/stats`)).data,
  getDepartmentBreakdown: async (): Promise<DepartmentBreakdown[]> => (await apiClient.get(`${BASE}/departments/breakdown`)).data,
  listDepartments: async (): Promise<PlatformDepartmentDTO[]> => (await apiClient.get(`${BASE}/departments`)).data,
  getProfile: async (id: string): Promise<PlatformUserProfileDTO> => (await apiClient.get(`${BASE}/${id}`)).data,

  invite: async (payload: InvitePlatformUserInput) => (await apiClient.post(`${BASE}/invite`, payload)).data,
  resendInvitation: async (id: string) => (await apiClient.post(`${BASE}/${id}/resend-invitation`)).data,
  cancelInvitation: async (id: string) => (await apiClient.post(`${BASE}/${id}/cancel-invitation`)).data,
  update: async (id: string, payload: { fullName?: string; email?: string; phoneNumber?: string; department?: string; role?: string }) =>
    (await apiClient.put(`${BASE}/${id}`, payload)).data,
  resetPassword: async (id: string) => (await apiClient.post(`${BASE}/${id}/reset-password`)).data,
  resetMfa: async (id: string) => (await apiClient.post(`${BASE}/${id}/reset-mfa`)).data,
  suspend: async (id: string, reason?: string) => (await apiClient.post(`${BASE}/${id}/suspend`, { reason })).data,
  activate: async (id: string) => (await apiClient.post(`${BASE}/${id}/activate`)).data,
  deactivate: async (id: string) => (await apiClient.post(`${BASE}/${id}/deactivate`)).data,
  archive: async (id: string) => (await apiClient.post(`${BASE}/${id}/archive`)).data,
  unlock: async (id: string) => (await apiClient.post(`${BASE}/${id}/unlock`)).data,
  remove: async (id: string) => (await apiClient.delete(`${BASE}/${id}`)).data,

  bulk: async (payload: BulkPlatformUserActionInput) => (await apiClient.post(`${BASE}/bulk`, payload)).data,
  recordExport: async (format: string, count: number) => (await apiClient.post(`${BASE}/export`, { format, count })).data,

  terminateSession: async (id: string, sessionId: string) => (await apiClient.post(`${BASE}/${id}/sessions/${sessionId}/terminate`)).data,
  terminateAllSessions: async (id: string) => (await apiClient.post(`${BASE}/${id}/sessions/terminate-all`)).data,

  assignOrganization: async (id: string, organizationId: string, accessLevel: string) =>
    (await apiClient.post(`${BASE}/${id}/organizations`, { organizationId, accessLevel })).data,
  removeOrganizationAssignment: async (id: string, assignmentId: string) => (await apiClient.delete(`${BASE}/${id}/organizations/${assignmentId}`)).data,

  createDepartment: async (name: string, description?: string) => (await apiClient.post(`${BASE}/departments`, { name, description })).data,
  updateDepartment: async (deptId: string, description?: string) => (await apiClient.put(`${BASE}/departments/${deptId}`, { description })).data,
  deleteDepartment: async (deptId: string) => (await apiClient.delete(`${BASE}/departments/${deptId}`)).data,
};
