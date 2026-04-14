from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


# ── Thread models ──

class ThreadCreate(BaseModel):
    """Payload when creating a new thread."""
    title: str

    model_config = ConfigDict(from_attributes=True)


class ThreadUpdate(BaseModel):
    """Payload when updating a thread title."""
    title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ThreadEntry(BaseModel):
    """Read model for a thread (returned by the API)."""
    id: int
    transcription_id: int
    title: str
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    post_count: int = 0
    latest_post_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ── Post models ──

class PostCreate(BaseModel):
    """Payload when creating a new post in a thread."""
    body: str
    parent_post_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class PostUpdate(BaseModel):
    """Payload when editing a post."""
    body: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PostEntry(BaseModel):
    """Read model for a single post."""
    id: int
    thread_id: int
    parent_post_id: Optional[int] = None
    body: str
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    edited_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PostSearchHit(BaseModel):
    """A single post returned from a search, with thread context."""
    id: int
    thread_id: int
    thread_title: str
    body: str
    created_by: Optional[int] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
