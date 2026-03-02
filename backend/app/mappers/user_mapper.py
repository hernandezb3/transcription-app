from datetime import datetime, timezone

from data_models.user import UserCreate, UserUpdate

class UserMapper:
    @staticmethod
    def _utc_now_naive() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def to_create_values(user: UserCreate, user_id: int = 1) -> dict:
        user_data = user.model_dump(exclude_unset=True)
        now = UserMapper._utc_now_naive()

        user_data.setdefault("created", now)
        user_data.setdefault("modified", now)
        user_data.setdefault("created_by", user_id)
        user_data.setdefault("modified_by", user_id)
        user_data.setdefault("active", 1)

        return user_data

    @staticmethod
    def to_update_values(user: UserUpdate, user_id: int = 1) -> dict:
        user_data = user.model_dump(exclude_unset=True)

        user_data.setdefault("modified", UserMapper._utc_now_naive())
        user_data.setdefault("modified_by", user_id)

        return user_data
