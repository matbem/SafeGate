import axios from 'axios';
import type {VerifyRequest, VerifyResponse} from './types';


// Definiujemy dwa osobne adresy dla różnych portów backendu
const ACCESS_API_URL = 'http://localhost:8000'; // Port dla Kiosku (Access)
const ADMIN_API_URL = 'http://localhost:8001';  // Port dla Admina (Admin/Auth)

export const api = {
  // Funkcja dla Kiosku - używa portu 8000
  verifyAccess: async (data: VerifyRequest): Promise<VerifyResponse> => {
    try {
      const response = await axios.post<VerifyResponse>(
        `${ACCESS_API_URL}/api/v1/access/verify`, // Użycie ACCESS_API_URL
        data
      );
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        return error.response.data as VerifyResponse;
      }
      throw new Error('Błąd komunikacji z serwerem dostępu');
    }
  },

  // NOWE: Funkcje dla Admina - używają portu 8001
  adminLogin: async (credentials: any) => {
    const response = await axios.post(`${ADMIN_API_URL}/api/v1/auth/login`, credentials);
    return response.data;
  },

  getUsers: async (token: string) => {
    const response = await axios.get(`${ADMIN_API_URL}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};