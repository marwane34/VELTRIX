"""
Setting repository.

Per-user key/value settings grouped by category. The composite unique
constraint on (user_id, key) makes `upsert` the natural write primitive:
insert if the key is new for the user, update the value/category otherwise.
`bulk_upsert` repeats that for a batch and returns the resulting rows.
"""
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.models.setting import Setting
from app.repositories.base import BaseRepository


class SettingRepository(BaseRepository[Setting]):
    """Repository for the `settings` table."""

    def __init__(self, db: Session):
        super().__init__(Setting, db)

    def get_by_user(self, user_id: str) -> list[Setting]:
        """Return all settings for a user."""
        return (
            self.db.query(Setting)
            .filter(Setting.user_id == user_id)
            .order_by(Setting.category.asc(), Setting.key.asc())
            .all()
        )

    def get_by_key(
        self,
        user_id: str,
        key: str,
    ) -> Optional[Setting]:
        """Return a single setting by (user_id, key), or None."""
        return (
            self.db.query(Setting)
            .filter(Setting.user_id == user_id, Setting.key == key)
            .first()
        )

    def upsert(
        self,
        user_id: str,
        key: str,
        value: str,
        category: str = "general",
    ) -> Setting:
        """
        Insert or update a setting keyed by (user_id, key).

        On conflict the existing row's `value` and `category` are updated.
        The row is committed and refreshed before being returned.
        """
        existing = self.get_by_key(user_id, key)
        if existing:
            existing.value = value
            existing.category = category
            self.db.commit()
            self.db.refresh(existing)
            return existing

        obj = Setting(
            id=str(uuid.uuid4()),
            user_id=user_id,
            key=key,
            value=value,
            category=category,
        )
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete_by_key(
        self,
        user_id: str,
        key: str,
    ) -> bool:
        """
        Delete a setting by (user_id, key). Returns True if a row was
        deleted, False if no matching setting existed.
        """
        existing = self.get_by_key(user_id, key)
        if not existing:
            return False
        self.db.delete(existing)
        self.db.commit()
        return True

    def bulk_upsert(
        self,
        user_id: str,
        settings: list[dict],
    ) -> list[Setting]:
        """
        Upsert a batch of settings for a user.

        Each dict in `settings` must contain `key`, `value`, and optionally
        `category` (defaults to "general"). Returns the resulting Setting
        rows in the same order as the input list.
        """
        results: list[Setting] = []
        for entry in settings:
            key = entry["key"]
            value = entry["value"]
            category = entry.get("category", "general")
            results.append(self.upsert(user_id, key, value, category))
        return results
