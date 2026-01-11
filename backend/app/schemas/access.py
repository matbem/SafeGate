from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Modele danych na podstawie specyfikacji [cite: 43-55]
class AccessVerifyRequest(BaseModel):
    qr_token: str
    image_base64: str
    timestamp: str

class AccessVerifyResponse(BaseModel):
    access_granted: bool
    message: str
    confidence_score: Optional[float] = None
    door_unlock_duration_ms: Optional[int] = None
    error_code: Optional[str] = None  # Używane w przypadku odmowy [cite: 59]

class AccessLogRead(BaseModel):
    timestamp: datetime
    status: str
    confidence: Optional[float]
    device_ip: Optional[str]

    class Config:
        from_attributes = True