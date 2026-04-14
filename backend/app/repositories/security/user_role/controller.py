import sqlalchemy

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.security.user_roles import UserRolesT
from app.data_models.security.user_role import UserRoleCreate, UserRoleUpdate
from app.mappers.security.user_role_mapper import UserRoleMapper


class UserRoleRepository:
    def __init__(self):
        self.database = DatabaseFactory()

    async def list_user_roles(self, limit: int, offset: int = 0):
        query = sqlalchemy.select(
            UserRolesT.id, UserRolesT.user_id, UserRolesT.role_id,
            UserRolesT.group_id, UserRolesT.assigned_by_user_id,
            UserRolesT.assignment_reason, UserRolesT.assigned_at,
            UserRolesT.expires_at, UserRolesT.status,
            UserRolesT.created_at, UserRolesT.updated_at,
        ).order_by(UserRolesT.id.asc()).limit(limit).offset(offset)
        result = await self.database.aread(query)
        return result

    async def count_user_roles(self):
        query = sqlalchemy.select(sqlalchemy.func.count(UserRolesT.id).label("total"))
        result = await self.database.aread(query)
        return result

    async def aget_user_role(self, user_role_id: int):
        query = sqlalchemy.select(
            UserRolesT.id, UserRolesT.user_id, UserRolesT.role_id,
            UserRolesT.group_id, UserRolesT.assigned_by_user_id,
            UserRolesT.assignment_reason, UserRolesT.assigned_at,
            UserRolesT.expires_at, UserRolesT.status,
            UserRolesT.created_at, UserRolesT.updated_at,
        ).where(UserRolesT.id == user_role_id)
        result = await self.database.aread(query)
        return result

    async def list_by_user(self, user_id: int, limit: int, offset: int = 0):
        query = sqlalchemy.select(
            UserRolesT.id, UserRolesT.user_id, UserRolesT.role_id,
            UserRolesT.group_id, UserRolesT.assigned_by_user_id,
            UserRolesT.assignment_reason, UserRolesT.assigned_at,
            UserRolesT.expires_at, UserRolesT.status,
            UserRolesT.created_at, UserRolesT.updated_at,
        ).where(UserRolesT.user_id == user_id).order_by(UserRolesT.id.asc()).limit(limit).offset(offset)
        result = await self.database.aread(query)
        return result

    async def create_user_role(self, user_role: UserRoleCreate):
        check_query = sqlalchemy.select(UserRolesT.id).where(
            UserRolesT.user_id == user_role.user_id,
            UserRolesT.role_id == user_role.role_id,
            UserRolesT.group_id == user_role.group_id,
        )
        existing = await self.database.aread(check_query)
        if existing.get("status_code") == 200:
            return {"status_code": 409, "message": "This user-role assignment already exists.", "data": existing.get("data", [])}

        data = UserRoleMapper.to_create_values(user_role)
        stmt = sqlalchemy.insert(UserRolesT).values(data)
        result = await self.database.acreate(stmt)
        return result

    async def update_user_role(self, user_role: UserRoleUpdate, user_role_id: int):
        data = UserRoleMapper.to_update_values(user_role)
        stmt = sqlalchemy.update(UserRolesT).where(UserRolesT.id == user_role_id).values(data)
        result = await self.database.aupdate(stmt)
        return result

    async def delete_user_role(self, user_role_id: int):
        stmt = sqlalchemy.delete(UserRolesT).where(UserRolesT.id == user_role_id)
        result = await self.database.adelete(stmt)
        return result
