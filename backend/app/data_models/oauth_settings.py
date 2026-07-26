from pydantic import BaseModel, ConfigDict
from typing import Optional


class OAuthSettingsUpdate(BaseModel):
    """Admin input when saving Azure OAuth config (task #3322).

    ``client_secret`` is WRITE-ONLY: send a new value to (re)set it, or omit / send an
    empty string to keep the currently stored secret unchanged. It is never echoed back.
    All other fields are optional so a partial edit (e.g. fixing the redirect URI) does
    not require re-entering everything.
    """
    tenant_id: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    redirect_uri: Optional[str] = None
    scopes: Optional[str] = None
    enabled: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class OAuthSettingsRead(BaseModel):
    """What the API returns for Azure OAuth config.

    Deliberately has NO ``client_secret`` field — the secret is never returned. The
    client learns only whether one is configured (``client_secret_set``) and gets a
    fixed mask for display (``client_secret_masked``).
    """
    provider: str
    tenant_id: Optional[str] = None
    client_id: Optional[str] = None
    redirect_uri: Optional[str] = None
    scopes: Optional[str] = None
    enabled: int = 0
    client_secret_set: bool = False
    client_secret_masked: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
