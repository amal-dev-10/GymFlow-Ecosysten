import axios from 'axios';

// Baked in at build time. In Docker/production this points at the API's public
// origin (e.g. https://api.gymflow.io); falls back to localhost for local dev.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT token & organization ID to all requests if present
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const organizationId = localStorage.getItem('organizationId');
      if (organizationId) {
        config.headers['x-organization-id'] = organizationId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Automatically refresh access token on 401 responses
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
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post('http://localhost:5000/v1/auth/refresh', {
            refreshToken,
          });
          const { accessToken, refreshToken: newRefreshToken, user } = response.data;
          localStorage.setItem('token', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
          }
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('organizationId');
          localStorage.removeItem('organizationName');
          window.location.href = '/auth?mode=login';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

// Standardized error handler
export const handleApiError = (error: any): string => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const data = error.response.data as any;
      if (data && data.message) {
        if (Array.isArray(data.message)) {
          return data.message.join(', ');
        }
        return data.message;
      }
      return `Server Error (${error.response.status}): ${error.response.statusText}`;
    } else if (error.request) {
      return 'Network Error: Cannot connect to the server. Make sure the backend is running.';
    }
  }
  return error.message || 'An unexpected error occurred.';
};
