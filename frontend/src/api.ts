// frontend/src/api.ts
import axios from 'axios';
import {
  type VerifyRequest,
  type VerifyResponse,
  type LoginResponse,
  type Employee,
  type AccessLog,
  type GetUsersResponse,
  type GetLogsResponse,
  type UserOperationsResponse,
  type PruneLogsResponse,
  type AddUserRequest,
  type UpdateUserListRequest,
  type DeleteUserRequest,
  type PruneLogsRequest
} from './types';

// Address of the backend API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

export const api = {
  // --- KIOSK ---
  verifyAccess: async (data: VerifyRequest): Promise<VerifyResponse> => {
    try {
      const response = await apiClient.post<VerifyResponse>('/access/verify', data);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data as VerifyResponse;
      }
      throw error;
    }
  },

  // --- AUTH ---
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const payload = { username, password };
    const response = await apiClient.post<LoginResponse>('/auth/login', payload);
    return response.data;
  },

  // --- ADMIN: USERS (Employees) ---
  
  // GET /users
  getUsers: async (): Promise<Employee[]> => {
    const response = await apiClient.get<GetUsersResponse>('/admin/users');
    return response.data.users || [];
  },

  // POST /add_user
  addUsers: async (users: Partial<Employee>[]): Promise<UserOperationsResponse> => {
    const payload: AddUserRequest = { users_list: users };
    const response = await apiClient.post<UserOperationsResponse>('/admin/add_user', payload);
    return response.data;
  },

  // PUT /users
  updateUsers: async (users: Partial<Employee>[]): Promise<UserOperationsResponse> => {
    const payload: UpdateUserListRequest = { users_list: users };
    const response = await apiClient.put<UserOperationsResponse>('/admin/users', payload);
    return response.data;
  },

  // DELETE /users
  deleteUsers: async (ids: number[]): Promise<UserOperationsResponse> => {
    const payload: DeleteUserRequest = { ids_to_delete: ids };
    // Axios DELETE with body requires the 'data' property
    const response = await apiClient.delete<UserOperationsResponse>('/admin/users', { data: payload });
    return response.data;
  },

  // GET /employees/{id}/history
  getEmployeeHistory: async (employeeId: number, limit: number = 10): Promise<AccessLog[]> => {
    const response = await apiClient.get<AccessLog[]>(`/admin/employees/${employeeId}/history`, {
      params: { limit }
    });
    return response.data;
  },

  // --- ADMIN: LOGS ---

  // GET /logs
  getLogs: async (timestamp?: string): Promise<AccessLog[]> => {
    // Default to fetch logs from epoch if no date provided, or handled by backend
    const since = timestamp || new Date(0).toISOString();
    const response = await apiClient.get<GetLogsResponse>('/admin/logs', {
      params: { timestamp: since }
    });
    return response.data.logs || [];
  },

  // DELETE /logs/prune
  pruneLogs: async (cutoffDate: string): Promise<PruneLogsResponse> => {
    const payload: PruneLogsRequest = { cutoff_date: cutoffDate, confirm: true };
    const response = await apiClient.delete<PruneLogsResponse>('/admin/logs/prune', { data: payload });
    return response.data;
  }
};