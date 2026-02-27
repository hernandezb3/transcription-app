from azure.storage.blob import BlobServiceClient, generate_container_sas, generate_blob_sas, ContainerSasPermissions, BlobSasPermissions
from datetime import datetime, timedelta, timezone

from queue import Queue

from config.app_settings import SettingsConfig
from config.app_logging import AppLogging

class AzureBlobStorageFactory:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            print('Creating instance of AzureBlobStorageFactory')
            cls._instance = super(AzureBlobStorageFactory, cls).__new__(cls)
            cls._instance._initialize(*args, **kwargs)
        return cls._instance

    def _initialize(self):

        self._settings = SettingsConfig().settings.Storage.Settings
        self._logger = AppLogging().logger

        self._connection_string = self._settings.ConnectionString
        self._container_name = self._settings.ContainerName
        self._pool_size = self._settings.PoolSize

        self.pool = Queue(maxsize=self._pool_size)
        for _ in range(self._pool_size):
            self.pool.put(self._create_client())

    def _create_client(self):
        return BlobServiceClient.from_connection_string(self._connection_string)

    def get_client(self):
        return self.pool.get()

    def release_client(self, client):
        self.pool.put(client)

    def upload(self, file_bytes, blob_path):
        client = self.get_client()
        try:
            container_client = client.get_container_client(self._container_name)
            blob_client = container_client.get_blob_client(blob_path)
            message = blob_client.upload_blob(file_bytes, overwrite=True)
            return message
        finally:
            self.release_client(client)

    def delete(self, blob_path):
        client = self.get_client()
        try:
            container_client = client.get_container_client(self._container_name)
            message = container_client.delete_blob(blob_path)
            return message
        finally:
            self.release_client(client)

    def read(self, blob_path):
        client = self.get_client()
        try:
            container_client = client.get_container_client(self._container_name)
            blob_client = container_client.get_blob_client(blob_path)
            blob_data = blob_client.download_blob().readall()
            return blob_data
        finally:
            self.release_client(client)
    def get_container_url(self):
        client = self.get_client()
        try:
            container_client = client.get_container_client(self._container_name)
            return container_client.url
        finally:
            self.release_client(client)

    def generate_container_sas_url(self, expiry_hours=1):
        client = self.get_client()
        try:
            sas_token = generate_container_sas(
                account_name=client.account_name,
                container_name=self._container_name,
                account_key=client.credential.account_key,
                permission=ContainerSasPermissions(read=True, list=True),
                expiry=datetime.now(datetime.timezone.utc) + timedelta(hours=expiry_hours)
            )
            container_url = f"https://{client.account_name}.blob.core.windows.net/{self._container_name}?{sas_token}"
            return container_url
        finally:
            self.release_client(client)
    
    def generate_blob_sas_url(self, blob_path, expiry_hours=24, container_name=None):
        client = self.get_client()
        try:
            target_container = container_name or self._container_name
            # Use UTC for SAS token times to avoid timezone issues with Azure
            now_utc = datetime.now(timezone.utc)
            sas_token = generate_blob_sas(
                account_name=client.account_name,
                container_name=target_container,
                blob_name=blob_path,
                account_key=client.credential.account_key,
                permission=BlobSasPermissions(read=True, list=True, write=True),
                start=now_utc - timedelta(minutes=15),  # 15 min buffer for clock skew
                expiry=now_utc + timedelta(hours=expiry_hours)
            )
            
            blob_url = f"https://{client.account_name}.blob.core.usgovcloudapi.net/{target_container}/{blob_path}?{sas_token}"
            #blob_url = f"https://{client.account_name}.blob.core.usgovcloudapi.net/{self.container_name}/{blob_path}"
            blob_url = blob_url.replace(' ', '%20')
            return blob_url
        finally:
            self.release_client(client)
    
    def list_files(self, folder_path):
        client = self.get_client()
        try:
            container_client = client.get_container_client(self._container_name)
            blob_list = container_client.list_blobs(name_starts_with=folder_path)
            blob_names = [blob.name for blob in blob_list if blob.name != folder_path]            
            return blob_names
        finally:
            self.release_client(client)

    def stream_blob(self, blob_path):
        client = self.get_client()
        try:
            container_client = client.get_container_client(self._container_name)
            blob_client = container_client.get_blob_client(blob_path)

            # Stream the blob in chunks
            stream = blob_client.download_blob()
            return stream.chunks()
        finally:
            self.release_client(client)
    
    def get_blob_size(self, blob_path):
        """Get the size of a blob in bytes."""
        client = self.get_client()
        try:
            container_client = client.get_container_client(self._container_name)
            blob_client = container_client.get_blob_client(blob_path)
            props = blob_client.get_blob_properties()
            return props.size
        finally:
            self.release_client(client)
    
    def copy_blob(self, source_container: str, source_blob: str, dest_container: str, dest_blob: str):
        """
        Copy a blob from one container to another within the same storage account.
        Returns the destination blob path if successful.
        """
        client = self.get_client()
        try:
            # Get source blob URL with SAS for copy operation
            source_sas = generate_blob_sas(
                account_name=client.account_name,
                container_name=source_container,
                blob_name=source_blob,
                account_key=client.credential.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.now() + timedelta(hours=1)
            )
            source_url = f"https://{client.account_name}.blob.core.usgovcloudapi.net/{source_container}/{source_blob}?{source_sas}"
            
            # Get destination blob client
            dest_container_client = client.get_container_client(dest_container)
            dest_blob_client = dest_container_client.get_blob_client(dest_blob)
            
            # Start copy operation
            copy_result = dest_blob_client.start_copy_from_url(source_url)
            
            # Wait for copy to complete (it's usually instant for same-account copies)
            import time
            props = dest_blob_client.get_blob_properties()
            while props.copy.status == 'pending':
                time.sleep(0.5)
                props = dest_blob_client.get_blob_properties()
            
            if props.copy.status == 'success':
                return dest_blob
            else:
                raise Exception(f"Blob copy failed with status: {props.copy.status}")
        finally:
            self.release_client(client)
    
    def delete_blob(self, container_name: str, blob_path: str):
        """Delete a blob from a specific container."""
        client = self.get_client()
        try:
            container_client = client.get_container_client(container_name)
            blob_client = container_client.get_blob_client(blob_path)
            blob_client.delete_blob()
        finally:
            self.release_client(client)