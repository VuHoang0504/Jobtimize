import axios from 'axios';

// Chuẩn hóa baseURL từ biến môi trường VITE_API_URL
// Nếu không cấu hình (chạy local dev), dùng '/api' để proxy qua Vite server
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Auto attach JWT token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jobtimize_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or unauthorized
      if (localStorage.getItem('jobtimize_token')) {
        localStorage.removeItem('jobtimize_token');
        localStorage.removeItem('jobtimize_user');
        window.dispatchEvent(new Event('auth-change'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
