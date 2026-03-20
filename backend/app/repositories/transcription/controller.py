import sqlalchemy

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.transcription.transcription import TranscriptDetailsT

class TranscriptRepository:
    def __init__(self):
        self.database = DatabaseFactory()

    async def aget(self, transcript_id: int):
        query = sqlalchemy.select(
            TranscriptDetailsT.id,
            TranscriptDetailsT.transcription_id,
            TranscriptDetailsT.section_id,
            TranscriptDetailsT.speaker,
            TranscriptDetailsT.begin_timestamp,
            TranscriptDetailsT.end_timestamp,
            TranscriptDetailsT.original_text,
            TranscriptDetailsT.edited_text,
            TranscriptDetailsT.tags,
            TranscriptDetailsT.is_active,
        ).where(TranscriptDetailsT.transcription_id == transcript_id)
        result = await self.database.aread(query)
        return result

    async def aupdate_section(self, section_id: int, updates: dict):
        """Update a single transcript section by its primary key."""
        stmt = (
            sqlalchemy.update(TranscriptDetailsT)
            .where(TranscriptDetailsT.id == section_id)
            .values(**updates)
        )
        result = await self.database.aupdate(stmt)
        return result
    