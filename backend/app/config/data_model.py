
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
  # Azure Blob / Azurite fields (optional so an S3/Spaces config also validates)
  ConnectionString: str = ""
  AccountName: str = ""
  Url: str = ""
  PoolSize: int = 5
  # DigitalOcean Spaces / S3 fields (optional so an Azure config also validates)
  Bucket: Optional[str] = None
  Region: Optional[str] = None
  Endpoint: Optional[str] = None
  AccessKey: Optional[str] = None
  SecretKey: Optional[str] = None
  PublicBaseUrl: Optional[str] = None

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
  