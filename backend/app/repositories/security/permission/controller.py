import sqlalchemy

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.security.permissions import PermissionsT
from app.data_models.security.permission import PermissionCreate, PermissionUpdate
from app.mappers.security.permission_mapper import PermissionMapper


class PermissionRepository:
    def __init__(self):
        self.database = DatabaseFactory()

    async def list_permissions(self, limit: int, offset: int = 0):
        query = sqlalchemy.select(
            PermissionsT.id, PermissionsT.code, PermissionsT.resource,
            PermissionsT.action, PermissionsT.description, PermissionsT.status,
            PermissionsT.created_at, PermissionsT.updated_at,
        ).order_by(PermissionsT.id.asc()).limit(limit).offset(offset)
        result = await self.database.aread(query)
        return result

    async def count_permissions(self):
        query = sqlalchemy.select(sqlalchemy.func.count(PermissionsT.id).label("total"))
        result = await self.database.aread(query)
        return result

    async def aget_permission(self, permission_id: int):
        query = sqlalchemy.select(
            PermissionsT.id, PermissionsT.code, PermissionsT.resource,
            PermissionsT.action, PermissionsT.description, PermissionsT.status,
            PermissionsT.created_at, PermissionsT.updated_at,
        ).where(PermissionsT.id == permission_id)
        result = await self.database.aread(query)
        return result

    async def create_permission(self, permission: PermissionCreate):
        data = PermissionMapper.to_create_values(permission)
        stmt = sqlalchemy.insert(PermissionsT).values(data)
        result = await self.database.acreate(stmt)
        return result

    async def update_permission(self, permission: PermissionUpdate, permission_id: int):
        data = PermissionMapper.to_update_values(permission)
        stmt = sqlalchemy.update(PermissionsT).where(PermissionsT.id == permission_id).values(data)
        result = await self.database.aupdate(stmt)
        return result

    async def delete_permission(self, permission_id: int):
        stmt = sqlalchemy.delete(PermissionsT).where(PermissionsT.id == permission_id)
        result = await self.database.adelete(stmt)
        return result
