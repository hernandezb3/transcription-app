"""add mentions and notifications tables

Revision ID: 11
Revises: 10
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '11'
down_revision = '10'
branch_labels = None
depends_on = None

# ---- pull the schema name from alembic.ini / env.py -----------------------
from app.db_models.base import Schema


def upgrade() -> None:
    # ── mentions_t ──
    op.create_table(
        'mentions_t',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.Integer, nullable=False),
        sa.Column('mentioned_user_id', sa.Integer, nullable=False),
        sa.Column('mentioned_by_user_id', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        schema=Schema,
    )
    op.create_index(
        'ix_mentions_entity',
        'mentions_t',
        ['entity_type', 'entity_id'],
        schema=Schema,
    )
    op.create_index(
        'ix_mentions_user',
        'mentions_t',
        ['mentioned_user_id'],
        schema=Schema,
    )

    # ── notifications_t ──
    op.create_table(
        'notifications_t',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer, nullable=False),
        sa.Column('actor_user_id', sa.Integer, nullable=True),
        sa.Column('notification_type', sa.String(50), nullable=False, server_default='info'),
        sa.Column('category', sa.String(50), nullable=False, server_default='mention'),
        sa.Column('priority', sa.String(20), nullable=False, server_default='normal'),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text, nullable=True),
        sa.Column('route', sa.String(500), nullable=True),
        sa.Column('entity_type', sa.String(100), nullable=True),
        sa.Column('entity_id', sa.String(100), nullable=True),
        sa.Column('is_read', sa.Integer, nullable=False, server_default='0'),
        sa.Column('read_at', sa.DateTime, nullable=True),
        sa.Column('expires_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        schema=Schema,
    )
    op.create_index(
        'ix_notifications_user_unread',
        'notifications_t',
        ['user_id', 'is_read'],
        schema=Schema,
    )
    op.create_index(
        'ix_notifications_created',
        'notifications_t',
        ['created_at'],
        schema=Schema,
    )


def downgrade() -> None:
    op.drop_index('ix_notifications_created', table_name='notifications_t', schema=Schema)
    op.drop_index('ix_notifications_user_unread', table_name='notifications_t', schema=Schema)
    op.drop_table('notifications_t', schema=Schema)

    op.drop_index('ix_mentions_user', table_name='mentions_t', schema=Schema)
    op.drop_index('ix_mentions_entity', table_name='mentions_t', schema=Schema)
    op.drop_table('mentions_t', schema=Schema)
