from datetime import datetime, timezone

from app.data_models.transcript_threads import ThreadEntry, PostEntry, PostSearchHit
from app.mappers.shared import SharedMapper


class ThreadMapper:
    def __init__(self):
        self.shared = SharedMapper()

    @staticmethod
    def _utc_now_naive() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    def to_thread_list(self, rows: list[dict]) -> list[ThreadEntry]:
        return [ThreadEntry(**self.shared.normalize_nulls(r)) for r in rows]

    def to_thread(self, row: dict) -> ThreadEntry:
        return ThreadEntry(**self.shared.normalize_nulls(row))

    def to_post_list(self, rows: list[dict]) -> list[PostEntry]:
        return [PostEntry(**self.shared.normalize_nulls(r)) for r in rows]

    def to_post(self, row: dict) -> PostEntry:
        return PostEntry(**self.shared.normalize_nulls(row))

    def to_search_hit_list(self, rows: list[dict]) -> list[PostSearchHit]:
        return [PostSearchHit(**self.shared.normalize_nulls(r)) for r in rows]

    def utc_now(self) -> datetime:
        return self._utc_now_naive()
