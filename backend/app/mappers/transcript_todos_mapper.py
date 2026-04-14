from datetime import datetime, timezone

from app.data_models.transcript_todos import TodoEntry
from app.mappers.shared import SharedMapper


class TodoMapper:
    def __init__(self):
        self.shared = SharedMapper()

    @staticmethod
    def _utc_now_naive() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    def to_list(self, rows: list[dict]) -> list[TodoEntry]:
        return [TodoEntry(**self.shared.normalize_nulls(r)) for r in rows]

    def to_single(self, row: dict) -> TodoEntry:
        return TodoEntry(**self.shared.normalize_nulls(row))

    def utc_now(self) -> datetime:
        return self._utc_now_naive()
