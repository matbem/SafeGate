import axios from 'axios';
import type {
  VerifyRequest,
  VerifyResponse,
  LoginResponse,
  User,
  AccessLog
} from './types';

// Backend (FastAPI) zazwyczaj działa na jednym porcie dla wszystkich tras
const API_URL = 'http://localhost:8000/api/v1';


const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// INTERCEPTOR: Automatyczne dodawanie tokena do każdego zapytania (dla Admina)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const api = {

  verifyAccess: async (data: VerifyRequest): Promise<VerifyResponse> => {
    try {
      const response = await apiClient.post<VerifyResponse>('/access/verify', data);
      return response.data;
    } catch (error: any) {

      if (error.response && error.response.data) {
        return error.response.data as VerifyResponse; // Zwracamy błąd jako odpowiedź (żeby wyświetlić "Odmowa")
      }
      throw new Error('Błąd komunikacji z serwerem dostępu');
    }
  },


  login: async (username: string, password: string): Promise<LoginResponse> => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    // Endpoint to zazwyczaj /login/access-token
    const response = await apiClient.post<LoginResponse>('/login/access-token', formData, {
      headers: { 'Content-Type': 'multipart/form-data' } // Nadpisujemy nagłówek tylko tutaj
    });
    return response.data;
  },


  getLogs: async (): Promise<AccessLog[]> => {
    const response = await apiClient.get<AccessLog[]>('/admin/logs');
    return response.data;
  },


  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/admin/users');
    return response.data;
  },


  createUser: async (userData: Partial<User> & { password: string }): Promise<User> => {
    const response = await apiClient.post<User>('/admin/users', userData);
    return response.data;
  }
};