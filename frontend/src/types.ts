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

export interface UserData {
  id?: number;
  full_name?: string;
  qr_token?: string;
  qr_valid_until?: string;
  reference_photo_base64?: string;
}

export interface UserOperationsResponse {
  success: boolean;
  added_modified_count: number;
  errors?: string[];
}

export interface LogEntry {
  timestamp: string;
  user_id?: string;
  access_granted: boolean;
  message?: string;
}

export interface GetLogsResponse {
  success: boolean;
  logs: LogEntry[];
}
export interface LoginRequest {
  username: string;
  password: string;
}