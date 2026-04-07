from typing import Any, List

from app.mappers.shared import SharedMapper


class LessonSubjectsMapper:

    _shared = SharedMapper()

    @staticmethod
    def to_lesson_subject(row: dict) -> dict:
        """Map a DB row dict into an API-friendly lesson subject payload."""
        mapped = dict(row)
        return LessonSubjectsMapper._shared.normalize_nulls(mapped)

    @staticmethod
    def to_lesson_subject_list(rows: List[dict]) -> List[dict]:
        return [LessonSubjectsMapper.to_lesson_subject(row) for row in rows]
