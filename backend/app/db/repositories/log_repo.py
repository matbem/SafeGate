# backend/app/db/repositories/log_repo.py
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

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