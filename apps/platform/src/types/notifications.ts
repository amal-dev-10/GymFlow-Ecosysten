export interface NotificationChannelDTO {
  key: string;
  label: string;
  icon: string | null;
  isActive: boolean;
  order: number;
  createdAt: string;
}

export interface NotificationTemplateDTO {
  id: string;
  title: string;
  category: string;
  channel: string;
  subject: string | null;
  body: string;
  variables: string[];
  status: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCampaignDTO {
  id: string;
  name: string;
  notificationType: string;
  channel: string;
  templateId: string | null;
  template: NotificationTemplateDTO | null;
  bodyOverride: string | null;
  audienceType: string;
  audienceFilter: { organizationIds?: string[] } | null;
  priority: string;
  status: string;
  scheduleType: string;
  scheduledFor: string | null;
  recurringFrequency: string | null;
  nextRunAt: string | null;
  expiresAt: string | null;
  timezone: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  cancelledAt: string | null;
}

export interface NotificationDTO {
  id: string;
  campaignId: string | null;
  title: string;
  body: string;
  notificationType: string;
  channel: string;
  priority: string;
  status: string;
  recipientType: string;
  recipientId: string | null;
  recipientName: string | null;
  organizationId: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsDashboardDTO {
  total: number;
  sentToday: number;
  pending: number;
  failed: number;
  scheduled: number;
  unread: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface VariableDTO {
  key: string;
  label: string;
}

export interface AudienceFilter {
  organizationIds?: string[];
}

export interface NotificationListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  channel?: string;
  notificationType?: string;
  priority?: string;
  organizationId?: string;
  campaignId?: string;
  startDate?: string;
  endDate?: string;
}

export interface QuickSendPayload {
  title: string;
  body: string;
  notificationType: string;
  channel: string;
  priority?: string;
  audienceType: string;
  audienceFilter?: AudienceFilter;
}

export interface CreateTemplatePayload {
  title: string;
  category: string;
  channel: string;
  subject?: string;
  body: string;
  variables?: string[];
  status?: string;
}

export type UpdateTemplatePayload = Partial<CreateTemplatePayload>;

export interface CreateCampaignPayload {
  name: string;
  notificationType: string;
  channel: string;
  templateId?: string;
  bodyOverride?: string;
  audienceType: string;
  audienceFilter?: AudienceFilter;
  priority?: string;
  scheduleType: 'NOW' | 'SCHEDULED' | 'RECURRING';
  scheduledFor?: string;
  recurringFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  expiresAt?: string;
  timezone?: string;
}

export interface UpdateCampaignPayload {
  name?: string;
  priority?: string;
  scheduledFor?: string;
  expiresAt?: string;
}

export const NOTIFICATION_TYPES = ['System', 'Organization', 'Member', 'Employee', 'Platform', 'Marketing'];
export const TEMPLATE_CATEGORIES = ['Authentication', 'Membership', 'Attendance', 'Workout', 'Diet', 'Payments', 'Invoices', 'Organization', 'Platform', 'Marketing'];
export const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
export const NOTIFICATION_STATUSES = ['Draft', 'Scheduled', 'Queued', 'Sending', 'Sent', 'Delivered', 'Read', 'Failed', 'Cancelled'];
export const AUDIENCE_TYPES = [
  { value: 'ALL_ORGANIZATIONS', label: 'All Organizations' },
  { value: 'SELECTED_ORGANIZATIONS', label: 'Selected Organizations' },
  { value: 'OWNERS', label: 'Owners' },
  { value: 'EMPLOYEES', label: 'Employees' },
  { value: 'MEMBERS', label: 'Members' },
  { value: 'PLATFORM_USERS', label: 'Platform Users' },
];
