from fastapi import APIRouter, Query
import math

from app.data_models.security.user_group import UserGroupCreate, UserGroupUpdate
from app.repositories.security.user_group.controller import UserGroupRepository

router = APIRouter(prefix="/user-groups")

@router.post("/")
async def create_user_group(user_group: UserGroupCreate):
    result = await UserGroupRepository().create_user_group(user_group)
    return result

@router.get("/{user_group_id}")
async def get_user_group(user_group_id: int):
    result = await UserGroupRepository().aget_user_group(user_group_id)
    data = result.get("data")
    return data

@router.put("/{user_group_id}")
async def update_user_group(user_group: UserGroupUpdate, user_group_id: int):
    result = await UserGroupRepository().update_user_group(user_group, user_group_id)
    return result

@router.delete("/{user_group_id}")
async def delete_user_group(user_group_id: int):
    result = await UserGroupRepository().delete_user_group(user_group_id)
    return result

@router.get("/")
async def list_user_groups(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=500),
):
    offset = (page - 1) * limit
    repository = UserGroupRepository()
    result = await repository.list_user_groups(limit=limit, offset=offset)
    count_result = await repository.count_user_groups()
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
    result = await UserGroupRepository().list_by_user(user_id=user_id, limit=limit, offset=offset)
    data = result.get("data") if isinstance(result, dict) else []
    return {"items": data, "page": page, "limit": limit}

@router.get("/by-group/{group_id}")
async def list_by_group(group_id: int, page: int = Query(default=1, ge=1), limit: int = Query(default=10, ge=1, le=500)):
    offset = (page - 1) * limit
    result = await UserGroupRepository().list_by_group(group_id=group_id, limit=limit, offset=offset)
    data = result.get("data") if isinstance(result, dict) else []
    return {"items": data, "page": page, "limit": limit}
