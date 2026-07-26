"""Data access for admin-configurable OAuth provider settings (task #3322).

The client secret is stored encrypted (see app/config/crypto.py) and is never returned
by ``get_azure`` — the read model exposes only whether a secret is set. ``upsert_azure``
encrypts a newly supplied secret and leaves the stored one untouched when the caller
sends a blank secret (blank = keep).
"""
import sqlalchemy

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.oauth_settings import OAuthSettingsT
from app.data_models.oauth_settings import OAuthSettingsUpdate, OAuthSettingsRead
from app.mappers.oauth_settings_mapper import OAuthSettingsMapper

AZURE_PROVIDER = "AzureAD"


class OAuthSettingsRepository:
    def __init__(self):
        self.database = DatabaseFactory()

    async def _get_row(self, provider: str) -> dict | None:
        query = sqlalchemy.select(
            OAuthSettingsT.id,
            OAuthSettingsT.provider,
            OAuthSettingsT.tenant_id,
            OAuthSettingsT.client_id,
            OAuthSettingsT.client_secret_encrypted,
            OAuthSettingsT.redirect_uri,
            OAuthSettingsT.scopes,
            OAuthSettingsT.enabled,
        ).where(OAuthSettingsT.provider == provider)
        result = await self.database.aread(query)
        data = result.get("data", []) if isinstance(result, dict) else []
        if isinstance(data, list) and data:
            return data[0]
        return None

    async def get_azure(self) -> OAuthSettingsRead:
        """Return the masked, secret-free Azure OAuth config."""
        row = await self._get_row(AZURE_PROVIDER)
        return OAuthSettingsMapper.to_read_model(row or {}, AZURE_PROVIDER)

    async def upsert_azure(self, payload: OAuthSettingsUpdate, user_id: int = 1) -> OAuthSettingsRead:
        """Create or update the Azure OAuth config, then return the masked read model."""
        values = OAuthSettingsMapper.to_update_values(payload, user_id=user_id)
        existing = await self._get_row(AZURE_PROVIDER)

        if existing:
            stmt = (
                sqlalchemy.update(OAuthSettingsT)
                .where(OAuthSettingsT.provider == AZURE_PROVIDER)
                .values(**values)
            )
            await self.database.aupdate(stmt)
        else:
            insert_values = {
                "provider": AZURE_PROVIDER,
                "created": OAuthSettingsMapper._utc_now_naive(),
                "created_by": user_id,
                **values,
            }
            insert_values.setdefault("enabled", 0)
            stmt = sqlalchemy.insert(OAuthSettingsT).values(**insert_values)
            await self.database.acreate(stmt)

        return await self.get_azure()
