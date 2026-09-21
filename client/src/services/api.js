import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
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
