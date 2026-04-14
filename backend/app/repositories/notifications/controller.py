import sqlalchemy
from sqlalchemy import func

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.notifications import NotificationsT
from app.db_models.user import UsersT
from app.mappers.notification_mapper import NotificationMapper
from app.data_models.notification_models import NotificationCreate, NotificationEntry


class NotificationRepository:
    def __init__(self):
        self.database = DatabaseFactory()
        self.mapper = NotificationMapper()

    async def acreate(self, data: NotificationCreate) -> dict:
        """Insert a new notification."""
        stmt = sqlalchemy.insert(NotificationsT).values(**data.model_dump())
        return await self.database.acreate(stmt)

    async def alist(self, user_id: int, limit: int = 30, offset: int = 0, unread_only: bool = False) -> list[NotificationEntry]:
        """Paginated notification list for a user, most recent first."""
        query = (
            sqlalchemy.select(
                NotificationsT.id,
                NotificationsT.user_id,
                NotificationsT.actor_user_id,
                UsersT.display_name.label("actor_display_name"),
                NotificationsT.notification_type,
                NotificationsT.category,
                NotificationsT.priority,
                NotificationsT.title,
                NotificationsT.message,
                NotificationsT.route,
                NotificationsT.entity_type,
                NotificationsT.entity_id,
                NotificationsT.is_read,
                NotificationsT.read_at,
                NotificationsT.created_at,
            )
            .outerjoin(UsersT, NotificationsT.actor_user_id == UsersT.id)
            .where(NotificationsT.user_id == user_id)
        )
        if unread_only:
            query = query.where(NotificationsT.is_read == 0)

        query = query.order_by(NotificationsT.created_at.desc()).limit(limit).offset(offset)
        result = await self.database.aread(query)
        rows = result.get("data", [])
        return self.mapper.to_list(rows)

    async def acount_unread(self, user_id: int) -> int:
        """Count of unread notifications for a user."""
        query = (
            sqlalchemy.select(func.count(NotificationsT.id).label("total"))
            .where(NotificationsT.user_id == user_id, NotificationsT.is_read == 0)
        )
        result = await self.database.aread(query)
        rows = result.get("data", [])
        if rows:
            return rows[0].get("total", 0)
        return 0

    async def amark_read(self, notification_id: int) -> dict:
        """Mark a single notification as read."""
        now = self.mapper._utc_now_naive()
        stmt = (
            sqlalchemy.update(NotificationsT)
            .where(NotificationsT.id == notification_id)
            .values(is_read=1, read_at=now)
        )
        return await self.database.aupdate(stmt)

    async def amark_all_read(self, user_id: int) -> dict:
        """Mark all unread notifications as read for a user."""
        now = self.mapper._utc_now_naive()
        stmt = (
            sqlalchemy.update(NotificationsT)
            .where(NotificationsT.user_id == user_id, NotificationsT.is_read == 0)
            .values(is_read=1, read_at=now)
        )
        return await self.database.aupdate(stmt)

    async def adelete(self, notification_id: int) -> dict:
        """Hard-delete a notification."""
        stmt = sqlalchemy.delete(NotificationsT).where(NotificationsT.id == notification_id)
        return await self.database.adelete(stmt)

    async def aclear_all(self, user_id: int) -> dict:
        """Hard-delete all notifications for a user."""
        stmt = sqlalchemy.delete(NotificationsT).where(NotificationsT.user_id == user_id)
        return await self.database.adelete(stmt)
