from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.api_routers.transcriptions.data_model import (
    TranscriptDetails,
    TranscriptSectionCreate,
    TranscriptSectionUpdate,
)
from app.mappers.transcription_mapper import TranscriptionMapper
from app.mappers.activity_log_mapper import ActivityLogMapper
from app.repositories.transcription.controller import TranscriptRepository
from app.repositories.activity_log.controller import ActivityLogRepository

router = APIRouter(prefix="/transcriptions")

repository = TranscriptRepository()
activity_repo = ActivityLogRepository()
activity_mapper = ActivityLogMapper()


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

    # Stamp modified_at / modified_by
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    updates["modified_at"] = now
    updates["modified_by"] = 1  # TODO: replace with authenticated user id

    result = await repository.aupdate_section(section_id, updates)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))

    # Log activity (best-effort, don't fail the request)
    try:
        row = await repository.aget_section(section_id)
        tid = row["transcription_id"] if row else None
        if tid:
            changed = list(body.model_dump(exclude_none=True).keys())
            sec = row.get('section_id', '?')
            summary = f"Edited section #{sec}"
            if "edited_text" in changed:
                summary = f"Edited text in section #{sec}"
            elif "speaker_id" in changed:
                summary = f"Changed speaker on section #{sec}"

            log = activity_mapper.to_create_values(
                transcription_id=tid,
                action="section_edited",
                section_id=row.get("section_id"),
                summary=summary,
                user_id=1,
            )
            await activity_repo.acreate(log)

            # Log a separate entry specifically for tag changes
            if "tags" in changed:
                tag_list = body.tags or []
                if tag_list:
                    tag_summary = f"Updated tags on section #{sec}: {', '.join(tag_list)}"
                else:
                    tag_summary = f"Removed all tags from section #{sec}"
                tag_log = activity_mapper.to_create_values(
                    transcription_id=tid,
                    action="tags_updated",
                    section_id=row.get("section_id"),
                    summary=tag_summary,
                    user_id=1,
                )
                await activity_repo.acreate(tag_log)
    except Exception:
        pass

    return result


@router.post("/{transcript_id}/sections")
async def create_section(transcript_id: int, body: TranscriptSectionCreate):
    """Add a new section to a transcript.

    *position* (1-based) controls where the section is inserted.
    When omitted the section is appended at the end.
    """
    max_id = await repository.aget_max_section_id(transcript_id)
    position = body.position if body.position is not None else max_id + 1

    # Clamp to valid range
    if position < 1:
        position = 1
    if position > max_id + 1:
        position = max_id + 1

    # Shift existing sections at or after the target position
    if position <= max_id:
        await repository.ashift_section_ids(transcript_id, from_position=position, delta=1)

    tags_csv = TranscriptionMapper.serialize_tags(body.tags) if body.tags else None

    section_data = {
        "transcription_id": transcript_id,
        "section_id": position,
        "speaker_id": body.speaker_id,
        "speaker": None,
        "begin_timestamp": body.begin_timestamp,
        "end_timestamp": body.end_timestamp,
        "original_text": body.original_text,
        "edited_text": body.edited_text,
        "tags": tags_csv,
    }

    result = await repository.acreate_section(section_data)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))

    # Log activity
    try:
        log = activity_mapper.to_create_values(
            transcription_id=transcript_id,
            action="section_added",
            section_id=position,
            summary=f"Added new section at position #{position}",
            user_id=1,
        )
        await activity_repo.acreate(log)
    except Exception:
        pass

    return {
        "message": "Section created successfully",
        "id": result.get("id"),
        "section_id": position,
    }


@router.delete("/sections/{section_id}")
async def delete_section(section_id: int):
    """Soft-delete a transcript section and compact the remaining order."""
    row = await repository.aget_section(section_id)
    if not row:
        raise HTTPException(status_code=404, detail="Section not found")
    if row["is_active"] == 0:
        raise HTTPException(status_code=404, detail="Section already deleted")

    transcript_id = row["transcription_id"]

    result = await repository.adeactivate_section(section_id)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))

    # Re-compact section_ids so there are no gaps
    await repository.acompact_section_ids(transcript_id)

    # Log activity
    try:
        log = activity_mapper.to_create_values(
            transcription_id=transcript_id,
            action="section_deleted",
            section_id=row.get("section_id"),
            summary=f"Deleted section #{row.get('section_id', '?')}",
            user_id=1,
        )
        await activity_repo.acreate(log)
    except Exception:
        pass

    return {"message": "Section deleted successfully", "deleted_section_id": section_id}
