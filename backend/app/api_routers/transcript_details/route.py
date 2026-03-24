from fastapi import APIRouter, HTTPException

from app.api_routers.transcript_details.data_model import (
    TranscriptDetailsComments,
    TranscriptDetailsCommentsCreateIngest
)
from app.mappers.transcript_details_comments import TranscriptDetailsCommentsMapper
from app.repositories.transcription.transcript_details_comments import TranscriptDetailsCommentsRepository

router = APIRouter(prefix="/transcriptions")
repository = TranscriptDetailsCommentsRepository()
mapper = TranscriptDetailsCommentsMapper()

@router.post("/{transcript_id}/comments")
async def create_comment(transcript_id: int, comment_data: TranscriptDetailsCommentsCreateIngest):
    mapped_data = mapper.to_create_values(comment_data, transcript_id=transcript_id)
    result = await repository.acreate(data=mapped_data)
    if result.get("status_code") == 201:
        return {"message": "Comment created successfully", "comment_id": result.get("id")}
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