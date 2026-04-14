import sqlalchemy
from sqlalchemy import or_

from app.infrastructure.databases.factory import DatabaseFactory

from app.db_models.user import UsersT
from app.db_models.security.user_roles import UserRolesT
from app.db_models.security.user_groups import UserGroupsT
from app.db_models.security.group_roles import GroupRolesT
from app.db_models.security.role_permissions import RolePermissionsT
from app.db_models.security.permissions import PermissionsT
from app.data_models.user import UserCreate, UserUpdate
from app.mappers.user_mapper import UserMapper

class UserRepository:
    def __init__(self):
        self.database = DatabaseFactory()

    async def get_user_permissions(self, user_id: int):
        """Resolve every active permission code the user holds.

        Permissions come from two paths:
          1) Direct:    user_roles → role_permissions → permissions
          2) Inherited: user_groups → group_roles → role_permissions → permissions

        Returns {"permissions": ["users.read", "transcripts.update", ...]}.
        """

        # Path 1: direct user → role assignments
        direct = (
            sqlalchemy.select(PermissionsT.code)
            .select_from(
                sqlalchemy.join(UserRolesT, RolePermissionsT, UserRolesT.role_id == RolePermissionsT.role_id)
                .join(PermissionsT, RolePermissionsT.permission_id == PermissionsT.id)
            )
            .where(
                UserRolesT.user_id == user_id,
                UserRolesT.status == "active",
                PermissionsT.status == "active",
            )
        )

        # Path 2: inherited via group membership
        inherited = (
            sqlalchemy.select(PermissionsT.code)
            .select_from(
                sqlalchemy.join(UserGroupsT, GroupRolesT, UserGroupsT.group_id == GroupRolesT.group_id)
                .join(RolePermissionsT, GroupRolesT.role_id == RolePermissionsT.role_id)
                .join(PermissionsT, RolePermissionsT.permission_id == PermissionsT.id)
            )
            .where(
                UserGroupsT.user_id == user_id,
                UserGroupsT.membership_status == "active",
                GroupRolesT.status == "active",
                PermissionsT.status == "active",
            )
        )

        query = sqlalchemy.union(direct, inherited)
        result = await self.database.aread(query)
        data = result.get("data", [])
        codes = list({row["code"] if isinstance(row, dict) else row for row in data})
        return {"permissions": codes}

    async def search_users(self, query: str = "", limit: int = 10):
        """Search users by user_name or display_name (ILIKE). Used for @mention autocomplete."""
        q = sqlalchemy.select(
            UsersT.id,
            UsersT.user_name,
            UsersT.display_name,
            UsersT.user_email,
        ).where(UsersT.active == 1)

        if query.strip():
            pattern = f"%{query.strip()}%"
            q = q.where(
                or_(
                    UsersT.user_name.ilike(pattern),
                    UsersT.display_name.ilike(pattern),
                )
            )

        q = q.order_by(UsersT.display_name.asc()).limit(limit)
        result = await self.database.aread(q)
        return result

    async def list_users(self, limit: int, offset: int = 0):
        query = sqlalchemy.select(
            UsersT.id, 
            UsersT.unique_id, 
            UsersT.user_name,
            UsersT.user_email,
            UsersT.display_name, 
            UsersT.first_name, 
            UsersT.last_name,
            UsersT.active,
            UsersT.created,
            UsersT.modified
        ).order_by(UsersT.id.asc()).limit(limit).offset(offset)
        result = await self.database.aread(query)
        return result

    async def count_users(self):
        query = sqlalchemy.select(sqlalchemy.func.count(UsersT.id).label("total"))
        result = await self.database.aread(query)
        return result

    async def aget_user(self, user_id: int):
        query = sqlalchemy.select(
            UsersT.id, 
            UsersT.unique_id, 
            UsersT.user_name, 
            UsersT.user_email,
            UsersT.display_name, 
            UsersT.first_name, 
            UsersT.last_name,
            UsersT.created

        ).where(UsersT.id == user_id)
        result = await self.database.aread(query)

        return result

    async def aget_user_by_username(self, user_name: str):
        """Return the full user row (including password_hash) for auth."""
        query = sqlalchemy.select(
            UsersT.id,
            UsersT.user_name,
            UsersT.user_email,
            UsersT.display_name,
            UsersT.first_name,
            UsersT.last_name,
            UsersT.password_hash,
            UsersT.active,
        ).where(UsersT.user_name == user_name)
        result = await self.database.aread(query)
        return result
    
    async def create_user(self, user: UserCreate):
        user_data = UserMapper.to_create_values(user)
        stmt = sqlalchemy.insert(UsersT).values(user_data)
        result = await self.database.acreate(stmt)
        return result
    
    async def update_user(self, user: UserUpdate,user_id: int):
        user_data = UserMapper.to_update_values(user)
        stmt = sqlalchemy.update(UsersT).where(UsersT.id == user_id).values(user_data)
        result = await self.database.aupdate(stmt)
        return result
    
    async def delete_user(self, user_id: int):
        stmt = sqlalchemy.delete(UsersT).where(UsersT.id == user_id)
        result = await self.database.adelete(stmt)
        return result

        query = sqlalchemy.select(
            UsersT.id, 
            UsersT.unique_id, 
            UsersT.user_name,
            UsersT.user_email,
            UsersT.display_name, 
            UsersT.first_name, 
            UsersT.last_name,
            UsersT.active,
            UsersT.created,
            UsersT.modified
        ).order_by(UsersT.id.asc()).limit(limit).offset(offset)
        result = await self.database.aread(query)
        return result

    async def count_users(self):
        query = sqlalchemy.select(sqlalchemy.func.count(UsersT.id).label("total"))
        result = await self.database.aread(query)
        return result

    async def aget_user(self, user_id: int):
        query = sqlalchemy.select(
            UsersT.id, 
            UsersT.unique_id, 
            UsersT.user_name, 
            UsersT.user_email,
            UsersT.display_name, 
            UsersT.first_name, 
            UsersT.last_name,
            UsersT.created

        ).where(UsersT.id == user_id)
        result = await self.database.aread(query)

        return result
    
    async def create_user(self, user: UserCreate):
        user_data = UserMapper.to_create_values(user)
        stmt = sqlalchemy.insert(UsersT).values(user_data)
        result = await self.database.acreate(stmt)
        return result
    
    async def update_user(self, user: UserUpdate,user_id: int):
        user_data = UserMapper.to_update_values(user)
        stmt = sqlalchemy.update(UsersT).where(UsersT.id == user_id).values(user_data)
        result = await self.database.aupdate(stmt)
        return result
    
    async def delete_user(self, user_id: int):
        stmt = sqlalchemy.delete(UsersT).where(UsersT.id == user_id)
        result = await self.database.adelete(stmt)
        return result