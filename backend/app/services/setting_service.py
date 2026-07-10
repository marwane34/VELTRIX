"""
Setting service.

Handles per-user application settings stored as key/value pairs grouped
by category. Supports single and bulk upserts, category-based retrieval,
and deletion. All operations are scoped to the user_id passed in by the
caller, enforcing per-user isolation.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.repositories.setting_repository import SettingRepository
from app.core.exceptions import NotFoundException, ValidationException
from app.models.setting import Setting


class SettingService:
    """
    Service handling user-scoped settings operations.

    Settings are keyed by (user_id, key) with a composite unique constraint
    in the database, making upsert the natural write primitive.
    """

    def __init__(self, db: Session):
        """Initialize the service with a database session and setting repository."""
        self.db = db
        self.setting_repo = SettingRepository(db)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------
    def get_settings(self, user_id: str) -> list[Setting]:
        """
        Return all settings for a user, ordered by category then key.

        Args:
            user_id: The owner's user ID.

        Returns:
            A list of Setting objects.
        """
        return self.setting_repo.get_by_user(user_id)

    def get_setting(self, user_id: str, key: str) -> Optional[Setting]:
        """
        Return a single setting by (user_id, key), or None if not found.

        Args:
            user_id: The owner's user ID.
            key: The setting key.

        Returns:
            The Setting object, or None if no matching setting exists.
        """
        return self.setting_repo.get_by_key(user_id, key)

    def get_settings_by_category(self, user_id: str, category: str) -> list[Setting]:
        """
        Return all settings for a user within a specific category.

        Args:
            user_id: The owner's user ID.
            category: The category to filter by (e.g. "general", "notifications").

        Returns:
            A list of Setting objects in the given category.
        """
        all_settings = self.setting_repo.get_by_user(user_id)
        return [s for s in all_settings if s.category == category]

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------
    def save_setting(
        self,
        user_id: str,
        key: str,
        value: str,
        category: str = "general",
    ) -> Setting:
        """
        Insert or update a single setting.

        If a setting with the given (user_id, key) already exists, its value
        and category are updated. Otherwise a new row is inserted.

        Args:
            user_id: The owner's user ID.
            key: The setting key.
            value: The setting value.
            category: The setting category (default "general").

        Returns:
            The upserted Setting object.

        Raises:
            ValidationException: If key or value is missing.
        """
        if not key or not key.strip():
            raise ValidationException(detail="Setting key is required")
        if value is None:
            raise ValidationException(detail="Setting value is required")

        return self.setting_repo.upsert(
            user_id=user_id,
            key=key.strip(),
            value=str(value),
            category=category,
        )

    def save_settings(self, user_id: str, settings: list[dict]) -> list[Setting]:
        """
        Bulk upsert a list of settings for a user.

        Each dict in `settings` must contain `key` and `value`, and may
        optionally contain `category` (defaults to "general").

        Args:
            user_id: The owner's user ID.
            settings: List of setting dicts.

        Returns:
            A list of upserted Setting objects, in the same order as the input.

        Raises:
            ValidationException: If the settings list is empty or any entry
                is missing required fields.
        """
        if not settings:
            raise ValidationException(detail="Settings list cannot be empty")

        # Validate all entries before performing any writes
        for entry in settings:
            if not entry.get("key") or not str(entry.get("key", "")).strip():
                raise ValidationException(detail="Each setting must have a non-empty key")
            if entry.get("value") is None:
                raise ValidationException(detail=f"Setting '{entry.get('key')}' must have a value")

        # Normalize entries: ensure value is a string and category defaults
        normalized: list[dict] = []
        for entry in settings:
            normalized.append(
                {
                    "key": str(entry["key"]).strip(),
                    "value": str(entry["value"]),
                    "category": entry.get("category", "general"),
                }
            )

        return self.setting_repo.bulk_upsert(user_id, normalized)

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------
    def delete_setting(self, user_id: str, key: str) -> bool:
        """
        Delete a setting by (user_id, key).

        Args:
            user_id: The owner's user ID.
            key: The setting key.

        Returns:
            True if a setting was deleted, False if no matching setting existed.

        Raises:
            NotFoundException: If no setting exists with the given key.
        """
        deleted = self.setting_repo.delete_by_key(user_id, key)
        if not deleted:
            raise NotFoundException(detail="Setting not found")
        return True
