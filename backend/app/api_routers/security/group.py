from fastapi import APIRouter, Query
import math

from app.data_models.security.group import GroupCreate, GroupUpdate
from app.repositories.security.group.controller import GroupRepository

router = APIRouter(prefix="/groups")

@router.post("/")
async def create_group(group: GroupCreate):
    result = await GroupRepository().create_group(group)
    return result

@router.get("/{group_id}")
async def get_group(group_id: int):
    result = await GroupRepository().aget_group(group_id)
    data = result.get("data")
    return data

@router.put("/{group_id}")
async def update_group(group: GroupUpdate, group_id: int):
    result = await GroupRepository().update_group(group, group_id)
    return result

@router.delete("/{group_id}")
async def delete_group(group_id: int):
    result = await GroupRepository().delete_group(group_id)
    return result

@router.get("/")
async def list_groups(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=500),
):
    offset = (page - 1) * limit
    repository = GroupRepository()
    result = await repository.list_groups(limit=limit, offset=offset)
    count_result = await repository.count_groups()
    data = result.get("data") if isinstance(result, dict) else []
    total = 0
    if isinstance(count_result, dict):
        count_data = count_result.get("data", [])
        if count_data and isinstance(count_data[0], dict):
            total = int(count_data[0].get("total", 0) or 0)
    total_pages = math.ceil(total / limit) if total > 0 else 1
    return {"items": data, "page": page, "limit": limit, "total": total, "total_pages": total_pages}
