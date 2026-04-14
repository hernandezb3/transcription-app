import sqlalchemy
from sqlalchemy import func

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.transcription.transcription import TranscriptTodosT
from app.mappers.transcript_todos_mapper import TodoMapper
from app.data_models.transcript_todos import TodoEntry


class TranscriptTodosRepository:
    def __init__(self):
        self.database = DatabaseFactory()
        self.mapper = TodoMapper()

    async def alist(self, transcription_id: int) -> list[TodoEntry]:
        """All active todos for a transcript, ordered by sort_order then id."""
        query = (
            sqlalchemy.select(
                TranscriptTodosT.id,
                TranscriptTodosT.transcription_id,
                TranscriptTodosT.title,
                TranscriptTodosT.is_completed,
                TranscriptTodosT.sort_order,
                TranscriptTodosT.created_by,
                TranscriptTodosT.created_at,
                TranscriptTodosT.completed_at,
            )
            .where(
                TranscriptTodosT.transcription_id == transcription_id,
                TranscriptTodosT.is_active == 1,
            )
            .order_by(TranscriptTodosT.is_completed.asc(), TranscriptTodosT.sort_order.asc(), TranscriptTodosT.id.asc())
        )
        result = await self.database.aread(query)
        rows = result.get("data", [])
        return self.mapper.to_list(rows)

    async def acreate(self, transcription_id: int, title: str, sort_order: int = 0, user_id: int | None = None) -> dict:
        """Insert a new todo."""
        now = self.mapper.utc_now()
        stmt = sqlalchemy.insert(TranscriptTodosT).values(
            transcription_id=transcription_id,
            title=title,
            is_completed=0,
            sort_order=sort_order,
            created_by=user_id,
            created_at=now,
            is_active=1,
        )
        return await self.database.acreate(stmt)

    async def aupdate(self, todo_id: int, values: dict) -> dict:
        """Update fields on a todo (title, is_completed, sort_order)."""
        stmt = (
            sqlalchemy.update(TranscriptTodosT)
            .where(TranscriptTodosT.id == todo_id, TranscriptTodosT.is_active == 1)
            .values(**values)
        )
        return await self.database.aupdate(stmt)

    async def adelete(self, todo_id: int) -> dict:
        """Soft-delete a todo."""
        stmt = (
            sqlalchemy.update(TranscriptTodosT)
            .where(TranscriptTodosT.id == todo_id)
            .values(is_active=0)
        )
        return await self.database.aupdate(stmt)
