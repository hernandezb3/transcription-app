import sqlalchemy

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.transcription.transcription import TranscriptSpeakersT
from app.data_models.transcript_speakers import TranscriptSpeakerCreate
from app.mappers.transcript_speakers_mapper import TranscriptSpeakersMapper


class TranscriptSpeakersRepository:
    def __init__(self):
        self.database = DatabaseFactory()
        self.mapper = TranscriptSpeakersMapper()

    async def alist(self, transcription_id: int):
        """Return all active speakers for a given transcript."""
        query = sqlalchemy.select(
            TranscriptSpeakersT.id,
            TranscriptSpeakersT.transcription_id,
            TranscriptSpeakersT.speaker_label,
            TranscriptSpeakersT.display_name,
            TranscriptSpeakersT.is_active,
        ).where(
            TranscriptSpeakersT.transcription_id == transcription_id,
            TranscriptSpeakersT.is_active == 1,
        ).order_by(TranscriptSpeakersT.id.asc())
        result = await self.database.aread(query)
        mapped_data = self.mapper.to_list_values(result.get("data", []))
        return mapped_data

    async def aget(self, speaker_id: int):
        """Get a single speaker by its primary key."""
        query = sqlalchemy.select(
            TranscriptSpeakersT.id,
            TranscriptSpeakersT.transcription_id,
            TranscriptSpeakersT.speaker_label,
            TranscriptSpeakersT.display_name,
            TranscriptSpeakersT.is_active,
        ).where(TranscriptSpeakersT.id == speaker_id)
        result = await self.database.aread(query)
        mapped_data = self.mapper.to_list_values(result.get("data", []))
        return mapped_data[0] if mapped_data else None

    async def acreate(self, data: TranscriptSpeakerCreate):
        """Insert a new speaker and return the result."""
        stmt = sqlalchemy.insert(TranscriptSpeakersT).values(**data.model_dump())
        result = await self.database.acreate(stmt)
        return result

    async def aupdate(self, speaker_id: int, updates: dict):
        """Update a speaker by its primary key (e.g. rename display_name)."""
        stmt = (
            sqlalchemy.update(TranscriptSpeakersT)
            .where(TranscriptSpeakersT.id == speaker_id)
            .values(**updates)
        )
        result = await self.database.aupdate(stmt)
        return result

    async def adeactivate_by_transcript(self, transcription_id: int):
        """Soft-delete all speakers for a transcript."""
        stmt = (
            sqlalchemy.update(TranscriptSpeakersT)
            .where(
                TranscriptSpeakersT.transcription_id == transcription_id,
                TranscriptSpeakersT.is_active == 1,
            )
            .values(is_active=0)
        )
        return await self.database.aupdate(stmt)

    async def aget_or_create(self, transcription_id: int, speaker_label: str):
        """
        Look up an active speaker by transcript + label.
        If not found, create one.  Returns the speaker id.
        """
        query = sqlalchemy.select(
            TranscriptSpeakersT.id,
        ).where(
            TranscriptSpeakersT.transcription_id == transcription_id,
            TranscriptSpeakersT.speaker_label == speaker_label,
            TranscriptSpeakersT.is_active == 1,
        )
        result = await self.database.aread(query)
        rows = result.get("data", [])
        if rows:
            return rows[0]["id"]

        create_data = TranscriptSpeakerCreate(
            transcription_id=transcription_id,
            speaker_label=speaker_label,
            display_name=speaker_label,
            is_active=1,
        )
        create_result = await self.acreate(create_data)
        return create_result.get("data", {}).get("id")
