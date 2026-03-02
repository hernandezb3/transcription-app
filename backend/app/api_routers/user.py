from fastapi import APIRouter, Header, Query
from repositories.user.controller import UserRepository
from typing import Optional
from data_models.user import UserCreate, UserUpdate
import math

router = APIRouter(prefix="/users")

@router.post("/")
async def create_user(user: UserCreate):
    result = await UserRepository().create_user(user)
    result.get("data")
    return result

@router.get("/{user_id}")
async def get_user(user_id: int):
    result = await UserRepository().aget_user(user_id)
    data = result.get("data")
    return data

@router.put("/{user_id}")
async def update_user(user: UserUpdate,user_id: int):
    result = await UserRepository().update_user(user,user_id)
    return result

@router.delete("/{user_id}")
async def delete_user(user_id: int):
    result = await UserRepository().delete_user(user_id)
    return result

@router.get("/")
async def list_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
):
    offset = (page - 1) * limit

    repository = UserRepository()
    result = await repository.list_users(limit=limit, offset=offset)
    count_result = await repository.count_users()

    data = result.get("data") if isinstance(result, dict) else []
    total = 0

    if isinstance(count_result, dict):
        count_data = count_result.get("data", [])
        if count_data and isinstance(count_data[0], dict):
            total = int(count_data[0].get("total", 0) or 0)

    total_pages = math.ceil(total / limit) if total > 0 else 1

    return {
        "items": data,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
    }