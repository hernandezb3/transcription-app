from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class Participant(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    role: Optional[str] = None
    description: Optional[str] = None
    join_date: Optional[datetime] = None
    withdrawal_date: Optional[datetime] = None
    status: Optional[str] = None
    number_of_audio_files: Optional[int] = None
    number_of_videos: Optional[int] = None
    created: Optional[datetime] = None
    modified: Optional[datetime] = None
    active: Optional[int] = 1

    model_config = ConfigDict(from_attributes=True)


class ParticipantCreate(BaseModel):
    name: str
    role: Optional[str] = None
    description: Optional[str] = None
    join_date: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ParticipantUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    description: Optional[str] = None
    join_date: Optional[datetime] = None
    withdrawal_date: Optional[datetime] = None
    status: Optional[str] = None
    number_of_audio_files: Optional[int] = None
    number_of_videos: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
