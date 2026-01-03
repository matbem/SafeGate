from fastapi import APIRouter, HTTPException, status
from app.schemas.auth import LoginRequest, LoginResponse, UserInfo

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
async def login(creds: LoginRequest):
    """
    Endpoint: Logowanie Administratora
    Opis: Weryfikuje poświadczenia i zwraca token JWT.
    """
    # Tutaj powinna znaleźć się logika weryfikacji hasła (np. hash)
    if creds.username == "admin" and creds.password == "super_secret_password123":
        # Mock odpowiedzi sukcesu [cite: 165-175]
        return LoginResponse(
            success=True,
            access_token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            expires_in=3600,
            user=UserInfo(
                id=1,
                role="admin",
                last_login="2024-11-27T09:15:00Z"
            )
        )
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nieprawidłowy login lub hasło."
    )