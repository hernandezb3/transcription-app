from app.data_models.transcript_speakers import TranscriptSpeaker, TranscriptSpeakerCreate
from app.mappers.shared import SharedMapper


class TranscriptSpeakersMapper:
    def __init__(self):
        self.shared_mapper = SharedMapper()

    @staticmethod
    def to_create_values(transcription_id: int, speaker_label: str) -> TranscriptSpeakerCreate:
        return TranscriptSpeakerCreate(
            transcription_id=transcription_id,
            speaker_label=speaker_label,
            display_name=speaker_label,
            is_active=1,
        )

    def to_list_values(self, rows: list[dict]) -> list[TranscriptSpeaker]:
        data = []
        for row in rows:
            normalized_row = self.shared_mapper.normalize_nulls(row)
            data.append(TranscriptSpeaker(**normalized_row))
        return data
