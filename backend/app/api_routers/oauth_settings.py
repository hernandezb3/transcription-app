"""Admin OAuth settings API (task #3322).

Lets an admin configure the Azure OAuth provider (tenant id, client id, client secret,
redirect URI, scopes, enabled) from the Settings area instead of static/env values.

Security:
  * The client secret is stored encrypted at rest and is NEVER returned here — GET
    exposes only ``client_secret_set`` + a mask.
  * These routes require an authenticated user (JWT). The UI is additionally gated by
    the ``settings.read`` / ``settings.write`` permissions (RequirePermission), matching
    how the rest of the admin surface is protected in this app.
"""
from fastapi import APIRouter, Depends

from app.data_models.oauth_settings import OAuthSettingsUpdate, OAuthSettingsRead
from app.repositories.oauth_settings.controller import OAuthSettingsRepository
from app.auth.dependencies import get_current_user_id

router = APIRouter(prefix="/settings/oauth")


@router.get("/azure", response_model=OAuthSettingsRead)
async def get_azure_oauth_settings(_user_id: int = Depends(get_current_user_id)):
    """Return the current Azure OAuth config (secret masked, never returned)."""
    return await OAuthSettingsRepository().get_azure()


@router.put("/azure", response_model=OAuthSettingsRead)
async def update_azure_oauth_settings(
    payload: OAuthSettingsUpdate,
    user_id: int = Depends(get_current_user_id),
):
    """Create/update the Azure OAuth config.

    A blank or omitted ``client_secret`` keeps the stored secret; a new value re-encrypts.
    """
    return await OAuthSettingsRepository().upsert_azure(payload, user_id=user_id)
