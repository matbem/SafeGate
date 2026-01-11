// frontend/src/types.ts

export interface VerifyRequest {
  qr_token: string;
  image_base64: string;
  timestamp: string;
}

export interface VerifyResponse {
  access_granted: boolean;
  message: string;
  confidence_score?: number;
  door_unlock_duration_ms?: number;
  error_code?: string;
}
export interface UserInfo {
  id: number;
  role: string;
  last_login: string;
}
export interface User {
  id: number;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean
}


export interface LoginResponse {
  success: boolean;
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserInfo;
}


export interface AccessLog {
  id: number;
  timestamp: string;
  user_id?: number;
  access_granted: boolean;
  verification_method: string;
  confidence_score?: number;
  image_path?: string;
}