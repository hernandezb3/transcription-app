import sqlalchemy

from infrastructure.databases.factory import DatabaseFactory

from db_models.user import UsersT
from data_models.user import UserCreate, UserUpdate
from mappers.user_mapper import UserMapper

class UserRepository:
    def __init__(self):
        self.database = DatabaseFactory()

    async def list_users(self, limit: int):
        query = sqlalchemy.select(
            UsersT.id, 
            UsersT.unique_id, 
            UsersT.user_name,
            UsersT.user_email,
            UsersT.display_name, 
            UsersT.first_name, 
            UsersT.last_name,
            UsersT.created
        ).limit(limit)
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