from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.services.image_facade_service import ImageProcessingFacade
from app.db.repositories.log_repo import LogRepository
from app.db.repositories.employee_repo import EmployeeRepository
from loguru import logger
from app.db.models import AccessStatus

class AccessService:
    """
    Business logic of access control.
    """
    
    def __init__(self, employee_repo: EmployeeRepository, log_repo: LogRepository):
        self.image_processor = ImageProcessingFacade()
        self.log_repo = log_repo 
        self.employee_repo = employee_repo

    async def verify_entrance(self, qr_token: str, image_base64: str) -> Dict[str, Any]:
        """
        Main method to verify entrance based on QR token and live image.
        """
        logger.info(f"Verifying access for QR Token: {qr_token}")
        
        user = await self.employee_repo.get_by_qr(qr_token)

        if not user:
            logger.warning(f"QR Token '{qr_token}' not found in DB.")
            await self._log_attempt(
                status="INVALID_QR", 
                employee_id=None, 
                image=None,          
                qr_content=qr_token  
            )
            return {
                "access_granted": False, 
                "error_code": "INVALID_QR", 
                "message": "Invalid QR code."
            }
        
        if user['qr_valid_until'] < datetime.now(timezone.utc):
            await self._log_attempt(
                status="EXPIRED_QR", 
                employee_id=user['id'], 
                image=image_base64, 
                qr_content=qr_token
            )
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

        status_for_db = face_verification['status']
        valid_statuses = [e.value for e in AccessStatus]

        if face_verification['success']:
            status_for_db = "SUCCESS"
        else:
            if status_for_db == 'LIVENESS_FAILED':
                error_msg = face_verification.get('error_message', '')
                if "No face detected" in error_msg:
                    status_for_db = "NO_FACE"
                else:
                    status_for_db = "FACE_MISMATCH"
            elif status_for_db == 'ERROR':
                status_for_db = "FACE_MISMATCH"
            elif status_for_db not in valid_statuses:
                status_for_db = "FACE_MISMATCH"

        await self._log_attempt(
            status=status_for_db, 
            employee_id=user['id'], 
            confidence=face_verification.get('confidence_score', 0.0),
            image=image_base64,   
            qr_content=qr_token
        )

        if face_verification['success']:
            return {
                "access_granted": True,
                "error_code": "SUCCESS",
                "message": "Access granted.",
            }
        
        return {
            "access_granted": False,
            "error_code": face_verification['status'],
            "message": face_verification.get('error_message', 'Access denied.')
        }
    

    async def _log_attempt(self, status: str, employee_id: Optional[int], confidence: float = 0.0, image: Optional[str] = None, qr_content: Optional[str] = None):
        """
        Logging access attempt to the database.
        """
        await self.log_repo.create(
            status=status, 
            employee_id=employee_id, 
            confidence=confidence,
            captured_image=image,
            qr_content=qr_content
        )
    
    async def get_history(self, employee_id: int, limit: int = 10):
        return await self.log_repo.get_employee_history(employee_id, limit)
    
    async def validate_qr_token(self, qr_token: str) -> dict:
        """
        Performs a rapid validation check of the QR code existence and validity. 
        Logs failed attempts to the database for security auditing
        """
        user = await self.employee_repo.get_by_qr(qr_token)

        if not user:
            logger.warning(f"Pre-validation failed: QR Token '{qr_token}' not found.")
            await self._log_attempt(
                status="INVALID_QR",
                employee_id=None,
                confidence=0.0,
                image=None,
                qr_content=qr_token
            )
            return {
                "valid": False, 
                "message": "Invalid QR code", # Zmieniono na angielski
                "employee_name": None 
            }
        
        if user['qr_valid_until'] < datetime.now(timezone.utc):
            logger.warning(f"Pre-validation failed: QR Token for user {user['id']} expired.")
            await self._log_attempt(
                status="EXPIRED_QR",
                employee_id=user['id'],
                confidence=0.0,
                image=None,
                qr_content=qr_token
            )
            return {
                "valid": False, 
                "message": "QR token has expired", 
                "employee_name": None
            }

        return {
            "valid": True, 
            "message": "QR code valid", 
            "employee_name": user['full_name']
        }