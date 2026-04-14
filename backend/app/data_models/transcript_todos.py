from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class TodoCreate(BaseModel):
    """Payload when creating a new todo."""
    title: str
    sort_order: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class TodoUpdate(BaseModel):
    """Payload when updating an existing todo."""
    title: Optional[str] = None
    is_completed: Optional[int] = None          # 0 or 1
    sort_order: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class TodoEntry(BaseModel):
    """Read model returned by the API."""
    id: int
    transcription_id: int
    title: str
    is_completed: int = 0
    sort_order: int = 0
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
