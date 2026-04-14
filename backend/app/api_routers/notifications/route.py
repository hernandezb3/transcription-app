from fastapi import APIRouter, HTTPException, Query

from app.repositories.notifications.controller import NotificationRepository
from app.mappers.notification_mapper import NotificationMapper

router = APIRouter(prefix="/notifications")

repo = NotificationRepository()
mapper = NotificationMapper()


@router.get("")
async def list_notifications(
    user_id: int = Query(..., description="The user to fetch notifications for"),
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
):
    """Paginated notifications for a user."""
    items = await repo.alist(
        user_id=user_id, limit=limit, offset=offset, unread_only=unread_only
    )
    return [item.model_dump() for item in items]


@router.get("/unread-count")
async def unread_count(user_id: int = Query(...)):
    """Return { count: N } of unread notifications."""
    count = await repo.acount_unread(user_id)
    return {"count": count}


@router.put("/{notification_id}/read")
async def mark_read(notification_id: int):
    """Mark one notification as read."""
    await repo.amark_read(notification_id)
    return {"ok": True}


@router.put("/read-all")
async def mark_all_read(user_id: int = Query(...)):
    """Mark every unread notification as read for a user."""
    await repo.amark_all_read(user_id)
    return {"ok": True}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: int):
    """Delete a single notification."""
    await repo.adelete(notification_id)
    return {"ok": True}


@router.delete("")
async def clear_all(user_id: int = Query(...)):
    """Delete all notifications for a user."""
    await repo.aclear_all(user_id)
    return {"ok": True}
