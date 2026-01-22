from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from main import app
from app.api.deps import get_access_service
from datetime import datetime

client = TestClient(app)
mock_access_service = AsyncMock()

# Replaces real service with a mock in the FastAPI dependency injection system
app.dependency_overrides[get_access_service] = lambda: mock_access_service

def test_interface_misuse_missing_field():
    """
    Tests Pydantic schema enforcement. Returns 422 if mandatory 'image_base64' is missing.
    """
    payload = {"qr_token": "some-uuid", "timestamp": str(datetime.now())} 
    response = client.post("/api/v1/access/verify", json=payload)
    assert response.status_code == 422

def test_valid_interface_flow():
    """
    Verifies full API lifecycle. Checks if 200 OK is returned with all mandatory and optional fields.
    """
    mock_access_service.verify_entrance.return_value = {
        "access_granted": True,
        "error_code": "SUCCESS",
        "message": "Access granted.",
        "confidence_score": 0.99,
        "door_unlock_duration_ms": 5000
    }
    
    payload = {
        "qr_token": "123e4567-e89b-12d3-a456-426614174000",
        "image_base64": "data:image/png;base64,....",
        "timestamp": str(datetime.now())
    }
    
    response = client.post("/api/v1/access/verify", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["access_granted"] is True
    assert data["door_unlock_duration_ms"] == 5000