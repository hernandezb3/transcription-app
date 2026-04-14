import sqlalchemy

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.security.role_permissions import RolePermissionsT
from app.data_models.security.role_permission import RolePermissionCreate
from app.mappers.security.role_permission_mapper import RolePermissionMapper


class RolePermissionRepository:
    def __init__(self):
        self.database = DatabaseFactory()

    async def list_role_permissions(self, limit: int, offset: int = 0):
        query = sqlalchemy.select(
            RolePermissionsT.id, RolePermissionsT.role_id,
            RolePermissionsT.permission_id, RolePermissionsT.created_at,
        ).order_by(RolePermissionsT.id.asc()).limit(limit).offset(offset)
        result = await self.database.aread(query)
        return result

    async def count_role_permissions(self):
        query = sqlalchemy.select(sqlalchemy.func.count(RolePermissionsT.id).label("total"))
        result = await self.database.aread(query)
        return result

    async def aget_role_permission(self, role_permission_id: int):
        query = sqlalchemy.select(
            RolePermissionsT.id, RolePermissionsT.role_id,
            RolePermissionsT.permission_id, RolePermissionsT.created_at,
        ).where(RolePermissionsT.id == role_permission_id)
        result = await self.database.aread(query)
        return result

    async def list_by_role(self, role_id: int, limit: int, offset: int = 0):
        query = sqlalchemy.select(
            RolePermissionsT.id, RolePermissionsT.role_id,
            RolePermissionsT.permission_id, RolePermissionsT.created_at,
        ).where(RolePermissionsT.role_id == role_id).order_by(RolePermissionsT.id.asc()).limit(limit).offset(offset)
        result = await self.database.aread(query)
        return result

    async def create_role_permission(self, role_permission: RolePermissionCreate):
        check_query = sqlalchemy.select(RolePermissionsT.id).where(
            RolePermissionsT.role_id == role_permission.role_id,
            RolePermissionsT.permission_id == role_permission.permission_id,
        )
        existing = await self.database.aread(check_query)
        existing_data = existing.get("data", [])
        if existing.get("status_code") == 200 and existing_data:
            return {"status_code": 409, "message": "This role-permission assignment already exists.", "data": existing_data}

        data = RolePermissionMapper.to_create_values(role_permission)
        stmt = sqlalchemy.insert(RolePermissionsT).values(data)
        result = await self.database.acreate(stmt)
        return result

    async def delete_role_permission(self, role_permission_id: int):
        stmt = sqlalchemy.delete(RolePermissionsT).where(RolePermissionsT.id == role_permission_id)
        result = await self.database.adelete(stmt)
        return result
