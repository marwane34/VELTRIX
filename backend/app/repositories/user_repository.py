"""
UserProfile repository.

Provides user-scoped queries on top of the generic CRUD operations. The
`get_by_id` override is a thin alias that keeps the auth.uid-style lookup
semantics explicit at the repository layer.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.user import UserProfile
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[UserProfile]):
    """Repository for the `user_profiles` table."""

    def __init__(self, db: Session):
        super().__init__(UserProfile, db)

    def get_by_email(self, email: str) -> Optional[UserProfile]:
        """Look up a user by their unique email address."""
        return (
            self.db.query(UserProfile)
            .filter(UserProfile.email == email)
            .first()
        )

    def get_by_id(self, id: str) -> Optional[UserProfile]:
        """
        Fetch a user profile by id.

        Mirrors the auth.uid lookup pattern used by Supabase RLS: the caller
        passes the authenticated user's UUID and we return the matching
        profile row (or None when the user does not yet have a profile).
        """
        return (
            self.db.query(UserProfile)
            .filter(UserProfile.id == id)
            .first()
        )

    def create_user(
        self,
        email: str,
        full_name: str = "",
        role: str = "operator",
        id: Optional[str] = None,
    ) -> UserProfile:
        """
        Create a new user profile.

        `id` is optional — when provided it should be the Supabase auth.uid
        so the profile row aligns with the auth user. When omitted the
        database / app layer is expected to supply a UUID.
        """
        obj_data: dict = {
            "email": email,
            "full_name": full_name,
            "role": role,
        }
        if id is not None:
            obj_data["id"] = id
        return self.create(obj_data)
