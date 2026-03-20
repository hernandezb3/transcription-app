from typing import Any, List


class TranscriptionMapper:
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
        return ",".join(TranscriptionMapper.parse_tags(tags))

    @staticmethod
    def to_transcript_details(row: dict) -> dict:
        """Map DB row payload into API-friendly transcript details payload."""
        mapped = dict(row)
        mapped["tags"] = TranscriptionMapper.parse_tags(mapped.get("tags"))
        return mapped
