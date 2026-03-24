from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime, timezone


class TranscriptDetailsCommentsCreateIngest(BaseModel):

    section_id: Optional[int] = None
    comment: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class TranscriptDetailsCommentsCreate(BaseModel):

    transcription_id: Optional[int] = None
    section_id: Optional[int] = None
    comment: Optional[str] = None
    created_by: Optional[int] = 1
    created_at: Optional[datetime] = None
    is_active: Optional[int] = 1

    model_config = ConfigDict(from_attributes=True)

class TranscriptDetailsComments(BaseModel):
    id: Optional[int] = None

    transcription_id: Optional[int] = None
    section_id: Optional[int] = None
    comment: Optional[str] = None
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    is_active: Optional[int] = 1

    model_config = ConfigDict(from_attributes=True)
