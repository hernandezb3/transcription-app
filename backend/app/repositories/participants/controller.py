import sqlalchemy
from datetime import datetime

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.transcription.metadata import ParticipantsT
from app.mappers.participants_mapper import ParticipantsMapper


class ParticipantsRepository:
    def __init__(self):
        self.database = DatabaseFactory()
        self.mapper = ParticipantsMapper()

    @staticmethod
    def _strip_tz(value):
        """Strip timezone info from a datetime so it matches TIMESTAMP WITHOUT TIME ZONE columns."""
        if isinstance(value, datetime) and value.tzinfo is not None:
            return value.replace(tzinfo=None)
        return value

    async def list(self):
        query = sqlalchemy.select(
            ParticipantsT.id,
            ParticipantsT.name,
            ParticipantsT.role,
            ParticipantsT.description,
            ParticipantsT.join_date,
            ParticipantsT.withdrawal_date,
            ParticipantsT.Status,
            ParticipantsT.Number_of_Audio_Files,
            ParticipantsT.Number_of_Videos,
            ParticipantsT.created,
            ParticipantsT.modified,
            ParticipantsT.active,
        ).where(ParticipantsT.active == 1)
        result = await self.database.aread(query)
        rows = result.get("data", [])
        return self.mapper.to_participant_list(rows)

    async def get(self, participant_id: int):
        query = sqlalchemy.select(
            ParticipantsT.id,
            ParticipantsT.name,
            ParticipantsT.role,
            ParticipantsT.description,
            ParticipantsT.join_date,
            ParticipantsT.withdrawal_date,
            ParticipantsT.Status,
            ParticipantsT.Number_of_Audio_Files,
            ParticipantsT.Number_of_Videos,
            ParticipantsT.created,
            ParticipantsT.modified,
            ParticipantsT.active,
        ).where(ParticipantsT.id == participant_id)
        result = await self.database.aread(query)
        rows = result.get("data", [])
        if not rows:
            return None
        return self.mapper.to_participant(rows[0])

    async def create(self, data: dict, user_id: int):
        now = datetime.utcnow()
        db_data = self.mapper.to_db_fields(data)
        stmt = sqlalchemy.insert(ParticipantsT).values(
            name=db_data["name"],
            role=db_data.get("role"),
            description=db_data.get("description"),
            join_date=self._strip_tz(db_data.get("join_date")),
            Status="Active",
            created=now,
            created_by=user_id,
            modified=now,
            modified_by=user_id,
            active=1,
        )
        result = await self.database.acreate(stmt)
        return result

    async def update(self, participant_id: int, updates: dict):
        db_updates = self.mapper.to_db_fields(updates)
        db_updates = {k: self._strip_tz(v) for k, v in db_updates.items()}
        stmt = (
            sqlalchemy.update(ParticipantsT)
            .where(ParticipantsT.id == participant_id)
            .values(**db_updates)
        )
        result = await self.database.aupdate(stmt)
        return result

    async def delete(self, participant_id: int):
        """Soft delete — sets active = 0."""
        stmt = (
            sqlalchemy.update(ParticipantsT)
            .where(ParticipantsT.id == participant_id)
            .values(active=0)
        )
        result = await self.database.aupdate(stmt)
        return result
