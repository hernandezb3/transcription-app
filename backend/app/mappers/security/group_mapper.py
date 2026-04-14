from datetime import datetime, timezone
from app.data_models.security.group import GroupCreate, GroupUpdate


class GroupMapper:
    @staticmethod
    def _utc_now_naive() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def to_create_values(group: GroupCreate) -> dict:
        data = group.model_dump(exclude_unset=True)
        now = GroupMapper._utc_now_naive()
        data.setdefault("created_at", now)
        data.setdefault("updated_at", now)
        data.setdefault("status", "active")
        data.setdefault("group_type", "security")
        return data

    @staticmethod
    def to_update_values(group: GroupUpdate) -> dict:
        data = group.model_dump(exclude_unset=True)
        data["updated_at"] = GroupMapper._utc_now_naive()
        return data
