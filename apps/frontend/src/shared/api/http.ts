import axios, { type AxiosError, type AxiosInstance } from 'axios';

const API_PREFIX = '/api/v1';

const rawBaseUrl =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  `http://localhost:3000${API_PREFIX}`;

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, '');

  if (!trimmed) {
    return API_PREFIX;
  }

  if (trimmed.endsWith(API_PREFIX)) {
    return trimmed;
  }

  return `${trimmed}${API_PREFIX}`;
}

function buildRequestUrl(baseURL: string | undefined, url?: string) {
  if (!url) {
    return baseURL ?? '';
  }

  if (/^https?:\/\//i.test(url) || url.startsWith('//')) {
    return url;
  }

  const normalizedBase = baseURL?.replace(/\/+$/, '') ?? '';
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${normalizedBase}${normalizedPath}`;
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

  if (import.meta.env.DEV) {
    const fullUrl = buildRequestUrl(config.baseURL ?? api.defaults.baseURL, config.url);
    console.debug('[API request]', {
      method: config.method?.toUpperCase(),
      baseURL: config.baseURL ?? api.defaults.baseURL,
      url: config.url,
      fullUrl
    });
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<Record<string, unknown>>) => {
    const status = error.response?.status;
    const payload = error.response?.data;
    const message = (payload && (payload.message as string)) || error.message || 'Sorğu zamanı xəta baş verdi';
    const requestConfig = error.config;
    const fullUrl = requestConfig ? buildRequestUrl(requestConfig.baseURL ?? api.defaults.baseURL, requestConfig.url) : undefined;

    console.error('[API error]', {
      method: requestConfig?.method?.toUpperCase(),
      baseURL: requestConfig?.baseURL ?? api.defaults.baseURL,
      url: requestConfig?.url,
      fullUrl,
      status,
      message,
      payload
    });

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
