import axios from 'axios';

const cleanUrl = (url, removeSuffix = '') => {
  if (!url) return url;
  let cleaned = url.replace(/^(https?:\/\/)+/, (match) => match.includes('https') ? 'https://' : 'http://');
  if (removeSuffix && cleaned.endsWith(removeSuffix)) {
    cleaned = cleaned.slice(0, -removeSuffix.length);
  }
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
};

let API_URL = cleanUrl(import.meta.env.VITE_API_URL);

if (API_URL && !API_URL.endsWith('/api')) {
  API_URL = `${API_URL}/api`;
}

if (!API_URL || API_URL.startsWith('http://localhost') || API_URL.startsWith('http://127.0.0.1')) {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    API_URL = 'https://verikarya.onrender.com/api';
  } else if (!API_URL) {
    API_URL = 'http://localhost:5000/api';
  }
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('verikarya_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
