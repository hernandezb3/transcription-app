import sqlalchemy
from sqlalchemy import func, case, label

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.transcription.transcription import TranscriptThreadsT, ThreadPostsT
from app.db_models.user import UsersT
from app.mappers.transcript_threads_mapper import ThreadMapper
from app.data_models.transcript_threads import ThreadEntry, PostEntry, PostSearchHit


class TranscriptThreadsRepository:
    def __init__(self):
        self.database = DatabaseFactory()
        self.mapper = ThreadMapper()

    # ── Thread operations ──

    async def alist_threads(self, transcription_id: int, search: str | None = None) -> list[ThreadEntry]:
        """All active threads for a transcript, with post count and latest post date.

        When *search* is provided, only threads whose post bodies (or title)
        contain the search text are returned.
        """

        # Sub-query: count of active posts per thread and latest post timestamp
        post_stats = (
            sqlalchemy.select(
                ThreadPostsT.thread_id,
                func.count(ThreadPostsT.id).label("post_count"),
                func.max(ThreadPostsT.created_at).label("latest_post_at"),
            )
            .where(ThreadPostsT.is_active == 1)
            .group_by(ThreadPostsT.thread_id)
            .subquery()
        )

        query = (
            sqlalchemy.select(
                TranscriptThreadsT.id,
                TranscriptThreadsT.transcription_id,
                TranscriptThreadsT.title,
                TranscriptThreadsT.created_by,
                UsersT.display_name.label("created_by_name"),
                TranscriptThreadsT.created_at,
                func.coalesce(post_stats.c.post_count, 0).label("post_count"),
                post_stats.c.latest_post_at,
            )
            .outerjoin(UsersT, TranscriptThreadsT.created_by == UsersT.id)
            .outerjoin(post_stats, TranscriptThreadsT.id == post_stats.c.thread_id)
            .where(
                TranscriptThreadsT.transcription_id == transcription_id,
                TranscriptThreadsT.is_active == 1,
            )
            .order_by(
                func.coalesce(post_stats.c.latest_post_at, TranscriptThreadsT.created_at).desc()
            )
        )

        # When searching, keep threads that have a matching post body OR title
        if search:
            pattern = f"%{search}%"
            has_matching_post = sqlalchemy.exists(
                sqlalchemy.select(ThreadPostsT.id).where(
                    ThreadPostsT.thread_id == TranscriptThreadsT.id,
                    ThreadPostsT.is_active == 1,
                    ThreadPostsT.body.ilike(pattern),
                )
            )
            query = query.where(
                sqlalchemy.or_(
                    has_matching_post,
                    TranscriptThreadsT.title.ilike(pattern),
                )
            )

        result = await self.database.aread(query)
        rows = result.get("data", [])
        return self.mapper.to_thread_list(rows)

    async def aget_thread(self, thread_id: int) -> ThreadEntry | None:
        """Get a single thread by id."""
        query = (
            sqlalchemy.select(
                TranscriptThreadsT.id,
                TranscriptThreadsT.transcription_id,
                TranscriptThreadsT.title,
                TranscriptThreadsT.created_by,
                UsersT.display_name.label("created_by_name"),
                TranscriptThreadsT.created_at,
            )
            .outerjoin(UsersT, TranscriptThreadsT.created_by == UsersT.id)
            .where(
                TranscriptThreadsT.id == thread_id,
                TranscriptThreadsT.is_active == 1,
            )
        )
        result = await self.database.aread(query)
        rows = result.get("data", [])
        if not rows:
            return None
        return self.mapper.to_thread(rows[0])

    async def acreate_thread(self, transcription_id: int, title: str, user_id: int | None = None) -> dict:
        """Insert a new thread."""
        now = self.mapper.utc_now()
        stmt = sqlalchemy.insert(TranscriptThreadsT).values(
            transcription_id=transcription_id,
            title=title,
            created_by=user_id,
            created_at=now,
            is_active=1,
        )
        return await self.database.acreate(stmt)

    async def aupdate_thread(self, thread_id: int, values: dict) -> dict:
        """Update fields on a thread."""
        stmt = (
            sqlalchemy.update(TranscriptThreadsT)
            .where(TranscriptThreadsT.id == thread_id, TranscriptThreadsT.is_active == 1)
            .values(**values)
        )
        return await self.database.aupdate(stmt)

    async def adelete_thread(self, thread_id: int) -> dict:
        """Soft-delete a thread."""
        stmt = (
            sqlalchemy.update(TranscriptThreadsT)
            .where(TranscriptThreadsT.id == thread_id)
            .values(is_active=0)
        )
        return await self.database.aupdate(stmt)

    # ── Post operations ──

    async def alist_posts(self, thread_id: int) -> list[PostEntry]:
        """All active posts for a thread, ordered chronologically."""
        query = (
            sqlalchemy.select(
                ThreadPostsT.id,
                ThreadPostsT.thread_id,
                ThreadPostsT.parent_post_id,
                ThreadPostsT.body,
                ThreadPostsT.created_by,
                UsersT.display_name.label("created_by_name"),
                ThreadPostsT.created_at,
                ThreadPostsT.edited_at,
            )
            .outerjoin(UsersT, ThreadPostsT.created_by == UsersT.id)
            .where(
                ThreadPostsT.thread_id == thread_id,
                ThreadPostsT.is_active == 1,
            )
            .order_by(ThreadPostsT.created_at.asc(), ThreadPostsT.id.asc())
        )
        result = await self.database.aread(query)
        rows = result.get("data", [])
        return self.mapper.to_post_list(rows)

    async def acreate_post(self, thread_id: int, body: str, parent_post_id: int | None = None, user_id: int | None = None) -> dict:
        """Insert a new post."""
        now = self.mapper.utc_now()
        stmt = sqlalchemy.insert(ThreadPostsT).values(
            thread_id=thread_id,
            parent_post_id=parent_post_id,
            body=body,
            created_by=user_id,
            created_at=now,
            is_active=1,
        )
        return await self.database.acreate(stmt)

    async def aupdate_post(self, post_id: int, values: dict) -> dict:
        """Update fields on a post (body, edited_at)."""
        stmt = (
            sqlalchemy.update(ThreadPostsT)
            .where(ThreadPostsT.id == post_id, ThreadPostsT.is_active == 1)
            .values(**values)
        )
        return await self.database.aupdate(stmt)

    async def adelete_post(self, post_id: int) -> dict:
        """Soft-delete a post."""
        stmt = (
            sqlalchemy.update(ThreadPostsT)
            .where(ThreadPostsT.id == post_id)
            .values(is_active=0)
        )
        return await self.database.aupdate(stmt)

    # ── Search ──

    async def asearch_posts(self, transcription_id: int, query: str) -> list[PostSearchHit]:
        """Return posts whose body matches *query*, with thread context."""
        pattern = f"%{query}%"
        stmt = (
            sqlalchemy.select(
                ThreadPostsT.id,
                ThreadPostsT.thread_id,
                TranscriptThreadsT.title.label("thread_title"),
                ThreadPostsT.body,
                ThreadPostsT.created_by,
                UsersT.display_name.label("created_by_name"),
                ThreadPostsT.created_at,
            )
            .join(TranscriptThreadsT, ThreadPostsT.thread_id == TranscriptThreadsT.id)
            .outerjoin(UsersT, ThreadPostsT.created_by == UsersT.id)
            .where(
                TranscriptThreadsT.transcription_id == transcription_id,
                TranscriptThreadsT.is_active == 1,
                ThreadPostsT.is_active == 1,
                ThreadPostsT.body.ilike(pattern),
            )
            .order_by(ThreadPostsT.created_at.desc())
            .limit(50)
        )
        result = await self.database.aread(stmt)
        rows = result.get("data", [])
        return self.mapper.to_search_hit_list(rows)
