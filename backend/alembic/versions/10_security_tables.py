"""security tables and seed data

Revision ID: 10
Revises: 09
Create Date: 2026-04-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '10'
down_revision: Union[str, Sequence[str]] = '09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = 'public'

# ──────────────────────────────────────────────────────────────────────
#  Permissions to seed
# ──────────────────────────────────────────────────────────────────────
DEFAULT_PERMISSIONS = [
    {'code': 'users.read',       'resource': 'users',       'action': 'read',   'description': 'View the users list'},
    {'code': 'users.write',      'resource': 'users',       'action': 'write',  'description': 'Create, edit, and delete any user'},
    {'code': 'groups.read',      'resource': 'groups',      'action': 'read',   'description': 'View groups'},
    {'code': 'groups.manage',    'resource': 'groups',      'action': 'manage', 'description': 'Manage group membership'},
    {'code': 'roles.read',       'resource': 'roles',       'action': 'read',   'description': 'View roles and their permission assignments'},
    {'code': 'roles.write',      'resource': 'roles',       'action': 'write',  'description': 'Create, edit roles and manage permission assignments'},
    {'code': 'transcripts.read', 'resource': 'transcripts', 'action': 'read',   'description': 'View transcripts'},
    {'code': 'transcripts.write','resource': 'transcripts', 'action': 'write',  'description': 'Create, edit, and delete transcripts'},
    {'code': 'participants.read','resource': 'participants', 'action': 'read',   'description': 'View participants'},
    {'code': 'participants.write','resource': 'participants','action': 'write',  'description': 'Manage participants'},
    {'code': 'settings.read',   'resource': 'settings',     'action': 'read',   'description': 'View application settings'},
    {'code': 'settings.write',  'resource': 'settings',     'action': 'write',  'description': 'Manage application settings'},
]

DEFAULT_ROLES = [
    {
        'code': 'admin',
        'name': 'Administrator',
        'description': 'Full platform access — users, roles, permissions, transcripts, and all modules.',
        'assignment_level': 'system',
    },
    {
        'code': 'manager',
        'name': 'Manager',
        'description': 'Manages group membership, views users, and manages transcripts.',
        'assignment_level': 'group',
    },
    {
        'code': 'user',
        'name': 'General User',
        'description': 'Standard access — view transcripts, view own group, view participants.',
        'assignment_level': 'both',
    },
]

ROLE_PERMISSIONS = {
    'admin': [
        'users.read', 'users.write',
        'groups.read', 'groups.manage',
        'roles.read', 'roles.write',
        'transcripts.read', 'transcripts.write',
        'participants.read', 'participants.write',
        'settings.read', 'settings.write',
    ],
    'manager': [
        'users.read',
        'groups.read', 'groups.manage',
        'roles.read',
        'transcripts.read', 'transcripts.write',
        'participants.read', 'participants.write',
        'settings.read',
    ],
    'user': [
        'groups.read',
        'transcripts.read',
        'participants.read',
        'settings.read',
    ],
}

BOOTSTRAP_GROUP = {
    'name': 'Administrators',
    'code': 'administrators',
    'description': 'Platform administrators with full access.',
    'group_type': 'admin',
    'status': 'active',
}


def upgrade() -> None:
    """Create security tables and seed data."""

    # ── groups_t ──
    op.create_table('groups_t',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('group_type', sa.String(length=50), nullable=False),
        sa.Column('parent_group_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['parent_group_id'], [f'{SCHEMA}.groups_t.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_groups_code'),
        schema=SCHEMA,
    )

    # ── roles_t ──
    op.create_table('roles_t',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('code', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('assignment_level', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_roles_code'),
        schema=SCHEMA,
    )

    # ── permissions_t ──
    op.create_table('permissions_t',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('code', sa.String(length=150), nullable=False),
        sa.Column('resource', sa.String(length=100), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_permissions_code'),
        schema=SCHEMA,
    )

    # ── user_groups_t ──
    op.create_table('user_groups_t',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('membership_status', sa.String(length=50), nullable=False),
        sa.Column('membership_type', sa.String(length=50), nullable=False),
        sa.Column('joined_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], [f'{SCHEMA}.users_t.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['group_id'], [f'{SCHEMA}.groups_t.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'group_id', name='uq_user_groups_user_group'),
        schema=SCHEMA,
    )

    # ── user_roles_t ──
    op.create_table('user_roles_t',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=True),
        sa.Column('assigned_by_user_id', sa.Integer(), nullable=True),
        sa.Column('assignment_reason', sa.String(length=500), nullable=True),
        sa.Column('assigned_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], [f'{SCHEMA}.users_t.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], [f'{SCHEMA}.roles_t.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['group_id'], [f'{SCHEMA}.groups_t.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_by_user_id'], [f'{SCHEMA}.users_t.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        schema=SCHEMA,
    )

    # ── group_roles_t ──
    op.create_table('group_roles_t',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('assigned_by_user_id', sa.Integer(), nullable=True),
        sa.Column('assignment_reason', sa.String(length=500), nullable=True),
        sa.Column('assigned_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['group_id'], [f'{SCHEMA}.groups_t.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], [f'{SCHEMA}.roles_t.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_by_user_id'], [f'{SCHEMA}.users_t.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        schema=SCHEMA,
    )

    # ── role_permissions_t ──
    op.create_table('role_permissions_t',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], [f'{SCHEMA}.roles_t.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['permission_id'], [f'{SCHEMA}.permissions_t.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('role_id', 'permission_id', name='uq_role_permissions_role_perm'),
        schema=SCHEMA,
    )

    # ── Seed permissions ──
    for perm in DEFAULT_PERMISSIONS:
        op.execute(
            sa.text(
                f"INSERT INTO {SCHEMA}.permissions_t (code, resource, action, description, status) "
                f"VALUES (:code, :resource, :action, :description, 'active') "
                f"ON CONFLICT (code) DO NOTHING"
            ).bindparams(code=perm['code'], resource=perm['resource'], action=perm['action'], description=perm['description'])
        )

    # ── Seed roles ──
    for role in DEFAULT_ROLES:
        op.execute(
            sa.text(
                f"INSERT INTO {SCHEMA}.roles_t (code, name, description, assignment_level, status) "
                f"VALUES (:code, :name, :description, :assignment_level, 'active') "
                f"ON CONFLICT (code) DO NOTHING"
            ).bindparams(code=role['code'], name=role['name'], description=role['description'], assignment_level=role['assignment_level'])
        )

    # ── Seed role-permission assignments ──
    for role_code, perm_codes in ROLE_PERMISSIONS.items():
        for perm_code in perm_codes:
            op.execute(
                sa.text(
                    f"INSERT INTO {SCHEMA}.role_permissions_t (role_id, permission_id) "
                    f"SELECT r.id, p.id FROM {SCHEMA}.roles_t r, {SCHEMA}.permissions_t p "
                    f"WHERE r.code = :role_code AND p.code = :perm_code "
                    f"ON CONFLICT (role_id, permission_id) DO NOTHING"
                ).bindparams(role_code=role_code, perm_code=perm_code)
            )

    # ── Seed administrators group ──
    op.execute(
        sa.text(
            f"INSERT INTO {SCHEMA}.groups_t (name, code, description, group_type, status) "
            f"VALUES (:name, :code, :description, :group_type, :status) "
            f"ON CONFLICT (code) DO NOTHING"
        ).bindparams(**BOOTSTRAP_GROUP)
    )

    # ── Assign admin role to user 1 (bootstrap) ──
    op.execute(
        sa.text(
            f"INSERT INTO {SCHEMA}.user_roles_t (user_id, role_id, status) "
            f"SELECT u.id, r.id, 'active' "
            f"FROM {SCHEMA}.users_t u, {SCHEMA}.roles_t r "
            f"WHERE u.id = 1 AND r.code = 'admin' "
            f"AND NOT EXISTS (SELECT 1 FROM {SCHEMA}.user_roles_t ur WHERE ur.user_id = u.id AND ur.role_id = r.id)"
        )
    )

    # ── Add user 1 to administrators group ──
    op.execute(
        sa.text(
            f"INSERT INTO {SCHEMA}.user_groups_t (user_id, group_id, membership_status, membership_type) "
            f"SELECT u.id, g.id, 'active', 'manager' "
            f"FROM {SCHEMA}.users_t u, {SCHEMA}.groups_t g "
            f"WHERE u.id = 1 AND g.code = 'administrators' "
            f"AND NOT EXISTS (SELECT 1 FROM {SCHEMA}.user_groups_t ug WHERE ug.user_id = u.id AND ug.group_id = g.id)"
        )
    )


def downgrade() -> None:
    """Drop security tables."""
    op.drop_table('role_permissions_t', schema=SCHEMA)
    op.drop_table('group_roles_t', schema=SCHEMA)
    op.drop_table('user_roles_t', schema=SCHEMA)
    op.drop_table('user_groups_t', schema=SCHEMA)
    op.drop_table('permissions_t', schema=SCHEMA)
    op.drop_table('roles_t', schema=SCHEMA)
    op.drop_table('groups_t', schema=SCHEMA)
