from datetime import datetime, timezone

from app.data_models.mention_models import MentionCreate, MentionEntry
from app.mappers.shared import SharedMapper


class MentionMapper:
    def __init__(self):
        self.shared = SharedMapper()

    @staticmethod
    def _utc_now_naive() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    def to_list(self, rows: list[dict]) -> list[MentionEntry]:
        return [MentionEntry(**self.shared.normalize_nulls(r)) for r in rows]

    def to_single(self, row: dict) -> MentionEntry:
        return MentionEntry(**self.shared.normalize_nulls(row))
