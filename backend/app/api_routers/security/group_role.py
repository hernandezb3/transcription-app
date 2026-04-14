from fastapi import APIRouter, Query
import math

from app.data_models.security.group_role import GroupRoleCreate, GroupRoleUpdate
from app.repositories.security.group_role.controller import GroupRoleRepository

router = APIRouter(prefix="/group-roles")

@router.post("/")
async def create_group_role(group_role: GroupRoleCreate):
    result = await GroupRoleRepository().create_group_role(group_role)
    return result

@router.get("/{group_role_id}")
async def get_group_role(group_role_id: int):
    result = await GroupRoleRepository().aget_group_role(group_role_id)
    data = result.get("data")
    return data

@router.put("/{group_role_id}")
async def update_group_role(group_role: GroupRoleUpdate, group_role_id: int):
    result = await GroupRoleRepository().update_group_role(group_role, group_role_id)
    return result

@router.delete("/{group_role_id}")
async def delete_group_role(group_role_id: int):
    result = await GroupRoleRepository().delete_group_role(group_role_id)
    return result

@router.get("/")
async def list_group_roles(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=500),
):
    offset = (page - 1) * limit
    repository = GroupRoleRepository()
    result = await repository.list_group_roles(limit=limit, offset=offset)
    count_result = await repository.count_group_roles()
    data = result.get("data") if isinstance(result, dict) else []
    total = 0
    if isinstance(count_result, dict):
        count_data = count_result.get("data", [])
        if count_data and isinstance(count_data[0], dict):
            total = int(count_data[0].get("total", 0) or 0)
    total_pages = math.ceil(total / limit) if total > 0 else 1
    return {"items": data, "page": page, "limit": limit, "total": total, "total_pages": total_pages}

@router.get("/by-group/{group_id}")
async def list_by_group(group_id: int, page: int = Query(default=1, ge=1), limit: int = Query(default=10, ge=1, le=500)):
    offset = (page - 1) * limit
    result = await GroupRoleRepository().list_by_group(group_id=group_id, limit=limit, offset=offset)
    data = result.get("data") if isinstance(result, dict) else []
    return {"items": data, "page": page, "limit": limit}
