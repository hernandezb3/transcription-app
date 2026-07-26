from sqlalchemy import Column, Integer, String, Text, DateTime, Identity, UniqueConstraint
from app.db_models.base import Base, Schema


class OAuthSettingsT(Base):
    """Admin-configurable OAuth provider settings (task #3322).

    One row per provider (currently just ``AzureAD``). The client secret is stored
    ENCRYPTED at rest in ``client_secret_encrypted`` — never in plain text, and never
    returned to the client (see app.mappers.oauth_settings_mapper / the read model).
    """
    __tablename__ = 'oauth_settings_t'
    __table_args__ = (
        UniqueConstraint('provider', name='uq_oauth_settings_provider'),
        {'schema': Schema},
    )

    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))
    provider = Column(String(50), nullable=False)                 # e.g. AzureAD
    tenant_id = Column(String(200), nullable=True)                # Azure directory/tenant id
    client_id = Column(String(200), nullable=True)                # Azure application/client id
    client_secret_encrypted = Column(Text, nullable=True)         # Fernet-encrypted secret (never plaintext)
    redirect_uri = Column(Text, nullable=True)
    scopes = Column(Text, nullable=True)                          # space/comma-separated scopes
    enabled = Column(Integer, nullable=False, default=0)          # 0 = off, 1 = on

    created = Column(DateTime, nullable=False)
    created_by = Column(Integer, nullable=False)
    modified = Column(DateTime, nullable=False)
    modified_by = Column(Integer, nullable=False)
