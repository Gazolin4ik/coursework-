import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Создание экземпляра axios с базовой конфигурацией
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена к запросам
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // Регистрация пользователя
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Вход в систему
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  // Получение профиля пользователя
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data.user;
  },

  // Обновление профиля
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data.user;
  },
};

export default api; 