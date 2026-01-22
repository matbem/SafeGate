from datetime import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, List, Any

class LogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self, 
        employee_id: Optional[int], 
        status: str, 
        confidence: float, 
        ip: str = "127.0.0.1", 
        captured_image: Optional[str] = None,
        qr_content: Optional[str] = None
    ):
        """
        Logs an access attempt with optional captured image (base64).
        """
        query = text("""
            INSERT INTO access_logs (employee_id, status, confidence, device_ip, captured_image, qr_content)
            VALUES (:employee_id, :status, :confidence, :ip, :captured_image, :qr_content)
        """)
        
        await self.session.execute(query, {
            "employee_id": employee_id,
            "status": status,
            "confidence": confidence,
            "ip": ip,
            "captured_image": captured_image,
            "qr_content": qr_content
        })
        await self.session.commit()
    
    async def get_employee_history(self, employee_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Fetches access log history for a given employee.
        """
        query = text("""
            SELECT log_id, timestamp, status, confidence, device_ip, captured_image, qr_content
            FROM access_logs 
            WHERE employee_id = :emp_id 
            ORDER BY timestamp DESC 
            LIMIT :limit
        """)
        result = await self.session.execute(query, {"emp_id": employee_id, "limit": limit})
        return [dict(row._mapping) for row in result.fetchall()]
    
    async def delete_older_than(self, cutoff_date: datetime) -> int:
        """
        Deletes logs older than the specified cutoff date.
        """
        query = text("""
            DELETE FROM access_logs 
            WHERE timestamp < :cutoff_date
        """)
        try:
            result = await self.session.execute(query, {"cutoff_date": cutoff_date})
            await self.session.commit()
            return result.rowcount
        except Exception as e:
            await self.session.rollback()
            raise e
        
    async def get_logs_since(self, since: datetime) -> List[Dict[str, Any]]:
        """
        Fetches logs since a specific timestamp.
        """
        query = text("""
            SELECT 
                l.log_id, 
                l.timestamp, 
                l.status, 
                l.confidence, 
                l.device_ip, 
                l.captured_image,
                l.qr_content,
                l.employee_id, 
                e.full_name
            FROM access_logs l
            LEFT JOIN employees e ON l.employee_id = e.id
            WHERE l.timestamp >= :since
            ORDER BY l.timestamp DESC
        """)
        result = await self.session.execute(query, {"since": since})
        return [dict(row._mapping) for row in result.fetchall()]