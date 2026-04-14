import sqlalchemy

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.security.groups import GroupsT
from app.data_models.security.group import GroupCreate, GroupUpdate
from app.mappers.security.group_mapper import GroupMapper


class GroupRepository:
    def __init__(self):
        self.database = DatabaseFactory()

    async def list_groups(self, limit: int, offset: int = 0):
        query = sqlalchemy.select(
            GroupsT.id, GroupsT.name, GroupsT.code, GroupsT.description,
            GroupsT.group_type, GroupsT.parent_group_id, GroupsT.status,
            GroupsT.created_at, GroupsT.updated_at,
        ).order_by(GroupsT.id.asc()).limit(limit).offset(offset)
        result = await self.database.aread(query)
        return result

    async def count_groups(self):
        query = sqlalchemy.select(sqlalchemy.func.count(GroupsT.id).label("total"))
        result = await self.database.aread(query)
        return result

    async def aget_group(self, group_id: int):
        query = sqlalchemy.select(
            GroupsT.id, GroupsT.name, GroupsT.code, GroupsT.description,
            GroupsT.group_type, GroupsT.parent_group_id, GroupsT.status,
            GroupsT.created_at, GroupsT.updated_at,
        ).where(GroupsT.id == group_id)
        result = await self.database.aread(query)
        return result

    async def create_group(self, group: GroupCreate):
        group_data = GroupMapper.to_create_values(group)
        stmt = sqlalchemy.insert(GroupsT).values(group_data)
        result = await self.database.acreate(stmt)
        return result

    async def update_group(self, group: GroupUpdate, group_id: int):
        group_data = GroupMapper.to_update_values(group)
        stmt = sqlalchemy.update(GroupsT).where(GroupsT.id == group_id).values(group_data)
        result = await self.database.aupdate(stmt)
        return result

    async def delete_group(self, group_id: int):
        stmt = sqlalchemy.delete(GroupsT).where(GroupsT.id == group_id)
        result = await self.database.adelete(stmt)
        return result
