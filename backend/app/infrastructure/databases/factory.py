from infrastructure.databases.sql import SQLFactory
from config.app_settings import SettingsConfig

class DatabaseFactory:

    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            print('creating new instance')
            cls._instance = super(DatabaseFactory, cls).__new__(cls)
            cls._instance._initialize(*args, **kwargs)
        return cls._instance

    def _initialize(self):
        self._settings = SettingsConfig().settings
        
        factory_mappings = {
            'SQL': SQLFactory()
        }

        database_provider = self._settings.TransactionalDatabase.ServiceProvider
        self.database_provider = factory_mappings.get(database_provider)
        self._health = True

    def read_text_query(self, query):
        return self.database_provider.read_text_query(query)

    def read(self, query):
        return self.database_provider.read(query)

    def update(self, stmt):
        return self.database_provider.update(stmt)

    def create(self, insert_stmt):
        return self.database_provider.create(insert_stmt)

    def delete(self, stmt):
        return self.database_provider.delete(stmt)
    
    async def aread(self, query):
        result = await self.database_provider.aread(query)
        return result
    
    async def acreate(self, query):
        result = await self.database_provider.acreate(query)
        return result    
    
    async def aupdate(self, query):
        result = await self.database_provider.aupdate(query)
        return result    
    
    async def adelete(self, query):
        result = await self.database_provider.adelete(query)
        return result    