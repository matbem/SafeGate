from fastapi import APIRouter, HTTPException, status
from app.schemas.auth import LoginRequest, LoginResponse, UserInfo
from app.core.security import verify_password, create_access_token
from app.core.config import settings

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
async def login(creds: LoginRequest):
    """
    Endpoint: Logowanie Administratora
    Opis: Weryfikuje poświadczenia i zwraca token JWT.
    """
    user = get_username_from_db(creds.username)  # Funkcja pobierająca nazwę użytkownika z bazy -> do napisania w w integracji z bazą
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    access_token = create_access_token(subject=creds.username)
    
    return LoginResponse(
        success = True,
        access_token = access_token,
        expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user = UserInfo(
            id = user.id,
            role = user.role,
            last_login = user.last_login
        )
    )