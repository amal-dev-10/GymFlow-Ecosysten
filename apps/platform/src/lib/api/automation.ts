import { apiClient } from './client';
import type {
  AutomationDashboardDTO,
  AutomationJobDTO,
  AutomationJobRunDTO,
  AutomationQueueDTO,
  AutomationQueueRollupDTO,
  PaginatedResponse,
  ListJobsFilters,
  ListRunsFilters,
  CreateJobPayload,
  UpdateJobPayload,
} from '@/types/automation';

const BASE = '/v1/platform/automation';

function cleanParams<T extends object>(filters: T) {
  const params: Record<string, unknown> = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) params[k] = v;
  });
  return params;
}

export const platformAutomationApi = {
  getDashboard: async (): Promise<AutomationDashboardDTO> => (await apiClient.get(`${BASE}/dashboard`)).data,

  listJobs: async (filters: ListJobsFilters = {}): Promise<PaginatedResponse<AutomationJobDTO>> => (await apiClient.get(`${BASE}/jobs`, { params: cleanParams(filters) })).data,
  getJob: async (id: string): Promise<AutomationJobDTO> => (await apiClient.get(`${BASE}/jobs/${id}`)).data,
  createJob: async (payload: CreateJobPayload): Promise<AutomationJobDTO> => (await apiClient.post(`${BASE}/jobs`, payload)).data,
  updateJob: async (id: string, payload: UpdateJobPayload): Promise<AutomationJobDTO> => (await apiClient.put(`${BASE}/jobs/${id}`, payload)).data,
  pauseJob: async (id: string): Promise<AutomationJobDTO> => (await apiClient.post(`${BASE}/jobs/${id}/pause`)).data,
  resumeJob: async (id: string): Promise<AutomationJobDTO> => (await apiClient.post(`${BASE}/jobs/${id}/resume`)).data,
  disableJob: async (id: string): Promise<AutomationJobDTO> => (await apiClient.post(`${BASE}/jobs/${id}/disable`)).data,
  runJobNow: async (id: string): Promise<AutomationJobRunDTO> => (await apiClient.post(`${BASE}/jobs/${id}/run-now`)).data,

  listWorkflows: async (): Promise<PaginatedResponse<AutomationJobDTO>> => (await apiClient.get(`${BASE}/workflows`)).data,

  listSchedules: async (): Promise<AutomationJobDTO[]> => (await apiClient.get(`${BASE}/schedules`)).data,

  listQueues: async (): Promise<AutomationQueueRollupDTO[]> => (await apiClient.get(`${BASE}/queues`)).data,
  updateQueue: async (key: string, isActive: boolean): Promise<AutomationQueueDTO> => (await apiClient.put(`${BASE}/queues/${key}`, { isActive })).data,

  listExecutionHistory: async (filters: ListRunsFilters = {}): Promise<PaginatedResponse<AutomationJobRunDTO>> => (await apiClient.get(`${BASE}/execution-history`, { params: cleanParams(filters) })).data,
  listFailedJobs: async (filters: ListRunsFilters = {}): Promise<PaginatedResponse<AutomationJobRunDTO>> => (await apiClient.get(`${BASE}/failed-jobs`, { params: cleanParams(filters) })).data,
  retryRun: async (id: string): Promise<AutomationJobRunDTO> => (await apiClient.post(`${BASE}/runs/${id}/retry`)).data,
  ignoreRun: async (id: string): Promise<AutomationJobRunDTO> => (await apiClient.post(`${BASE}/runs/${id}/ignore`)).data,
};
