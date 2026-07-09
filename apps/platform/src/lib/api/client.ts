import axios from 'axios';

// Same backend as apps/web and apps/api itself - the Platform Administration
// app is a separate frontend, but talks to the one shared backend.
// No default Content-Type header here on purpose: axios already sets
// 'application/json' automatically for plain-object bodies. Pinning it as a
// default breaks FormData uploads (e.g. branding logo/favicon) because axios
// then can't swap in the required 'multipart/form-data; boundary=...' value.
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
});

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('platform_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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
      typeof window !== 'undefined'
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('platform_refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/v1/auth/refresh`,
            { refreshToken }
          );
          const { accessToken, refreshToken: newRefreshToken, user } = response.data;
          localStorage.setItem('platform_token', accessToken);
          localStorage.setItem('platform_refreshToken', newRefreshToken);
          if (user) localStorage.setItem('platform_user', JSON.stringify(user));
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('platform_token');
          localStorage.removeItem('platform_refreshToken');
          localStorage.removeItem('platform_user');
          window.location.href = '/login';
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
        return Array.isArray(data.message) ? data.message.join(', ') : data.message;
      }
      return `Server Error (${error.response.status}): ${error.response.statusText}`;
    }
    if (error.request) {
      return 'Network Error: Cannot connect to the server. Make sure the backend is running.';
    }
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
};
