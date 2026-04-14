from sqlalchemy import Column, Integer, String, DateTime, Identity, UniqueConstraint
from sqlalchemy.sql import func
from app.db_models.base import Base, Schema


class PermissionsT(Base):
    __tablename__ = 'permissions_t'
    __table_args__ = (
        UniqueConstraint('code', name='uq_permissions_code'),
        {'schema': Schema},
    )

    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))
    code = Column(String(150), nullable=False)           # e.g. users.read, reports.export
    resource = Column(String(100), nullable=False)        # e.g. users, reports, groups
    action = Column(String(100), nullable=False)          # e.g. read, update, delete
    description = Column(String(500), nullable=True)
    status = Column(String(50), nullable=False, default='active')  # active | inactive

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
