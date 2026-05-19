import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('bestapp.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

