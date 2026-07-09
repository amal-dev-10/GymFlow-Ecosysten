import { apiClient } from './client';
import type {
  PlanDTO,
  PlanStatsDTO,
  PlanVersionHistoryDTO,
  PlanAuditLogDTO,
  ResourceDefinitionDTO,
  FeatureDefinitionDTO,
  PlanFormInput,
} from '@/types/plans';

export interface PlanListFilters {
  search?: string;
  status?: string;
  visibility?: string;
  billingCycle?: string;
}

export const platformPlansApi = {
  list: async (filters: PlanListFilters = {}): Promise<PlanDTO[]> => {
    const response = await apiClient.get('/v1/platform/plans', { params: filters });
    return response.data;
  },
  getStats: async (): Promise<PlanStatsDTO> => {
    const response = await apiClient.get('/v1/platform/plans/stats');
    return response.data;
  },
  getResourceCatalog: async (): Promise<ResourceDefinitionDTO[]> => {
    const response = await apiClient.get('/v1/platform/plans/catalogs/resources');
    return response.data;
  },
  getFeatureCatalog: async (): Promise<FeatureDefinitionDTO[]> => {
    const response = await apiClient.get('/v1/platform/plans/catalogs/features');
    return response.data;
  },
  get: async (id: string): Promise<PlanDTO> => {
    const response = await apiClient.get(`/v1/platform/plans/${id}`);
    return response.data;
  },
  create: async (payload: PlanFormInput): Promise<PlanDTO> => {
    const response = await apiClient.post('/v1/platform/plans', payload);
    return response.data;
  },
  update: async (id: string, payload: Partial<PlanFormInput>): Promise<PlanDTO> => {
    const response = await apiClient.put(`/v1/platform/plans/${id}`, payload);
    return response.data;
  },
  duplicate: async (id: string, mode: 'clone' | 'version'): Promise<PlanDTO> => {
    const response = await apiClient.post(`/v1/platform/plans/${id}/duplicate`, { mode });
    return response.data;
  },
  archive: async (id: string): Promise<PlanDTO> => {
    const response = await apiClient.post(`/v1/platform/plans/${id}/archive`);
    return response.data;
  },
  activate: async (id: string): Promise<PlanDTO> => {
    const response = await apiClient.post(`/v1/platform/plans/${id}/activate`);
    return response.data;
  },
  getVersionHistory: async (id: string): Promise<PlanVersionHistoryDTO[]> => {
    const response = await apiClient.get(`/v1/platform/plans/${id}/version-history`);
    return response.data;
  },
  getAuditLog: async (id: string): Promise<PlanAuditLogDTO[]> => {
    const response = await apiClient.get(`/v1/platform/plans/${id}/audit-log`);
    return response.data;
  },
};
