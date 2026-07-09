import { apiClient } from './client';
import type { CouponDTO, CouponStatsDTO, CreateCouponInput, UpdateCouponInput } from '@/types/coupons';

const BASE = '/v1/platform/coupons';

export const platformCouponsApi = {
  list: async (): Promise<CouponDTO[]> => (await apiClient.get(BASE)).data,
  getStats: async (): Promise<CouponStatsDTO> => (await apiClient.get(`${BASE}/stats`)).data,
  create: async (payload: CreateCouponInput): Promise<CouponDTO> => (await apiClient.post(BASE, payload)).data,
  update: async (id: string, payload: UpdateCouponInput): Promise<CouponDTO> => (await apiClient.put(`${BASE}/${id}`, payload)).data,
  remove: async (id: string) => (await apiClient.delete(`${BASE}/${id}`)).data,
};
