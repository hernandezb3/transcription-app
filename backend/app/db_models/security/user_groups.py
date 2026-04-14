from sqlalchemy import Column, Integer, String, DateTime, Identity, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.db_models.base import Base, Schema


class UserGroupsT(Base):
    __tablename__ = 'user_groups_t'
    __table_args__ = (
        UniqueConstraint('user_id', 'group_id', name='uq_user_groups_user_group'),
        {'schema': Schema},
    )

    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))
    user_id = Column(Integer, ForeignKey(f'{Schema}.users_t.id', ondelete='CASCADE'), nullable=False)
    group_id = Column(Integer, ForeignKey(f'{Schema}.groups_t.id', ondelete='CASCADE'), nullable=False)
    membership_status = Column(String(50), nullable=False, default='active')  # active | inactive | removed
    membership_type = Column(String(50), nullable=False, default='member')    # member | manager
    joined_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
