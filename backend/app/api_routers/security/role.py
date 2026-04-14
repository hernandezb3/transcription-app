from fastapi import APIRouter, Query
import math

from app.data_models.security.role import RoleCreate, RoleUpdate
from app.repositories.security.role.controller import RoleRepository

router = APIRouter(prefix="/roles")

@router.post("/")
async def create_role(role: RoleCreate):
    result = await RoleRepository().create_role(role)
    return result

@router.get("/{role_id}")
async def get_role(role_id: int):
    result = await RoleRepository().aget_role(role_id)
    data = result.get("data")
    return data

@router.put("/{role_id}")
async def update_role(role: RoleUpdate, role_id: int):
    result = await RoleRepository().update_role(role, role_id)
    return result

@router.delete("/{role_id}")
async def delete_role(role_id: int):
    result = await RoleRepository().delete_role(role_id)
    return result

@router.get("/")
async def list_roles(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=500),
):
    offset = (page - 1) * limit
    repository = RoleRepository()
    result = await repository.list_roles(limit=limit, offset=offset)
    count_result = await repository.count_roles()
    data = result.get("data") if isinstance(result, dict) else []
    total = 0
    if isinstance(count_result, dict):
        count_data = count_result.get("data", [])
        if count_data and isinstance(count_data[0], dict):
            total = int(count_data[0].get("total", 0) or 0)
    total_pages = math.ceil(total / limit) if total > 0 else 1
    return {"items": data, "page": page, "limit": limit, "total": total, "total_pages": total_pages}
