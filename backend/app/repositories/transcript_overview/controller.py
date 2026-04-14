import sqlalchemy
from sqlalchemy import func

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.transcription.transcription import (
    TranscriptsT,
    TranscriptDetailsT,
    TranscriptDetailsCommentsT,
    TranscriptSpeakersT,
)
from app.db_models.user import UsersT
from app.mappers.transcripts_mapper import TranscriptsMapper
from app.mappers.shared import SharedMapper


class TranscriptOverviewRepository:
    def __init__(self):
        self.database = DatabaseFactory()
        self.shared = SharedMapper()
        self.transcripts_mapper = TranscriptsMapper()

    async def aget_transcript_meta(self, transcript_id: int) -> dict | None:
        """Fetch core transcript row."""
        query = sqlalchemy.select(
            TranscriptsT.id,
            TranscriptsT.title,
            TranscriptsT.description,
            TranscriptsT.status,
            TranscriptsT.lesson_subject,
            TranscriptsT.lesson_number,
            TranscriptsT.tags,
            TranscriptsT.created,
            TranscriptsT.modified,
        ).where(TranscriptsT.id == transcript_id, TranscriptsT.active == 1)
        result = await self.database.aread(query)
        rows = result.get("data", [])
        if not rows:
            return None
        return self.transcripts_mapper.to_transcript(rows[0])

    async def aget_section_stats(self, transcript_id: int) -> dict:
        """Return total sections, edited sections, and duration bounds."""
        query = sqlalchemy.select(
            func.count(TranscriptDetailsT.id).label("total_sections"),
            func.count(
                sqlalchemy.case(
                    (
                        sqlalchemy.and_(
                            TranscriptDetailsT.edited_text.isnot(None),
                            TranscriptDetailsT.edited_text != TranscriptDetailsT.original_text,
                        ),
                        1,
                    )
                )
            ).label("edited_sections"),
            func.min(TranscriptDetailsT.begin_timestamp).label("min_ts"),
            func.max(TranscriptDetailsT.end_timestamp).label("max_ts"),
        ).where(
            TranscriptDetailsT.transcription_id == transcript_id,
            TranscriptDetailsT.is_active == 1,
        )
        result = await self.database.aread(query)
        rows = result.get("data", [])
        if not rows:
            return {"total_sections": 0, "edited_sections": 0, "min_ts": None, "max_ts": None}
        return self.shared.normalize_nulls(rows[0])

    async def aget_comment_count(self, transcript_id: int) -> int:
        query = sqlalchemy.select(
            func.count(TranscriptDetailsCommentsT.id).label("cnt")
        ).where(
            TranscriptDetailsCommentsT.transcription_id == transcript_id,
            TranscriptDetailsCommentsT.is_active == 1,
        )
        result = await self.database.aread(query)
        rows = result.get("data", [])
        return rows[0]["cnt"] if rows else 0

    async def aget_speakers(self, transcript_id: int) -> list[dict]:
        """Speakers with their section counts."""
        subq = (
            sqlalchemy.select(
                TranscriptDetailsT.speaker_id,
                func.count(TranscriptDetailsT.id).label("section_count"),
            )
            .where(
                TranscriptDetailsT.transcription_id == transcript_id,
                TranscriptDetailsT.is_active == 1,
                TranscriptDetailsT.speaker_id.isnot(None),
            )
            .group_by(TranscriptDetailsT.speaker_id)
            .subquery()
        )
        query = (
            sqlalchemy.select(
                TranscriptSpeakersT.id,
                TranscriptSpeakersT.display_name,
                TranscriptSpeakersT.speaker_label,
                func.coalesce(subq.c.section_count, 0).label("section_count"),
            )
            .outerjoin(subq, TranscriptSpeakersT.id == subq.c.speaker_id)
            .where(
                TranscriptSpeakersT.transcription_id == transcript_id,
                TranscriptSpeakersT.is_active == 1,
            )
        )
        result = await self.database.aread(query)
        return [self.shared.normalize_nulls(r) for r in result.get("data", [])]

    async def aget_recent_comments(self, transcript_id: int, limit: int = 5) -> list[dict]:
        """Most recent comments with user display names."""
        query = (
            sqlalchemy.select(
                TranscriptDetailsCommentsT.id,
                TranscriptDetailsCommentsT.section_id,
                TranscriptDetailsCommentsT.comment,
                TranscriptDetailsCommentsT.created_by,
                TranscriptDetailsCommentsT.created_at,
                UsersT.display_name.label("user_display_name"),
            )
            .outerjoin(UsersT, TranscriptDetailsCommentsT.created_by == UsersT.id)
            .where(
                TranscriptDetailsCommentsT.transcription_id == transcript_id,
                TranscriptDetailsCommentsT.is_active == 1,
            )
            .order_by(TranscriptDetailsCommentsT.created_at.desc())
            .limit(limit)
        )
        result = await self.database.aread(query)
        return [self.shared.normalize_nulls(r) for r in result.get("data", [])]
