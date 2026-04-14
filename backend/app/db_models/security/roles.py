from sqlalchemy import Column, Integer, String, DateTime, Identity, UniqueConstraint
from sqlalchemy.sql import func
from app.db_models.base import Base, Schema


class RolesT(Base):
    __tablename__ = 'roles_t'
    __table_args__ = (
        UniqueConstraint('code', name='uq_roles_code'),
        {'schema': Schema},
    )

    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))
    code = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    assignment_level = Column(String(50), nullable=False, default='both')  # system | group | both
    status = Column(String(50), nullable=False, default='active')          # active | inactive

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
