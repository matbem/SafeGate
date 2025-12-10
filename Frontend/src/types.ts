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