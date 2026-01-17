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
        # --- ZABEZPIECZENIE: Jeśli token jest pusty lub None, nie szukaj w bazie ---
        if not qr_token:
            return None

        query = text("""
            SELECT id, full_name, face_encoding, qr_valid_until 
            FROM employees 
            WHERE qr_token = :qr_token
        """)
        
        result = await self.session.execute(query, {"qr_token": qr_token})
        row = result.fetchone()
        
        if row:
            # Konwersja wiersza na słownik
            return {
                "id": row.id,
                "full_name": row.full_name,
                # Obsługa formatu wektora (string z bazy -> list)
                "face_encoding": eval(row.face_encoding) if isinstance(row.face_encoding, str) else row.face_encoding,
                "qr_valid_until": row.qr_valid_until
            }
        return None

    async def create(self, user_data: Dict[str, Any]) -> int:
        """
        Creates a new employee. 
        Used in UserService.create_users_bulk.
        """
        query = text("""
            INSERT INTO employees (full_name, qr_token, qr_valid_until, face_encoding, reference_photo)
            VALUES (:full_name, :qr_token, :qr_valid_until, :face_encoding, :ref_photo)
            RETURNING id
        """)
        
        # Przygotowanie parametrów
        params = {
            "full_name": user_data["full_name"],
            "qr_token": user_data["qr_token"],
            "qr_valid_until": user_data["qr_valid_until"],
            # Konwersja listy floatów na string dla bazy (jeśli wymagane przez sterownik)
            "face_encoding": str(user_data["face_encoding"]), 
            "ref_photo": user_data.get("reference_photo", "") # Lub reference_photo_base64, zależnie co przychodzi z serwisu
        }
        
        result = await self.session.execute(query, params)
        await self.session.commit()
        return result.scalar()
    
    async def update(self, user_id: int, update_data: Dict[str, Any]) -> bool:
        """
        Updates an existing employee.
        Dynamically builds the SET clause based on provided keys.
        """
        set_clauses = []
        params = {"id": user_id}

        if "full_name" in update_data:
            set_clauses.append("full_name = :full_name")
            params["full_name"] = update_data["full_name"]
        if "qr_token" in update_data:
            set_clauses.append("qr_token = :qr_token")
            params["qr_token"] = update_data["qr_token"]
        if "qr_valid_until" in update_data:
            set_clauses.append("qr_valid_until = :qr_valid_until")
            params["qr_valid_until"] = update_data["qr_valid_until"]
        if "face_encoding" in update_data:
            set_clauses.append("face_encoding = :face_encoding")
            encoding = update_data["face_encoding"]
            params["face_encoding"] = str(encoding) if isinstance(encoding, list) else encoding
        if "reference_photo_base64" in update_data:
            set_clauses.append("reference_photo = :ref_photo")
            params["ref_photo"] = update_data["reference_photo_base64"]
        elif "reference_photo" in update_data:
            set_clauses.append("reference_photo = :ref_photo")
            params["ref_photo"] = update_data["reference_photo"]
        
        if not set_clauses:
            return False 
        
        query = text(f"""
            UPDATE employees 
            SET {', '.join(set_clauses)}
            WHERE id = :id
        """)

        result = await self.session.execute(query, params)
        await self.session.commit()
        return result.rowcount > 0
    
    async def delete_bulk(self, ids: List[int]) -> int:
        """
        Deletes multiple employees by IDs.
        Returns the number of deleted records.
        """
        if not ids:
            return 0
        
        query = text("""
            DELETE FROM employees 
            WHERE id = ANY(:ids)
        """)

        try:
            result = await self.session.execute(query, {"ids": ids})
            await self.session.commit()
            return result.rowcount
        except Exception as e:
            await self.session.rollback()
            raise e
        

    async def get_all(self) -> List[Dict[str, Any]]:
        """
        Fetches all employees.
        Used in UserService.get_all_users.
        """
        query = text("""
            SELECT id, full_name, qr_token, qr_valid_until, reference_photo
            FROM employees
            ORDER BY id DESC
        """)
        
        result = await self.session.execute(query)
        rows = result.fetchall()
        
        users = []
        for row in rows:
            users.append({
                "id": row.id,
                "full_name": row.full_name,
                "qr_token": row.qr_token,
                "qr_valid_until": row.qr_valid_until,
                # Mapujemy kolumnę z bazy na nazwę oczekiwaną przez frontend
                "reference_photo_base64": row.reference_photo 
            })
        
        return users