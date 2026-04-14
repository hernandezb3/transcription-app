"""add transcript_todos_t table

Revision ID: 09
Revises: 08
Create Date: 2026-04-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '09'
down_revision: Union[str, Sequence[str], None] = '08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'transcript_todos_t',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('transcription_id', sa.Integer, nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('is_completed', sa.Integer, nullable=False, server_default='0'),
        sa.Column('sort_order', sa.Integer, nullable=False, server_default='0'),
        sa.Column('created_by', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=True),
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('is_active', sa.Integer, nullable=False, server_default='1'),
        schema='public',
    )

    op.create_index(
        'ix_transcript_todos_transcription',
        'transcript_todos_t',
        ['transcription_id', 'is_active'],
        schema='public',
    )


def downgrade() -> None:
    op.drop_index('ix_transcript_todos_transcription', table_name='transcript_todos_t', schema='public')
    op.drop_table('transcript_todos_t', schema='public')
