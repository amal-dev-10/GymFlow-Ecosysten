// Shapes mirror apps/api/src/modules/platform-roles (PLT-008). This is the
// dynamic RBAC framework for GymFlow employees (PlatformAdminUser) - named
// RoleDTO etc. to avoid colliding with the legacy `PlatformRole` literal
// union type in types/plans.ts, which is untouched by this module.

export type PermissionEffect = 'ALLOW' | 'DENY';
export type MatrixCellState = 'ALLOW' | 'DENY' | 'INHERITED' | 'INHERITED_DENY' | 'NONE';
export type RoleStatus = 'Active' | 'Archived';
export type AssignmentStatus = 'Active' | 'Expired' | 'Revoked';

export interface PermissionCategoryDTO {
  key: string;
  label: string;
  icon: string | null;
  order: number;
  description: string | null;
}

export interface PermissionActionDTO {
  key: string;
  label: string;
  isSensitive: boolean;
}

export interface PermissionDTO {
  id?: string;
  key: string;
  label: string;
  description?: string | null;
  resourceLabel?: string;
  isSensitive: boolean;
  category: string;
  categoryKey: string;
  action?: string;
  actionKey?: string;
}

export interface PermissionTreeCategoryDTO {
  key: string;
  label: string;
  icon: string | null;
  permissions: { key: string; label: string; action: string; isSensitive: boolean }[];
}

export interface RoleListItemDTO {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  status: RoleStatus;
  colorTag: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  permissionCount: number;
  usersAssigned: number;
}

export interface RoleListResponse {
  data: RoleListItemDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RolePermissionEntryDTO {
  key: string;
  label: string;
  category: string;
  categoryKey: string;
  action: string;
  effect: PermissionEffect;
  note: string | null;
  isSensitive: boolean;
}

export interface RoleUserRowDTO {
  assignmentId: string;
  platformUserId: string;
  fullName: string;
  email: string | null;
  department: string | null;
  isTemporary: boolean;
  expiresAt: string | null;
  assignedByName: string | null;
  assignedAt: string;
}

export interface AuditLogEntryDTO {
  id: string;
  action: string;
  user: string;
  details: string;
  eventType: string | null;
  eventCategory: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface RoleDetailDTO {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  status: RoleStatus;
  colorTag: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: RolePermissionEntryDTO[];
  permissionGroups: { id: string; name: string; effect: PermissionEffect }[];
  inheritsFrom: { id: string; name: string }[];
  inheritedBy: { id: string; name: string }[];
  restrictions: { key: string; label: string; note: string | null }[];
  users: RoleUserRowDTO[];
  effectivePermissionCount: number;
  auditHistory: AuditLogEntryDTO[];
}

export interface RolesDashboardDTO {
  totalRoles: number;
  systemRoles: number;
  customRoles: number;
  permissionGroups: number;
  platformUsersAssigned: number;
  temporaryAccessGrants: number;
  recentlyModifiedRoles: { id: string; name: string; isSystem: boolean; updatedAt: string }[];
}

export interface PermissionMatrixDTO {
  roles: { id: string; name: string; isSystem: boolean }[];
  permissions: { key: string; label: string; category: string; categoryKey: string; isSensitive: boolean }[];
  cells: Record<string, Record<string, { state: MatrixCellState; sourceRoleName?: string }>>;
}

export interface EffectivePermissionDTO {
  key: string;
  effect: PermissionEffect;
  label: string;
  categoryKey: string;
  isSensitive: boolean;
  sourceRoleIds: string[];
  sourceRoleNames: string[];
}

export interface PermissionGroupDTO {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isSystem: boolean;
  permissionCount: number;
  rolesUsingGroup: number;
  permissions: { key: string; label: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface RoleTemplateDTO {
  id: string;
  name: string;
  description: string | null;
  category: string;
  permissionKeys: string[];
  groupIds: string[];
  isSystem: boolean;
  createdAt: string;
}

export interface RoleAssignmentRowDTO {
  assignmentId: string;
  platformUserId: string;
  fullName: string;
  department: string | null;
  roleId: string;
  roleName: string;
  isTemporary: boolean;
  expiresAt: string | null;
  assignedByName: string | null;
  assignedAt: string;
}

export interface RoleAssignmentListResponse {
  data: RoleAssignmentRowDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TemporaryAccessRowDTO {
  id: string;
  platformUserId: string;
  fullName: string;
  roleId: string;
  roleName: string;
  reason: string | null;
  approverName: string | null;
  expiresAt: string | null;
  status: AssignmentStatus;
  assignedByName: string | null;
  assignedAt: string;
  revokedAt: string | null;
  revokedByName: string | null;
}

export interface TemporaryAccessListResponse {
  data: TemporaryAccessRowDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogListResponse {
  data: AuditLogEntryDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PermissionGrantInput {
  permissionKey: string;
  effect: PermissionEffect;
  note?: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  colorTag?: string;
  categoryKeys?: string[];
  permissions?: PermissionGrantInput[];
  groupIds?: string[];
  inheritsRoleIds?: string[];
  assignUserIds?: string[];
  fromTemplateId?: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  colorTag?: string;
  status?: RoleStatus;
}

export interface RoleListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: RoleStatus;
  kind?: 'system' | 'custom';
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}
