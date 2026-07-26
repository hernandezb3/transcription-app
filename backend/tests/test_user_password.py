"""Contract tests for the user password lifecycle (task #3318).

Covers the two paths #3318 names — setting a password when creating a user, and
admin reset of an existing user's password:
  * UserMapper.to_create_values hashes a supplied password into password_hash and
    never persists the plain-text field.
  * PasswordUpdate is the reset payload and requires a password.
  * hash/verify round-trips (bcrypt) so a reset password can actually sign in.
"""

import pytest

from app.data_models.user import UserCreate, UserUpdate, PasswordUpdate
from app.mappers.user_mapper import UserMapper
from app.auth.security import hash_password, verify_password


def test_create_values_hashes_password_and_drops_plaintext():
    values = UserMapper.to_create_values(
        UserCreate(user_name="jdoe", password="supersecret")
    )
    assert "password" not in values  # plain-text never persisted
    assert "password_hash" in values
    assert values["password_hash"] != "supersecret"
    assert verify_password("supersecret", values["password_hash"])


def test_create_values_without_password_sets_no_hash():
    values = UserMapper.to_create_values(UserCreate(user_name="directory_only"))
    assert "password" not in values
    assert "password_hash" not in values


def test_password_update_requires_password():
    m = PasswordUpdate(password="newpassword123")
    assert m.password == "newpassword123"
    with pytest.raises(Exception):
        PasswordUpdate()  # password is required


def test_user_update_has_no_password_field():
    # Reset goes through the dedicated PasswordUpdate path, not the generic update.
    assert "password" not in UserUpdate.model_fields


def test_hash_is_verifiable_and_salted():
    a = hash_password("same-password")
    b = hash_password("same-password")
    assert a != b  # bcrypt salts each hash
    assert verify_password("same-password", a)
    assert verify_password("same-password", b)
    assert not verify_password("wrong", a)
