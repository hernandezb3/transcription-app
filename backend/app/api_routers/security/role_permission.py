from fastapi import APIRouter, Query
import math

from app.data_models.security.role_permission import RolePermissionCreate
from app.repositories.security.role_permission.controller import RolePermissionRepository

router = APIRouter(prefix="/role-permissions")

@router.post("/")
async def create_role_permission(role_permission: RolePermissionCreate):
    result = await RolePermissionRepository().create_role_permission(role_permission)
    data = result.get("data")
    if isinstance(data, list) and len(data) > 0:
        return data[0]
    return data

@router.get("/by-role/{role_id}")
async def list_by_role(role_id: int, page: int = Query(default=1, ge=1), limit: int = Query(default=500, ge=1, le=500)):
    offset = (page - 1) * limit
    result = await RolePermissionRepository().list_by_role(role_id=role_id, limit=limit, offset=offset)
    data = result.get("data") if isinstance(result, dict) else []
    return {"items": data, "page": page, "limit": limit}

@router.get("/{role_permission_id}")
async def get_role_permission(role_permission_id: int):
    result = await RolePermissionRepository().aget_role_permission(role_permission_id)
    data = result.get("data")
    return data

@router.delete("/{role_permission_id}")
async def delete_role_permission(role_permission_id: int):
    result = await RolePermissionRepository().delete_role_permission(role_permission_id)
    return result

@router.get("/")
async def list_role_permissions(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=500),
):
    offset = (page - 1) * limit
    repository = RolePermissionRepository()
    result = await repository.list_role_permissions(limit=limit, offset=offset)
    count_result = await repository.count_role_permissions()
    data = result.get("data") if isinstance(result, dict) else []
    total = 0
    if isinstance(count_result, dict):
        count_data = count_result.get("data", [])
        if count_data and isinstance(count_data[0], dict):
            total = int(count_data[0].get("total", 0) or 0)
    total_pages = math.ceil(total / limit) if total > 0 else 1
    return {"items": data, "page": page, "limit": limit, "total": total, "total_pages": total_pages}
