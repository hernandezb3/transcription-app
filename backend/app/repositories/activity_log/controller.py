import sqlalchemy

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.transcription.transcription import TranscriptActivityLogT, TranscriptDetailsT
from app.db_models.user import UsersT
from app.data_models.transcript_overview import ActivityLogCreate
from app.mappers.activity_log_mapper import ActivityLogMapper


class ActivityLogRepository:
    def __init__(self):
        self.database = DatabaseFactory()
        self.mapper = ActivityLogMapper()

    async def acreate(self, data: ActivityLogCreate):
        """Insert a new activity log entry."""
        stmt = sqlalchemy.insert(TranscriptActivityLogT).values(
            **data.model_dump()
        )
        return await self.database.acreate(stmt)

    async def alist(self, transcription_id: int, limit: int = 20, actions: list[str] | None = None):
        """Return the most recent activity entries for a transcript, with user display names."""
        query = (
            sqlalchemy.select(
                TranscriptActivityLogT.id,
                TranscriptActivityLogT.transcription_id,
                TranscriptActivityLogT.action,
                TranscriptActivityLogT.section_id,
                TranscriptActivityLogT.summary,
                TranscriptActivityLogT.user_id,
                UsersT.display_name.label("user_display_name"),
                TranscriptActivityLogT.created_at,
                TranscriptDetailsT.id.label("section_db_id"),
            )
            .outerjoin(UsersT, TranscriptActivityLogT.user_id == UsersT.id)
            .outerjoin(
                TranscriptDetailsT,
                sqlalchemy.and_(
                    TranscriptDetailsT.transcription_id == TranscriptActivityLogT.transcription_id,
                    TranscriptDetailsT.section_id == TranscriptActivityLogT.section_id,
                    TranscriptDetailsT.is_active == 1,
                ),
            )
            .where(TranscriptActivityLogT.transcription_id == transcription_id)
            .order_by(TranscriptActivityLogT.created_at.desc())
            .limit(limit)
        )
        if actions:
            query = query.where(TranscriptActivityLogT.action.in_(actions))
        result = await self.database.aread(query)
        rows = result.get("data", [])
        return self.mapper.to_list_values(rows)

    async def alist_recent_edits(
        self,
        transcription_id: int,
        user_id: int | None = None,
        limit: int = 15,
    ):
        """Return recent *edit* activity entries joined with section detail.

        Only includes ``section_edited`` actions so the frontend can show a
        "pick up where you left off" list with enough info to scroll to a
        section.
        """
        query = (
            sqlalchemy.select(
                TranscriptActivityLogT.id,
                TranscriptActivityLogT.transcription_id,
                TranscriptActivityLogT.action,
                TranscriptActivityLogT.section_id,
                TranscriptActivityLogT.summary,
                TranscriptActivityLogT.user_id,
                UsersT.display_name.label("user_display_name"),
                TranscriptActivityLogT.created_at,
                # Section detail columns for the frontend
                TranscriptDetailsT.id.label("section_db_id"),
                TranscriptDetailsT.edited_text.label("section_edited_text"),
                TranscriptDetailsT.original_text.label("section_original_text"),
                TranscriptDetailsT.speaker.label("section_speaker"),
                TranscriptDetailsT.begin_timestamp.label("section_begin_timestamp"),
            )
            .outerjoin(UsersT, TranscriptActivityLogT.user_id == UsersT.id)
            .outerjoin(
                TranscriptDetailsT,
                sqlalchemy.and_(
                    TranscriptDetailsT.transcription_id == TranscriptActivityLogT.transcription_id,
                    TranscriptDetailsT.section_id == TranscriptActivityLogT.section_id,
                    TranscriptDetailsT.is_active == 1,
                ),
            )
            .where(
                TranscriptActivityLogT.transcription_id == transcription_id,
                TranscriptActivityLogT.action == "section_edited",
            )
        )

        if user_id is not None:
            query = query.where(TranscriptActivityLogT.user_id == user_id)

        # De-duplicate by section_id – keep only the most recent edit per section
        query = query.order_by(TranscriptActivityLogT.created_at.desc()).limit(limit * 3)

        result = await self.database.aread(query)
        rows = result.get("data", [])

        # De-dup in Python (keep first occurrence = most recent per section_id)
        seen_sections: set[int | None] = set()
        deduped: list[dict] = []
        for row in rows:
            sid = row.get("section_id")
            if sid in seen_sections:
                continue
            seen_sections.add(sid)
            deduped.append(row)
            if len(deduped) >= limit:
                break

        return deduped
