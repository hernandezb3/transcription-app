"""add tags column to transcript_details_t

Revision ID: 01
Revises: 00
Create Date: 2026-03-20 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '01'
down_revision: Union[str, Sequence[str], None] = '00'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add tags column to transcript_details_t."""
    op.add_column(
        'transcript_details_t',
        sa.Column('tags', sa.Text(), nullable=True),
        schema='public',
    )


def downgrade() -> None:
    """Remove tags column from transcript_details_t."""
    op.drop_column('transcript_details_t', 'tags', schema='public')
