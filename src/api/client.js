import axios from 'axios';
import { REQUEST_TIMEOUT_MS } from '../constants';
import useAuthStore from '../store/authStore';
import useConfigStore from '../store/configStore';

const client = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

client.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const apiBaseUrl = useConfigStore.getState().apiBaseUrl;
    config.baseURL = apiBaseUrl;
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  }
);

export default client;
