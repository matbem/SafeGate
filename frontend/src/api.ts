import axios from 'axios';
import type {
  VerifyRequest,
  VerifyResponse,
  UserData,
  UserOperationsResponse,
  GetLogsResponse
} from './types';

const API_URL = 'http://localhost:8000';

export const api = {
  // Weryfikacja (Bramka)
  verifyAccess: async (data: VerifyRequest): Promise<VerifyResponse> => {
    const response = await axios.post<VerifyResponse>(`${API_URL}/api/v1/verify`, data);
    return response.data;
  },

  // Logi (Admin)
  getLogs: async (sinceTimestamp: string): Promise<GetLogsResponse> => {
    const response = await axios.get<GetLogsResponse>(`${API_URL}/api/v1/logs`, {
      params: { timestamp: sinceTimestamp }
    });
    return response.data;
  },

  // Zarządzanie użytkownikami (Admin)
  addUser: async (users: UserData[]): Promise<UserOperationsResponse> => {
    const response = await axios.post<UserOperationsResponse>(`${API_URL}/api/v1/add_user`, {
      users_list: users
    });
    return response.data;
  },

  deleteUsers: async (ids: number[]): Promise<UserOperationsResponse> => {
    const response = await axios.delete<UserOperationsResponse>(`${API_URL}/api/v1/users`, {
      data: { ids_to_delete: ids }
    });
    return response.data;
  }
};