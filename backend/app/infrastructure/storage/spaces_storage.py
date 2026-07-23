"""DigitalOcean Spaces (S3-compatible) storage backend.

Mirrors the public interface of ``AzureBlobStorageFactory`` so the two are
interchangeable behind ``StorageFactory``. DO Spaces speaks the S3 API, so this
uses boto3. "Container"/"blob" (Azure vocabulary used throughout the app) map to
S3 "bucket"/"object key" here — method names are kept identical on purpose so the
rest of the codebase does not need to know which backend is active.

Config comes from ``settings.Storage.Settings`` (see StorageSettings):
  - Bucket / ContainerName : Spaces bucket name
  - Region                 : e.g. "sfo3", "nyc3" (used to derive the endpoint)
  - Endpoint / Url         : full endpoint, e.g. "https://sfo3.digitaloceanspaces.com"
  - AccessKey / SecretKey  : Spaces access key pair
  - PublicBaseUrl          : optional CDN/public base for get_container_url()
"""

from datetime import datetime, timedelta, timezone
from queue import Queue

import boto3
from botocore.client import Config

from app.config.app_settings import SettingsConfig
from app.config.app_logging import AppLogging


class SpacesStorageFactory:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            print('Creating instance of SpacesStorageFactory')
            cls._instance = super(SpacesStorageFactory, cls).__new__(cls)
            cls._instance._initialize(*args, **kwargs)
        return cls._instance

    def _initialize(self):
        self._settings = SettingsConfig().settings.Storage.Settings
        self._logger = AppLogging().logger

        self._bucket = self._settings.Bucket or self._settings.ContainerName
        self._region = self._settings.Region
        self._endpoint = self._resolve_endpoint()
        self._public_base_url = (self._settings.PublicBaseUrl or '').rstrip('/')
        self._access_key = self._settings.AccessKey
        self._secret_key = self._settings.SecretKey
        self._pool_size = self._settings.PoolSize or 5

        # boto3 clients are cheap to reuse and safe to share across threads for
        # discrete calls, but we mirror the Azure factory's small client pool so
        # the two backends have the same concurrency characteristics.
        self.pool = Queue(maxsize=self._pool_size)
        for _ in range(self._pool_size):
            self.pool.put(self._create_client())

    def _resolve_endpoint(self):
        endpoint = self._settings.Endpoint or self._settings.Url
        if endpoint:
            return endpoint.rstrip('/')
        if self._region:
            return f'https://{self._region}.digitaloceanspaces.com'
        raise ValueError('Spaces storage requires either Endpoint/Url or Region in settings.')

    def _create_client(self):
        return boto3.client(
            's3',
            region_name=self._region,
            endpoint_url=self._endpoint,
            aws_access_key_id=self._access_key,
            aws_secret_access_key=self._secret_key,
            # Virtual-hosted addressing + SigV4 is what DO Spaces expects and is
            # required for presigned URLs to resolve to <bucket>.<region>.....
            config=Config(signature_version='s3v4', s3={'addressing_style': 'virtual'}),
        )

    def get_client(self):
        return self.pool.get()

    def release_client(self, client):
        self.pool.put(client)

    # -- core operations -----------------------------------------------------

    def upload(self, file_bytes, blob_path):
        client = self.get_client()
        try:
            body = file_bytes.read() if hasattr(file_bytes, 'read') else file_bytes
            return client.put_object(Bucket=self._bucket, Key=blob_path, Body=body)
        finally:
            self.release_client(client)

    def delete(self, blob_path):
        client = self.get_client()
        try:
            return client.delete_object(Bucket=self._bucket, Key=blob_path)
        finally:
            self.release_client(client)

    def read(self, blob_path):
        client = self.get_client()
        try:
            obj = client.get_object(Bucket=self._bucket, Key=blob_path)
            return obj['Body'].read()
        finally:
            self.release_client(client)

    def get_container_url(self):
        if self._public_base_url:
            return self._public_base_url
        return f'{self._endpoint}/{self._bucket}'

    def generate_container_sas_url(self, expiry_hours=1):
        # S3 has no direct "container SAS"; the closest analogue is the bucket
        # base URL. Presigned URLs are per-object (generate_blob_sas_url).
        return self.get_container_url()

    def generate_blob_sas_url(self, blob_path, expiry_hours=24, container_name=None):
        client = self.get_client()
        try:
            bucket = container_name or self._bucket
            url = client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': blob_path},
                ExpiresIn=int(expiry_hours * 3600),
            )
            return url
        finally:
            self.release_client(client)

    def list_files(self, folder_path):
        client = self.get_client()
        try:
            keys = []
            paginator = client.get_paginator('list_objects_v2')
            for page in paginator.paginate(Bucket=self._bucket, Prefix=folder_path):
                for item in page.get('Contents', []):
                    name = item['Key']
                    if name != folder_path:
                        keys.append(name)
            return keys
        finally:
            self.release_client(client)

    def stream_blob(self, blob_path):
        # Note: the underlying StreamingBody stays open for the lifetime of the
        # iterator; the caller is responsible for consuming it fully.
        client = self.get_client()
        try:
            obj = client.get_object(Bucket=self._bucket, Key=blob_path)
            return obj['Body'].iter_chunks()
        finally:
            self.release_client(client)

    def get_blob_size(self, blob_path):
        client = self.get_client()
        try:
            head = client.head_object(Bucket=self._bucket, Key=blob_path)
            return head['ContentLength']
        finally:
            self.release_client(client)

    def copy_blob(self, source_container, source_blob, dest_container, dest_blob):
        client = self.get_client()
        try:
            client.copy_object(
                Bucket=dest_container,
                Key=dest_blob,
                CopySource={'Bucket': source_container, 'Key': source_blob},
            )
            return dest_blob
        finally:
            self.release_client(client)

    def delete_blob(self, container_name, blob_path):
        client = self.get_client()
        try:
            return client.delete_object(Bucket=container_name, Key=blob_path)
        finally:
            self.release_client(client)
