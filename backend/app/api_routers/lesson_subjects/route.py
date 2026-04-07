from fastapi import APIRouter, HTTPException

from app.api_routers.lesson_subjects.data_model import (
    LessonSubject,
    LessonSubjectCreate,
    LessonSubjectUpdate,
)
from app.repositories.lesson_subjects.controller import LessonSubjectsRepository

router = APIRouter(prefix="/lesson-subjects")

repository = LessonSubjectsRepository()


@router.get("/")
async def get_all_lesson_subjects():
    data = await repository.list()
    return [LessonSubject(**row).model_dump() for row in data]


@router.get("/{subject_id}")
async def get_lesson_subject(subject_id: int):
    data = await repository.get(subject_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Lesson subject not found")
    return LessonSubject(**data).model_dump()


@router.post("/", status_code=201)
async def create_lesson_subject(body: LessonSubjectCreate):
    data = body.model_dump()
    # TODO: replace with actual authenticated user id
    result = await repository.create(data, user_id=1)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
    return result


@router.put("/{subject_id}")
async def update_lesson_subject(subject_id: int, body: LessonSubjectUpdate):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await repository.update(subject_id, updates)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
    return result


@router.delete("/{subject_id}", status_code=204)
async def delete_lesson_subject(subject_id: int):
    result = await repository.delete(subject_id)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
