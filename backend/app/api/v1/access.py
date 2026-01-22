from fastapi import APIRouter, HTTPException, Depends
from app.schemas.access import AccessVerifyRequest, AccessVerifyResponse
from app.services.access_service import AccessService
from app.api.deps import get_access_service

router = APIRouter()

@router.post("/verify", response_model=AccessVerifyResponse)
async def verify_access(data: AccessVerifyRequest,
                        access_service: AccessService = Depends(get_access_service)):
    """
    Entrance verification
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

from app.schemas.access import AccessVerifyRequest, AccessVerifyResponse, CheckQrRequest, CheckQrResponse # zaktualizuj import

@router.post("/check-qr", response_model=CheckQrResponse)
async def check_qr_validity(
    data: CheckQrRequest,
    access_service: AccessService = Depends(get_access_service)
):
    """
    Preliminary QR token validity check
    """
    result = await access_service.validate_qr_token(data.qr_token)
    return CheckQrResponse(**result)
    
