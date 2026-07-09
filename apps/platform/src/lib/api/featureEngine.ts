import { apiClient } from './client';
import type {
  EngineDashboardDTO,
  FeatureCatalogItemDTO,
  ResourceCatalogItemDTO,
  FeatureMatrixDTO,
  ResourceMatrixDTO,
  WorkspaceExperienceOverviewDTO,
  OrganizationUsageSummaryDTO,
  OrganizationDetailDTO,
  UpgradeRecommendationDTO,
  ViolationDTO,
  EngineOverrideDTO,
  EngineAuditLogPageDTO,
  EvaluateFeatureResultDTO,
  EvaluateResourceResultDTO,
  DeveloperPreviewDTO,
  CreateFeatureInput,
  UpdateFeatureInput,
  CreateResourceInput,
  UpdateResourceInput,
  CreateFeatureDependencyInput,
  UpdateValidationRuleInput,
  CreateOverrideInput,
  SetWorkspaceExperienceOverrideInput,
} from '@/types/featureEngine';

const BASE = '/v1/platform/feature-engine';

export const featureEngineApi = {
  getDashboard: async (): Promise<EngineDashboardDTO> => (await apiClient.get(`${BASE}/dashboard`)).data,

  // Features
  listFeatures: async (): Promise<FeatureCatalogItemDTO[]> => (await apiClient.get(`${BASE}/features`)).data,
  createFeature: async (payload: CreateFeatureInput) => (await apiClient.post(`${BASE}/features`, payload)).data,
  updateFeature: async (key: string, payload: UpdateFeatureInput) => (await apiClient.put(`${BASE}/features/${key}`, payload)).data,
  deleteFeature: async (key: string) => (await apiClient.delete(`${BASE}/features/${key}`)).data,
  addFeatureDependency: async (payload: CreateFeatureDependencyInput) => (await apiClient.post(`${BASE}/features/dependencies`, payload)).data,
  removeFeatureDependency: async (id: string) => (await apiClient.delete(`${BASE}/features/dependencies/${id}`)).data,

  // Limits / Resources
  listResources: async (): Promise<ResourceCatalogItemDTO[]> => (await apiClient.get(`${BASE}/limits`)).data,
  createResource: async (payload: CreateResourceInput) => (await apiClient.post(`${BASE}/limits`, payload)).data,
  updateResource: async (key: string, payload: UpdateResourceInput) => (await apiClient.put(`${BASE}/limits/${key}`, payload)).data,
  deleteResource: async (key: string) => (await apiClient.delete(`${BASE}/limits/${key}`)).data,
  updateValidationRule: async (resourceKey: string, planId: string, payload: UpdateValidationRuleInput) =>
    (await apiClient.put(`${BASE}/limits/${resourceKey}/validation-rules/${planId}`, payload)).data,

  // Matrices
  getFeatureMatrix: async (): Promise<FeatureMatrixDTO> => (await apiClient.get(`${BASE}/matrix/features`)).data,
  getResourceMatrix: async (): Promise<ResourceMatrixDTO> => (await apiClient.get(`${BASE}/matrix/limits`)).data,

  // Workspace Experience
  listWorkspaceExperience: async (): Promise<WorkspaceExperienceOverviewDTO> => (await apiClient.get(`${BASE}/workspace-experience`)).data,
  setOrganizationWorkspaceExperience: async (organizationId: string, payload: SetWorkspaceExperienceOverrideInput) =>
    (await apiClient.put(`${BASE}/organizations/${organizationId}/workspace-experience`, payload)).data,

  // Organizations
  listOrganizationsUsage: async (filters: { search?: string; planId?: string } = {}): Promise<OrganizationUsageSummaryDTO[]> =>
    (await apiClient.get(`${BASE}/organizations`, { params: filters })).data,
  getOrganizationDetail: async (id: string): Promise<OrganizationDetailDTO> => (await apiClient.get(`${BASE}/organizations/${id}`)).data,
  getUpgradeRecommendation: async (id: string): Promise<UpgradeRecommendationDTO | null> =>
    (await apiClient.get(`${BASE}/organizations/${id}/upgrade-recommendation`)).data,

  // Violations
  listViolations: async (filters: { organizationId?: string; severity?: 'warning' | 'exceeded' } = {}): Promise<ViolationDTO[]> =>
    (await apiClient.get(`${BASE}/violations`, { params: filters })).data,

  // Overrides
  listOverrides: async (filters: { organizationId?: string; status?: string; scope?: string } = {}): Promise<EngineOverrideDTO[]> =>
    (await apiClient.get(`${BASE}/overrides`, { params: filters })).data,
  createOverride: async (payload: CreateOverrideInput): Promise<EngineOverrideDTO> => (await apiClient.post(`${BASE}/overrides`, payload)).data,
  revokeOverride: async (id: string): Promise<EngineOverrideDTO> => (await apiClient.post(`${BASE}/overrides/${id}/revoke`)).data,

  // Evaluation
  evaluateFeature: async (organizationId: string, featureKey: string): Promise<EvaluateFeatureResultDTO> =>
    (await apiClient.post(`${BASE}/evaluate/feature`, { organizationId, featureKey })).data,
  evaluateResource: async (organizationId: string, resourceKey: string, requestedAmount?: number): Promise<EvaluateResourceResultDTO> =>
    (await apiClient.post(`${BASE}/evaluate/resource`, { organizationId, resourceKey, requestedAmount })).data,

  // Audit
  getAuditLog: async (filters: { entityType?: string; organizationId?: string; page?: number; limit?: number } = {}): Promise<EngineAuditLogPageDTO> =>
    (await apiClient.get(`${BASE}/audit`, { params: filters })).data,

  // Developer Preview
  getDeveloperPreview: async (organizationId: string, featureKey?: string, resourceKey?: string): Promise<DeveloperPreviewDTO> =>
    (await apiClient.get(`${BASE}/developer-preview`, { params: { organizationId, featureKey, resourceKey } })).data,
};
