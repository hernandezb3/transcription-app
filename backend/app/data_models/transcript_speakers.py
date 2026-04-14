from pydantic import BaseModel, ConfigDict
from typing import Optional


class TranscriptSpeaker(BaseModel):
    id: Optional[int] = None
    transcription_id: Optional[int] = None
    speaker_label: Optional[str] = None
    display_name: Optional[str] = None
    is_active: Optional[int] = 1

    model_config = ConfigDict(from_attributes=True)


class TranscriptSpeakerCreate(BaseModel):
    transcription_id: int
    speaker_label: Optional[str] = None
    display_name: Optional[str] = None
    is_active: Optional[int] = 1

    model_config = ConfigDict(from_attributes=True)


class TranscriptSpeakerUpdate(BaseModel):
    """Payload for updating a speaker (typically renaming)."""
    display_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
