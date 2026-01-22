from fastapi import APIRouter, HTTPException, Query, Depends
from app.schemas.admin import (
    AddUserRequest,
    UpdateUserListRequest,
    DeleteUserRequest,
    PruneLogsRequest,
    UserOperationsResponse,
    GetUsersResponse,
    GetLogsResponse,
    PruneLogsResponse
)
from app.api.deps import get_user_service, get_access_service
from app.services.access_service import AccessService
import datetime
from typing import List
from app.schemas.access import AccessLogRead

router = APIRouter()

@router.get("/users", response_model=GetUsersResponse)
async def get_users(user_service=Depends(get_user_service)):
    """
    Endpoint: Getting all users for admin panel
    """
    users = await user_service.get_all_users()
    
    if users and isinstance(users, list):
        return GetUsersResponse(success=True, users=users, count=len(users))
    return GetUsersResponse(success=False, users=[], count=0)

@router.post("/add_user", status_code=201, response_model=UserOperationsResponse)
async def add_users(payload: AddUserRequest, user_service=Depends(get_user_service)):
    """
   Endpint adding users for admin panel
    """
    users_dicts = [user.model_dump() for user in payload.users_list]

    result = await user_service.create_users_bulk(users_dicts)

    if result["errors"]:
        raise HTTPException(status_code=400, detail=result["errors"])
    
    return UserOperationsResponse(
        success=True,
        added_modified_count=result["added_count"]
    )

@router.put("/users", status_code=200, response_model=UserOperationsResponse)
async def update_users(payload: UpdateUserListRequest, user_service=Depends(get_user_service)):
    """
    Endpoint: Group user data update
    """
    users_dicts = [user.model_dump(exclude_unset=True) for user in payload.users_list]

    result = await user_service.update_users(users_dicts)
    if result["errors"]:
        raise HTTPException(status_code=400, detail=result["errors"])
    return UserOperationsResponse(
        success=True,
        added_modified_count=result["modified_count"]
    )

@router.delete("/users", status_code=200, response_model=UserOperationsResponse)
async def delete_users(payload: DeleteUserRequest, user_service=Depends(get_user_service)):
    """
    Endpoint: Deleting users
    """
    result = await user_service.delete_users(payload.ids_to_delete)

    if result["errors"]:
        raise HTTPException(status_code=400, detail=result["errors"])
    return UserOperationsResponse(
        success=True,
        added_modified_count=result["deleted_count"]
    )

@router.get("/employees/{employee_id}/history", response_model=List[AccessLogRead])
async def get_employee_access_history(
    employee_id: int,
    limit: int = 10,
    access_service: AccessService = Depends(get_access_service)
):
    return await access_service.get_history(employee_id, limit)

@router.get("/logs", response_model=GetLogsResponse)
async def get_logs(timestamp: datetime.datetime = Query(..., description="Format ISO 8601"), user_service=Depends(get_user_service)):
    """
    Endpoint: Getting logs for admin panel
    """
    logs = await user_service.get_logs(since=timestamp)
    
    if logs and isinstance(logs, list):
        return GetLogsResponse(success=True, logs=logs)
    return GetLogsResponse(success=False, logs=[])

@router.delete("/logs/prune", status_code=200, response_model=PruneLogsResponse)
async def prune_logs(payload: PruneLogsRequest, user_service=Depends(get_user_service)):
    """
    Endpoint: Pruning old logs
    """
    if not payload.confirm:
        raise HTTPException(status_code=400, detail="Brak potwierdzenia 'confirm'")
    
    try:
        cutoff_date = datetime.datetime.fromisoformat(payload.cutoff_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO 8601.")
    
    result = await user_service.prune_old_logs(cutoff_date=cutoff_date)

    if result["errors"] or not result:
        raise HTTPException(status_code=500, detail=str(result["errors"]))
    
    return PruneLogsResponse(
        success=True,
        deleted_count=result["deleted_count"],
        message=f"Successfully deleted {result['deleted_count']} logs older than {payload.cutoff_date}."
    )

@router.post("/users/{user_id}/regenerate-qr", status_code=200)
async def regenerate_user_qr(
    user_id: int, 
    user_service=Depends(get_user_service)
):
    """
    Force QR token regeneration for a specific user
    """
    result = await user_service.regenerate_qr_token(user_id)
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["errors"])
        
    return result