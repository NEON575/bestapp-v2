import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { API_PREFIX } from '@bestapp/shared';

const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  `http://localhost:3000${API_PREFIX}`;

function normalizeBaseUrl(value: string) {
  const trimmed = value.replace(/\/$/, '');
  if (trimmed.endsWith(API_PREFIX)) {
    return trimmed;
  }

  return `${trimmed}${API_PREFIX}`;
}

export class ApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, options?: { status?: number; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.details = options?.details;
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: normalizeBaseUrl(rawBaseUrl),
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bestapp.token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<Record<string, unknown>>) => {
    const status = error.response?.status;
    const payload = error.response?.data;
    const message =
      (payload && (payload.message as string)) ||
      error.message ||
      'Произошла ошибка при обращении к серверу';

    if (status === 401) {
      localStorage.removeItem('bestapp.session');
      localStorage.removeItem('bestapp.token');
    }

    return Promise.reject(
      new ApiError(message, {
        status,
        details: payload
      })
    );
  }
);

export function setAuthToken(token?: string | null) {
  if (!token) {
    localStorage.removeItem('bestapp.token');
    return;
  }

  localStorage.setItem('bestapp.token', token);
}

export function getAuthToken() {
  return localStorage.getItem('bestapp.token');
}

