from fastapi import Depends
from app.services.user_services import UserService
from app.db.repositories.employee_repo import EmployeeRepository
from app.db.repositories.log_repo import LogRepository #michał ważne dla ciebie jakie repo stworzyć!!!

def get_employee_repository() -> EmployeeRepository:
    return EmployeeRepository()

def get_log_repository() -> LogRepository:
    return LogRepository()

def get_user_service(
    employee_repo: EmployeeRepository = Depends(get_employee_repository),
    log_repo: LogRepository = Depends(get_log_repository)
) -> UserService:
    return UserService(
        employee_repo=employee_repo,
        log_repo=log_repo
    )