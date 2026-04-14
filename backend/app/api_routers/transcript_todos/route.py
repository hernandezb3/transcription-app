from fastapi import APIRouter, HTTPException

from app.repositories.transcript_todos.controller import TranscriptTodosRepository
from app.data_models.transcript_todos import TodoCreate, TodoUpdate, TodoEntry
from app.mappers.transcript_todos_mapper import TodoMapper
from app.mappers.activity_log_mapper import ActivityLogMapper
from app.repositories.activity_log.controller import ActivityLogRepository
from app.services.mention_service import MentionService

router = APIRouter(prefix="/transcripts")

repo = TranscriptTodosRepository()
mapper = TodoMapper()
activity_repo = ActivityLogRepository()
activity_mapper = ActivityLogMapper()
mention_service = MentionService()


@router.get("/{transcript_id}/todos")
async def list_todos(transcript_id: int):
    """Return all active todos for a transcript."""
    items = await repo.alist(transcript_id)
    return [item.model_dump() for item in items]


@router.post("/{transcript_id}/todos", status_code=201)
async def create_todo(transcript_id: int, body: TodoCreate):
    """Create a new todo item."""
    result = await repo.acreate(
        transcription_id=transcript_id,
        title=body.title,
        sort_order=body.sort_order or 0,
        user_id=1,  # TODO: real auth
    )

    # Process @mentions in the todo title (best-effort)
    try:
        # Grab the new todo id from the insert result
        todo_id = None
        if isinstance(result, dict):
            rd = result.get("data")
            if isinstance(rd, list) and rd:
                todo_id = rd[0].get("id")
            elif isinstance(rd, dict):
                todo_id = rd.get("id")
        if todo_id:
            await mention_service.process_mentions(
                text=body.title,
                entity_type="todo",
                entity_id=todo_id,
                author_user_id=1,
                context_title="to-do",
                route=f"/transcriptions/{transcript_id}",
            )
    except Exception:
        pass

    # Log activity (best-effort)
    try:
        preview = (body.title or "")[:60]
        log = activity_mapper.to_create_values(
            transcription_id=transcript_id,
            action="todo_created",
            section_id=None,
            summary=f"Added todo: \"{preview}{'…' if len(body.title or '') > 60 else ''}\"",
            user_id=1,
        )
        await activity_repo.acreate(log)
    except Exception:
        pass

    # Return the refreshed list so the UI can re-render
    items = await repo.alist(transcript_id)
    return [item.model_dump() for item in items]


@router.put("/{transcript_id}/todos/{todo_id}")
async def update_todo(transcript_id: int, todo_id: int, body: TodoUpdate):
    """Update a todo (title, completion, sort order)."""
    values: dict = {}
    if body.title is not None:
        values["title"] = body.title
    if body.is_completed is not None:
        values["is_completed"] = body.is_completed
        if body.is_completed == 1:
            values["completed_at"] = mapper.utc_now()
        else:
            values["completed_at"] = None
    if body.sort_order is not None:
        values["sort_order"] = body.sort_order

    if not values:
        raise HTTPException(status_code=400, detail="No fields to update")

    await repo.aupdate(todo_id, values)

    # Log activity for completion/uncompletion (best-effort)
    try:
        if body.is_completed is not None:
            title_preview = (body.title or "")[:60] if body.title else None
            if body.is_completed == 1:
                action = "todo_completed"
                summary = f"Completed todo #{todo_id}"
                if title_preview:
                    summary = f"Completed todo: \"{title_preview}\""
            else:
                action = "todo_reopened"
                summary = f"Reopened todo #{todo_id}"
                if title_preview:
                    summary = f"Reopened todo: \"{title_preview}\""
            log = activity_mapper.to_create_values(
                transcription_id=transcript_id,
                action=action,
                section_id=None,
                summary=summary,
                user_id=1,
            )
            await activity_repo.acreate(log)
    except Exception:
        pass

    # Return refreshed list
    items = await repo.alist(transcript_id)
    return [item.model_dump() for item in items]


@router.delete("/{transcript_id}/todos/{todo_id}")
async def delete_todo(transcript_id: int, todo_id: int):
    """Soft-delete a todo."""
    await repo.adelete(todo_id)

    # Log activity (best-effort)
    try:
        log = activity_mapper.to_create_values(
            transcription_id=transcript_id,
            action="todo_deleted",
            section_id=None,
            summary=f"Deleted todo #{todo_id}",
            user_id=1,
        )
        await activity_repo.acreate(log)
    except Exception:
        pass

    items = await repo.alist(transcript_id)
    return [item.model_dump() for item in items]
