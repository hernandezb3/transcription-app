from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class LessonSubject(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    created: Optional[datetime] = None
    modified: Optional[datetime] = None
    active: Optional[int] = 1

    model_config = ConfigDict(from_attributes=True)


class LessonSubjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LessonSubjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
