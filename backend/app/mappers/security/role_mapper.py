from datetime import datetime, timezone
from app.data_models.security.role import RoleCreate, RoleUpdate


class RoleMapper:
    @staticmethod
    def _utc_now_naive() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def to_create_values(role: RoleCreate) -> dict:
        data = role.model_dump(exclude_unset=True)
        now = RoleMapper._utc_now_naive()
        data.setdefault("created_at", now)
        data.setdefault("updated_at", now)
        data.setdefault("status", "active")
        data.setdefault("assignment_level", "both")
        return data

    @staticmethod
    def to_update_values(role: RoleUpdate) -> dict:
        data = role.model_dump(exclude_unset=True)
        data["updated_at"] = RoleMapper._utc_now_naive()
        return data
