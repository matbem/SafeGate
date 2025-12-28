from pydantic import BaseModel
from typing import List, Optional

class UserData(BaseModel):
    full_name: Optional[str] = None
    qr_token: Optional[str] = None
    qr_valid_until: Optional[str] = None
    reference_photo_base64: Optional[str] = None

class UserUpdateRequest(BaseModel):
    id: Optional[int] = None
    qr_token: Optional[str] = None
    full_name: Optional[str] = None
    qr_valid_until: Optional[str] = None
    reference_photo_base64: Optional[str] = None

class AddUserRequest(BaseModel):
    users_list: List[UserData]

class UpdateUserListRequest(BaseModel):
    users_list: List[UserUpdateRequest]

class DeleteUserRequest(BaseModel):
    ids_to_delete: List[int]
    tokens_to_delete: List[str]

class PruneLogsRequest(BaseModel):
    cutoff_date: str
    confirm: bool