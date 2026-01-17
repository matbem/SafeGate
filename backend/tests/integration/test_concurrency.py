import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from app.services.access_service import AccessService

@pytest.mark.asyncio
async def test_concurrent_access_attempts():
    """Symulacja 50 jednoczesnych requestów (Stress Test)."""
    mock_emp_repo = AsyncMock()
    mock_log_repo = AsyncMock()
    mock_emp_repo.get_by_qr.return_value = {'id': 1, 'qr_valid_until': '2099-01-01', 'face_encoding': [0.1]}
    
    with patch('app.services.access_service.ImageProcessingFacade') as MockFacade:
        facade_instance = MockFacade.return_value
        # Symulacja pracy AI (bez sleep, czysta asynchroniczność)
        facade_instance.process_verification_request.return_value = {
            'success': True, 'status': 'SUCCESS', 'confidence_score': 0.99
        }
        
        service = AccessService(mock_emp_repo, mock_log_repo)
        
        # Generowanie 50 tasków
        tasks = [service.verify_entrance(f"QR_{i}", "img") for i in range(50)]
        
        start = asyncio.get_running_loop().time()
        results = await asyncio.gather(*tasks)
        duration = asyncio.get_running_loop().time() - start
        
        assert len(results) == 50
        assert all(r['access_granted'] for r in results)
        # Czas wykonania powinien być bliski 0 przy mockach, jeśli kod jest dobrze napisany async
        print(f"Processed 50 requests in {duration:.4f}s")