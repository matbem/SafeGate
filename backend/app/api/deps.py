from fastapi import Depends
from sql.alchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.user_services import UserService
from app.db.repositories.employee_repo import EmployeeRepository
from app.db.repositories.log_repo import LogRepository

def get_employee_repository(session: AsyncSession = Depends(get_db)) -> EmployeeRepository:
    return EmployeeRepository(session)

def get_log_repository(session: AsyncSession = Depends(get_db)) -> LogRepository:
    return LogRepository(session)

def get_user_service(
    employee_repo: EmployeeRepository = Depends(get_employee_repository),
    log_repo: LogRepository = Depends(get_log_repository)
) -> UserService:
    return UserService(
        employee_repo=employee_repo,
        log_repo=log_repo
    )