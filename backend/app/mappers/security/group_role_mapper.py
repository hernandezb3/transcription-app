from datetime import datetime, timezone
from app.data_models.security.group_role import GroupRoleCreate, GroupRoleUpdate


class GroupRoleMapper:
    @staticmethod
    def _utc_now_naive() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def to_create_values(group_role: GroupRoleCreate) -> dict:
        data = group_role.model_dump(exclude_unset=True)
        now = GroupRoleMapper._utc_now_naive()
        data.setdefault("created_at", now)
        data.setdefault("updated_at", now)
        data.setdefault("assigned_at", now)
        data.setdefault("status", "active")
        return data

    @staticmethod
    def to_update_values(group_role: GroupRoleUpdate) -> dict:
        data = group_role.model_dump(exclude_unset=True)
        data["updated_at"] = GroupRoleMapper._utc_now_naive()
        return data
