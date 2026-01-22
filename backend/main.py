import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from loguru import logger

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.api.v1 import access, admin, auth
from app.db.session import async_session_maker
from app.db.repositories.employee_repo import EmployeeRepository
from app.db.repositories.log_repo import LogRepository
from app.services.user_services import UserService

async def schedule_log_pruning():
    """
    Background task executing the data retention policy,
    scheduled to run once per day
    """
    while True:
        try:
            logger.info("Automatyczne czyszczenie logów: Rozpoczęto sprawdzanie retencji danych (6 miesięcy).")
            
            async with async_session_maker() as session:
                employee_repo = EmployeeRepository(session)
                log_repo = LogRepository(session)
                user_service = UserService(employee_repo, log_repo)
                
                cutoff_date = datetime.now(timezone.utc) - timedelta(days=182)
                
                result = await user_service.prune_old_logs(cutoff_date)
                
                logger.success(f"Auto-purge zakończony. Usunięto rekordów: {result['deleted_count']}.")
                
        except Exception as e:
            logger.error(f"Błąd krytyczny podczas automatycznego czyszczenia logów: {str(e)}")
    
        await asyncio.sleep(86400)

@asynccontextmanager
async def lifespan(app: FastAPI):
    pruning_task = asyncio.create_task(schedule_log_pruning())
    yield
    pruning_task.cancel()

app = FastAPI(title="SafeGate API", lifespan=lifespan)

# Cors Middleware config
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(access.router, prefix="/api/v1/access", tags=["Access"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])