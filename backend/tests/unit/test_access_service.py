import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone, timedelta
from app.services.access_service import AccessService

@pytest.mark.asyncio
class TestAccessServicePartitions:
    
    @pytest.fixture
    def service_mocks(self):
        emp_repo = AsyncMock()
        log_repo = AsyncMock()
        with patch('app.services.access_service.ImageProcessingFacade') as MockFacade:
            facade_instance = MockFacade.return_value
            yield emp_repo, log_repo, facade_instance

    async def test_partition_invalid_qr(self, service_mocks):
        """Unknown QR -> Access Denied + NO image storage (GDPR compliance)."""
        emp_repo, log_repo, _ = service_mocks
        service = AccessService(emp_repo, log_repo)
        emp_repo.get_by_qr.return_value = None
        
        result = await service.verify_entrance("BAD_TOKEN", "base64_img")
        
        assert result['access_granted'] is False
        assert result['error_code'] == "INVALID_QR"
        
        # Verify that no image was stored for unauthorized tokens
        log_repo.create.assert_called_once()
        assert log_repo.create.call_args.kwargs['captured_image'] is None

    async def test_partition_expired_qr(self, service_mocks):
        """Expired QR -> Access Denied + Image stored (as evidence)."""
        emp_repo, log_repo, _ = service_mocks
        service = AccessService(emp_repo, log_repo)
        expired_date = datetime.now(timezone.utc) - timedelta(days=1)
        emp_repo.get_by_qr.return_value = {
            'id': 123, 'qr_valid_until': expired_date, 'face_encoding': []
        }
        
        result = await service.verify_entrance("EXPIRED", "base64_img")
        
        assert result['error_code'] == "EXPIRED_QR"
        assert log_repo.create.call_args.kwargs['captured_image'] == "base64_img"

    async def test_partition_success_access(self, service_mocks):
        """Valid QR and Face -> Access Granted."""
        emp_repo, log_repo, facade = service_mocks
        service = AccessService(emp_repo, log_repo)
        
        emp_repo.get_by_qr.return_value = {
            'id': 99, 
            'qr_valid_until': datetime.now(timezone.utc) + timedelta(hours=1),
            'face_encoding': [0.1]
        }
        facade.process_verification_request.return_value = {
            'success': True, 'status': 'SUCCESS', 'confidence_score': 0.98
        }
        
        result = await service.verify_entrance("VALID", "img")
        
        assert result['access_granted'] is True
        assert log_repo.create.call_args.kwargs['status'] == "SUCCESS"