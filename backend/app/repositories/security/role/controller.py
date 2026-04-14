import sqlalchemy

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.security.roles import RolesT
from app.data_models.security.role import RoleCreate, RoleUpdate
from app.mappers.security.role_mapper import RoleMapper


class RoleRepository:
    def __init__(self):
        self.database = DatabaseFactory()

    async def list_roles(self, limit: int, offset: int = 0):
        query = sqlalchemy.select(
            RolesT.id, RolesT.code, RolesT.name, RolesT.description,
            RolesT.assignment_level, RolesT.status,
            RolesT.created_at, RolesT.updated_at,
        ).order_by(RolesT.id.asc()).limit(limit).offset(offset)
        result = await self.database.aread(query)
        return result

    async def count_roles(self):
        query = sqlalchemy.select(sqlalchemy.func.count(RolesT.id).label("total"))
        result = await self.database.aread(query)
        return result

    async def aget_role(self, role_id: int):
        query = sqlalchemy.select(
            RolesT.id, RolesT.code, RolesT.name, RolesT.description,
            RolesT.assignment_level, RolesT.status,
            RolesT.created_at, RolesT.updated_at,
        ).where(RolesT.id == role_id)
        result = await self.database.aread(query)
        return result

    async def create_role(self, role: RoleCreate):
        role_data = RoleMapper.to_create_values(role)
        stmt = sqlalchemy.insert(RolesT).values(role_data)
        result = await self.database.acreate(stmt)
        return result

    async def update_role(self, role: RoleUpdate, role_id: int):
        role_data = RoleMapper.to_update_values(role)
        stmt = sqlalchemy.update(RolesT).where(RolesT.id == role_id).values(role_data)
        result = await self.database.aupdate(stmt)
        return result

    async def delete_role(self, role_id: int):
        stmt = sqlalchemy.delete(RolesT).where(RolesT.id == role_id)
        result = await self.database.adelete(stmt)
        return result
