import os
import shutil
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import UploadFile

from app.config.app_logging import AppLogging
from app.infrastructure.storage.factory import StorageFactory
from app.repositories.transcription.controller import TranscriptRepository
from app.repositories.transcripts.transcript_files import TranscriptFilesRepository
from app.services.transcript_process.audio_analyzer import analyze_audio, format_timestamp


class TranscriptProcessService:
    def __init__(self):
        self.storage = StorageFactory()
        self.file_repo = TranscriptFilesRepository()
        self.transcript_repo = TranscriptRepository()
        self.logger = AppLogging().logger

    @staticmethod
    def _get_working_directory(transcription_id: int) -> Path:
        return (Path.cwd() / "tmp" / "transcript_process" / str(transcription_id)).resolve()

    @staticmethod
    def _build_transcript_sections(transcription_id: int, parsed: dict) -> list[dict]:
        return [
            {
                "transcription_id": transcription_id,
                "section_id": index,
                "speaker": segment.get("speaker"),
                "begin_timestamp": format_timestamp(segment["start"]),
                "end_timestamp": format_timestamp(segment["end"]),
                "original_text": segment["text"],
                "edited_text": segment["text"],
                "tags": None,
            }
            for index, segment in enumerate(parsed.get("combined_diarized_segments", []), start=1)
        ]

    async def _replace_transcript_details(self, transcription_id: int, parsed: dict):
        sections = self._build_transcript_sections(transcription_id, parsed)
        await self.transcript_repo.adeactivate_by_transcript(transcription_id)

        for section in sections:
            result = await self.transcript_repo.acreate_section(section)
            if result.get("status_code", 500) >= 400:
                raise RuntimeError(result.get("message", "Failed to save transcript details"))

        return sections

    def _write_temp_audio(self, file_bytes: bytes, suffix: str) -> Path:
        tmp_file = NamedTemporaryFile(delete=False, suffix=suffix)
        try:
            tmp_file.write(file_bytes)
            tmp_file.flush()
        finally:
            tmp_file.close()
        return Path(tmp_file.name)

    async def upload_audio(self, transcription_id: int, file: UploadFile, user_id: int = 1):
        """
        Upload an audio file, generate transcript details, and persist both file and transcript metadata.

        Steps:
            1. Read file bytes from the upload
            2. Transcribe and diarize the audio from a temp file
            3. Upload to blob storage via StorageFactory
            4. Insert a record into transcript_files_t via the repository
            5. Replace transcript_details_t rows for the transcript
        """
        file_bytes = await file.read()
        if not file_bytes:
            raise ValueError("Uploaded file is empty (0 bytes)")

        file_name = file.filename or f"transcript_{transcription_id}.wav"
        file_ext = os.path.splitext(file_name)[1].lstrip(".")
        blob_path = f"audio/{transcription_id}.{file_ext}"
        temp_audio_path = self._write_temp_audio(file_bytes, f".{file_ext}" if file_ext else "")
        working_dir = self._get_working_directory(transcription_id)

        try:
            working_dir.mkdir(parents=True, exist_ok=True)
            parsed = analyze_audio(temp_audio_path, working_dir)
        except Exception as e:
            self.logger.error(f"Failed to generate transcript details: {e}")
            raise
        finally:
            try:
                temp_audio_path.unlink(missing_ok=True)
            except Exception:
                pass
            shutil.rmtree(working_dir, ignore_errors=True)

        # Upload to blob storage
        try:
            self.storage.upload(file_bytes, blob_path)
            self.logger.info(f"Uploaded audio file to blob: {blob_path}")
        except Exception as e:
            self.logger.error(f"Failed to upload audio to blob storage: {e}")
            raise

        # Record file metadata in the database
        file_record = {
            "transcription_id": transcription_id,
            "file_name": file_name,
            "file_type": file_ext,
            "file_path": blob_path,
            "created_by": user_id,
        }
        result = await self.file_repo.create(file_record)
        if result.get("status_code", 500) >= 400:
            raise RuntimeError(result.get("message", "Failed to create transcript file record"))

        sections = await self._replace_transcript_details(transcription_id, parsed)

        result["data"] = {
            **result.get("data", {}),
            "file_path": blob_path,
            "sections_created": len(sections),
        }
        return result

    def get_audio(self, file_path: str):
        return self.storage.read(file_path)