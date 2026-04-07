import sqlalchemy
from datetime import datetime

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.transcription.transcription import TranscriptFilesT


class TranscriptFilesRepository:
    def __init__(self):
        self.database = DatabaseFactory()

    async def create(self, data: dict):
        now = datetime.utcnow()
        stmt = sqlalchemy.insert(TranscriptFilesT).values(
            transcription_id=data["transcription_id"],
            file_name=data["file_name"],
            file_type=data.get("file_type"),
            file_path=data["file_path"],
            created_by=data.get("created_by", 1),
            created_at=now,
            is_active=1,
        )
        result = await self.database.acreate(stmt)
        return result

    async def list_by_transcript(self, transcription_id: int):
        query = sqlalchemy.select(
            TranscriptFilesT.id,
            TranscriptFilesT.transcription_id,
            TranscriptFilesT.file_name,
            TranscriptFilesT.file_type,
            TranscriptFilesT.file_path,
            TranscriptFilesT.created_by,
            TranscriptFilesT.created_at,
            TranscriptFilesT.is_active,
        ).where(
            TranscriptFilesT.transcription_id == transcription_id,
            TranscriptFilesT.is_active == 1,
        )
        result = await self.database.aread(query)
        return result.get("data", [])

    async def get(self, file_id: int):
        query = sqlalchemy.select(
            TranscriptFilesT.id,
            TranscriptFilesT.transcription_id,
            TranscriptFilesT.file_name,
            TranscriptFilesT.file_type,
            TranscriptFilesT.file_path,
            TranscriptFilesT.created_by,
            TranscriptFilesT.created_at,
            TranscriptFilesT.is_active,
        ).where(TranscriptFilesT.id == file_id)
        result = await self.database.aread(query)
        rows = result.get("data", [])
        if not rows:
            return None
        return rows[0]

    async def delete(self, file_id: int):
        """Soft delete — sets is_active = 0."""
        stmt = (
            sqlalchemy.update(TranscriptFilesT)
            .where(TranscriptFilesT.id == file_id)
            .values(is_active=0)
        )
        result = await self.database.aupdate(stmt)
        return result
