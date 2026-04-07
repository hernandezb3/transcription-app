"""seed initial data

Revision ID: 02
Revises: 01
Create Date: 2026-03-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '02'
down_revision: Union[str, Sequence[str], None] = '01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed initial data."""

    # Seed users
    op.execute("""
        INSERT INTO public.users_t (
            unique_id, user_email, user_name, first_name, last_name,
            display_name, created, created_by, modified, modified_by, active
        ) VALUES
        (
            'bryan-hernandez-001',
            'bryan@ponoponoi.com',
            'bryan',
            'Bryan',
            'Hernandez',
            'Bryan Hernandez',
            NOW(), 1, NOW(), 1, 1
        ),
        (
            'brittney-hernandez-001',
            'brittney@bridge-collab.com',
            'brittney',
            'Brittney',
            'Hernandez',
            'Brittney Hernandez',
            NOW(), 1, NOW(), 1, 1
        )
        ON CONFLICT DO NOTHING;
    """)

    # Seed transcript details
    op.execute("""
        INSERT INTO public.transcript_details_t (
            transcription_id, section_id, speaker,
            begin_timestamp, end_timestamp,
            original_text, edited_text, is_active
        ) VALUES
        (1, 1, 'Teacher', '00:00:01.000', '00:00:04.500',
         'Alright class today we are going to solve a simple algebra problem',
         'Alright class, today we are going to solve a simple algebra problem.', 1),
        (1, 2, 'Student', '00:00:04.600', '00:00:07.200',
         'Is it going to be like solving for x again',
         'Is it going to be like solving for x again?', 1),
        (1, 3, 'Teacher', '00:00:07.300', '00:00:12.000',
         'Yes exactly today we will solve the equation 2x plus 3 equals 11',
         'Yes, exactly. Today we will solve the equation 2x + 3 = 11.', 1),
        (1, 4, 'Student', '00:00:12.100', '00:00:15.000',
         'Okay I think we need to move the 3 first',
         'Okay, I think we need to move the 3 first.', 1),
        (1, 5, 'Teacher', '00:00:15.100', '00:00:20.500',
         'Good so what operation will you use to move the 3 to the other side',
         'Good. What operation will you use to move the 3 to the other side?', 1),
        (1, 6, 'Student', '00:00:20.600', '00:00:24.200',
         'We subtract 3 from both sides',
         'We subtract 3 from both sides.', 1),
        (1, 7, 'Teacher', '00:00:24.300', '00:00:29.000',
         'Exactly so now we have 2x equals 8',
         'Exactly. So now we have 2x = 8.', 1),
        (1, 8, 'Student', '00:00:29.100', '00:00:32.500',
         'Then we divide both sides by 2',
         'Then we divide both sides by 2.', 1),
        (1, 9, 'Teacher', '00:00:32.600', '00:00:36.200',
         'Exactly and what does that give us',
         'Correct. And what does that give us?', 1),
        (1, 10, 'Student', '00:00:36.300', '00:00:39.000',
         'X equals 4',
         'x = 4.', 1),
        (1, 11, 'Teacher', '00:00:39.100', '00:00:44.000',
         'Great job that is how you solve a basic linear equation',
         'Great job. That is how you solve a basic linear equation.', 1)
        ON CONFLICT DO NOTHING;
    """)

    # Seed microphone colors
    op.execute("""
        INSERT INTO public.microphone_colors_t (
            color, description,
            created, created_by, modified, modified_by, active
        ) VALUES
        ('Teacher',  'Teacher mic',                     NOW(), 1, NOW(), 1, 1),
        ('Blue',    'Kid mic',                         NOW(), 1, NOW(), 1, 1),
        ('Green',   'Kid mic',                         NOW(), 1, NOW(), 1, 1),
        ('Orange',  'Kid mic',                         NOW(), 1, NOW(), 1, 1),
        ('Purple', 'Kid mic',                         NOW(), 1, NOW(), 1, 1),
        ('Red', 'Kid mic',                         NOW(), 1, NOW(), 1, 1),
        ('Yellow', 'Kid mic',                         NOW(), 1, NOW(), 1, 1)
        ON CONFLICT DO NOTHING;
    """)

    # Seed participants
    op.execute("""
        INSERT INTO public.participants_t (
            name, role, description, join_date, withdrawal_date,
            "Status", "Number_of_Audio_Files", "Number_of_Videos",
            created, created_by, modified, modified_by, active
        ) VALUES
        ('participant_001', 'Teacher', 'Anonymized teacher participant', '2026-01-15', NULL, 'Active', 5, 2, NOW(), 1, NOW(), 1, 1),
        ('participant_002', 'Teacher', 'Anonymized teacher participant', '2026-01-15', NULL, 'Active', 3, 1, NOW(), 1, NOW(), 1, 1),
        ('participant_003', 'Teacher', 'Anonymized teacher participant', '2026-01-15', NULL, 'Active', 4, 2, NOW(), 1, NOW(), 1, 1),
        ('participant_004', 'Teacher', 'Anonymized teacher participant', '2026-02-01', NULL, 'Active', 0, 0, NOW(), 1, NOW(), 1, 1),
        ('participant_005', 'Teacher', 'Anonymized teacher participant', '2026-02-10', NULL, 'Active', 2, 1, NOW(), 1, NOW(), 1, 1),
        ('participant_006', 'Teacher', 'Anonymized teacher participant', '2026-01-15', NULL, 'Active', 1, 0, NOW(), 1, NOW(), 1, 1)
        ON CONFLICT DO NOTHING;
    """)


def downgrade() -> None:
    """Remove seeded data."""
    op.execute("DELETE FROM public.participants_t WHERE name IN ('participant_001','participant_002','participant_003','participant_004','participant_005','participant_006');")
    op.execute("DELETE FROM public.microphone_colors_t WHERE color IN ('Teacher','Blue','Green','Orange','Purple','Red','Yellow');")
    op.execute("DELETE FROM public.transcript_details_t WHERE transcription_id = 1;")
    op.execute("DELETE FROM public.users_t WHERE unique_id IN ('bryan-hernandez-001', 'brittney-hernandez-001');")