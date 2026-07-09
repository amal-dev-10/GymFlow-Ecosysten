// Shapes mirror apps/api/src/modules/platform-users (PLT-007). These are
// GymFlow's internal employees who staff this Platform Administration
// console - completely separate from OrganizationUser (tenant staff/members),
// which must never appear here.

import type { PlatformRole } from './plans';

export type { PlatformRole };
export type PlatformUserStatus = 'PENDING_INVITATION' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'LOCKED' | 'ARCHIVED';

export interface PlatformUserRowDTO {
  id: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string;
  department: string | null;
  role: PlatformRole;
  status: PlatformUserStatus;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  online: boolean;
  createdAt: string;
  invitedAt: string | null;
  invitedByName: string | null;
  invitationExpiresAt: string | null;
  acceptedAt: string | null;
  suspendedAt: string | null;
  suspendReason: string | null;
  deactivatedAt: string | null;
  archivedAt: string | null;
  lockedUntil: string | null;
  failedLoginAttempts: number;
  assignedOrganizationCount: number;
}

export interface PlatformUserListResponse {
  data: PlatformUserRowDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PlatformUserStatsDTO {
  total: number;
  active: number;
  pendingInvitations: number;
  suspended: number;
  online: number;
  administrators: number;
  supportEngineers: number;
  developers: number;
}

export interface DepartmentBreakdown {
  department: string;
  count: number;
}

export interface PlatformDepartmentDTO {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
}

export interface AssignedOrganization {
  id: string;
  organization: { id: string; name: string; slug: string };
  accessLevel: string;
  status: string;
  assignedAt: string;
  assignedByName: string | null;
}

export interface PlatformUserSession {
  id: string;
  device: string;
  browser: string;
  ipAddress: string;
  createdAt: string;
  status: 'Active' | 'Revoked';
}

export interface PlatformUserTimelineEvent {
  id: string;
  action: string;
  details: string;
  user: string;
  eventType: string | null;
  createdAt: string;
}

export interface PlatformUserProfileDTO extends PlatformUserRowDTO {
  permissions: string[];
  assignedOrganizations: AssignedOrganization[];
  security: {
    mfaEnabled: boolean;
    mfaEnabledAt: string | null;
    mfaRecoveryCodesRemaining: number | null;
    failedLoginAttempts: number;
    lockedUntil: string | null;
    sessionTimeoutMinutes: number;
    recentLogins: PlatformUserSession[];
  };
  sessions: PlatformUserSession[];
  timeline: PlatformUserTimelineEvent[];
}

export interface PlatformUserListFilters {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  role?: string;
  status?: string;
  mfaEnabled?: string;
  online?: string;
  sortBy?: string;
  sortDir?: string;
}

export interface InvitePlatformUserInput {
  fullName: string;
  email?: string;
  phoneNumber: string;
  department?: string;
  role: string;
  permissions?: string[];
}

export interface BulkPlatformUserActionInput {
  userIds: string[];
  action: 'activate' | 'suspend' | 'assign_department' | 'assign_role' | 'export' | 'delete';
  department?: string;
  role?: string;
  reason?: string;
}
