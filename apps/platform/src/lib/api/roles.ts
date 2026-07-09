import { apiClient } from './client';
import type {
  RoleListResponse,
  RoleListFilters,
  RoleDetailDTO,
  RolesDashboardDTO,
  PermissionMatrixDTO,
  EffectivePermissionDTO,
  PermissionGroupDTO,
  RoleTemplateDTO,
  RoleAssignmentListResponse,
  TemporaryAccessListResponse,
  AuditLogListResponse,
  PermissionCategoryDTO,
  PermissionActionDTO,
  PermissionDTO,
  PermissionTreeCategoryDTO,
  CreateRoleInput,
  UpdateRoleInput,
  PermissionGrantInput,
} from '@/types/roles';

const BASE = '/v1/platform/roles';

function cleanParams<T extends object>(filters: T) {
  const params: Record<string, unknown> = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) params[k] = v;
  });
  return params;
}

export const platformRolesApi = {
  // --- Dashboard / List / Details ---
  getDashboard: async (): Promise<RolesDashboardDTO> => (await apiClient.get(`${BASE}/dashboard`)).data,
  list: async (filters: RoleListFilters = {}): Promise<RoleListResponse> => (await apiClient.get(BASE, { params: cleanParams(filters) })).data,
  getDetails: async (id: string): Promise<RoleDetailDTO> => (await apiClient.get(`${BASE}/${id}`)).data,

  // --- Create / Update / Delete ---
  create: async (input: CreateRoleInput): Promise<RoleDetailDTO> => (await apiClient.post(BASE, input)).data,
  update: async (id: string, input: UpdateRoleInput): Promise<RoleDetailDTO> => (await apiClient.put(`${BASE}/${id}`, input)).data,
  remove: async (id: string): Promise<{ ok: true }> => (await apiClient.delete(`${BASE}/${id}`)).data,

  // --- Permission matrix / groups / inheritance ---
  setPermissions: async (id: string, permissions: PermissionGrantInput[]): Promise<RoleDetailDTO> => (await apiClient.put(`${BASE}/${id}/permissions`, { permissions })).data,
  setGroups: async (id: string, groupIds: string[]): Promise<RoleDetailDTO> => (await apiClient.put(`${BASE}/${id}/groups`, { groupIds })).data,
  addInheritance: async (id: string, inheritsRoleId: string): Promise<RoleDetailDTO> => (await apiClient.post(`${BASE}/${id}/inheritance/${inheritsRoleId}`)).data,
  removeInheritance: async (id: string, inheritsRoleId: string): Promise<RoleDetailDTO> => (await apiClient.delete(`${BASE}/${id}/inheritance/${inheritsRoleId}`)).data,
  getMatrix: async (): Promise<PermissionMatrixDTO> => (await apiClient.get(`${BASE}/matrix`)).data,

  // --- Developer Preview / evaluation ---
  getEffectivePermissions: async (id: string): Promise<EffectivePermissionDTO[]> => (await apiClient.get(`${BASE}/${id}/effective-permissions`)).data,
  getUserEffectivePermissions: async (platformUserId: string): Promise<EffectivePermissionDTO[]> => (await apiClient.get(`${BASE}/users/${platformUserId}/effective-permissions`)).data,

  // --- Assignment ---
  assign: async (id: string, payload: { platformUserId: string; isTemporary?: boolean; reason?: string; approverName?: string; expiresAt?: string }) =>
    (await apiClient.post(`${BASE}/${id}/assign`, payload)).data,
  unassign: async (id: string, platformUserId: string) => (await apiClient.delete(`${BASE}/${id}/assign/${platformUserId}`)).data,
  listAssignments: async (filters: { search?: string; page?: number; limit?: number } = {}): Promise<RoleAssignmentListResponse> =>
    (await apiClient.get(`${BASE}/assignments`, { params: cleanParams(filters) })).data,

  // --- Temporary Access ---
  grantTemporaryAccess: async (payload: { platformUserId: string; roleId: string; reason: string; expiresAt: string; approverName: string }) =>
    (await apiClient.post(`${BASE}/temporary-access`, payload)).data,
  listTemporaryAccess: async (filters: { status?: string; page?: number; limit?: number } = {}): Promise<TemporaryAccessListResponse> =>
    (await apiClient.get(`${BASE}/temporary-access`, { params: cleanParams(filters) })).data,
  revokeTemporaryAccess: async (id: string) => (await apiClient.post(`${BASE}/temporary-access/${id}/revoke`)).data,

  // --- Audit ---
  getAuditHistory: async (filters: { search?: string; eventType?: string; page?: number; limit?: number } = {}): Promise<AuditLogListResponse> =>
    (await apiClient.get(`${BASE}/audit`, { params: cleanParams(filters) })).data,
};

export const platformPermissionsApi = {
  listCategories: async (): Promise<PermissionCategoryDTO[]> => (await apiClient.get('/v1/platform/permission-categories')).data,
  listActions: async (): Promise<PermissionActionDTO[]> => (await apiClient.get('/v1/platform/permission-actions')).data,
  search: async (filters: { search?: string; categoryKey?: string; actionKey?: string; roleId?: string } = {}): Promise<PermissionDTO[]> =>
    (await apiClient.get('/v1/platform/permissions', { params: cleanParams(filters) })).data,
  tree: async (): Promise<PermissionTreeCategoryDTO[]> => (await apiClient.get('/v1/platform/permissions/tree')).data,
};

const GROUPS_BASE = '/v1/platform/permission-groups';
export const platformPermissionGroupsApi = {
  list: async (): Promise<PermissionGroupDTO[]> => (await apiClient.get(GROUPS_BASE)).data,
  create: async (payload: { name: string; description?: string; category: string; permissionKeys?: string[] }): Promise<PermissionGroupDTO> =>
    (await apiClient.post(GROUPS_BASE, payload)).data,
  update: async (id: string, payload: { name?: string; description?: string; category?: string; permissionKeys?: string[] }): Promise<PermissionGroupDTO> =>
    (await apiClient.put(`${GROUPS_BASE}/${id}`, payload)).data,
  remove: async (id: string): Promise<{ ok: true }> => (await apiClient.delete(`${GROUPS_BASE}/${id}`)).data,
};

const TEMPLATES_BASE = '/v1/platform/role-templates';
export const platformRoleTemplatesApi = {
  list: async (): Promise<RoleTemplateDTO[]> => (await apiClient.get(TEMPLATES_BASE)).data,
  create: async (payload: { name: string; description?: string; category: string; permissionKeys?: string[]; groupIds?: string[] }): Promise<RoleTemplateDTO> =>
    (await apiClient.post(TEMPLATES_BASE, payload)).data,
  update: async (id: string, payload: { name?: string; description?: string; category?: string; permissionKeys?: string[]; groupIds?: string[] }): Promise<RoleTemplateDTO> =>
    (await apiClient.put(`${TEMPLATES_BASE}/${id}`, payload)).data,
  remove: async (id: string): Promise<{ ok: true }> => (await apiClient.delete(`${TEMPLATES_BASE}/${id}`)).data,
};
