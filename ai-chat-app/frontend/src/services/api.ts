// frontend/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
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

// Response interceptor to handle auth errors
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

// frontend/src/services/auth.ts
import { api } from './api';

export interface LoginResponse {
  user: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  token: string;
}

export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (username: string, email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// frontend/src/services/chat.ts
import { api } from './api';

export const chatAPI = {
  createChat: async (title?: string, model?: string) => {
    const response = await api.post('/chat', { title, model });
    return response.data;
  },

  getChatHistory: async (page = 1, limit = 20) => {
    const response = await api.get(`/chat/history?page=${page}&limit=${limit}`);
    return response.data;
  },

  getChat: async (chatId: string) => {
    const response = await api.get(`/chat/${chatId}`);
    return response.data;
  },

  sendMessage: async (chatId: string, content: string, model?: string) => {
    const response = await api.post(`/chat/${chatId}/message`, { content, model });
    return response.data;
  },

  deleteChat: async (chatId: string) => {
    const response = await api.delete(`/chat/${chatId}`);
    return response.data;
  },
};

// frontend/src/services/document.ts
import { api } from './api';

export const documentAPI = {
  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    
    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getDocuments: async () => {
    const response = await api.get('/documents');
    return response.data;
  },

  analyzeDocument: async (documentId: string, question: string) => {
    const response = await api.post(`/documents/${documentId}/analyze`, { question });
    return response.data;
  },

  deleteDocument: async (documentId: string) => {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  },
};