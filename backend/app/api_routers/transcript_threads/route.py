from fastapi import APIRouter, HTTPException, Query

from app.repositories.transcript_threads.controller import TranscriptThreadsRepository
from app.data_models.transcript_threads import ThreadCreate, ThreadUpdate, PostCreate, PostUpdate
from app.mappers.transcript_threads_mapper import ThreadMapper
from app.mappers.activity_log_mapper import ActivityLogMapper
from app.repositories.activity_log.controller import ActivityLogRepository
from app.services.mention_service import MentionService

router = APIRouter(prefix="/transcripts")

repo = TranscriptThreadsRepository()
mapper = ThreadMapper()
activity_repo = ActivityLogRepository()
activity_mapper = ActivityLogMapper()
mention_service = MentionService()


# ═══════════════════════════════════════════════════════════════
#  Thread endpoints
# ═══════════════════════════════════════════════════════════════

@router.get("/{transcript_id}/threads")
async def list_threads(transcript_id: int, search: str | None = Query(None)):
    """Return all active threads for a transcript.

    Pass ``?search=term`` to filter threads whose messages (or title)
    contain the search text.
    """
    items = await repo.alist_threads(transcript_id, search=search)
    return [item.model_dump() for item in items]


@router.get("/{transcript_id}/threads/search-posts")
async def search_posts(transcript_id: int, q: str = Query("")):
    """Search post bodies across all threads for a transcript.

    Returns a flat list of matching posts with thread context.
    """
    if not q.strip():
        return []
    hits = await repo.asearch_posts(transcript_id, q.strip())
    return [h.model_dump() for h in hits]


@router.get("/{transcript_id}/threads/{thread_id}")
async def get_thread(transcript_id: int, thread_id: int):
    """Return a single thread with its posts."""
    thread = await repo.aget_thread(thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    posts = await repo.alist_posts(thread_id)
    return {
        "thread": thread.model_dump(),
        "posts": [p.model_dump() for p in posts],
    }


@router.post("/{transcript_id}/threads", status_code=201)
async def create_thread(transcript_id: int, body: ThreadCreate):
    """Create a new discussion thread."""
    result = await repo.acreate_thread(
        transcription_id=transcript_id,
        title=body.title,
        user_id=1,  # TODO: real auth
    )

    # Process @mentions in the thread title (best-effort)
    try:
        thread_id = None
        if isinstance(result, dict):
            rd = result.get("data")
            if isinstance(rd, list) and rd:
                thread_id = rd[0].get("id")
            elif isinstance(rd, dict):
                thread_id = rd.get("id")
        if thread_id:
            await mention_service.process_mentions(
                text=body.title,
                entity_type="thread",
                entity_id=thread_id,
                author_user_id=1,
                context_title="discussion thread",
                route=f"/transcriptions/{transcript_id}/threads",
            )
    except Exception:
        pass

    # Log activity (best-effort)
    try:
        preview = (body.title or "")[:60]
        log = activity_mapper.to_create_values(
            transcription_id=transcript_id,
            action="thread_created",
            section_id=None,
            summary=f"Started thread: \"{preview}{'…' if len(body.title or '') > 60 else ''}\"",
            user_id=1,
        )
        await activity_repo.acreate(log)
    except Exception:
        pass

    items = await repo.alist_threads(transcript_id)
    return [item.model_dump() for item in items]


@router.put("/{transcript_id}/threads/{thread_id}")
async def update_thread(transcript_id: int, thread_id: int, body: ThreadUpdate):
    """Update a thread title."""
    values: dict = {}
    if body.title is not None:
        values["title"] = body.title

    if not values:
        raise HTTPException(status_code=400, detail="No fields to update")

    await repo.aupdate_thread(thread_id, values)
    items = await repo.alist_threads(transcript_id)
    return [item.model_dump() for item in items]


@router.delete("/{transcript_id}/threads/{thread_id}")
async def delete_thread(transcript_id: int, thread_id: int):
    """Soft-delete a thread."""
    await repo.adelete_thread(thread_id)

    # Log activity (best-effort)
    try:
        log = activity_mapper.to_create_values(
            transcription_id=transcript_id,
            action="thread_deleted",
            section_id=None,
            summary=f"Deleted thread #{thread_id}",
            user_id=1,
        )
        await activity_repo.acreate(log)
    except Exception:
        pass

    items = await repo.alist_threads(transcript_id)
    return [item.model_dump() for item in items]


# ═══════════════════════════════════════════════════════════════
#  Post endpoints (nested under thread)
# ═══════════════════════════════════════════════════════════════

@router.get("/{transcript_id}/threads/{thread_id}/posts")
async def list_posts(transcript_id: int, thread_id: int):
    """Return all active posts for a thread."""
    posts = await repo.alist_posts(thread_id)
    return [p.model_dump() for p in posts]


@router.post("/{transcript_id}/threads/{thread_id}/posts", status_code=201)
async def create_post(transcript_id: int, thread_id: int, body: PostCreate):
    """Add a post to a thread."""
    result = await repo.acreate_post(
        thread_id=thread_id,
        body=body.body,
        parent_post_id=body.parent_post_id,
        user_id=1,  # TODO: real auth
    )

    # Process @mentions in the post body (best-effort)
    try:
        post_id = None
        if isinstance(result, dict):
            rd = result.get("data")
            if isinstance(rd, list) and rd:
                post_id = rd[0].get("id")
            elif isinstance(rd, dict):
                post_id = rd.get("id")
        if post_id:
            await mention_service.process_mentions(
                text=body.body,
                entity_type="thread_post",
                entity_id=post_id,
                author_user_id=1,
                context_title="thread reply",
                route=f"/transcriptions/{transcript_id}/threads",
            )
    except Exception:
        pass

    # Log activity (best-effort)
    try:
        preview = (body.body or "")[:60]
        log = activity_mapper.to_create_values(
            transcription_id=transcript_id,
            action="thread_reply",
            section_id=None,
            summary=f"Replied in thread #{thread_id}: \"{preview}{'…' if len(body.body or '') > 60 else ''}\"",
            user_id=1,
        )
        await activity_repo.acreate(log)
    except Exception:
        pass

    posts = await repo.alist_posts(thread_id)
    return [p.model_dump() for p in posts]


@router.put("/{transcript_id}/threads/{thread_id}/posts/{post_id}")
async def update_post(transcript_id: int, thread_id: int, post_id: int, body: PostUpdate):
    """Edit a post body."""
    values: dict = {}
    if body.body is not None:
        values["body"] = body.body
        values["edited_at"] = mapper.utc_now()

    if not values:
        raise HTTPException(status_code=400, detail="No fields to update")

    await repo.aupdate_post(post_id, values)
    posts = await repo.alist_posts(thread_id)
    return [p.model_dump() for p in posts]


@router.delete("/{transcript_id}/threads/{thread_id}/posts/{post_id}")
async def delete_post(transcript_id: int, thread_id: int, post_id: int):
    """Soft-delete a post."""
    await repo.adelete_post(post_id)
    posts = await repo.alist_posts(thread_id)
    return [p.model_dump() for p in posts]
