import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone, timedelta
from app.services.access_service import AccessService

@pytest.mark.asyncio
async def test_valid_qr_wrong_face():
    """Scenario: Stolen card (Valid QR token, but biometric mismatch)."""
    mock_emp_repo = AsyncMock()
    mock_log_repo = AsyncMock()
    
    mock_emp_repo.get_by_qr.return_value = {
        'id': 777,
        'qr_valid_until': datetime.now(timezone.utc) + timedelta(days=1),
        'face_encoding': [0.5] * 128
    }
    
    with patch('app.services.access_service.ImageProcessingFacade') as MockFacade:
        facade = MockFacade.return_value
        facade.process_verification_request.return_value = {
            'success': False,
            'status': 'FACE_MISMATCH',
            'error_message': 'Distance too large',
            'confidence_score': 0.2
        }
        
        service = AccessService(mock_emp_repo, mock_log_repo)
        result = await service.verify_entrance("STOLEN_QR", "thief_face")
        
        assert result['access_granted'] is False
        assert result['error_code'] == "FACE_MISMATCH"
        
        call_args = mock_log_repo.create.call_args.kwargs
        assert call_args['employee_id'] == 777
        assert call_args['captured_image'] is not None