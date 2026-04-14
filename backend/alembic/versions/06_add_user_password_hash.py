"""add password_hash to users_t

Revision ID: 06
Revises: 05
Create Date: 2026-04-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '06'
down_revision: Union[str, Sequence[str], None] = '05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users_t',
        sa.Column('password_hash', sa.String(length=255), nullable=True),
        schema='public',
    )


def downgrade() -> None:
    op.drop_column('users_t', 'password_hash', schema='public')
