from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql+asyncpg://postgres:yourpassword@db:5432/safegate"

engine = create_async_engine(DATABASE_URL, echo=True)

async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

AsyncSessionLocal = async_session_maker

async def get_db():
    """
    Standard FastAPI dependency for database sessions.
    """
    async with AsyncSessionLocal() as session:
        yield session