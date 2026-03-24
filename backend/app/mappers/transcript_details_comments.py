from datetime import datetime, timezone

import pandas as pd

from app.data_models.transcript_details_comments import TranscriptDetailsCommentsCreate, TranscriptDetailsCommentsCreateIngest,TranscriptDetailsComments
from app.mappers.shared import SharedMapper

class TranscriptDetailsCommentsMapper:
    def __init__(self):
        self.shared_mapper = SharedMapper()
        
    @staticmethod
    def _utc_now_naive() -> datetime:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        return now

    @staticmethod
    def to_create_values(comment: TranscriptDetailsCommentsCreateIngest, transcript_id:int = 1,user_id: int = 1) -> TranscriptDetailsCommentsCreate:
        data = comment.model_dump(exclude_unset=True)
        now = TranscriptDetailsCommentsMapper._utc_now_naive()

        data.setdefault("transcription_id", transcript_id)
        data.setdefault("created_at", now)
        data.setdefault("created_by", user_id)
        data.setdefault("is_active", 1)
        data_model = TranscriptDetailsCommentsCreate(**data)

        return data_model

    def to_list_values(self, rows: list[dict]) -> list[TranscriptDetailsComments]:
        data = []
        for row in rows:
            normalized_row = self.shared_mapper.normalize_nulls(row)
            data.append(TranscriptDetailsComments(**normalized_row))
        return data
    
