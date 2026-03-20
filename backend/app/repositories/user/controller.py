import sqlalchemy

from app.infrastructure.databases.factory import DatabaseFactory

from app.db_models.user import UsersT
from app.data_models.user import UserCreate, UserUpdate
from app.mappers.user_mapper import UserMapper

class UserRepository:
    def __init__(self):
        self.database = DatabaseFactory()

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