from sqlalchemy import Column, Integer, DateTime, Identity, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.db_models.base import Base, Schema


class RolePermissionsT(Base):
    __tablename__ = 'role_permissions_t'
    __table_args__ = (
        UniqueConstraint('role_id', 'permission_id', name='uq_role_permissions_role_perm'),
        {'schema': Schema},
    )

    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))
    role_id = Column(Integer, ForeignKey(f'{Schema}.roles_t.id', ondelete='CASCADE'), nullable=False)
    permission_id = Column(Integer, ForeignKey(f'{Schema}.permissions_t.id', ondelete='CASCADE'), nullable=False)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
