from datetime import datetime, timezone
from app.data_models.security.user_group import UserGroupCreate, UserGroupUpdate


class UserGroupMapper:
    @staticmethod
    def _utc_now_naive() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def to_create_values(user_group: UserGroupCreate) -> dict:
        data = user_group.model_dump(exclude_unset=True)
        now = UserGroupMapper._utc_now_naive()
        data.setdefault("created_at", now)
        data.setdefault("updated_at", now)
        data.setdefault("membership_status", "active")
        data.setdefault("membership_type", "member")
        data.setdefault("joined_at", now)
        return data

    @staticmethod
    def to_update_values(user_group: UserGroupUpdate) -> dict:
        data = user_group.model_dump(exclude_unset=True)
        data["updated_at"] = UserGroupMapper._utc_now_naive()
        return data
