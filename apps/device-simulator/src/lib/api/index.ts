import { apiClient } from "./client";
import type { DeviceType } from "@/types/device";

/**
 * Thin wrappers around the existing backend endpoints (apps/api).
 * No business logic lives here - this only maps simulator needs onto the
 * already-implemented Auth / Devices / Attendance / Members APIs that
 * apps/web also consumes.
 */

export const authApi = {
  sendOtp: async (phoneNumber: string, mode?: "signup" | "login") => {
    const response = await apiClient.post("/v1/auth/otp/send", { phoneNumber, mode });
    return response.data;
  },
  verifyOtp: async (phoneNumber: string, otp: string, mode?: "signup" | "login") => {
    const response = await apiClient.post("/v1/auth/otp/verify", { phoneNumber, otp, mode });
    return response.data;
  },
  getMe: async () => {
    const response = await apiClient.get("/v1/auth/me");
    return response.data;
  },
};

export const devicesApi = {
  list: async (gymId: string) => {
    const response = await apiClient.get<any[]>("/v1/devices", { params: { gymId } });
    return response.data;
  },
  create: async (payload: { gymId: string; name: string; type: DeviceType }) => {
    const response = await apiClient.post("/v1/devices", payload);
    return response.data;
  },
  update: async (id: string, payload: { name?: string; status?: string; version?: string }) => {
    const response = await apiClient.patch(`/v1/devices/${id}`, payload);
    return response.data;
  },
  heartbeat: async (id: string, payload?: { version?: string }) => {
    const response = await apiClient.post(`/v1/devices/${id}/heartbeat`, payload || {});
    return response.data;
  },
  remove: async (id: string) => {
    const response = await apiClient.delete(`/v1/devices/${id}`);
    return response.data;
  },
};

export const attendanceApi = {
  checkIn: async (payload: {
    memberId?: string;
    gymId: string;
    method: string;
    memberName?: string;
    deviceUsed?: string;
  }) => {
    const response = await apiClient.post("/v1/attendance/check-in", payload);
    return response.data;
  },
  listLogs: async (gymId: string) => {
    const response = await apiClient.get<any[]>("/v1/attendance/logs", { params: { gymId } });
    return response.data;
  },
};

export const membersApi = {
  list: async (params: { search?: string; gymId?: string }) => {
    const response = await apiClient.get<any[]>("/v1/members", { params });
    return response.data;
  },
  get: async (id: string) => {
    const response = await apiClient.get<any>(`/v1/members/${id}`);
    return response.data;
  },
};

export const orgApi = {
  list: async () => {
    const response = await apiClient.get<any[]>("/v1/organizations");
    return response.data;
  },
};

export const gymApi = {
  list: async (organizationId: string) => {
    const response = await apiClient.get<any[]>("/v1/gyms", { params: { organizationId } });
    return response.data;
  },
};

export { handleApiError } from "./client";
