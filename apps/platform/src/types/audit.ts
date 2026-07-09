// Shapes mirror apps/api/src/modules/platform-audit (PLT-010). Platform-wide
// audit exploration for GymFlow staff - separate from the tenant-scoped
// audit-logs module used inside a single organization's Org 360 Audit tab.

export type Severity = 'Information' | 'Low' | 'Medium' | 'High' | 'Critical';
export type EventStatus = 'Success' | 'Failure';

export interface AuditCategoryDTO {
  key: string;
  label: string;
  icon: string | null;
  order: number;
  description: string | null;
  isEnabled?: boolean;
}

export interface AuditEventRowDTO {
  id: string;
  organizationId: string | null;
  organization?: { name: string } | null;
  userId: string | null;
  action: string;
  user: string;
  details: string;
  eventType: string | null;
  eventCategory: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  severity: Severity;
  correlationId: string | null;
  requestId: string | null;
  country: string | null;
  createdAt: string;
  status: EventStatus;
  device: string;
  browser: string;
  os: string;
}

export interface AuditEventDetailDTO extends AuditEventRowDTO {
  relatedEvents: AuditEventRowDTO[];
}

export interface AuditListResponse {
  data: AuditEventRowDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditDashboardDTO {
  totalEventsToday: number;
  criticalEvents: number;
  authenticationEvents: number;
  organizationEvents: number;
  subscriptionEvents: number;
  systemEvents: number;
  apiEvents: number;
  securityEvents: number;
}

export interface SecurityEventsResponse extends AuditListResponse {
  stats: { failedLogins: number; mfaEvents: number; lockedAccounts: number; roleChanges: number };
}

export interface ApiActivityRowDTO {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  responseTimeMs: number;
  actorName: string | null;
  actorUserId: string | null;
  organizationId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface ApiActivityResponse {
  data: ApiActivityRowDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: { requestCount: number; failedRequests: number; avgResponseTimeMs: number; topEndpoints: { path: string; count: number }[] };
}

export interface AuditSavedSearchDTO {
  id: string;
  name: string;
  ownerName: string | null;
  isSystem: boolean;
  filters: AuditListFilters;
  createdAt: string;
  updatedAt: string;
}

export interface AuditRetentionSettingDTO {
  id: string;
  defaultRetentionDays: number | null;
  archiveEnabled: boolean;
  categoryOverrides: Record<string, number> | null;
  updatedByName: string | null;
  updatedAt: string;
}

export interface RetentionPreviewDTO {
  affectedCount: number;
  cutoff: string | null;
}

export interface AuditAlertRuleDTO {
  id: string;
  name: string;
  description: string | null;
  triggerType: 'CRITICAL_EVENT' | 'FAILED_PAYMENT' | 'REPEATED_LOGIN_FAILURES' | 'HIGH_API_ERRORS' | 'PERMISSION_CHANGES' | 'SECURITY_RISK';
  conditions: { threshold: number; windowMinutes: number };
  isEnabled: boolean;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertPreviewDTO {
  matchCount: number;
  threshold: number;
  wouldTrigger: boolean;
  windowMinutes: number;
}

export interface AuditExportJobDTO {
  id: string;
  format: 'CSV' | 'EXCEL' | 'PDF' | 'JSON';
  filters: Record<string, unknown> | null;
  requestedByName: string | null;
  rowCount: number;
  createdAt: string;
}

export interface AuditListFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  severity?: Severity;
  userId?: string;
  organizationId?: string;
  eventType?: string;
  status?: 'success' | 'failure';
  country?: string;
  browser?: string;
  os?: string;
  startDate?: string;
  endDate?: string;
  correlationId?: string;
  sortDir?: 'asc' | 'desc';
}
