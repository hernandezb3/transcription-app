from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class MentionCreate(BaseModel):
    entity_type: str
    entity_id: int
    mentioned_user_id: int
    mentioned_by_user_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class MentionEntry(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    mentioned_user_id: int
    mentioned_by_user_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
