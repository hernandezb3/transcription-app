
from typing import List, Optional
from pydantic import BaseModel

class ApplicationLoggingSettings(BaseModel):
  ConnectionString: str

class ApplicationLogging(BaseModel):
  ServiceProvider: str
  Settings: ApplicationLoggingSettings

class RuntimeSettings(BaseModel):
  CORS: List[str]
  UAIClientId: str
  AppURL: str
  AppKey: Optional[str] = None

class ScopeModel(BaseModel):
  Path: str
  Name: str

class AuthorizationProviderSettings(BaseModel):
  AppRegistrationTenantId: str
  AppRegistrationClientId: str
  AppRegistrationClientSecret: str
  Scope: ScopeModel

class AuthorizationProvider(BaseModel):
  ServiceProvider: str
  Settings: AuthorizationProviderSettings

class SecretItem(BaseModel):
  secret: str
  mapping: str
  content_type: str

class SecretManagerSettings(BaseModel):
  URL: str
  Secrets: List[SecretItem]

class SecretManager(BaseModel):
  ServiceProvider: str
  Settings: SecretManagerSettings

class TransactionalDatabaseSettings(BaseModel):
  Type: str
  ConnectionString: str
  AuthenticationType: str
  BaseSchema: str

class TransactionalDatabase(BaseModel):
  ServiceProvider: str
  Settings: TransactionalDatabaseSettings

class StorageSettings(BaseModel):
  ContainerName: str
  ConnectionString: str
  AccountName: str
  Url: str
  PoolSize:int

class Storage(BaseModel):
  ServiceProvider: str
  Settings: StorageSettings

class build_information(BaseModel):
  init_time: str
  build_number: str
  build_id: str
  build_user: str
  build_url: str

class AppConfig(BaseModel):
  RuntimeSettings: RuntimeSettings
  AuthorizationProvider: AuthorizationProvider
  ApplicationLogging: ApplicationLogging
  SecretManager: SecretManager
  TransactionalDatabase: TransactionalDatabase
  Storage: Storage
  BuildInformation: build_information
  