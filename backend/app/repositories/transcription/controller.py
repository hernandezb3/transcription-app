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
        ).where(
            TranscriptDetailsT.transcription_id == transcript_id,
            TranscriptDetailsT.is_active == 1,
        ).order_by(TranscriptDetailsT.section_id.asc(), TranscriptDetailsT.id.asc())
        result = await self.database.aread(query)
        return result

    async def acreate_section(self, data: dict):
        stmt = sqlalchemy.insert(TranscriptDetailsT).values(
            transcription_id=data["transcription_id"],
            section_id=data["section_id"],
            speaker=data.get("speaker"),
            begin_timestamp=data.get("begin_timestamp"),
            end_timestamp=data.get("end_timestamp"),
            original_text=data.get("original_text"),
            edited_text=data.get("edited_text"),
            tags=data.get("tags"),
            is_active=1,
        )
        return await self.database.acreate(stmt)

    async def adeactivate_by_transcript(self, transcript_id: int):
        stmt = (
            sqlalchemy.update(TranscriptDetailsT)
            .where(
                TranscriptDetailsT.transcription_id == transcript_id,
                TranscriptDetailsT.is_active == 1,
            )
            .values(is_active=0)
        )
        return await self.database.aupdate(stmt)

    async def aupdate_section(self, section_id: int, updates: dict):
        """Update a single transcript section by its primary key."""
        stmt = (
            sqlalchemy.update(TranscriptDetailsT)
            .where(TranscriptDetailsT.id == section_id)
            .values(**updates)
        )
        result = await self.database.aupdate(stmt)
        return result
    