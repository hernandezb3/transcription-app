"""add oauth_settings_t (admin-configurable Azure OAuth) — task #3322

Revision ID: 13
Revises: 12
Create Date: 2026-07-25

Stores admin-managed OAuth provider config. The client secret column holds a
Fernet-encrypted value only (see app/config/crypto.py) — never plaintext.
Seeds a single empty ``AzureAD`` row so the admin Settings form has something to edit.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '13'
down_revision: Union[str, Sequence[str], None] = '12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = 'public'


def upgrade() -> None:
    op.create_table(
        'oauth_settings_t',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('tenant_id', sa.String(length=200), nullable=True),
        sa.Column('client_id', sa.String(length=200), nullable=True),
        sa.Column('client_secret_encrypted', sa.Text(), nullable=True),
        sa.Column('redirect_uri', sa.Text(), nullable=True),
        sa.Column('scopes', sa.Text(), nullable=True),
        sa.Column('enabled', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('created_by', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('modified', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('modified_by', sa.Integer(), nullable=False, server_default='1'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('provider', name='uq_oauth_settings_provider'),
        schema=SCHEMA,
    )

    # Seed an empty AzureAD row (idempotent) so the admin form always has a target.
    op.execute(
        sa.text(
            f"INSERT INTO {SCHEMA}.oauth_settings_t "
            f"(provider, enabled, created, created_by, modified, modified_by) "
            f"VALUES ('AzureAD', 0, now(), 1, now(), 1) "
            f"ON CONFLICT (provider) DO NOTHING"
        )
    )


def downgrade() -> None:
    op.drop_table('oauth_settings_t', schema=SCHEMA)
