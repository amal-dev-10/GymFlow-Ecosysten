export interface AutomationQueueDTO {
  key: string;
  label: string;
  icon: string | null;
  isActive: boolean;
  order: number;
  createdAt: string;
}

export interface AutomationQueueRollupDTO extends AutomationQueueDTO {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retryCount: number;
}

export interface AutomationJobDTO {
  id: string;
  name: string;
  category: string;
  workflowType: string | null;
  description: string | null;
  scheduleType: string;
  cronExpression: string | null;
  status: string;
  queueKey: string;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunDurationMs: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationJobRunDTO {
  id: string;
  jobId: string;
  job?: AutomationJobDTO;
  queueKey: string;
  status: string;
  triggeredBy: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  failureReason: string | null;
  log: string | null;
  ignoredAt: string | null;
  createdAt: string;
}

export interface AutomationDashboardDTO {
  activeJobs: number;
  scheduledJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  queuedJobs: number;
  avgExecutionTimeMs: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ListJobsFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  scheduleType?: string;
  queueKey?: string;
}

export interface ListRunsFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  jobId?: string;
  queueKey?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateJobPayload {
  name: string;
  category: string;
  workflowType?: string;
  description?: string;
  scheduleType: string;
  cronExpression?: string;
  queueKey: string;
}

export type UpdateJobPayload = Partial<CreateJobPayload>;

export const JOB_CATEGORIES = ['Membership', 'Attendance', 'Workout', 'Nutrition', 'Billing', 'Subscription', 'Notifications', 'Platform', 'Reports', 'Storage'];
export const SCHEDULE_TYPES = [
  { value: 'EVERY_MINUTE', label: 'Every Minute' },
  { value: 'HOURLY', label: 'Hourly' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'CUSTOM_CRON', label: 'Custom Cron' },
];
export const JOB_STATUSES = ['Active', 'Paused', 'Disabled'];
export const RUN_STATUSES = ['Queued', 'Running', 'Completed', 'Failed'];
export const WORKFLOW_TYPES = [
  'Membership Expiry',
  'Membership Renewal',
  'Trial Expiry',
  'Invoice Generation',
  'Payment Reminder',
  'Workout Reminder',
  'Diet Reminder',
  'Attendance Sync',
  'Database Cleanup',
  'Storage Cleanup',
];
