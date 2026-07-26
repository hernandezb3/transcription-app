"""Contract tests for admin-configurable Azure OAuth settings (task #3322).

These cover the security-critical, DB-free logic:
  * the secret encrypt/decrypt round-trip and key resolution (env key vs derived),
  * that the client secret is never exposed by the read model,
  * that the mapper is write-only for the secret (blank = keep, new value = re-encrypt).

No database or Azure tenant is required — repository/resolver DB paths are out of scope
here and are covered by the manual-verify note on the card.
"""
from cryptography.fernet import Fernet

from app.config.crypto import (
    encrypt_secret,
    decrypt_secret,
    try_decrypt_secret,
    mask_secret,
    get_encryption_key,
)
from app.data_models.oauth_settings import OAuthSettingsUpdate, OAuthSettingsRead
from app.mappers.oauth_settings_mapper import OAuthSettingsMapper


# ── crypto ────────────────────────────────────────────────────────────────────
def test_encrypt_decrypt_round_trip():
    secret = "super-sensitive-azure-client-secret"
    token = encrypt_secret(secret)
    assert token != secret                      # stored value is not the plaintext
    assert decrypt_secret(token) == secret      # ...but decrypts back to it


def test_derived_key_is_stable_and_valid_fernet(monkeypatch):
    # No dedicated key set → key is derived from JWT_SECRET_KEY, deterministically.
    monkeypatch.delenv("SETTINGS_ENCRYPTION_KEY", raising=False)
    monkeypatch.setenv("JWT_SECRET_KEY", "unit-test-secret")

    key1 = get_encryption_key()
    key2 = get_encryption_key()
    assert key1 == key2                          # stable across calls (same input)
    # A valid Fernet key is 32 urlsafe-base64 bytes → constructing Fernet must not raise.
    Fernet(key1)


def test_env_key_is_respected(monkeypatch):
    dedicated = Fernet.generate_key().decode("utf-8")
    monkeypatch.setenv("SETTINGS_ENCRYPTION_KEY", dedicated)

    token = encrypt_secret("hello")
    assert decrypt_secret(token) == "hello"
    # Token is decryptable directly with the same dedicated key.
    assert Fernet(dedicated.encode()).decrypt(token.encode()) == b"hello"


def test_try_decrypt_returns_none_on_garbage():
    assert try_decrypt_secret(None) is None
    assert try_decrypt_secret("") is None
    assert try_decrypt_secret("not-a-valid-token") is None


def test_mask_secret():
    assert mask_secret(False) is None
    assert mask_secret(True)  # a non-empty mask string
    # The mask is a fixed placeholder — it must not depend on any real secret.
    assert mask_secret(True) == mask_secret(True)


# ── read model never leaks the secret ──────────────────────────────────────────
def test_read_model_has_no_client_secret_field():
    assert "client_secret" not in OAuthSettingsRead.model_fields
    assert "client_secret_encrypted" not in OAuthSettingsRead.model_fields
    assert "client_secret_set" in OAuthSettingsRead.model_fields


def test_to_read_model_marks_secret_set_without_exposing_it():
    row = {
        "provider": "AzureAD",
        "tenant_id": "tenant-123",
        "client_id": "client-abc",
        "client_secret_encrypted": encrypt_secret("s3cr3t"),
        "redirect_uri": "https://app/callback",
        "scopes": "api://x/Full",
        "enabled": 1,
    }
    read = OAuthSettingsMapper.to_read_model(row, "AzureAD")
    dumped = read.model_dump()

    assert read.client_secret_set is True
    assert read.client_secret_masked  # shows a mask
    assert read.tenant_id == "tenant-123"
    # The real secret (encrypted or plaintext) must appear nowhere in the payload.
    assert "s3cr3t" not in str(dumped)
    assert row["client_secret_encrypted"] not in str(dumped)


def test_to_read_model_empty_row_reports_no_secret():
    read = OAuthSettingsMapper.to_read_model({}, "AzureAD")
    assert read.provider == "AzureAD"
    assert read.client_secret_set is False
    assert read.client_secret_masked is None
    assert read.enabled == 0


# ── write-only secret mapper ────────────────────────────────────────────────────
def test_update_blank_secret_keeps_existing():
    # Editing only the redirect URI, secret left blank → secret column not written.
    values = OAuthSettingsMapper.to_update_values(
        OAuthSettingsUpdate(redirect_uri="https://new/callback", client_secret="")
    )
    assert values["redirect_uri"] == "https://new/callback"
    assert "client_secret_encrypted" not in values
    assert "client_secret" not in values  # plaintext never persisted
    assert "modified" in values and "modified_by" in values


def test_update_omitted_secret_keeps_existing():
    values = OAuthSettingsMapper.to_update_values(OAuthSettingsUpdate(tenant_id="t2"))
    assert values["tenant_id"] == "t2"
    assert "client_secret_encrypted" not in values


def test_update_new_secret_is_encrypted():
    values = OAuthSettingsMapper.to_update_values(
        OAuthSettingsUpdate(client_secret="brand-new-secret")
    )
    assert "client_secret" not in values          # never the plaintext key
    assert "client_secret_encrypted" in values
    enc = values["client_secret_encrypted"]
    assert enc != "brand-new-secret"
    assert decrypt_secret(enc) == "brand-new-secret"


def test_update_only_writes_supplied_fields():
    values = OAuthSettingsMapper.to_update_values(OAuthSettingsUpdate(enabled=1))
    assert values["enabled"] == 1
    # Untouched fields must not appear (no-clobber via exclude_unset).
    assert "tenant_id" not in values
    assert "client_id" not in values
    assert "redirect_uri" not in values
