import { apiClient } from './client';

export const authApi = {
  sendOtp: async (phoneNumber: string) => {
    const response = await apiClient.post('/v1/auth/otp/send', { phoneNumber, mode: 'login' });
    return response.data;
  },
  verifyOtp: async (phoneNumber: string, otp: string) => {
    const response = await apiClient.post('/v1/auth/otp/verify', { phoneNumber, otp, mode: 'login' });
    return response.data;
  },
  getMe: async () => {
    const response = await apiClient.get('/v1/auth/me');
    return response.data;
  },
};

export { platformPlansApi } from './plans';
export type { PlanListFilters } from './plans';
export { featureEngineApi } from './featureEngine';
export { platformOrganizationsApi } from './organizations';
export { platformCouponsApi } from './coupons';
export { platformUsersApi } from './platformUsers';
export { platformRolesApi, platformPermissionsApi, platformPermissionGroupsApi, platformRoleTemplatesApi } from './roles';
export { platformAuditApi } from './audit';
export { platformSupportApi } from './support';
export { platformRevenueApi } from './revenue';
export { platformGlobalSettingsApi } from './globalSettings';
export { platformNotificationsApi } from './notifications';
export { platformAutomationApi } from './automation';
export { handleApiError } from './client';
