from pydantic import BaseModel
from typing import Optional

# Modele danych na podstawie specyfikacji [cite: 160-174]
class LoginRequest(BaseModel):
    username: str
    password: str

class UserInfo(BaseModel):
    id: int
    role: str
    last_login: str

class LoginResponse(BaseModel):
    success: bool
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: UserInfo