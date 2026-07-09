import axios from "axios";
import { env } from "@/utils/env";

/**
 * Axios client for the device simulator.
 *
 * Mirrors apps/web/src/lib/api/client.ts so the simulator authenticates
 * and talks to the same backend (apps/api) exactly like the admin web app
 * and, eventually, real hardware adapters would.
 */
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("device_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const organizationId = localStorage.getItem("device_organizationId");
      if (organizationId) {
        config.headers["x-organization-id"] = organizationId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      typeof window !== "undefined"
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("device_refreshToken");
      if (refreshToken) {
        try {
          const response = await axios.post(`${env.apiUrl}/v1/auth/refresh`, {
            refreshToken,
          });
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem("device_token", accessToken);
          localStorage.setItem("device_refreshToken", newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem("device_token");
          localStorage.removeItem("device_refreshToken");
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const data = error.response.data as any;
      if (data?.message) {
        return Array.isArray(data.message) ? data.message.join(", ") : data.message;
      }
      return `Server Error (${error.response.status}): ${error.response.statusText}`;
    }
    if (error.request) {
      return "Network Error: Cannot reach the backend server.";
    }
  }
  return error instanceof Error ? error.message : "An unexpected error occurred.";
};
