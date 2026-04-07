from fastapi import APIRouter, HTTPException, UploadFile, File

from app.api_routers.transcripts.data_model import (
    Transcript,
    TranscriptCreate,
    TranscriptUpdate,
)
from app.repositories.transcripts.controller import TranscriptsRepository
from app.services.transcript_process.service import TranscriptProcessService

router = APIRouter(prefix="/transcripts")

repository = TranscriptsRepository()
transcript_service = TranscriptProcessService()


@router.get("/")
async def get_all_transcripts():
    data = await repository.list()
    return [Transcript(**row).model_dump() for row in data]


@router.get("/{transcript_id}")
async def get_transcript(transcript_id: int):
    data = await repository.get(transcript_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return Transcript(**data).model_dump()


@router.post("/", status_code=201)
async def create_transcript(body: TranscriptCreate):
    data = body.model_dump()
    # TODO: replace with actual authenticated user id
    result = await repository.create(data, user_id=1)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
    return result


@router.put("/{transcript_id}")
async def update_transcript(transcript_id: int, body: TranscriptUpdate):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await repository.update(transcript_id, updates)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
    return result


@router.delete("/{transcript_id}", status_code=204)
async def delete_transcript(transcript_id: int):
    result = await repository.delete(transcript_id)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))


@router.post("/{transcript_id}/upload-audio", status_code=201)
async def upload_audio_file(transcript_id: int, file: UploadFile = File(...)):
    """Upload an audio file for a transcript. Stores in blob storage and records metadata."""
    # Verify transcript exists
    transcript = await repository.get(transcript_id)
    if transcript is None:
        raise HTTPException(status_code=404, detail="Transcript not found")

    try:
        # TODO: replace with actual authenticated user id
        result = await transcript_service.upload_audio(transcript_id, file, user_id=1)
        status = result.get("status_code", 500)
        if status >= 400:
            raise HTTPException(status_code=status, detail=result.get("message"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload audio file: {str(e)}")
