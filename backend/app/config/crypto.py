"""Symmetric encryption for secrets stored at rest (e.g. the Azure OAuth client
secret configured from the admin Settings area, task #3322).

We use Fernet (AES-128-CBC + HMAC-SHA256 authentication) from the ``cryptography``
package, which is already available in the runtime image (pulled in transitively by
``python-jose[cryptography]``).

Key resolution, in order:
  1. ``SETTINGS_ENCRYPTION_KEY`` env var — a urlsafe-base64 32-byte Fernet key. This
     is what production SHOULD set (generate with ``Fernet.generate_key()``).
  2. Otherwise, derive a stable key from ``JWT_SECRET_KEY`` (SHA-256 → urlsafe-base64)
     so the app still works in local/dev/CI with zero extra configuration.

Trade-off: the derived fallback is only as strong as ``JWT_SECRET_KEY``; prod should
set a dedicated ``SETTINGS_ENCRYPTION_KEY``. Rotating the key means previously stored
secrets can no longer be decrypted and must be re-entered — that is intentional and
acceptable for a small set of admin-managed OAuth secrets.
"""
from __future__ import annotations

import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken

# Kept in sync with app.auth.security.SECRET_KEY's default so a deployment that sets
# neither var is at least internally consistent.
_JWT_SECRET_DEFAULT = "change-me-in-production-please"

# Shown to the client instead of the real secret. The real value is never returned.
_MASK = "••••••••"


def _derive_key_from(secret: str) -> bytes:
    """Turn an arbitrary secret string into a valid 32-byte urlsafe-base64 Fernet key."""
    digest = hashlib.sha256(secret.encode("utf-8")).digest()  # 32 bytes
    return base64.urlsafe_b64encode(digest)


def get_encryption_key() -> bytes:
    """Return the active Fernet key (env-provided, else derived from JWT secret)."""
    env_key = os.environ.get("SETTINGS_ENCRYPTION_KEY")
    if env_key:
        # Accept a ready-made Fernet key as-is; Fernet() validates it on use.
        return env_key.encode("utf-8") if isinstance(env_key, str) else env_key

    jwt_secret = os.environ.get("JWT_SECRET_KEY", _JWT_SECRET_DEFAULT)
    return _derive_key_from(jwt_secret)


def _fernet() -> Fernet:
    return Fernet(get_encryption_key())


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a secret for storage at rest. Returns a urlsafe token string."""
    if plaintext is None:
        raise ValueError("Cannot encrypt None.")
    token = _fernet().encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_secret(token: str) -> str:
    """Decrypt a stored secret. Raises InvalidToken if the key/token don't match."""
    if not token:
        raise ValueError("Cannot decrypt an empty token.")
    raw = token.encode("utf-8") if isinstance(token, str) else token
    return _fernet().decrypt(raw).decode("utf-8")


def try_decrypt_secret(token: str | None) -> str | None:
    """Best-effort decrypt — returns None instead of raising (e.g. after key rotation)."""
    if not token:
        return None
    try:
        return decrypt_secret(token)
    except (InvalidToken, ValueError):
        return None


def mask_secret(has_secret: bool) -> str | None:
    """Return the display mask when a secret is configured, else None.

    Never derived from the real secret's contents — length/value are not leaked.
    """
    return _MASK if has_secret else None
