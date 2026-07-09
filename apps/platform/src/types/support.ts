// Shapes mirror apps/api/src/modules/platform-support (PLT-011). Platform-
// wide support workspace - separate from Org 360's existing Support tab,
// which reads/writes the same SupportTicket table via its own endpoints.

export type TicketStatus = 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'ESCALATED' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SlaBand = 'on_track' | 'at_risk' | 'breached';

// URGENT is kept as the underlying value for backward compatibility; the UI
// labels it "Critical" everywhere, matching the spec.
export const PRIORITY_LABELS: Record<TicketPriority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Critical' };

export const ESCALATION_LEVELS = ['Support', 'Engineering', 'Operations', 'Finance', 'Platform Admin'] as const;
export type EscalationLevel = (typeof ESCALATION_LEVELS)[number];

export interface SlaStatus {
  firstResponseDueAt: string;
  resolutionDueAt: string;
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
  minutesRemaining: number | null;
  band: SlaBand;
  isClosed: boolean;
}

export interface TicketAttachmentDTO {
  id: string;
  ticketId: string;
  messageId: string | null;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByName: string;
  createdAt: string;
}

export interface TicketMessageDTO {
  id: string;
  ticketId: string;
  authorType: 'Customer' | 'Agent' | 'System';
  authorName: string;
  authorUserId: string | null;
  body: string;
  isInternal: boolean;
  mentions: string[];
  createdAt: string;
  attachments?: TicketAttachmentDTO[];
}

export interface EscalationDTO {
  id: string;
  ticketId: string;
  fromLevel: string;
  toLevel: string;
  reason: string;
  ownerName: string | null;
  status: 'Open' | 'Resolved';
  resolution: string | null;
  createdByName: string;
  createdAt: string;
  resolvedAt: string | null;
  ticket?: { ticketNumber: number; subject: string; organization?: { name: string } };
}

export interface TicketRowDTO {
  id: string;
  ticketNumber: number;
  organizationId: string;
  organization?: { name: string };
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  priorityLabel: string;
  category: string | null;
  assignedEngineer: string | null;
  assignedEngineerId: string | null;
  assignedEngineerName: string | null;
  satisfactionScore: number | null;
  satisfactionComment: string | null;
  internalNotes: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  firstRespondedAt: string | null;
  sla: SlaStatus;
}

export interface TicketListResponse {
  data: TicketRowDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrgSnapshotDTO {
  id: string;
  name: string;
  logoUrl: string | null;
  owner: { id: string; name: string; email: string | null; phone: string } | null;
  plan: { id: string; name: string; billingCycle: string } | null;
  derivedStatus: string;
  lastActiveAt: string | null;
  usage: {
    members: { used: number; limit: number | null };
    branches: { used: number; limit: number | null };
    users: { used: number; limit: number | null };
    storage: { used: number; limit: number | null; unit: string };
  };
  health: { score: number; band: string; reasons: string[] };
}

export interface SubscriptionSnapshotDTO {
  plan: { id: string; name: string; billingCycle: string } | null;
  subscriptionStatus: string;
  trialEndDate: string | null;
  subscriptionEndDate: string | null;
  paymentStatus: string;
  isEnterprise: boolean;
}

export interface BillingSnapshotDTO {
  invoices: { id: string; amount: number; status: string; dueDate: string; paidAt: string | null; payments: { id: string; amount: number; status: string; createdAt: string }[] }[];
}

export interface FeatureSnapshotDTO {
  featureAccess: { featureKey: string; label: string; category: string; state: string; overridden: boolean }[];
  usage: { resourceKey: string; label: string; used: number; limitValue: number | null; percentUsed: number | null }[];
  violations: unknown[];
}

export interface TicketWorkspaceDTO extends TicketRowDTO {
  organization: { id: string; name: string };
  messages: TicketMessageDTO[];
  attachments: TicketAttachmentDTO[];
  escalations: EscalationDTO[];
  relatedTickets: { id: string; ticketNumber: number; subject: string; status: TicketStatus; priority: TicketPriority; createdAt: string }[];
  auditTimeline: { id: string; action: string; details: string; user: string; severity: string; createdAt: string; correlationId: string | null }[];
  orgSnapshot: OrgSnapshotDTO | null;
  subscriptionSnapshot: SubscriptionSnapshotDTO | null;
  billingSnapshot: BillingSnapshotDTO | null;
  featureSnapshot: FeatureSnapshotDTO | null;
}

export interface SupportDashboardDTO {
  openTickets: number;
  criticalTickets: number;
  pendingTickets: number;
  waitingOnCustomer: number;
  resolvedToday: number;
  avgResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  avgCsat: number | null;
  csatCount: number;
}

export interface SlaPolicyDTO {
  id: string | null;
  priority: TicketPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  updatedAt: string | null;
}

export interface SlaDashboardDTO {
  overdueTickets: number;
  upcomingBreaches: number;
  onTrack: number;
  policies: SlaPolicyDTO[];
}

export interface KbArticleDTO {
  id: string;
  title: string;
  slug: string;
  category: string;
  body: string;
  type: 'Article' | 'FAQ' | 'Troubleshooting' | 'Internal';
  tags: string[];
  viewCount: number;
  isPublished: boolean;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportNotificationsDTO {
  newTickets: { id: string; ticketNumber: number; subject: string; organizationName: string; createdAt: string }[];
  criticalTickets: { id: string; ticketNumber: number; subject: string; organizationName: string; createdAt: string }[];
  escalations: { id: string; ticketId: string; ticketNumber: number; toLevel: string; organizationName: string; createdAt: string }[];
  slaWarnings: { id: string; ticketNumber: number; subject: string; band: SlaBand; minutesRemaining: number | null }[];
}

export interface TicketListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string;
  assignedEngineerId?: string;
  organizationId?: string;
  startDate?: string;
  endDate?: string;
  sla?: SlaBand;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}
