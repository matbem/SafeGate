from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, List, Any

class LogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, employee_id: Optional[int], status: str, confidence: float, ip: str = "127.0.0.1"):
        """
        Logs an access attempt.
        Used in AccessService._log_attempt.
        """
        query = text("""
            INSERT INTO access_logs (employee_id, status, confidence, device_ip)
            VALUES (:employee_id, :status, :confidence, :ip)
        """)
        
        await self.session.execute(query, {
            "employee_id": employee_id,
            "status": status,
            "confidence": confidence,
            "ip": ip
        })
        await self.session.commit()
    
    async def get_employee_history(self, employee_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Fetches access log history for a given employee.
        """
        query = text("""
            SELECT timestamp, status, confidence, device_ip 
            FROM access_logs 
            WHERE employee_id = :emp_id 
            ORDER BY timestamp DESC 
            LIMIT :limit
        """)
        result = await self.session.execute(query, {"emp_id": employee_id, "limit": limit})
        return [dict(row._mapping) for row in result.fetchall()]