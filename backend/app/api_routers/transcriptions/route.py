from fastapi import APIRouter, HTTPException

from app.api_routers.transcriptions.data_model import (
    TranscriptDetails,
    TranscriptSectionUpdate,
)
from app.mappers.transcription_mapper import TranscriptionMapper
from app.repositories.transcription.controller import TranscriptRepository

router = APIRouter(prefix="/transcriptions")

repository = TranscriptRepository()


@router.get("/{transcript_id}")
async def get_transcript(transcript_id: int):
    result = await repository.aget(transcript_id)
    rows = result.get("data", [])
    data = [
        TranscriptDetails(**TranscriptionMapper.to_transcript_details(row)).model_dump()
        for row in rows
    ]
    return data


@router.put("/sections/{section_id}")
async def update_section(section_id: int, body: TranscriptSectionUpdate):
    """Update speaker, edited_text, or tags for a single transcript section."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "tags" in updates:
        updates["tags"] = TranscriptionMapper.serialize_tags(updates["tags"])
    result = await repository.aupdate_section(section_id, updates)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
    return result
