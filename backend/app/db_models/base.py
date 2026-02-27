"""
Shared SQLAlchemy Base for all models.
All db_models should import Base from this module.
"""
from sqlalchemy.orm import declarative_base
from config.app_settings import SettingsConfig

Base = declarative_base()

settings = SettingsConfig().settings.TransactionalDatabase.Settings

Schema = settings.BaseSchema
