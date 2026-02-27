import os
import urllib
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import Session
from azure.identity import DefaultAzureCredential
from sqlalchemy import event
from sqlalchemy import text

from config.app_logging import AppLogging
from config.app_settings import SettingsConfig

class SQLFactory:

    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            print('creating new instance')
            cls._instance = super(SQLFactory, cls).__new__(cls)
            cls._instance._initialize(*args, **kwargs)
        return cls._instance

    def _initialize(self):
        self._general_settings = SettingsConfig().settings
        self._settings = SettingsConfig().settings.TransactionalDatabase.Settings
        self._logger = AppLogging().logger
        self.conn_string = self.generate_connection_string()

        sync_connect_args = {}
        async_connect_args = {}

        # Local Postgres instances commonly run without SSL.
        _local_hosts = ('@localhost' , '@127.0.0.1', '@pg-server-transcriptions')
        if self.conn_string.startswith('postgresql') and any(h in self.conn_string for h in _local_hosts):
            sync_connect_args['sslmode'] = 'disable'
        if self.aconn_string.startswith('postgresql') and any(h in self.aconn_string for h in _local_hosts):
            async_connect_args['ssl'] = False

        self.engine = create_engine(
            self.conn_string, 
            connect_args=sync_connect_args,
            pool_size=10, 
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=1800
            )
        
        self.aengine = create_async_engine(
            self.aconn_string, 
            connect_args=async_connect_args,
            pool_size=10, 
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=1800
            )
        
        if self.engine.url.drivername.startswith('postgresql') and self._auth_type == 'UID':
            credential = DefaultAzureCredential()
            token_url = "https://ossrdbms-aad.database.usgovcloudapi.net/.default"

            @event.listens_for(self.engine, "do_connect")
            def provide_token(dialect, conn_rec, cargs, cparams):
                password = credential.get_token(token_url).token
                cparams['password'] = password
                return dialect.connect(*cargs, **cparams)
            
            @event.listens_for(self.aengine.sync_engine, "do_connect")
            def aprovide_token(dialect, conn_rec, cargs, cparams):
                password = credential.get_token(token_url).token
                cparams['password'] = password
                return dialect.connect(*cargs, **cparams)

    def generate_connection_string(self):
        database = self._settings.Type
        connection_string = self._settings.ConnectionString
        self._auth_type = self._settings.AuthenticationType

        if database == 'PostgresSQL':
            # Support both URL style and key/value style connection strings.
            # URL examples:
            #   postgresql+asyncpg://user:pass@host:5432/db
            #   postgresql://user:pass@host:5432/db
            if '://' in connection_string:
                normalized = connection_string.strip()

                if normalized.startswith('postgres://'):
                    normalized = normalized.replace('postgres://', 'postgresql://', 1)

                if '+asyncpg' in normalized:
                    self.aconn_string = normalized
                    self.conn_string = normalized.replace('+asyncpg', '+psycopg2', 1)
                elif '+psycopg2' in normalized:
                    self.conn_string = normalized
                    self.aconn_string = normalized.replace('+psycopg2', '+asyncpg', 1)
                elif normalized.startswith('postgresql://'):
                    self.conn_string = normalized.replace('postgresql://', 'postgresql+psycopg2://', 1)
                    self.aconn_string = normalized.replace('postgresql://', 'postgresql+asyncpg://', 1)
                else:
                    self.conn_string = normalized
                    self.aconn_string = normalized
            else:
                components = {}
                for item in connection_string.split(';'):
                    item = item.strip()
                    if not item:
                        continue
                    if '=' not in item:
                        continue
                    key, value = item.split('=', 1)
                    components[key] = value

                if self._auth_type == 'UsernamePassword':
                    self.conn_string = "postgresql+psycopg2://{Username}:{Password}@{Host}:{Port}/{Database}".format(**components)
                    self.aconn_string = "postgresql+asyncpg://{Username}:{Password}@{Host}:{Port}/{Database}".format(**components)

                elif self._auth_type == 'UID':
                    os.environ['AZURE_CLIENT_ID']=self._general_settings.RuntimeSettings.UAIClientId
                    credential = DefaultAzureCredential()
                    password = ''
                    try:
                        password = credential.get_token("https://ossrdbms-aad.database.usgovcloudapi.net/.default").token
                    except Exception as e:
                        self._logger.exception(e)
                    components['Password'] = password
                    self.conn_string = "postgresql+psycopg2://{Username}:{Password}@{Host}:{Port}/{Database}".format(**components)
                    self.aconn_string = "postgresql+asyncpg://{Username}:{Password}@{Host}:{Port}/{Database}".format(**components)


        elif database == 'AzureSQL':
            params = urllib.parse.quote_plus(connection_string)
            self.conn_string = 'mssql+pyodbc:///?odbc_connect={}'.format(params)  

        return self.conn_string

    def read_text_query(self, query: str):
        try:
            session = Session(bind=self.engine, autocommit=False, autoflush=False)
            data_rows = session.execute(text(query)).fetchall()
            return data_rows
        except Exception as e:
            self._logger.exception("SQLFactory.read_execute: " + str(e), exc_info=True)
            return None
        finally:
            session.close()

    def read(self, query):
        try:
            response_body = {'status_code': None, 'message': None, 'data': []}
            session = Session(bind=self.engine, autocommit=False, autoflush=False)
            data_rows = session.execute(query).fetchall()
            if len(data_rows) == 0:
                response_body['status_code'] = 404
                response_body['message'] = 'No records were found that match the query criteria.'
            else:
                data_rows_dict = pd.DataFrame(data_rows).to_dict(orient='records')
                response_body['status_code'] = 200
                response_body['message'] = 'Success'
                response_body['data'] = data_rows_dict
        except Exception as e:
            response_body['status_code'] = 500
            response_body['message'] = str(e)
            self._logger.exception(e, exc_info=True)
        finally:
            session.close()
        return response_body

    def update(self, stmt):
        try:
            session = Session(bind=self.engine, autocommit=False, autoflush=False)
            session.execute(stmt)
            session.commit()
        finally:
            session.close()

    def create(self, stmt):
        try:
            session = Session(bind=self.engine, autocommit=False, autoflush=False)
            result = session.execute(stmt.returning(stmt.table.c.id))
            session.commit()
            created_id = result.scalar()
            created_dict = {"id": created_id}
            return created_dict
        finally:
            session.close()

    def delete(self, stmt):
        try:
            session = Session(bind=self.engine, autocommit=False, autoflush=False)
            result = session.execute(stmt)
            session.commit()
            if result.rowcount == 0:
                return {'status_code': 404, 'message': 'No records found matching the query criteria'}
            else:
                return {'status_code': 200, 'message': 'Success, Deleted {} records'.format(result.rowcount)}
        finally:
            session.close()
    
    async def aread(self, query):
        try:
            response_body = {'status_code': None, 'message': None, 'data': []}
            async with AsyncSession(bind=self.aengine, autocommit=False, autoflush=False) as session:
                result = await session.execute(query)
                data_rows = result.fetchall()
                if len(data_rows) == 0:
                    response_body['status_code'] = 404
                    response_body['message'] = 'No records were found that match the query criteria.'
                else:
                    data_rows_dict = pd.DataFrame(data_rows).to_dict(orient='records')
                    response_body['status_code'] = 200
                    response_body['message'] = 'Success'
                    response_body['data'] = data_rows_dict
            return response_body
        except Exception as e:
            response_body['status_code'] = 500
            response_body['message'] = str(e)
            response_body['data'] = []
            self._logger.exception(e, exc_info=True)
            return response_body

    async def acreate(self, stmt):
        try:
            response_body = {'status_code': None, 'message': None, 'data': []}
            async with AsyncSession(bind=self.aengine, autocommit=False, autoflush=True) as session:
                result = await session.execute(stmt.returning(stmt.table.c.id))
                created_id = result.scalar()
                
                await session.commit()

                response_body['status_code'] = 201
                response_body['message'] = 'Success, Created record with Id: {}'.format(created_id)
                response_body['data'] = {"id": created_id}

            return response_body
        
        except Exception as e:
            response_body['status_code'] = 500
            response_body['message'] = str(e)
            self._logger.exception(e, exc_info=True)
            
            return response_body

    async def aupdate(self, stmt):
        try:
            response_body = {'status_code': None, 'message': None, 'data': []}
            async with AsyncSession(bind=self.aengine, autocommit=False, autoflush=False) as session:
                result = await session.execute(stmt)
                await session.commit()
            
            response_body['status_code'] = 200
            response_body['message'] = 'Success, Updated {} records'.format(result.rowcount)

            return response_body

        except Exception as e:
            response_body['status_code'] = 500
            response_body['message'] = str(e)
            self._logger.exception(e, exc_info=True)
            return response_body

    async def adelete(self, stmt):
        try:
            response_body = {'status_code': None, 'message': None, 'data': []}
            async with AsyncSession(bind=self.aengine, autocommit=False, autoflush=False) as session:
                result = await session.execute(stmt)
                await session.commit()
                if result.rowcount == 0:
                    response_body['status_code'] = 404
                    response_body['message'] = 'No records found matching the query criteria'
                else:
                    response_body['status_code'] = 200
                    response_body['message'] = 'Success, Deleted {} records'.format(result.rowcount)
            
            return response_body
        
        except Exception as e:
            response_body['status_code'] = 500
            response_body['message'] = str(e)
            self._logger.exception(e, exc_info=True)
            
            return response_body
