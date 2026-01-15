from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db.models import Admin

class AdminRepository:
    def __init__(self, session:AsyncSession):
        self.session = session

    async def get_by_username(self, username: str) -> Optional[Admin]:
        """
        Fetches admin user by username.
        """
        query = text("SELECT * FROM admins WHERE username = :username")
        result = await self.session.execute(query, {"username": username})
        return result.fetchone()
    
    async def update_last_login(self, admin_id: int) -> None:
        """
        Updates the last login timestamp for the admin user.
        """
        query = text("UPDATE admins SET last_login = NOW() WHERE id = :admin_id")
        await self.session.execute(query, {"admin_id": admin_id})
        await self.session.commit()