from datetime import datetime, timezone
from app.data_models.security.user_role import UserRoleCreate, UserRoleUpdate


class UserRoleMapper:
    @staticmethod
    def _utc_now_naive() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def to_create_values(user_role: UserRoleCreate) -> dict:
        data = user_role.model_dump(exclude_unset=True)
        now = UserRoleMapper._utc_now_naive()
        data.setdefault("created_at", now)
        data.setdefault("updated_at", now)
        data.setdefault("assigned_at", now)
        data.setdefault("status", "active")
        return data

    @staticmethod
    def to_update_values(user_role: UserRoleUpdate) -> dict:
        data = user_role.model_dump(exclude_unset=True)
        data["updated_at"] = UserRoleMapper._utc_now_naive()
        return data
