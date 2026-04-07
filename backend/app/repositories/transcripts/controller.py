import sqlalchemy
from datetime import datetime

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.transcription.transcription import TranscriptsT
from app.mappers.transcripts_mapper import TranscriptsMapper


class TranscriptsRepository:
    def __init__(self):
        self.database = DatabaseFactory()
        self.mapper = TranscriptsMapper()

    async def list(self):
        query = sqlalchemy.select(
            TranscriptsT.id,
            TranscriptsT.unique_id,
            TranscriptsT.title,
            TranscriptsT.description,
            TranscriptsT.status,
            TranscriptsT.microphone_color_id,
            TranscriptsT.participant_id,
            TranscriptsT.lesson_number,
            TranscriptsT.lesson_subject,
            TranscriptsT.tags,
            TranscriptsT.created,
            TranscriptsT.modified,
            TranscriptsT.active,
        ).where(TranscriptsT.active == 1)
        result = await self.database.aread(query)
        rows = result.get("data", [])
        return self.mapper.to_transcript_list(rows)

    async def get(self, transcript_id: int):
        query = sqlalchemy.select(
            TranscriptsT.id,
            TranscriptsT.unique_id,
            TranscriptsT.title,
            TranscriptsT.description,
            TranscriptsT.status,
            TranscriptsT.microphone_color_id,
            TranscriptsT.participant_id,
            TranscriptsT.lesson_number,
            TranscriptsT.lesson_subject,
            TranscriptsT.tags,
            TranscriptsT.created,
            TranscriptsT.modified,
            TranscriptsT.active,
        ).where(TranscriptsT.id == transcript_id)
        result = await self.database.aread(query)
        rows = result.get("data", [])
        if not rows:
            return None
        return self.mapper.to_transcript(rows[0])

    async def create(self, data: dict, user_id: int):
        now = datetime.utcnow()
        tags = self.mapper.serialize_tags(data.get("tags")) if data.get("tags") else None
        stmt = sqlalchemy.insert(TranscriptsT).values(
            unique_id=data.get("unique_id"),
            title=data["title"],
            description=data.get("description"),
            status="Active",
            microphone_color_id=data.get("microphone_color_id"),
            participant_id=data.get("participant_id"),
            lesson_number=data.get("lesson_number"),
            lesson_subject=data.get("lesson_subject"),
            tags=tags,
            created=now,
            created_by=user_id,
            modified=now,
            modified_by=user_id,
            active=1,
        )
        result = await self.database.acreate(stmt)
        return result

    async def update(self, transcript_id: int, updates: dict):
        if "tags" in updates:
            updates["tags"] = self.mapper.serialize_tags(updates["tags"])
        stmt = (
            sqlalchemy.update(TranscriptsT)
            .where(TranscriptsT.id == transcript_id)
            .values(**updates)
        )
        result = await self.database.aupdate(stmt)
        return result

    async def delete(self, transcript_id: int):
        """Soft delete — sets active = 0."""
        stmt = (
            sqlalchemy.update(TranscriptsT)
            .where(TranscriptsT.id == transcript_id)
            .values(active=0)
        )
        result = await self.database.aupdate(stmt)
        return result
