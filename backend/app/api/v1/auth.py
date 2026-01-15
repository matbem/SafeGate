from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.auth import LoginRequest, LoginResponse, UserInfo
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.api.deps import get_admin_repository
from app.db.repositories.admin_repo import AdminRepository

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
async def login(
    creds: LoginRequest,
    admin_repo: AdminRepository = Depends(get_admin_repository)
    ):
    """
    Endpoint: Admin login
    """
    user = await admin_repo.get_by_username(creds.username)
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials")
    
    await admin_repo.update_last_login(user.id)
    
    access_token = create_access_token(subject=creds.username)
    
    return LoginResponse(
        success = True,
        access_token = access_token,
        expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user = UserInfo(
            id = user.id,
            role = user.role,
            last_login = str(user.last_login) if user.last_login else None
        )
    )