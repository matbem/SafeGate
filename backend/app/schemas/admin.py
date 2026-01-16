from datetime import datetime

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserData(BaseModel):
    id: Optional[int] = None
    full_name: Optional[str] = None
    qr_token: Optional[str] = None
    qr_valid_until: Optional[datetime] = None
    reference_photo_base64: Optional[str] = None

class UserUpdateRequest(BaseModel):
    id: Optional[int] = None
    qr_token: Optional[str] = None
    full_name: Optional[str] = None
    qr_valid_until: Optional[datetime] = None
    reference_photo_base64: Optional[str] = None

class AddUserRequest(BaseModel):
    users_list: List[UserData]

class UpdateUserListRequest(BaseModel):
    users_list: List[UserUpdateRequest]

class DeleteUserRequest(BaseModel):
    ids_to_delete: List[int]
    
class PruneLogsRequest(BaseModel):
    cutoff_date: str
    confirm: bool

class UserOperationsResponse(BaseModel):
    success: bool
    added_modified_count: int
    #added_modified_ids: Optional[List[int]] = None
    errors: Optional[List[str]] = None

class GetUsersResponse(BaseModel):
    success: bool
    users: List[dict]
    count: int

class GetLogsResponse(BaseModel):
    success: bool
    logs: List[dict]

class PruneLogsResponse(BaseModel):
    success: bool
    deleted_count: int
    message: str
