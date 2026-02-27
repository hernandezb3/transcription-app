import os
import json
import logging

from datetime import datetime
from zoneinfo import ZoneInfo
from config.data_model import AppConfig

class SettingsConfig:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            print('creating new instance of Settings Config')
            cls._instance = super(SettingsConfig, cls).__new__(cls)
            cls._instance._initialize(*args, **kwargs)
        return cls._instance

    def _initialize(self):

        try:
            self.environment = os.environ['AppEnvironment'].lower()
        except Exception as e:
            logging.info(f'{e}')
            self.environment = 'local'

        self.base_settings = self.get_base_settings()
        status_secret_manager = self.init_secret_manager()
        assert status_secret_manager, "Failed to initialize secret manager."

        self.settings = self.map_secrets_to_settings()

        #adding build information to settings
        self.settings.BuildInformation.init_time = datetime.strptime(datetime.strptime(datetime.now(tz=ZoneInfo('America/Los_Angeles')).strftime("%Y-%m-%d %H:%M:%S"), "%Y-%m-%d %H:%M:%S").strftime("%Y-%m-%d %H:%M:%S"), "%Y-%m-%d %H:%M:%S")        
        self.settings.BuildInformation.build_number = str(os.environ.get('BuildNumber', 0))
        self.settings.BuildInformation.build_id = str(os.environ.get('BuildId', 0))
        self.settings.BuildInformation.build_user = os.environ.get('BuildUser','smitty@occourts.org')
        self.settings.BuildInformation.build_url = f'https://occourts.visualstudio.com/TranslationServices/_build/results?buildId={self.settings.BuildInformation.build_id}&view=results'

    def get_base_settings(self):
        
        settings_file = f'config/settings.{self.environment}.json'
        
        try:
            with open(settings_file, 'r') as file:
                settings = json.load(file)
                app_config = AppConfig(**settings)
            return app_config
        except FileNotFoundError:
            logging.error(f'Settings file {settings_file} not found.')
            return {}
        except json.JSONDecodeError as e:
            logging.error(f'Error decoding JSON from {settings_file}: {e}')
            return {}
        return self.settings
    
    def init_secret_manager(self):
        self.secret_manager_settings = self.base_settings.SecretManager.Settings
        self.vault_url = self.secret_manager_settings.URL
        assert self.vault_url, "Vault URL is not set in the settings."

        self.secret_list = self.secret_manager_settings.Secrets
        assert self.secret_list, "Secrets are not set in the settings."

        return True

    def _get_secret(self,secret_id):
        secret_value = os.environ.get(secret_id,None)
        return secret_value
   
    def map_secrets_to_settings(self):
        mapped_settings = self.base_settings

        for secret_info in self.secret_list:
            secret_key = secret_info.secret
            target_location = secret_info.mapping
            content_type = secret_info.content_type

            secret_value = self._get_secret(secret_key)
            
            if content_type == 'json':
                secret_value = json.loads(secret_value)
                for key, value in secret_value.items():
                    attrs = f"{target_location}.{key}".split('.')
                    current = mapped_settings
                    for attr in attrs[:-1]:
                        current = getattr(current, attr)
                    setattr(current, attrs[-1], value)
            else:
                attrs = target_location.split('.')
                current = mapped_settings
                for attr in attrs[:-1]:
                    current = getattr(current, attr)
                setattr(current, attrs[-1], secret_value)

        return mapped_settings
