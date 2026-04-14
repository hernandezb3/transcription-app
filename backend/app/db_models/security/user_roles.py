from sqlalchemy import Column, Integer, String, DateTime, Identity, ForeignKey
from sqlalchemy.sql import func
from app.db_models.base import Base, Schema


class UserRolesT(Base):
    __tablename__ = 'user_roles_t'
    __table_args__ = {'schema': Schema}

    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))
    user_id = Column(Integer, ForeignKey(f'{Schema}.users_t.id', ondelete='CASCADE'), nullable=False)
    role_id = Column(Integer, ForeignKey(f'{Schema}.roles_t.id', ondelete='CASCADE'), nullable=False)
    group_id = Column(Integer, ForeignKey(f'{Schema}.groups_t.id', ondelete='CASCADE'), nullable=True)  # null = system-level
    assigned_by_user_id = Column(Integer, ForeignKey(f'{Schema}.users_t.id', ondelete='SET NULL'), nullable=True)
    assignment_reason = Column(String(500), nullable=True)
    assigned_at = Column(DateTime, nullable=False, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)
    status = Column(String(50), nullable=False, default='active')  # active | expired | revoked

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
