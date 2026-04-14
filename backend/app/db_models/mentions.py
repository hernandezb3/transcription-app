from sqlalchemy import Column, Integer, String, DateTime, Identity, Text
from sqlalchemy.sql import func
from app.db_models.base import Base, Schema


class MentionsT(Base):
    """
    Generic @mentions table.
    entity_type + entity_id point to the parent object (comment, todo, etc.).
    """
    __tablename__ = 'mentions_t'
    __table_args__ = {'schema': Schema}

    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))
    entity_type = Column(String(50), nullable=False)           # 'comment' | 'detail_comment' | 'todo'
    entity_id = Column(Integer, nullable=False)                # FK to the parent row
    mentioned_user_id = Column(Integer, nullable=False)        # user being @mentioned
    mentioned_by_user_id = Column(Integer, nullable=True)      # user who created the mention
    created_at = Column(DateTime, nullable=False, server_default=func.now())
