"""add transcript_activity_log_t and modified_at/modified_by on transcript_details_t

Revision ID: 08
Revises: 07
Create Date: 2026-04-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '08'
down_revision: Union[str, Sequence[str], None] = '07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create the activity log table
    op.create_table(
        'transcript_activity_log_t',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('transcription_id', sa.Integer, nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('section_id', sa.Integer, nullable=True),
        sa.Column('summary', sa.Text, nullable=True),
        sa.Column('user_id', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        schema='public',
    )

    # 2. Index for fast lookups by transcript
    op.create_index(
        'ix_activity_log_transcription_id',
        'transcript_activity_log_t',
        ['transcription_id', 'created_at'],
        schema='public',
    )

    # 3. Add modified_at and modified_by to transcript_details_t
    op.add_column(
        'transcript_details_t',
        sa.Column('modified_at', sa.DateTime, nullable=True),
        schema='public',
    )
    op.add_column(
        'transcript_details_t',
        sa.Column('modified_by', sa.Integer, nullable=True),
        schema='public',
    )


def downgrade() -> None:
    op.drop_column('transcript_details_t', 'modified_by', schema='public')
    op.drop_column('transcript_details_t', 'modified_at', schema='public')
    op.drop_index(
        'ix_activity_log_transcription_id',
        'transcript_activity_log_t',
        schema='public',
    )
    op.drop_table('transcript_activity_log_t', schema='public')
