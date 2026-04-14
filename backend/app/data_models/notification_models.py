from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class NotificationCreate(BaseModel):
    user_id: int
    actor_user_id: Optional[int] = None
    notification_type: str = "info"
    category: str = "mention"
    priority: str = "normal"
    title: str
    message: Optional[str] = None
    route: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    is_read: int = 0

    model_config = ConfigDict(from_attributes=True)


class NotificationUpdate(BaseModel):
    is_read: Optional[int] = None
    read_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationEntry(BaseModel):
    id: int
    user_id: int
    actor_user_id: Optional[int] = None
    actor_display_name: Optional[str] = None
    notification_type: str = "info"
    category: str = "mention"
    priority: str = "normal"
    title: str
    message: Optional[str] = None
    route: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    is_read: int = 0
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
