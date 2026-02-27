from fastapi import APIRouter, Header
from repositories.user.controller import UserRepository
from typing import Optional
from data_models.user import UserCreate, UserUpdate

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
async def list_users(limit: Optional[int] = 10):
    result = await UserRepository().list_users(limit)
    data = result.get("data")
    return data