from sqlalchemy import Column, Integer, String, DateTime, Identity, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.db_models.base import Base, Schema


class GroupsT(Base):
    __tablename__ = 'groups_t'
    __table_args__ = (
        UniqueConstraint('code', name='uq_groups_code'),
        {'schema': Schema},
    )

    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))
    name = Column(String(255), nullable=False)
    code = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    group_type = Column(String(50), nullable=False, default='security')  # security | functional | pilot | admin
    parent_group_id = Column(Integer, ForeignKey(f'{Schema}.groups_t.id', ondelete='SET NULL'), nullable=True)
    status = Column(String(50), nullable=False, default='active')        # active | inactive

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
