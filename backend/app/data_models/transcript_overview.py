from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class ActivityLogCreate(BaseModel):
    """Internal model used when inserting a new activity log row."""
    transcription_id: int
    action: str
    section_id: Optional[int] = None
    summary: Optional[str] = None
    user_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ActivityLogEntry(BaseModel):
    """Read model returned by the API."""
    id: Optional[int] = None
    transcription_id: Optional[int] = None
    action: Optional[str] = None
    section_id: Optional[int] = None
    summary: Optional[str] = None
    user_id: Optional[int] = None
    user_display_name: Optional[str] = None
    created_at: Optional[datetime] = None
    section_db_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class TranscriptOverviewSpeaker(BaseModel):
    id: int
    display_name: Optional[str] = None
    speaker_label: Optional[str] = None
    section_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class TranscriptOverview(BaseModel):
    """Aggregated landing-page data for a single transcript."""
    id: int
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    lesson_subject: Optional[str] = None
    lesson_number: Optional[str] = None
    tags: List[str] = []
    created: Optional[datetime] = None
    modified: Optional[datetime] = None

    # stats
    total_sections: int = 0
    edited_sections: int = 0
    total_speakers: int = 0
    total_comments: int = 0
    total_duration: Optional[str] = None       # formatted like "12:34"

    speakers: List[TranscriptOverviewSpeaker] = []
    recent_activity: List[ActivityLogEntry] = []
    recent_comments: List[dict] = []

    model_config = ConfigDict(from_attributes=True)
