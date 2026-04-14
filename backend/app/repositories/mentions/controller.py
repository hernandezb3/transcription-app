import sqlalchemy

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.mentions import MentionsT
from app.mappers.mention_mapper import MentionMapper
from app.data_models.mention_models import MentionCreate, MentionEntry


class MentionRepository:
    def __init__(self):
        self.database = DatabaseFactory()
        self.mapper = MentionMapper()

    async def acreate(self, data: MentionCreate) -> dict:
        """Insert a new mention record."""
        stmt = sqlalchemy.insert(MentionsT).values(**data.model_dump())
        return await self.database.acreate(stmt)

    async def alist_by_entity(self, entity_type: str, entity_id: int) -> list[MentionEntry]:
        """All mentions for a given entity (comment, todo, etc.)."""
        query = (
            sqlalchemy.select(
                MentionsT.id,
                MentionsT.entity_type,
                MentionsT.entity_id,
                MentionsT.mentioned_user_id,
                MentionsT.mentioned_by_user_id,
                MentionsT.created_at,
            )
            .where(
                MentionsT.entity_type == entity_type,
                MentionsT.entity_id == entity_id,
            )
            .order_by(MentionsT.created_at.desc())
        )
        result = await self.database.aread(query)
        rows = result.get("data", [])
        return self.mapper.to_list(rows)

    async def alist_for_user(self, user_id: int, limit: int = 50) -> list[MentionEntry]:
        """All mentions where a given user was @mentioned."""
        query = (
            sqlalchemy.select(
                MentionsT.id,
                MentionsT.entity_type,
                MentionsT.entity_id,
                MentionsT.mentioned_user_id,
                MentionsT.mentioned_by_user_id,
                MentionsT.created_at,
            )
            .where(MentionsT.mentioned_user_id == user_id)
            .order_by(MentionsT.created_at.desc())
            .limit(limit)
        )
        result = await self.database.aread(query)
        rows = result.get("data", [])
        return self.mapper.to_list(rows)

    async def adelete_by_entity(self, entity_type: str, entity_id: int) -> dict:
        """Remove all mentions for an entity (e.g. when the comment is deleted)."""
        stmt = (
            sqlalchemy.delete(MentionsT)
            .where(
                MentionsT.entity_type == entity_type,
                MentionsT.entity_id == entity_id,
            )
        )
        return await self.database.adelete(stmt)
