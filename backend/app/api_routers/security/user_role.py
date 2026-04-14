from fastapi import APIRouter, Query
import math

from app.data_models.security.user_role import UserRoleCreate, UserRoleUpdate
from app.repositories.security.user_role.controller import UserRoleRepository

router = APIRouter(prefix="/user-roles")

@router.post("/")
async def create_user_role(user_role: UserRoleCreate):
    result = await UserRoleRepository().create_user_role(user_role)
    return result

@router.get("/{user_role_id}")
async def get_user_role(user_role_id: int):
    result = await UserRoleRepository().aget_user_role(user_role_id)
    data = result.get("data")
    return data

@router.put("/{user_role_id}")
async def update_user_role(user_role: UserRoleUpdate, user_role_id: int):
    result = await UserRoleRepository().update_user_role(user_role, user_role_id)
    return result

@router.delete("/{user_role_id}")
async def delete_user_role(user_role_id: int):
    result = await UserRoleRepository().delete_user_role(user_role_id)
    return result

@router.get("/")
async def list_user_roles(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=500),
):
    offset = (page - 1) * limit
    repository = UserRoleRepository()
    result = await repository.list_user_roles(limit=limit, offset=offset)
    count_result = await repository.count_user_roles()
    data = result.get("data") if isinstance(result, dict) else []
    total = 0
    if isinstance(count_result, dict):
        count_data = count_result.get("data", [])
        if count_data and isinstance(count_data[0], dict):
            total = int(count_data[0].get("total", 0) or 0)
    total_pages = math.ceil(total / limit) if total > 0 else 1
    return {"items": data, "page": page, "limit": limit, "total": total, "total_pages": total_pages}

@router.get("/by-user/{user_id}")
async def list_by_user(user_id: int, page: int = Query(default=1, ge=1), limit: int = Query(default=10, ge=1, le=500)):
    offset = (page - 1) * limit
    result = await UserRoleRepository().list_by_user(user_id=user_id, limit=limit, offset=offset)
    data = result.get("data") if isinstance(result, dict) else []
    return {"items": data, "page": page, "limit": limit}
