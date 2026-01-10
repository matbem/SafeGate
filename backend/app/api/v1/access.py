from fastapi import APIRouter, HTTPException
from app.schemas.access import AccessVerifyRequest, AccessVerifyResponse
from services.access_service import get_access_service, AccessService

router = APIRouter()

@router.post("/verify", response_model=AccessVerifyResponse)
async def verify_access(data: AccessVerifyRequest,
                        access_service: AccessService = get_access_service()):
    """
    Endpoint: Weryfikacja wejścia
    Opis: Odbiera token QR i klatkę wideo, zwraca decyzję o otwarciu drzwi.
    """

    try:
        result = await access_service.verify_entrance(
            qr_token=data.qr_token,
            image_base64=data.image_base64
        )
    
        if result['access_granted']:
            return AccessVerifyResponse(
                access_granted=True,
                message="Dostęp przyznany.",
                confidence_score=result.get('confidence_score'),
                door_unlock_duration_ms=result.get('door_unlock_duration_ms')
            )
        else:
            return AccessVerifyResponse(
                access_granted=False,
                message=result.get('message', 'Dostęp odmówiony.'),
                error_code=result.get('error_code')
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd serwera: {str(e)}")
    
