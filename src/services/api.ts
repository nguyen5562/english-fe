import axios from 'axios';
import { API_URL } from '../const/apiConfig';
import { useAuthStore } from '../store/auth.store';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      // Optional: Redirect to login if the store update doesn't trigger it fast enough or if we're not in a React context that reacts to it.
      // But typically Reactive updates should handle it.
    }
    return Promise.reject(error);
  },
);
