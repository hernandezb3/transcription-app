"""add transcript_speakers_t and speaker_id FK on transcript_details_t

Revision ID: 07
Revises: 06
Create Date: 2026-04-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '07'
down_revision: Union[str, Sequence[str], None] = '06'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create the transcript_speakers_t table
    op.create_table(
        'transcript_speakers_t',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('transcription_id', sa.Integer, nullable=False),
        sa.Column('speaker_label', sa.String(200), nullable=True),
        sa.Column('display_name', sa.String(200), nullable=True),
        sa.Column('is_active', sa.Integer, nullable=False, server_default='1'),
        schema='public',
    )

    # 2. Add speaker_id column to transcript_details_t
    op.add_column(
        'transcript_details_t',
        sa.Column('speaker_id', sa.Integer, nullable=True),
        schema='public',
    )

    # 3. Populate transcript_speakers_t from existing distinct speakers
    op.execute("""
        INSERT INTO public.transcript_speakers_t (transcription_id, speaker_label, display_name, is_active)
        SELECT DISTINCT transcription_id, speaker, speaker, 1
        FROM public.transcript_details_t
        WHERE speaker IS NOT NULL AND is_active = 1;
    """)

    # 4. Back-fill speaker_id on transcript_details_t
    op.execute("""
        UPDATE public.transcript_details_t d
        SET speaker_id = s.id
        FROM public.transcript_speakers_t s
        WHERE d.transcription_id = s.transcription_id
          AND d.speaker = s.speaker_label
          AND d.speaker IS NOT NULL;
    """)

    # 5. Add FK constraint
    op.create_foreign_key(
        'fk_transcript_details_speaker_id',
        'transcript_details_t',
        'transcript_speakers_t',
        ['speaker_id'],
        ['id'],
        source_schema='public',
        referent_schema='public',
    )

    # 6. Index on (transcription_id, is_active) for speakers lookup
    op.create_index(
        'ix_transcript_speakers_transcription_active',
        'transcript_speakers_t',
        ['transcription_id', 'is_active'],
        schema='public',
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_transcript_details_speaker_id',
        'transcript_details_t',
        schema='public',
        type_='foreignkey',
    )
    op.drop_index(
        'ix_transcript_speakers_transcription_active',
        'transcript_speakers_t',
        schema='public',
    )
    op.drop_column('transcript_details_t', 'speaker_id', schema='public')
    op.drop_table('transcript_speakers_t', schema='public')
