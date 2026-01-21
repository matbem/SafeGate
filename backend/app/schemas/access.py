from pydantic import BaseModel, IPvAnyAddress
from typing import Optional, Union
from datetime import datetime

class AccessVerifyRequest(BaseModel):
    qr_token: str
    image_base64: str
    timestamp: str

class AccessVerifyResponse(BaseModel):
    access_granted: bool
    message: str
    confidence_score: Optional[float] = None
    door_unlock_duration_ms: Optional[int] = None
    error_code: Optional[str] = None 


class AccessLogRead(BaseModel):
    log_id: int
    timestamp: datetime
    status: str
    confidence: Optional[float] = None
    device_ip: Optional[Union[str, IPvAnyAddress]] = None
    employee_id: Optional[int] = None
    full_name: Optional[str] = None
    captured_image: Optional[str] = None 
    qr_content: Optional[str] = None

    class Config:
        from_attributes = True

class CheckQrRequest(BaseModel):
    qr_token: str

class CheckQrResponse(BaseModel):
    valid: bool
    message: str
    employee_name: str | None = None