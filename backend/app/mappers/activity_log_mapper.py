from datetime import datetime, timezone

from app.data_models.transcript_overview import ActivityLogCreate, ActivityLogEntry
from app.mappers.shared import SharedMapper


class ActivityLogMapper:
    def __init__(self):
        self.shared_mapper = SharedMapper()

    @staticmethod
    def _utc_now_naive() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def to_create_values(
        transcription_id: int,
        action: str,
        section_id: int | None = None,
        summary: str | None = None,
        user_id: int | None = None,
    ) -> ActivityLogCreate:
        now = ActivityLogMapper._utc_now_naive()
        return ActivityLogCreate(
            transcription_id=transcription_id,
            action=action,
            section_id=section_id,
            summary=summary,
            user_id=user_id,
            created_at=now,
        )

    def to_list_values(self, rows: list[dict]) -> list[ActivityLogEntry]:
        data = []
        for row in rows:
            normalized = self.shared_mapper.normalize_nulls(row)
            data.append(ActivityLogEntry(**normalized))
        return data
