import axios from 'axios';
import toast from 'react-hot-toast'; 


//this is importantttttt 
const BASE_DOMAIN = import.meta.env.VITE_API_URL || 'http://localhost:5272';

export const apiClient = axios.create({
  baseURL: `${BASE_DOMAIN}/api`, 
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
  if (error.response?.status === 429) {
  toast.error("Whoa there! You're moving too fast. Please wait a minute.", {
    id: 'rate-limit',
    duration: 4000
  });
}

    if (error.response?.status === 401) {
      toast.error("Your session has expired. Please log in again.");
    }

    return Promise.reject(error);
  }
);