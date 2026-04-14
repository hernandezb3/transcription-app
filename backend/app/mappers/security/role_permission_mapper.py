from datetime import datetime, timezone
from app.data_models.security.role_permission import RolePermissionCreate


class RolePermissionMapper:
    @staticmethod
    def _utc_now_naive() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def to_create_values(role_permission: RolePermissionCreate) -> dict:
        data = role_permission.model_dump(exclude_unset=True)
        now = RolePermissionMapper._utc_now_naive()
        data.setdefault("created_at", now)
        return data
