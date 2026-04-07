"""seed lesson subjects

Revision ID: 05
Revises: 04
Create Date: 2026-03-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '05'
down_revision: Union[str, Sequence[str], None] = '04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed lesson subjects."""
    op.execute("""
        INSERT INTO public.lesson_subjects_t
            (name, description, created, created_by, modified, modified_by, active)
        VALUES
            ('Math',            'Mathematics and arithmetic',       NOW(), 1, NOW(), 1, 1),
            ('ELA',         'English Language Arts',           NOW(), 1, NOW(), 1, 1)
        ON CONFLICT DO NOTHING;
    """)


def downgrade() -> None:
    """Remove seeded lesson subjects."""
    op.execute("""
        DELETE FROM public.lesson_subjects_t
        WHERE name IN (
            'Math', 'ELA'
        );
        );
    """)
