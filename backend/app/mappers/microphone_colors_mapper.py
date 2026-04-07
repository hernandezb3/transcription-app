from typing import Any, List


class MicrophoneColorsMapper:

    @staticmethod
    def to_microphone_color(row: dict) -> dict:
        """Map a DB row dict into an API-friendly microphone color payload."""
        mapped = dict(row)
        return mapped

    @staticmethod
    def to_microphone_color_list(rows: List[dict]) -> List[dict]:
        return [MicrophoneColorsMapper.to_microphone_color(row) for row in rows]
