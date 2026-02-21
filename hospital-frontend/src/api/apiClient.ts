import axios from 'axios';

// 1. Grab the URL from .env, or use localhost
const BASE_DOMAIN = import.meta.env.VITE_API_URL || 'http://localhost:5272';

// 2. Append '/api' right here so you never have to type it again
export const apiClient = axios.create({
  baseURL: `${BASE_DOMAIN}/api`, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add your token interceptor here once
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});