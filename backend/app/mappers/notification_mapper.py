from datetime import datetime, timezone

from app.data_models.notification_models import NotificationCreate, NotificationEntry
from app.mappers.shared import SharedMapper


class NotificationMapper:
    def __init__(self):
        self.shared = SharedMapper()

    @staticmethod
    def _utc_now_naive() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def to_create_values(
        user_id: int,
        title: str,
        message: str | None = None,
        actor_user_id: int | None = None,
        notification_type: str = "info",
        category: str = "mention",
        priority: str = "normal",
        route: str | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
    ) -> NotificationCreate:
        return NotificationCreate(
            user_id=user_id,
            actor_user_id=actor_user_id,
            notification_type=notification_type,
            category=category,
            priority=priority,
            title=title,
            message=message,
            route=route,
            entity_type=entity_type,
            entity_id=entity_id,
            is_read=0,
        )

    def to_list(self, rows: list[dict]) -> list[NotificationEntry]:
        return [NotificationEntry(**self.shared.normalize_nulls(r)) for r in rows]

    def to_single(self, row: dict) -> NotificationEntry:
        return NotificationEntry(**self.shared.normalize_nulls(row))
