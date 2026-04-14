from fastapi import APIRouter, Query
import math

from app.data_models.security.permission import PermissionCreate, PermissionUpdate
from app.repositories.security.permission.controller import PermissionRepository

router = APIRouter(prefix="/permissions")

@router.post("/")
async def create_permission(permission: PermissionCreate):
    result = await PermissionRepository().create_permission(permission)
    return result

@router.get("/{permission_id}")
async def get_permission(permission_id: int):
    result = await PermissionRepository().aget_permission(permission_id)
    data = result.get("data")
    return data

@router.put("/{permission_id}")
async def update_permission(permission: PermissionUpdate, permission_id: int):
    result = await PermissionRepository().update_permission(permission, permission_id)
    return result

@router.delete("/{permission_id}")
async def delete_permission(permission_id: int):
    result = await PermissionRepository().delete_permission(permission_id)
    return result

@router.get("/")
async def list_permissions(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=500),
):
    offset = (page - 1) * limit
    repository = PermissionRepository()
    result = await repository.list_permissions(limit=limit, offset=offset)
    count_result = await repository.count_permissions()
    data = result.get("data") if isinstance(result, dict) else []
    total = 0
    if isinstance(count_result, dict):
        count_data = count_result.get("data", [])
        if count_data and isinstance(count_data[0], dict):
            total = int(count_data[0].get("total", 0) or 0)
    total_pages = math.ceil(total / limit) if total > 0 else 1
    return {"items": data, "page": page, "limit": limit, "total": total, "total_pages": total_pages}
