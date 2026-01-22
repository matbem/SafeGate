import pytest
from unittest.mock import AsyncMock
from fastapi import HTTPException
from app.api.v1.access import verify_access
from app.schemas.access import AccessVerifyRequest
from datetime import datetime

@pytest.mark.asyncio
async def test_database_failure_during_logging():
    mock_service = AsyncMock()
    mock_service.verify_entrance.side_effect = Exception("DB Connection Refused")

    payload = AccessVerifyRequest(
        qr_token="valid-uuid", 
        image_base64="data...",
        timestamp=str(datetime.now())
    )
    
    with pytest.raises(HTTPException) as exc_info:
        await verify_access(data=payload, access_service=mock_service)
    
    assert exc_info.value.status_code == 500