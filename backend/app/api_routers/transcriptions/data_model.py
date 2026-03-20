from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class TranscriptDetails(BaseModel):
    id: Optional[int] = None

    transcription_id: Optional[int] = None
    section_id: Optional[int] = None
    speaker: Optional[str] = None
    begin_timestamp: Optional[str] = None
    end_timestamp: Optional[str] = None
    original_text: Optional[str] = None
    edited_text: Optional[str] = None
    tags: List[str] = []
    is_active: Optional[int] = 1

    model_config = ConfigDict(from_attributes=True)


class TranscriptSectionUpdate(BaseModel):
    """Payload for updating a single transcript section."""
    speaker: Optional[str] = None
    edited_text: Optional[str] = None
    tags: Optional[List[str]] = None

    model_config = ConfigDict(from_attributes=True)
