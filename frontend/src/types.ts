// frontend/src/types.ts

// --- KIOSK TYPES ---
export interface VerifyRequest {
  qr_token: string;
  image_base64: string;
  timestamp: string; // ISO 8601
}

export interface VerifyResponse {
  access_granted: boolean;
  message: string;
  confidence_score?: number;
  door_unlock_duration_ms?: number;
  error_code?: string;
}

// frontend/src/types.ts

// --- Auth & Generic ---
export interface LoginResponse {
  success: boolean;
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserInfo;
}

export interface UserInfo {
  id: number;
  role: string;
  last_login: string;
}

// --- Kiosk / Verification ---
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

// --- Admin: Employees (Users) ---
export interface Employee {
  id: number;
  full_name: string;
  qr_token: string;
  qr_valid_until: string;
  reference_photo_base64?: string; // Dodane pole zdjęcia
  created_at?: string;
}

// Responses
export interface GetUsersResponse {
  success: boolean;
  users: Employee[];
  count: number;
}

export interface UserOperationsResponse {
  success: boolean;
  added_modified_count: number;
  errors?: string[];
}

// Requests
export interface AddUserRequest {
  users_list: Partial<Employee>[];
}

export interface UpdateUserListRequest {
  users_list: Partial<Employee>[];
}

export interface DeleteUserRequest {
  ids_to_delete: number[];
}

// --- Admin: Logs ---
export interface AccessLog {
  log_id: number;
  timestamp: string;
  status: string;
  confidence?: number;
  device_ip?: string;
  employee_id?: number;
  full_name?: string;
}

export interface GetLogsResponse {
  success: boolean;
  logs: AccessLog[];
}

export interface PruneLogsRequest {
  cutoff_date: string;
  confirm: boolean;
}

export interface PruneLogsResponse {
  success: boolean;
  deleted_count: number;
  message: string;
}

export interface CheckQrResponse {
  valid: boolean;
  message: string;
  employee_name?: string;
}