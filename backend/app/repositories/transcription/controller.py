import sqlalchemy

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.transcription.transcription import TranscriptDetailsT, TranscriptSpeakersT

class TranscriptRepository:
    def __init__(self):
        self.database = DatabaseFactory()

    async def aget(self, transcript_id: int):
        query = sqlalchemy.select(
            TranscriptDetailsT.id,
            TranscriptDetailsT.transcription_id,
            TranscriptDetailsT.section_id,
            TranscriptDetailsT.speaker_id,
            TranscriptSpeakersT.display_name.label("speaker"),
            TranscriptDetailsT.begin_timestamp,
            TranscriptDetailsT.end_timestamp,
            TranscriptDetailsT.original_text,
            TranscriptDetailsT.edited_text,
            TranscriptDetailsT.tags,
            TranscriptDetailsT.is_active,
        ).outerjoin(
            TranscriptSpeakersT,
            TranscriptDetailsT.speaker_id == TranscriptSpeakersT.id,
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
            speaker_id=data.get("speaker_id"),
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

    # ── Section ordering helpers ──────────────────────────────────────

    async def aget_max_section_id(self, transcript_id: int) -> int:
        """Return the highest section_id for a transcript, or 0 if none."""
        query = sqlalchemy.select(
            sqlalchemy.func.coalesce(
                sqlalchemy.func.max(TranscriptDetailsT.section_id), 0
            ).label("max_section_id")
        ).where(
            TranscriptDetailsT.transcription_id == transcript_id,
            TranscriptDetailsT.is_active == 1,
        )
        result = await self.database.aread(query)
        rows = result.get("data", [])
        return rows[0]["max_section_id"] if rows else 0

    async def ashift_section_ids(self, transcript_id: int, from_position: int, delta: int = 1):
        """Shift section_ids by *delta* for every active row at or after *from_position*."""
        stmt = (
            sqlalchemy.update(TranscriptDetailsT)
            .where(
                TranscriptDetailsT.transcription_id == transcript_id,
                TranscriptDetailsT.section_id >= from_position,
                TranscriptDetailsT.is_active == 1,
            )
            .values(section_id=TranscriptDetailsT.section_id + delta)
        )
        return await self.database.aupdate(stmt)

    async def adeactivate_section(self, section_id: int):
        """Soft-delete a single section by primary key."""
        stmt = (
            sqlalchemy.update(TranscriptDetailsT)
            .where(TranscriptDetailsT.id == section_id)
            .values(is_active=0)
        )
        return await self.database.aupdate(stmt)

    async def aget_section(self, section_id: int):
        """Fetch a single section row by primary key."""
        query = sqlalchemy.select(
            TranscriptDetailsT.id,
            TranscriptDetailsT.transcription_id,
            TranscriptDetailsT.section_id,
            TranscriptDetailsT.is_active,
        ).where(TranscriptDetailsT.id == section_id)
        result = await self.database.aread(query)
        rows = result.get("data", [])
        return rows[0] if rows else None

    async def acompact_section_ids(self, transcript_id: int):
        """Re-number section_ids to be contiguous (1, 2, 3, …) for a transcript.

        Uses a sub-query that ranks rows by their current section_id and
        primary key, then assigns dense sequential ids.
        """
        # Fetch active sections in order and re-assign section_ids
        query = sqlalchemy.select(
            TranscriptDetailsT.id,
            TranscriptDetailsT.section_id,
        ).where(
            TranscriptDetailsT.transcription_id == transcript_id,
            TranscriptDetailsT.is_active == 1,
        ).order_by(TranscriptDetailsT.section_id.asc(), TranscriptDetailsT.id.asc())
        result = await self.database.aread(query)
        rows = result.get("data", [])
        for idx, row in enumerate(rows, start=1):
            if row["section_id"] != idx:
                await self.aupdate_section(row["id"], {"section_id": idx})
    