from fastapi import APIRouter, HTTPException, Depends

from app.api_routers.microphone_colors.data_model import (
    MicrophoneColor,
    MicrophoneColorCreate,
    MicrophoneColorUpdate,
)
from app.auth.dependencies import get_current_user_id
from app.repositories.microphone_colors.controller import MicrophoneColorsRepository

router = APIRouter(prefix="/microphone-colors")

repository = MicrophoneColorsRepository()


@router.get("/")
async def get_all_microphone_colors():
    data = await repository.list()
    return [MicrophoneColor(**row).model_dump() for row in data]


@router.get("/{color_id}")
async def get_microphone_color(color_id: int):
    data = await repository.get(color_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Microphone color not found")
    return MicrophoneColor(**data).model_dump()


@router.post("/", status_code=201)
async def create_microphone_color(
    body: MicrophoneColorCreate,
    current_user_id: int = Depends(get_current_user_id),
):
    data = body.model_dump()
    result = await repository.create(data, user_id=current_user_id)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
    return result


@router.put("/{color_id}")
async def update_microphone_color(color_id: int, body: MicrophoneColorUpdate):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await repository.update(color_id, updates)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
    return result


@router.delete("/{color_id}", status_code=204)
async def delete_microphone_color(color_id: int):
    result = await repository.delete(color_id)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
