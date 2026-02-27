from infrastructure.storage.azure_storage import AzureBlobStorageFactory
from config.app_settings import SettingsConfig
from config.app_logging import AppLogging

class StorageFactory:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            print('creating instance of Storage Factory')
            cls._instance = super(StorageFactory, cls).__new__(cls)
            cls._instance._initialize(*args, **kwargs)
        return cls._instance

    def _initialize(self):
        self._logger = AppLogging().logger
        self._service_provider = SettingsConfig().settings.Storage.ServiceProvider

        service_providers = {
            'AzureStorageAccount': AzureBlobStorageFactory()
        }

        self.factory = service_providers.get(self._service_provider)
        self._health = True

    def upload(self, file_bytes, path):
        return self.factory.upload(file_bytes, path)

    def delete(self, path):
        return self.factory.delete(path)

    def read(self, path):
        return self.factory.read(path)

    def get_container_url(self):
        return self.factory.get_container_url()
        
    def generate_blob_sas_url(self, blob_path, expiry_hours=24, container_name=None):
        return self.factory.generate_blob_sas_url(blob_path, expiry_hours, container_name)

    def generate_container_sas_url(self, expiry_hours=24):
        return self.factory.generate_container_sas_url(expiry_hours)
    
    def list_files(self, path):
        return self.factory.list_files(path)
    
    def stream_blob(self, blob_path):
        return self.factory.stream_blob(blob_path)
    
    def get_blob_size(self, blob_path):
        """Get the size of a blob in bytes."""
        return self.factory.get_blob_size(blob_path)