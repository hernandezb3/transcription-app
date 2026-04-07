from typing import Any, List

from app.mappers.shared import SharedMapper


class TranscriptsMapper:

    _shared = SharedMapper()

    @staticmethod
    def parse_tags(value: Any) -> List[str]:
        """Accept CSV string or list and always return a clean list of tags."""
        if value is None:
            return []
        if isinstance(value, list):
            return [tag.strip() for tag in value if tag and tag.strip()]
        if isinstance(value, str):
            return [tag.strip() for tag in value.split(",") if tag.strip()]
        return []

    @staticmethod
    def serialize_tags(tags: List[str]) -> str:
        """Join tags into CSV format for DB storage."""
        return ",".join(TranscriptsMapper.parse_tags(tags))

    @staticmethod
    def to_transcript(row: dict) -> dict:
        """Map a DB row dict into an API-friendly transcript payload."""
        mapped = TranscriptsMapper._shared.normalize_nulls(dict(row))
        mapped["tags"] = TranscriptsMapper.parse_tags(mapped.get("tags"))
        return mapped

    @staticmethod
    def to_transcript_list(rows: List[dict]) -> List[dict]:
        return [TranscriptsMapper.to_transcript(row) for row in rows]
