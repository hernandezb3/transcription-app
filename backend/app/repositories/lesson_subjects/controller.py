import sqlalchemy
from datetime import datetime

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.transcription.metadata import LessonSubjectsT
from app.mappers.lesson_subjects_mapper import LessonSubjectsMapper


class LessonSubjectsRepository:
    def __init__(self):
        self.database = DatabaseFactory()
        self.mapper = LessonSubjectsMapper()

    async def list(self):
        query = sqlalchemy.select(
            LessonSubjectsT.id,
            LessonSubjectsT.name,
            LessonSubjectsT.description,
            LessonSubjectsT.created,
            LessonSubjectsT.modified,
            LessonSubjectsT.active,
        ).where(LessonSubjectsT.active == 1)
        result = await self.database.aread(query)
        rows = result.get("data", [])
        return self.mapper.to_lesson_subject_list(rows)

    async def get(self, subject_id: int):
        query = sqlalchemy.select(
            LessonSubjectsT.id,
            LessonSubjectsT.name,
            LessonSubjectsT.description,
            LessonSubjectsT.created,
            LessonSubjectsT.modified,
            LessonSubjectsT.active,
        ).where(LessonSubjectsT.id == subject_id)
        result = await self.database.aread(query)
        rows = result.get("data", [])
        if not rows:
            return None
        return self.mapper.to_lesson_subject(rows[0])

    async def create(self, data: dict, user_id: int):
        now = datetime.utcnow()
        stmt = sqlalchemy.insert(LessonSubjectsT).values(
            name=data["name"],
            description=data.get("description"),
            created=now,
            created_by=user_id,
            modified=now,
            modified_by=user_id,
            active=1,
        )
        result = await self.database.acreate(stmt)
        return result

    async def update(self, subject_id: int, updates: dict):
        stmt = (
            sqlalchemy.update(LessonSubjectsT)
            .where(LessonSubjectsT.id == subject_id)
            .values(**updates)
        )
        result = await self.database.aupdate(stmt)
        return result

    async def delete(self, subject_id: int):
        """Soft delete — sets active = 0."""
        stmt = (
            sqlalchemy.update(LessonSubjectsT)
            .where(LessonSubjectsT.id == subject_id)
            .values(active=0)
        )
        result = await self.database.aupdate(stmt)
        return result
