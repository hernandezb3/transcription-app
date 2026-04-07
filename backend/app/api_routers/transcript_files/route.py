import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.api_routers.transcript_files.data_model import TranscriptFile
from app.repositories.transcripts.transcript_files import TranscriptFilesRepository
from app.mappers.transcript_files_mapper import TranscriptFilesMapper
from app.services.transcript_process.service import TranscriptProcessService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transcripts")

repository = TranscriptFilesRepository()
mapper = TranscriptFilesMapper()
service = TranscriptProcessService()

audio_types = {
    "mp3": "audio/mpeg",
    "wav": "audio/wav"
}


@router.get("/{transcript_id}/files")
async def list_transcript_files(transcript_id: int):
    rows = await repository.list_by_transcript(transcript_id)
    data = mapper.to_transcript_file_list(rows)
    return [TranscriptFile(**row).model_dump() for row in data]


@router.get("/{transcript_id}/files/{file_id}")
async def get_transcript_file(transcript_id: int, file_id: int):
    row = await repository.get(file_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Transcript file not found")
    data = mapper.to_transcript_file(row)
    return TranscriptFile(**data).model_dump()


@router.delete("/{transcript_id}/files/{file_id}", status_code=204)
async def delete_transcript_file(transcript_id: int, file_id: int):
    result = await repository.delete(file_id)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))


@router.head("/{transcript_id}/audio")
async def head_audio_file(transcript_id: int):
    """Check whether an audio file exists for this transcript (used by the player probe)."""
    rows = await repository.list_by_transcript(transcript_id)
    if not rows:
        raise HTTPException(status_code=404, detail="No audio file found for this transcript")
    file_record = mapper.to_transcript_file(rows[0])
    file_type = (file_record.get("file_type") or "").lower()
    content_type = audio_types.get(file_type, "application/octet-stream")
    return Response(content=b"", media_type=content_type)


@router.get("/{transcript_id}/audio")
async def get_audio_file(transcript_id: int):
    """Return the audio file bytes for a transcript. Uses the first active audio file found."""
    rows = await repository.list_by_transcript(transcript_id)
    if not rows:
        raise HTTPException(status_code=404, detail="No audio file found for this transcript")

    file_record = mapper.to_transcript_file(rows[0])
    blob_path = file_record.get("file_path")
    file_type = (file_record.get("file_type") or "").lower()

    try:
        file_bytes = service.get_audio(blob_path)
    except Exception as e:
        logger.error(f"Failed to retrieve audio from blob storage: blob_path={blob_path!r}, error={e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve audio file: {str(e)}")

    if not file_bytes:
        raise HTTPException(status_code=404, detail="Audio file is empty or missing from storage")

    content_type = audio_types.get(file_type, "application/octet-stream")

    return Response(
        content=file_bytes,
        media_type=content_type,
    )
