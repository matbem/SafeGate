import axios from 'axios';
import {
  type VerifyRequest,
  type VerifyResponse,
  type LoginResponse,
  type User,
  type AccessLog
} from './types';

// Adres API (zakładamy, że backend działa na porcie 8000)
const API_URL = 'http://localhost:8000/api/v1';

// Konfiguracja klienta axios
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json', // Domyślnie wysyłamy JSON
  },
});

// Interceptor: Automatyczne dodawanie tokena do zapytań (jeśli jesteśmy zalogowani)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

export const api = {
  // --- KIOSK (Dla zwykłego użytkownika) ---
  verifyAccess: async (data: VerifyRequest): Promise<VerifyResponse> => {
    try {
      const response = await apiClient.post<VerifyResponse>('/access/verify', data);
      return response.data;
    } catch (error: any) {
      // Jeśli serwer zwróci błąd (np. 403 - Odmowa), i tak chcemy go obsłużyć w UI
      if (error.response && error.response.data) {
        return error.response.data as VerifyResponse;
      }
      throw new Error('Błąd komunikacji z serwerem dostępu');
    }
  },

  // --- ADMIN (Logowanie i Zarządzanie) ---

  // Logowanie: Teraz wysyła JSON {username, password}
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const payload = {
      username: username,
      password: password
    };

    // WAŻNE: Upewnij się, że w backendzie masz endpoint '/auth/login' obsługujący JSON!
    // Jeśli backend używa standardowego OAuth2 ('/login/access-token'), to wymagałby FormData.
    const response = await apiClient.post<LoginResponse>('/auth/login', payload);
    return response.data;
  },

  // Pobieranie logów wejść
  getLogs: async (): Promise<AccessLog[]> => {
    const response = await apiClient.get<AccessLog[]>('/admin/logs');
    return response.data;
  },

  // Pobieranie listy użytkowników
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/admin/users');
    return response.data;
  },

  // (Opcjonalnie) Tworzenie nowego użytkownika
  createUser: async (userData: Partial<User> & { password: string }): Promise<User> => {
    const response = await apiClient.post<User>('/admin/users', userData);
    return response.data;
  }
};