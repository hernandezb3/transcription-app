from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class MicrophoneColor(BaseModel):
    id: Optional[int] = None
    color: Optional[str] = None
    description: Optional[str] = None
    created: Optional[datetime] = None
    modified: Optional[datetime] = None
    active: Optional[int] = 1

    model_config = ConfigDict(from_attributes=True)


class MicrophoneColorCreate(BaseModel):
    color: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MicrophoneColorUpdate(BaseModel):
    color: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
