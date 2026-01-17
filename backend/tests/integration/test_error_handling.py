import pytest
from unittest.mock import AsyncMock
from fastapi import HTTPException
from app.api.v1.access import verify_access
from app.schemas.access import AccessVerifyRequest

@pytest.mark.asyncio
async def test_database_failure_during_logging():
    """Awaria bazy po weryfikacji -> Fail-Secure (500 Internal Server Error)."""
    mock_service = AsyncMock()
    # Symulacja: kod działa, ale rzuca wyjątek przy próbie zapisu logu
    mock_service.verify_entrance.side_effect = Exception("DB Connection Refused")

    payload = AccessVerifyRequest(qr_token="valid-uuid", image_base64="data...")
    
    # Sprawdzamy czy API zwraca 500 zamiast "wisieć"
    with pytest.raises(HTTPException) as exc_info:
        await verify_access(data=payload, access_service=mock_service)
    
    assert exc_info.value.status_code == 500