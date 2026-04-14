"""add transcript_threads_t and thread_posts_t tables

Revision ID: 12
Revises: 11
Create Date: 2026-04-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '12'
down_revision: Union[str, Sequence[str], None] = '11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Threads table ──
    op.create_table(
        'transcript_threads_t',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('transcription_id', sa.Integer, nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('created_by', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=True),
        sa.Column('is_active', sa.Integer, nullable=False, server_default='1'),
        schema='public',
    )

    op.create_index(
        'ix_transcript_threads_transcription',
        'transcript_threads_t',
        ['transcription_id', 'is_active'],
        schema='public',
    )

    # ── Posts table ──
    op.create_table(
        'thread_posts_t',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('thread_id', sa.Integer, nullable=False),
        sa.Column('parent_post_id', sa.Integer, nullable=True),
        sa.Column('body', sa.Text, nullable=False),
        sa.Column('created_by', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=True),
        sa.Column('edited_at', sa.DateTime, nullable=True),
        sa.Column('is_active', sa.Integer, nullable=False, server_default='1'),
        schema='public',
    )

    op.create_index(
        'ix_thread_posts_thread',
        'thread_posts_t',
        ['thread_id', 'is_active'],
        schema='public',
    )

    op.create_index(
        'ix_thread_posts_parent',
        'thread_posts_t',
        ['parent_post_id'],
        schema='public',
    )


def downgrade() -> None:
    op.drop_index('ix_thread_posts_parent', table_name='thread_posts_t', schema='public')
    op.drop_index('ix_thread_posts_thread', table_name='thread_posts_t', schema='public')
    op.drop_table('thread_posts_t', schema='public')
    op.drop_index('ix_transcript_threads_transcription', table_name='transcript_threads_t', schema='public')
    op.drop_table('transcript_threads_t', schema='public')
