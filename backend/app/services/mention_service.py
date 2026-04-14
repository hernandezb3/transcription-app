"""
Service that creates mention records + notifications when @usernames are
detected in comments or todos.
"""
from __future__ import annotations

from typing import List

import sqlalchemy
from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.user import UsersT
from app.repositories.mentions.controller import MentionRepository
from app.repositories.notifications.controller import NotificationRepository
from app.mappers.notification_mapper import NotificationMapper
from app.data_models.mention_models import MentionCreate
from app.services.mention_parser import extract_mentions


class MentionService:
    def __init__(self):
        self.db = DatabaseFactory()
        self.mention_repo = MentionRepository()
        self.notification_repo = NotificationRepository()
        self.notification_mapper = NotificationMapper()

    async def _resolve_usernames(self, usernames: List[str]) -> list[dict]:
        """Look up users by username and return list of {id, user_name, display_name}."""
        if not usernames:
            return []
        query = (
            sqlalchemy.select(
                UsersT.id,
                UsersT.user_name,
                UsersT.display_name,
            )
            .where(UsersT.user_name.in_(usernames))
        )
        result = await self.db.aread(query)
        return result.get("data", [])

    async def process_mentions(
        self,
        text: str | None,
        entity_type: str,
        entity_id: int,
        author_user_id: int | None,
        context_title: str = "item",
        route: str | None = None,
    ) -> List[int]:
        """
        Parse @mentions from *text*, create mention records and notifications.

        Returns the list of mentioned user IDs.
        """
        usernames = extract_mentions(text)
        if not usernames:
            return []

        users = await self._resolve_usernames(usernames)
        mentioned_ids: List[int] = []

        for user in users:
            uid = user["id"]
            # Don't notify yourself
            if uid == author_user_id:
                continue

            mentioned_ids.append(uid)

            # Create mention record
            mention = MentionCreate(
                entity_type=entity_type,
                entity_id=entity_id,
                mentioned_user_id=uid,
                mentioned_by_user_id=author_user_id,
            )
            try:
                await self.mention_repo.acreate(mention)
            except Exception:
                pass

            # Create notification
            actor_name = ""
            if author_user_id:
                # We'll just use a simple label; the front-end joins actor_display_name
                actor_name = "Someone"
            display = user.get("display_name") or user.get("user_name", "")
            notification = self.notification_mapper.to_create_values(
                user_id=uid,
                title=f"You were mentioned in a {context_title}",
                message=f"@{display} you were mentioned in a {context_title}.",
                actor_user_id=author_user_id,
                notification_type="info",
                category="mention",
                priority="normal",
                route=route,
                entity_type=entity_type,
                entity_id=str(entity_id),
            )
            try:
                await self.notification_repo.acreate(notification)
            except Exception:
                pass

        return mentioned_ids
