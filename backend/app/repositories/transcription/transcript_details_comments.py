import sqlalchemy

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.transcription.transcription import TranscriptDetailsCommentsT
from app.data_models.transcript_details_comments import TranscriptDetailsCommentsCreate
from app.mappers.transcript_details_comments import TranscriptDetailsCommentsMapper

class TranscriptDetailsCommentsRepository:
    def __init__(self):
        self.database = DatabaseFactory()
        self.mapper = TranscriptDetailsCommentsMapper()

    async def alist(self, transcript_id: int):
        query = sqlalchemy.select(
            TranscriptDetailsCommentsT.id,
            TranscriptDetailsCommentsT.transcription_id,
            TranscriptDetailsCommentsT.section_id,
            TranscriptDetailsCommentsT.comment,
            TranscriptDetailsCommentsT.created_by,
            TranscriptDetailsCommentsT.created_at,
            TranscriptDetailsCommentsT.is_active
        ).where(TranscriptDetailsCommentsT.transcription_id == transcript_id)
        result = await self.database.aread(query)
        mapped_data = self.mapper.to_list_values(result.get("data", []))
        return mapped_data
    
    async def aget(self, comment_id: int):
        query = sqlalchemy.select(
            TranscriptDetailsCommentsT.id,
            TranscriptDetailsCommentsT.transcription_id,
            TranscriptDetailsCommentsT.section_id,
            TranscriptDetailsCommentsT.comment,
            TranscriptDetailsCommentsT.created_by,
            TranscriptDetailsCommentsT.created_at,
            TranscriptDetailsCommentsT.is_active
        ).where(TranscriptDetailsCommentsT.id == comment_id)
        result = await self.database.aread(query)
        mapped_data = self.mapper.to_list_values(result.get("data", []))
        mapped_data = mapped_data[0] if mapped_data else None
        return mapped_data
    
    async def acreate(self, data: TranscriptDetailsCommentsCreate):
        """Create a new transcript comment."""
        stmt = sqlalchemy.insert(TranscriptDetailsCommentsT).values(**data.model_dump())
        result = await self.database.acreate(stmt)
        return result
    
    async def aupdate(self, comment_id: int, updates: dict):
        """Update a single transcript comment by its primary key."""
        query = (
            sqlalchemy.update(TranscriptDetailsCommentsT)
            .where(TranscriptDetailsCommentsT.id == comment_id)
            .values(**updates)
        )
        result = await self.database.aupdate(query)
        return result
    