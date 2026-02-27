from sqlalchemy import Column, Integer, String, DateTime, Identity
from db_models.base import Base, Schema

class UsersT(Base):
    __tablename__ = 'users_t'
    __table_args__ = {'schema': Schema}
    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))
    
    unique_id = Column(String(50), nullable=True)
    user_email = Column(String(215), nullable=True)
    user_name = Column(String(200), nullable=True)
    first_name = Column(String(200), nullable=True)
    last_name = Column(String(100), nullable=True)
    display_name = Column(String(200), nullable=True)

    created = Column(DateTime, nullable=False)
    created_by = Column(Integer, nullable=False)
    modified = Column(DateTime, nullable=False)
    modified_by = Column(Integer, nullable=False)
    active = Column(Integer, nullable=False, default=1)