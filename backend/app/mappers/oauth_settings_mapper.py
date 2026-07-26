"""Mapping between the OAuth settings DB row, the admin input, and the safe read model.

Two invariants live here (task #3322):
  * The client secret is NEVER put into the read model — only ``client_secret_set`` +
    a fixed mask. (write-only secret)
  * On update, a blank/omitted ``client_secret`` keeps the stored value; a non-blank one
    is re-encrypted. (blank = keep)
"""
from datetime import datetime, timezone

from app.data_models.oauth_settings import OAuthSettingsUpdate, OAuthSettingsRead
from app.config.crypto import encrypt_secret, mask_secret


class OAuthSettingsMapper:
    @staticmethod
    def _utc_now_naive() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def to_read_model(row: dict, provider: str) -> OAuthSettingsRead:
        """Build the client-safe read model from a DB row dict (or an empty default)."""
        row = row or {}
        has_secret = bool(row.get("client_secret_encrypted"))
        return OAuthSettingsRead(
            provider=row.get("provider") or provider,
            tenant_id=row.get("tenant_id"),
            client_id=row.get("client_id"),
            redirect_uri=row.get("redirect_uri"),
            scopes=row.get("scopes"),
            enabled=int(row.get("enabled") or 0),
            client_secret_set=has_secret,
            client_secret_masked=mask_secret(has_secret),
        )

    @staticmethod
    def to_update_values(payload: OAuthSettingsUpdate, user_id: int = 1) -> dict:
        """Columns to write on update. Only fields the admin actually set are included.

        The plaintext secret is popped and, if non-blank, encrypted into
        ``client_secret_encrypted``; a blank/omitted secret is left untouched (kept).
        """
        data = payload.model_dump(exclude_unset=True)

        plain_secret = data.pop("client_secret", None)
        if plain_secret is not None and plain_secret.strip() != "":
            data["client_secret_encrypted"] = encrypt_secret(plain_secret)
        # blank or omitted → do not touch the stored secret

        data["modified"] = OAuthSettingsMapper._utc_now_naive()
        data["modified_by"] = user_id
        return data
