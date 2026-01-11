from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, List, Any

class EmployeeRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_qr(self, qr_token: str) -> Optional[Dict[str, Any]]:
        """
        Fetches user by QR token. 
        Used in AccessService.verify_entrance.
        """
        query = text("""
            SELECT id, full_name, face_encoding, qr_valid_until 
            FROM employees 
            WHERE qr_token = :qr_token
        """)
        
        result = await self.session.execute(query, {"qr_token": qr_token})
        row = result.fetchone()
        
        if row:
            # Convert row to dict and parse vector if necessary
            return {
                "id": row.id,
                "full_name": row.full_name,
                # Postgres vector returns as a string or list depending on driver
                # Ensure it returns a list of floats for the biometric engine
                "face_encoding":  eval(row.face_encoding) if isinstance(row.face_encoding, str) else row.face_encoding,
                "qr_valid_until": row.qr_valid_until
            }
        return None

    async def create(self, user_data: Dict[str, Any]) -> int:
        """
        Creates a new employee. 
        Used in UserService.create_users_bulk.
        """
        query = text("""
            INSERT INTO employees (full_name, qr_token, qr_valid_until, face_encoding, reference_photo_path, photo_integrity_hash)
            VALUES (:full_name, :qr_token, :qr_valid_until, :face_encoding, :ref_photo, :hash)
            RETURNING id
        """)
        
        # 'face_encoding' must be passed as a list of floats, pgvector handles the rest
        params = {
            "full_name": user_data["full_name"],
            "qr_token": user_data["qr_token"],
            "qr_valid_until": user_data["qr_valid_until"],
            "face_encoding": str(user_data["face_encoding"]), # Cast to string for SQL format if needed
            "ref_photo": user_data.get("reference_photo", ""),
            "hash": "hash_placeholder" # You should compute SHA256 of the photo here
        }
        
        result = await self.session.execute(query, params)
        await self.session.commit()
        return result.scalar()