import sqlalchemy
from datetime import datetime

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.transcription.metadata import MicrophoneColorsT
from app.mappers.microphone_colors_mapper import MicrophoneColorsMapper


class MicrophoneColorsRepository:
    def __init__(self):
        self.database = DatabaseFactory()
        self.mapper = MicrophoneColorsMapper()

    async def list(self):
        query = sqlalchemy.select(
            MicrophoneColorsT.id,
            MicrophoneColorsT.color,
            MicrophoneColorsT.description,
            MicrophoneColorsT.created,
            MicrophoneColorsT.modified,
            MicrophoneColorsT.active,
        ).where(MicrophoneColorsT.active == 1)
        result = await self.database.aread(query)
        rows = result.get("data", [])
        return self.mapper.to_microphone_color_list(rows)

    async def get(self, color_id: int):
        query = sqlalchemy.select(
            MicrophoneColorsT.id,
            MicrophoneColorsT.color,
            MicrophoneColorsT.description,
            MicrophoneColorsT.created,
            MicrophoneColorsT.modified,
            MicrophoneColorsT.active,
        ).where(MicrophoneColorsT.id == color_id)
        result = await self.database.aread(query)
        rows = result.get("data", [])
        if not rows:
            return None
        return self.mapper.to_microphone_color(rows[0])

    async def create(self, data: dict, user_id: int):
        now = datetime.utcnow()
        stmt = sqlalchemy.insert(MicrophoneColorsT).values(
            color=data["color"],
            description=data.get("description"),
            created=now,
            created_by=user_id,
            modified=now,
            modified_by=user_id,
            active=1,
        )
        result = await self.database.acreate(stmt)
        return result

    async def update(self, color_id: int, updates: dict):
        stmt = (
            sqlalchemy.update(MicrophoneColorsT)
            .where(MicrophoneColorsT.id == color_id)
            .values(**updates)
        )
        result = await self.database.aupdate(stmt)
        return result

    async def delete(self, color_id: int):
        """Soft delete — sets active = 0."""
        stmt = (
            sqlalchemy.update(MicrophoneColorsT)
            .where(MicrophoneColorsT.id == color_id)
            .values(active=0)
        )
        result = await self.database.aupdate(stmt)
        return result
