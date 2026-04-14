import os

from fastapi import UploadFile

from app.config.app_logging import AppLogging
from app.infrastructure.storage.factory import StorageFactory
from app.repositories.transcription.controller import TranscriptRepository
from app.repositories.transcription.transcript_speakers import TranscriptSpeakersRepository
from app.repositories.transcripts.transcript_files import TranscriptFilesRepository
from app.services.transcript_process.transcript_parser import parse_transcript_file, format_timestamp


class TranscriptProcessService:
    def __init__(self):
        self.storage = StorageFactory()
        self.file_repo = TranscriptFilesRepository()
        self.transcript_repo = TranscriptRepository()
        self.speakers_repo = TranscriptSpeakersRepository()
        self.logger = AppLogging().logger

    @staticmethod
    def _build_transcript_sections(transcription_id: int, parsed: dict, speaker_id_map: dict) -> list[dict]:
        return [
            {
                "transcription_id": transcription_id,
                "section_id": index,
                "speaker_id": speaker_id_map.get(segment.get("speaker")),
                "speaker": segment.get("speaker"),
                "begin_timestamp": format_timestamp(segment["start"]),
                "end_timestamp": format_timestamp(segment["end"]),
                "original_text": segment["text"],
                "edited_text": segment["text"],
                "tags": None,
            }
            for index, segment in enumerate(parsed.get("combined_diarized_segments", []), start=1)
        ]

    async def _create_speakers(self, transcription_id: int, parsed: dict) -> dict:
        """
        Extract unique speaker labels from the parsed output, create rows in
        transcript_speakers_t and return a mapping {label: speaker_id}.
        """
        segments = parsed.get("combined_diarized_segments", [])
        unique_labels = list(dict.fromkeys(seg.get("speaker") for seg in segments if seg.get("speaker")))
        speaker_id_map: dict[str, int] = {}
        for label in unique_labels:
            speaker_id = await self.speakers_repo.aget_or_create(transcription_id, label)
            speaker_id_map[label] = speaker_id
        return speaker_id_map

    async def _replace_transcript_details(self, transcription_id: int, parsed: dict):
        # Deactivate old speakers and create fresh ones
        await self.speakers_repo.adeactivate_by_transcript(transcription_id)
        speaker_id_map = await self._create_speakers(transcription_id, parsed)

        sections = self._build_transcript_sections(transcription_id, parsed, speaker_id_map)
        await self.transcript_repo.adeactivate_by_transcript(transcription_id)

        for section in sections:
            result = await self.transcript_repo.acreate_section(section)
            if result.get("status_code", 500) >= 400:
                raise RuntimeError(result.get("message", "Failed to save transcript details"))

        return sections

    async def upload_transcript(
        self,
        transcription_id: int,
        audio_file: UploadFile,
        transcript_file: UploadFile,
        user_id: int = 1,
    ):
        """
        Upload an audio file together with a pre-made transcript text file.

        Steps:
            1. Read both files
            2. Parse the transcript text into speaker/timestamp segments
            3. Upload the audio to blob storage
            4. Record file metadata in transcript_files_t
            5. Replace transcript_details_t rows with parsed segments
        """
        # -- read audio --
        audio_bytes = await audio_file.read()
        if not audio_bytes:
            raise ValueError("Uploaded audio file is empty (0 bytes)")

        # -- read & parse transcript --
        transcript_bytes = await transcript_file.read()
        if not transcript_bytes:
            raise ValueError("Uploaded transcript file is empty (0 bytes)")

        transcript_text = transcript_bytes.decode("utf-8")
        try:
            parsed = parse_transcript_file(transcript_text)
        except Exception as e:
            self.logger.error(f"Failed to parse transcript file: {e}")
            raise ValueError(f"Could not parse transcript file: {e}")

        segments = parsed.get("combined_diarized_segments", [])
        if not segments:
            raise ValueError(
                "No transcript segments found. Expected format:\n"
                "speaker timestamp\ntext\n\nspeaker timestamp\ntext"
            )

        # -- upload audio to blob storage --
        audio_name = audio_file.filename or f"transcript_{transcription_id}.wav"
        audio_ext = os.path.splitext(audio_name)[1].lstrip(".")
        blob_path = f"audio/{transcription_id}.{audio_ext}"

        try:
            self.storage.upload(audio_bytes, blob_path)
            self.logger.info(f"Uploaded audio file to blob: {blob_path}")
        except Exception as e:
            self.logger.error(f"Failed to upload audio to blob storage: {e}")
            raise

        # -- record audio file metadata --
        file_record = {
            "transcription_id": transcription_id,
            "file_name": audio_name,
            "file_type": audio_ext,
            "file_path": blob_path,
            "created_by": user_id,
        }
        result = await self.file_repo.create(file_record)
        if result.get("status_code", 500) >= 400:
            raise RuntimeError(result.get("message", "Failed to create transcript file record"))

        # -- persist transcript sections --
        sections = await self._replace_transcript_details(transcription_id, parsed)

        result["data"] = {
            **result.get("data", {}),
            "file_path": blob_path,
            "sections_created": len(sections),
        }
        return result

    def get_audio(self, file_path: str):
        return self.storage.read(file_path)