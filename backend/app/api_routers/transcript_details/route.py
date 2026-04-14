from fastapi import APIRouter, HTTPException

from app.api_routers.transcript_details.data_model import (
    TranscriptDetailsComments,
    TranscriptDetailsCommentsCreateIngest
)
from app.mappers.transcript_details_comments import TranscriptDetailsCommentsMapper
from app.mappers.activity_log_mapper import ActivityLogMapper
from app.repositories.transcription.transcript_details_comments import TranscriptDetailsCommentsRepository
from app.repositories.activity_log.controller import ActivityLogRepository
from app.services.mention_service import MentionService

router = APIRouter(prefix="/transcriptions")
repository = TranscriptDetailsCommentsRepository()
mapper = TranscriptDetailsCommentsMapper()
activity_repo = ActivityLogRepository()
activity_mapper = ActivityLogMapper()
mention_service = MentionService()

@router.post("/{transcript_id}/comments")
async def create_comment(transcript_id: int, comment_data: TranscriptDetailsCommentsCreateIngest):
    mapped_data = mapper.to_create_values(comment_data, transcript_id=transcript_id)
    result = await repository.acreate(data=mapped_data)
    if result.get("status_code") == 201:
        comment_id = result.get("id")

        # Process @mentions in the comment text (best-effort)
        try:
            if comment_id:
                await mention_service.process_mentions(
                    text=comment_data.comment,
                    entity_type="detail_comment",
                    entity_id=comment_id,
                    author_user_id=1,
                    context_title="comment",
                    route=f"/transcriptions/{transcript_id}/editor",
                )
        except Exception:
            pass

        # Log activity (best-effort)
        try:
            preview = (comment_data.comment or "")[:60]
            log = activity_mapper.to_create_values(
                transcription_id=transcript_id,
                action="comment_added",
                section_id=comment_data.section_id,
                summary=f"Commented on section #{comment_data.section_id}: \"{preview}{'…' if len(comment_data.comment or '') > 60 else ''}\"",
                user_id=1,
            )
            await activity_repo.acreate(log)
        except Exception:
            pass
        return {"message": "Comment created successfully", "comment_id": comment_id}
    else:
        raise HTTPException(status_code=500, detail="Failed to create comment")
    
@router.get("/{transcript_id}/comments")
async def list_comments(transcript_id: int):
    result = await repository.alist(transcript_id)
    return result

@router.get("/{transcript_id}/comments/{comment_id}")
async def get_comment(comment_id: int):
    result = await repository.aget(comment_id)
    return result