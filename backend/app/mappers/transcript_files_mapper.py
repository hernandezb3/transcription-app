from typing import Any, List

from app.mappers.shared import SharedMapper


class TranscriptFilesMapper:

    _shared = SharedMapper()

    @staticmethod
    def to_transcript_file(row: dict) -> dict:
        """Map a DB row dict into an API-friendly transcript file payload."""
        mapped = dict(row)
        return TranscriptFilesMapper._shared.normalize_nulls(mapped)

    @staticmethod
    def to_transcript_file_list(rows: List[dict]) -> List[dict]:
        return [TranscriptFilesMapper.to_transcript_file(row) for row in rows]
