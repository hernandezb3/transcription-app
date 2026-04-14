from fastapi import APIRouter, HTTPException

from app.api_routers.transcript_speakers.data_model import (
    TranscriptSpeakerResponse,
    TranscriptSpeakerUpdatePayload,
)
from app.repositories.transcription.transcript_speakers import TranscriptSpeakersRepository

router = APIRouter(prefix="/transcriptions")

repository = TranscriptSpeakersRepository()


@router.get("/{transcript_id}/speakers")
async def list_speakers(transcript_id: int):
    """Return all active speakers for a transcript."""
    speakers = await repository.alist(transcript_id)
    return [TranscriptSpeakerResponse(**s.model_dump()).model_dump() for s in speakers]


@router.get("/{transcript_id}/speakers/{speaker_id}")
async def get_speaker(transcript_id: int, speaker_id: int):
    """Return a single speaker."""
    speaker = await repository.aget(speaker_id)
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
    return TranscriptSpeakerResponse(**speaker.model_dump()).model_dump()


@router.put("/{transcript_id}/speakers/{speaker_id}")
async def update_speaker(transcript_id: int, speaker_id: int, body: TranscriptSpeakerUpdatePayload):
    """Rename a speaker – this change propagates everywhere the speaker is referenced."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await repository.aupdate(speaker_id, updates)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
    return result
