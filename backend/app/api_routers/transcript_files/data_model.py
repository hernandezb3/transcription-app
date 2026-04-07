from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class TranscriptFile(BaseModel):
    id: Optional[int] = None
    transcription_id: Optional[int] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_path: Optional[str] = None
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    is_active: Optional[int] = 1

    model_config = ConfigDict(from_attributes=True)
