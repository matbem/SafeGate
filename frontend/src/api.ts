import axios from 'axios';
import type {VerifyRequest, VerifyResponse} from './types';

// Adres backendu (możesz zmienić na localhost:8000 lub inny)
const API_URL = 'http://localhost:8000';

export const api = {
  verifyAccess: async (data: VerifyRequest): Promise<VerifyResponse> => {
    try {
      // POST /api/v1/access/verify
      const response = await axios.post<VerifyResponse>(`${API_URL}/api/v1/access/verify`, data);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        return error.response.data as VerifyResponse;
      }
      throw new Error('Błąd komunikacji z serwerem');
    }
  }
};