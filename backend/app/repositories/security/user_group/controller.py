import sqlalchemy

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.security.user_groups import UserGroupsT
from app.data_models.security.user_group import UserGroupCreate, UserGroupUpdate
from app.mappers.security.user_group_mapper import UserGroupMapper


class UserGroupRepository:
    def __init__(self):
        self.database = DatabaseFactory()

    async def list_user_groups(self, limit: int, offset: int = 0):
        query = sqlalchemy.select(
            UserGroupsT.id, UserGroupsT.user_id, UserGroupsT.group_id,
            UserGroupsT.membership_status, UserGroupsT.membership_type,
            UserGroupsT.joined_at, UserGroupsT.created_at, UserGroupsT.updated_at,
        ).order_by(UserGroupsT.id.asc()).limit(limit).offset(offset)
        result = await self.database.aread(query)
        return result

    async def count_user_groups(self):
        query = sqlalchemy.select(sqlalchemy.func.count(UserGroupsT.id).label("total"))
        result = await self.database.aread(query)
        return result

    async def aget_user_group(self, user_group_id: int):
        query = sqlalchemy.select(
            UserGroupsT.id, UserGroupsT.user_id, UserGroupsT.group_id,
            UserGroupsT.membership_status, UserGroupsT.membership_type,
            UserGroupsT.joined_at, UserGroupsT.created_at, UserGroupsT.updated_at,
        ).where(UserGroupsT.id == user_group_id)
        result = await self.database.aread(query)
        return result

    async def list_by_user(self, user_id: int, limit: int, offset: int = 0):
        query = sqlalchemy.select(
            UserGroupsT.id, UserGroupsT.user_id, UserGroupsT.group_id,
            UserGroupsT.membership_status, UserGroupsT.membership_type,
            UserGroupsT.joined_at, UserGroupsT.created_at, UserGroupsT.updated_at,
        ).where(UserGroupsT.user_id == user_id).order_by(UserGroupsT.id.asc()).limit(limit).offset(offset)
        result = await self.database.aread(query)
        return result

    async def list_by_group(self, group_id: int, limit: int, offset: int = 0):
        query = sqlalchemy.select(
            UserGroupsT.id, UserGroupsT.user_id, UserGroupsT.group_id,
            UserGroupsT.membership_status, UserGroupsT.membership_type,
            UserGroupsT.joined_at, UserGroupsT.created_at, UserGroupsT.updated_at,
        ).where(UserGroupsT.group_id == group_id).order_by(UserGroupsT.id.asc()).limit(limit).offset(offset)
        result = await self.database.aread(query)
        return result

    async def create_user_group(self, user_group: UserGroupCreate):
        check_query = sqlalchemy.select(UserGroupsT.id).where(
            UserGroupsT.user_id == user_group.user_id,
            UserGroupsT.group_id == user_group.group_id,
        )
        existing = await self.database.aread(check_query)
        if existing.get("status_code") == 200:
            return {"status_code": 409, "message": "This user-group assignment already exists.", "data": existing.get("data", [])}

        data = UserGroupMapper.to_create_values(user_group)
        stmt = sqlalchemy.insert(UserGroupsT).values(data)
        result = await self.database.acreate(stmt)
        return result

    async def update_user_group(self, user_group: UserGroupUpdate, user_group_id: int):
        data = UserGroupMapper.to_update_values(user_group)
        stmt = sqlalchemy.update(UserGroupsT).where(UserGroupsT.id == user_group_id).values(data)
        result = await self.database.aupdate(stmt)
        return result

    async def delete_user_group(self, user_group_id: int):
        stmt = sqlalchemy.delete(UserGroupsT).where(UserGroupsT.id == user_group_id)
        result = await self.database.adelete(stmt)
        return result
