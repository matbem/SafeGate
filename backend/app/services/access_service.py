from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from app.services.image_facade_service import ImageProcessingFacade
from app.db.repositories.log_repo import LogRepository
from app.db.repositories.employee_repo import EmployeeRepository
from loguru import logger

class AccessService:
    """
    Bussiness logic of access control.
    """
    
    def __init__(self):
        self.image_processor = ImageProcessingFacade()
        self.log_repo = LogRepository()  # Dependency Injection
        self.employee_repo = EmployeeRepository()

    async def verify_entrance(self, qr_token: str, image_base64: str) -> Dict[str, Any]:
        """
        Main method to verify entrance based on QR token and live image.
        Parameters:
        - qr_token: str - QR code token from the user
        - image_base64: str - Base64 encoded image from the camera
        Returns:
        - Dict with access decision and details
        """

        logger.info(f"Verifying access for QR Token: {qr_token}")
        
        # Etap 1: Weryfikacja QR (Fail-Fast) 
        user = await self.employee_repo.get_by_qr(qr_token)
        
        # MOCK danych użytkownika na potrzeby przykładu
        # user = self._mock_get_user_by_token(qr_token)
        logger.debug(f"User fetched from DB: {user}")

        if not user:
            await self._log_attempt(status="INVALID_QR", employee_id=None)
            return {
                "access_granted": False, 
                "error_code": "INVALID_QR", 
                "message": "Wrong or expired QR token."
            }
        

        if user['qr_valid_until'] < datetime.now():
            await self._log_attempt(status="INVALID_QR", employee_id=user['id'])
            return {
                "access_granted": False, 
                "error_code": "EXPIRED_QR", 
                "message": "QR token has expired."
            }

        face_verification = self.image_processor.process_verification_request(
            image_base64=image_base64,
            known_encoding=user['face_encoding']
        )
        logger.debug(f"Face verification result: {face_verification}")

        if face_verification['success']:
            await self._log_attempt(
                status=face_verification['status'], 
                employee_id=user['id'],
                confidence=face_verification.get('confidence_score', 0.0)
            )
            return {
                "access_granted": True,
                "error_code": face_verification['status'],
                "message": "Access granted.",}
        
        await self._log_attempt(
            status=face_verification['status'], 
            employee_id=user['id'], 
            confidence=face_verification.get('confidence_score', 0.0)
        )
        return {
            "access_granted": False,
            "error_code": face_verification['status'],
            "message": face_verification.get('error_message', 'Access denied.')
        }
    

    async def _log_attempt(self, status: str, employee_id: Optional[int], confidence: float = 0.0):
        """
        Loggging access attempt to the database.
        """
        logger.debug(f"Logging access attempt: status={status}, employee_id={employee_id}, confidence={confidence}")
        # await self.log_repo.create(...)

    def _mock_get_user_by_token(self, token):
        """Pomocnicza funkcja mockująca bazę danych."""
        if token == "valid_token_123":
            return {
                "id": 1,
                "full_name": "Jan Kowalski",
                "qr_valid_until": datetime(2030, 1, 1),
                # Przykładowy wektor (mock)
                "face_encoding": [-0.1] * 128 
            }
        return None
    
    async def get_history(self, employee_id: int, limit: int = 10):
        """ 
        Fetches access history for a given employee.
        """
        return await self.log_repo.get_employee_history(employee_id, limit)