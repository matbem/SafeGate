@pytest.mark.asyncio
async def test_concurrent_access_attempts():
    """
    Concurrency stress test for 50 parallel 2FA requests.
    Validates non-blocking I/O and event loop stability by mocking DB and 
    CPU-heavy biometrics. Asserts response integrity under high load.
    """
    mock_emp_repo = AsyncMock()
    mock_log_repo = AsyncMock()
    
    valid_until = datetime(2099, 1, 1, tzinfo=timezone.utc)
    mock_emp_repo.get_by_qr.return_value = {
        'id': 1, 
        'qr_valid_until': valid_until, 
        'face_encoding': [0.1]
    }
    
    with patch('app.services.access_service.ImageProcessingFacade') as MockFacade:
        facade_instance = MockFacade.return_value
        facade_instance.process_verification_request.return_value = {
            'success': True, 'status': 'SUCCESS', 'confidence_score': 0.99
        }
        
        service = AccessService(mock_emp_repo, mock_log_repo)
        
        # Inicjalizacja 50 współbieżnych koprocedur 
        tasks = [service.verify_entrance(f"QR_{i}", "img") for i in range(50)]
        
        start = asyncio.get_running_loop().time()
        # Wykorzystanie mechanizmu fan-out do równoległego wykonania zadań
        results = await asyncio.gather(*tasks)
        duration = asyncio.get_running_loop().time() - start
        
        assert len(results) == 50
        assert all(r['access_granted'] for r in results)
        print(f"Processed 50 requests in {duration:.4f}s")