from fastapi import APIRouter, HTTPException
from backend.app.schemas.access import AccessVerifyRequest, AccessVerifyResponse

router = APIRouter()

@router.post("/verify", response_model=AccessVerifyResponse)
async def verify_access(data: AccessVerifyRequest):
    """
    Endpoint: Weryfikacja wejścia
    Opis: Odbiera token QR i klatkę wideo, zwraca decyzję o otwarciu drzwi.
    Zgodnie z dokumentacją: [cite: 40-42]
    """
    # Tutaj następuje wywołanie silnika biometrycznego (Strategy Pattern)
    
    # Symulacja: Sukces (200 OK) [cite: 49-55]
    if data.qr_token == "valid_token":
        return AccessVerifyResponse(
            access_granted=True,
            message="Witaj, Michał Bober",
            confidence_score=0.94,
            door_unlock_duration_ms=5000
        )
    
    # Symulacja: Porażka - Błąd biometrii (403 Forbidden) [cite: 56-61]
    # W FastAPI 403 zwracamy jako exception lub sterujemy kodem odpowiedzi
    return AccessVerifyResponse(
        access_granted=False,
        error_code="FACE_MISMATCH",
        message="Weryfikacja biometryczna nie powiodła się."
    )