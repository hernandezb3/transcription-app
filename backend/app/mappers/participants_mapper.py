from typing import Any, List

from app.mappers.shared import SharedMapper


class ParticipantsMapper:

    _shared = SharedMapper()

    # DB column → API field name mapping
    _field_map = {
        "Status": "status",
        "Number_of_Audio_Files": "number_of_audio_files",
        "Number_of_Videos": "number_of_videos",
    }

    # API field → DB column name mapping (reverse)
    _reverse_field_map = {v: k for k, v in _field_map.items()}

    @staticmethod
    def to_participant(row: dict) -> dict:
        """Map a DB row dict into an API-friendly participant payload."""
        mapped = {}
        for key, value in row.items():
            api_key = ParticipantsMapper._field_map.get(key, key)
            mapped[api_key] = value
        return ParticipantsMapper._shared.normalize_nulls(mapped)

    @staticmethod
    def to_participant_list(rows: List[dict]) -> List[dict]:
        return [ParticipantsMapper.to_participant(row) for row in rows]

    @staticmethod
    def to_db_fields(updates: dict) -> dict:
        """Convert API field names back to DB column names for updates."""
        mapped = {}
        for key, value in updates.items():
            db_key = ParticipantsMapper._reverse_field_map.get(key, key)
            mapped[db_key] = value
        return mapped
