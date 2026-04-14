from fastapi import APIRouter, HTTPException

from app.data_models.transcript_overview import (
    TranscriptOverview,
    TranscriptOverviewSpeaker,
)
from app.repositories.transcript_overview.controller import TranscriptOverviewRepository
from app.repositories.activity_log.controller import ActivityLogRepository

router = APIRouter(prefix="/transcripts")

overview_repo = TranscriptOverviewRepository()
activity_repo = ActivityLogRepository()


def _compute_duration(min_ts: str | None, max_ts: str | None) -> str | None:
    """Compute a human-readable duration string from timestamp bounds."""
    if not min_ts or not max_ts:
        return None

    def _to_seconds(ts: str) -> float:
        parts = ts.split(":")
        parts_f = [float(p) for p in parts]
        if len(parts_f) == 3:
            return parts_f[0] * 3600 + parts_f[1] * 60 + parts_f[2]
        if len(parts_f) == 2:
            return parts_f[0] * 60 + parts_f[1]
        return parts_f[0]

    try:
        total_sec = _to_seconds(max_ts) - _to_seconds(min_ts)
        if total_sec < 0:
            total_sec = 0
        h = int(total_sec // 3600)
        m = int((total_sec % 3600) // 60)
        s = int(total_sec % 60)
        if h > 0:
            return f"{h}:{m:02d}:{s:02d}"
        return f"{m}:{s:02d}"
    except (ValueError, IndexError):
        return None


@router.get("/{transcript_id}/overview")
async def get_transcript_overview(transcript_id: int):
    """Return aggregated landing-page data for a transcript."""
    meta = await overview_repo.aget_transcript_meta(transcript_id)
    if meta is None:
        raise HTTPException(status_code=404, detail="Transcript not found")

    stats = await overview_repo.aget_section_stats(transcript_id)
    comment_count = await overview_repo.aget_comment_count(transcript_id)
    speakers_raw = await overview_repo.aget_speakers(transcript_id)
    recent_activity = await activity_repo.alist(
        transcript_id,
        limit=15,
        actions=["section_edited", "comment_added", "tags_updated"],
    )
    recent_comments = await overview_repo.aget_recent_comments(transcript_id, limit=5)

    duration = _compute_duration(stats.get("min_ts"), stats.get("max_ts"))

    speakers = [TranscriptOverviewSpeaker(**s) for s in speakers_raw]

    overview = TranscriptOverview(
        id=meta["id"],
        title=meta.get("title"),
        description=meta.get("description"),
        status=meta.get("status"),
        lesson_subject=meta.get("lesson_subject"),
        lesson_number=meta.get("lesson_number"),
        tags=meta.get("tags", []),
        created=meta.get("created"),
        modified=meta.get("modified"),
        total_sections=stats.get("total_sections", 0),
        edited_sections=stats.get("edited_sections", 0),
        total_speakers=len(speakers),
        total_comments=comment_count,
        total_duration=duration,
        speakers=speakers,
        recent_activity=[a.model_dump() for a in recent_activity],
        recent_comments=recent_comments,
    )

    return overview.model_dump()


@router.get("/{transcript_id}/recent-edits")
async def get_recent_edits(transcript_id: int, user_id: int | None = None, limit: int = 15):
    """Return recent section-edit activity for a transcript.

    Optionally filter by *user_id* to show only the current user's edits.
    Each entry includes enough section detail for the frontend to render a
    "pick up where you left off" list and scroll to a section.
    """
    rows = await activity_repo.alist_recent_edits(
        transcription_id=transcript_id,
        user_id=user_id,
        limit=limit,
    )

    # Normalise for JSON serialisation
    entries = []
    for row in rows:
        entry = dict(row) if not isinstance(row, dict) else row
        # Truncate text preview to 120 chars for the frontend
        edited = entry.get("section_edited_text") or entry.get("section_original_text") or ""
        entry["text_preview"] = edited[:120] + ("…" if len(edited) > 120 else "")
        entries.append(entry)

    return entries
