from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class Transcript(BaseModel):
    id: Optional[int] = None
    unique_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    microphone_color_id: Optional[int] = None
    participant_id: Optional[int] = None
    lesson_number: Optional[str] = None
    lesson_subject: Optional[str] = None
    tags: List[str] = []
    created: Optional[datetime] = None
    modified: Optional[datetime] = None
    active: Optional[int] = 1

    model_config = ConfigDict(from_attributes=True)


class TranscriptCreate(BaseModel):
    unique_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    microphone_color_id: Optional[int] = None
    participant_id: Optional[int] = None
    lesson_number: Optional[str] = None
    lesson_subject: Optional[str] = None
    tags: Optional[List[str]] = None

    model_config = ConfigDict(from_attributes=True)


class TranscriptUpdate(BaseModel):
    unique_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    microphone_color_id: Optional[int] = None
    participant_id: Optional[int] = None
    lesson_number: Optional[str] = None
    lesson_subject: Optional[str] = None
    tags: Optional[List[str]] = None

    model_config = ConfigDict(from_attributes=True)
