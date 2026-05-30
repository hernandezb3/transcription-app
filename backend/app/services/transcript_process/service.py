import os

from fastapi import UploadFile

from app.config.app_logging import AppLogging
from app.infrastructure.storage.factory import StorageFactory
from app.repositories.transcription.controller import TranscriptRepository
from app.repositories.transcription.transcript_speakers import TranscriptSpeakersRepository
from app.repositories.transcripts.transcript_files import TranscriptFilesRepository
from app.services.transcript_process.transcript_parser import parse_transcript_file, format_timestamp
from app.services.transcript_process.exceptions import (
    EmptyAudioFileError,
    InvalidAudioFileError,
    EmptyTranscriptFileError,
    TranscriptDecodeError,
    TranscriptParseError,
    EmptyTranscriptError,
)


class TranscriptProcessService:
    def __init__(self):
        self.storage = StorageFactory()
        self.file_repo = TranscriptFilesRepository()
        self.transcript_repo = TranscriptRepository()
        self.speakers_repo = TranscriptSpeakersRepository()
        self.logger = AppLogging().logger

    @staticmethod
    def _validate_audio_bytes(audio_bytes: bytes, filename: str | None) -> None:
        """Best-effort sanity check that the upload really is an MP3/WAV file.

        We sniff the file's magic bytes instead of trusting the extension, so a
        renamed or corrupted file is rejected up front with a friendly error
        rather than silently producing an unplayable transcript.

        Raises :class:`InvalidAudioFileError` if the header isn't recognisable.
        """
        if len(audio_bytes) < 12:
            raise InvalidAudioFileError(detail=f"file too small ({len(audio_bytes)} bytes)")

        header = audio_bytes[:12]
        is_wav = header[:4] == b"RIFF" and header[8:12] == b"WAVE"
        # MP3: an ID3v2 tag ("ID3") or an MPEG audio frame sync (0xFF 0xEx/0xFx)
        is_mp3 = header[:3] == b"ID3" or (header[0] == 0xFF and (header[1] & 0xE0) == 0xE0)

        if not (is_wav or is_mp3):
            raise InvalidAudioFileError(
                detail=f"unrecognised audio header {header[:4]!r} for file {filename!r}"
            )

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
        # -- read & validate audio --
        audio_bytes = await audio_file.read()
        if not audio_bytes:
            raise EmptyAudioFileError()
        self._validate_audio_bytes(audio_bytes, audio_file.filename)

        # -- read transcript --
        transcript_bytes = await transcript_file.read()
        if not transcript_bytes:
            raise EmptyTranscriptFileError()

        # utf-8-sig transparently strips a BOM if present, otherwise == utf-8
        try:
            transcript_text = transcript_bytes.decode("utf-8-sig")
        except UnicodeDecodeError as e:
            self.logger.error(f"Transcript file is not valid UTF-8 text: {e}")
            raise TranscriptDecodeError(detail=str(e))

        # -- parse transcript --
        try:
            parsed = parse_transcript_file(transcript_text)
        except Exception as e:
            self.logger.error(f"Failed to parse transcript file: {e}")
            raise TranscriptParseError(detail=str(e))

        segments = parsed.get("combined_diarized_segments", [])
        if not segments:
            raise EmptyTranscriptError()

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