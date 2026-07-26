"""Single source of truth for the *effective* Azure OAuth config (task #3322).

Precedence:
  1. The admin-configured DB row (``oauth_settings_t`` where provider='AzureAD'), if a
     tenant + client id are set. The client secret is decrypted here for server-side use.
  2. Otherwise, the static ``AuthorizationProvider`` values from settings.*.json.

This is the seam future ``fastapi_azure_auth`` wiring should read from, so live sign-in
picks up admin changes without a redeploy. Nothing consumes Azure auth today (the dep is
present but unwired), so this resolver has no runtime caller yet — it exists so the
config the admin saves is reachable from one place when sign-in is wired up.
"""
from typing import Optional

from pydantic import BaseModel

from app.config.app_settings import SettingsConfig
from app.config.crypto import try_decrypt_secret
from app.repositories.oauth_settings.controller import OAuthSettingsRepository, AZURE_PROVIDER


class EffectiveAzureOAuth(BaseModel):
    tenant_id: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None  # decrypted; server-side use only, never serialized to a client
    redirect_uri: Optional[str] = None
    scopes: Optional[str] = None
    enabled: bool = False
    source: str = "static"  # "db" | "static"


def _from_static() -> EffectiveAzureOAuth:
    provider = SettingsConfig().settings.AuthorizationProvider.Settings
    scope = provider.Scope
    return EffectiveAzureOAuth(
        tenant_id=provider.AppRegistrationTenantId or None,
        client_id=provider.AppRegistrationClientId or None,
        client_secret=provider.AppRegistrationClientSecret or None,
        scopes=(scope.Path or None) if scope else None,
        enabled=bool(provider.AppRegistrationClientId),
        source="static",
    )


async def resolve_azure_oauth() -> EffectiveAzureOAuth:
    """Return the effective Azure OAuth config, preferring the admin DB row."""
    repo = OAuthSettingsRepository()
    row = await repo._get_row(AZURE_PROVIDER)

    if row and (row.get("tenant_id") or row.get("client_id")):
        return EffectiveAzureOAuth(
            tenant_id=row.get("tenant_id"),
            client_id=row.get("client_id"),
            client_secret=try_decrypt_secret(row.get("client_secret_encrypted")),
            redirect_uri=row.get("redirect_uri"),
            scopes=row.get("scopes"),
            enabled=bool(row.get("enabled")),
            source="db",
        )

    return _from_static()
