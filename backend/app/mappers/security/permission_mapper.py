from datetime import datetime, timezone
from app.data_models.security.permission import PermissionCreate, PermissionUpdate


class PermissionMapper:
    @staticmethod
    def _utc_now_naive() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def to_create_values(permission: PermissionCreate) -> dict:
        data = permission.model_dump(exclude_unset=True)
        now = PermissionMapper._utc_now_naive()
        data.setdefault("created_at", now)
        data.setdefault("updated_at", now)
        data.setdefault("status", "active")
        return data

    @staticmethod
    def to_update_values(permission: PermissionUpdate) -> dict:
        data = permission.model_dump(exclude_unset=True)
        data["updated_at"] = PermissionMapper._utc_now_naive()
        return data
