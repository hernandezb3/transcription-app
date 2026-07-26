"""Contract tests for the edit-user update path (task #3319).

Covers the two things #3319 adds on top of #3318 — renaming a user and toggling
active/inactive — through the generic UserUpdate → UserMapper.to_update_values path:
  * `active` is an editable field on UserUpdate (0 disables sign-in without deletion).
  * to_update_values only writes fields the caller actually set (exclude_unset), so a
    partial edit never clobbers untouched columns, and always stamps modified/modified_by.
  * active=0 survives the mapper (a falsy-but-set value must not be dropped).
"""

from app.data_models.user import UserUpdate
from app.mappers.user_mapper import UserMapper


def test_user_update_has_active_field():
    # #3319: admins can disable a user without deleting the account.
    assert "active" in UserUpdate.model_fields


def test_update_values_toggle_inactive_is_preserved():
    values = UserMapper.to_update_values(UserUpdate(active=0))
    # active=0 is falsy but explicitly set — it must reach the DB, not be dropped.
    assert values["active"] == 0
    assert "modified" in values
    assert "modified_by" in values


def test_update_values_rename_only_touches_supplied_fields():
    values = UserMapper.to_update_values(
        UserUpdate(first_name="Ada", last_name="Lovelace", display_name="Ada")
    )
    assert values["first_name"] == "Ada"
    assert values["last_name"] == "Lovelace"
    assert values["display_name"] == "Ada"
    # Fields the edit form never sent must not appear (no-clobber via exclude_unset).
    assert "user_name" not in values
    assert "active" not in values
    assert "user_email" not in values


def test_update_values_full_edit_includes_active_and_names():
    values = UserMapper.to_update_values(
        UserUpdate(
            first_name="Grace",
            last_name="Hopper",
            display_name="Grace H.",
            user_email="grace@example.com",
            active=1,
        )
    )
    assert values["first_name"] == "Grace"
    assert values["user_email"] == "grace@example.com"
    assert values["active"] == 1
    assert "unique_id" not in values  # untouched → not written
