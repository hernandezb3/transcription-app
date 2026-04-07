from fastapi import APIRouter, HTTPException

from app.api_routers.participants.data_model import (
    Participant,
    ParticipantCreate,
    ParticipantUpdate,
)
from app.repositories.participants.controller import ParticipantsRepository

router = APIRouter(prefix="/participants")

repository = ParticipantsRepository()


@router.get("/")
async def get_all_participants():
    data = await repository.list()
    return [Participant(**row).model_dump() for row in data]


@router.get("/{participant_id}")
async def get_participant(participant_id: int):
    data = await repository.get(participant_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Participant not found")
    return Participant(**data).model_dump()


@router.post("/", status_code=201)
async def create_participant(body: ParticipantCreate):
    data = body.model_dump()
    # TODO: replace with actual authenticated user id
    result = await repository.create(data, user_id=1)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
    return result


@router.put("/{participant_id}")
async def update_participant(participant_id: int, body: ParticipantUpdate):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await repository.update(participant_id, updates)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
    return result


@router.delete("/{participant_id}", status_code=204)
async def delete_participant(participant_id: int):
    result = await repository.delete(participant_id)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
