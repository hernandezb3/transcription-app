from sqlalchemy import Column, Integer, String, DateTime, Identity, Text
from sqlalchemy.sql import func
from app.db_models.base import Base, Schema


class NotificationsT(Base):
    """
    In-app notification for a user.
    Modelled after the example app's notification system.
    """
    __tablename__ = 'notifications_t'
    __table_args__ = {'schema': Schema}

    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))

    user_id = Column(Integer, nullable=False)                          # recipient
    actor_user_id = Column(Integer, nullable=True)                     # who triggered it

    notification_type = Column(String(50), nullable=False, default='info')    # info | warning | success | action_required
    category = Column(String(50), nullable=False, default='mention')          # mention | todo | comment | system
    priority = Column(String(20), nullable=False, default='normal')           # low | normal | high | urgent

    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)

    route = Column(String(500), nullable=True)                         # in-app link, e.g. /transcriptions/5/editor
    entity_type = Column(String(100), nullable=True)                   # comment | todo | etc.
    entity_id = Column(String(100), nullable=True)

    is_read = Column(Integer, nullable=False, default=0)               # 0 = unread, 1 = read
    read_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
