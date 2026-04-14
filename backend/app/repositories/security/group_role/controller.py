import sqlalchemy

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.security.group_roles import GroupRolesT
from app.data_models.security.group_role import GroupRoleCreate, GroupRoleUpdate
from app.mappers.security.group_role_mapper import GroupRoleMapper


class GroupRoleRepository:
    def __init__(self):
        self.database = DatabaseFactory()

    async def list_group_roles(self, limit: int, offset: int = 0):
        query = sqlalchemy.select(
            GroupRolesT.id, GroupRolesT.group_id, GroupRolesT.role_id,
            GroupRolesT.assigned_by_user_id, GroupRolesT.assignment_reason,
            GroupRolesT.assigned_at, GroupRolesT.expires_at, GroupRolesT.status,
            GroupRolesT.created_at, GroupRolesT.updated_at,
        ).order_by(GroupRolesT.id.asc()).limit(limit).offset(offset)
        result = await self.database.aread(query)
        return result

    async def count_group_roles(self):
        query = sqlalchemy.select(sqlalchemy.func.count(GroupRolesT.id).label("total"))
        result = await self.database.aread(query)
        return result

    async def aget_group_role(self, group_role_id: int):
        query = sqlalchemy.select(
            GroupRolesT.id, GroupRolesT.group_id, GroupRolesT.role_id,
            GroupRolesT.assigned_by_user_id, GroupRolesT.assignment_reason,
            GroupRolesT.assigned_at, GroupRolesT.expires_at, GroupRolesT.status,
            GroupRolesT.created_at, GroupRolesT.updated_at,
        ).where(GroupRolesT.id == group_role_id)
        result = await self.database.aread(query)
        return result

    async def list_by_group(self, group_id: int, limit: int, offset: int = 0):
        query = sqlalchemy.select(
            GroupRolesT.id, GroupRolesT.group_id, GroupRolesT.role_id,
            GroupRolesT.assigned_by_user_id, GroupRolesT.assignment_reason,
            GroupRolesT.assigned_at, GroupRolesT.expires_at, GroupRolesT.status,
            GroupRolesT.created_at, GroupRolesT.updated_at,
        ).where(GroupRolesT.group_id == group_id).order_by(GroupRolesT.id.asc()).limit(limit).offset(offset)
        result = await self.database.aread(query)
        return result

    async def create_group_role(self, group_role: GroupRoleCreate):
        data = GroupRoleMapper.to_create_values(group_role)
        stmt = sqlalchemy.insert(GroupRolesT).values(data)
        result = await self.database.acreate(stmt)
        return result

    async def update_group_role(self, group_role: GroupRoleUpdate, group_role_id: int):
        data = GroupRoleMapper.to_update_values(group_role)
        stmt = sqlalchemy.update(GroupRolesT).where(GroupRolesT.id == group_role_id).values(data)
        result = await self.database.aupdate(stmt)
        return result

    async def delete_group_role(self, group_role_id: int):
        stmt = sqlalchemy.delete(GroupRolesT).where(GroupRolesT.id == group_role_id)
        result = await self.database.adelete(stmt)
        return result
