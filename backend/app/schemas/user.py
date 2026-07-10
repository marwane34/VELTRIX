"""
UserProfile schemas.
Pydantic models for creating, updating, and returning user profile records
that mirror the `user_profiles` table.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserProfileBase(BaseModel):
    """Shared fields for a user profile."""

    id: str
    email: EmailStr
    full_name: str = ""
    role: str = "operator"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class UserProfileCreate(BaseModel):
    """Payload for creating a new user profile (id/timestamps assigned server-side)."""

    email: EmailStr
    full_name: str = ""
    role: str = "operator"


class UserProfileUpdate(BaseModel):
    """Payload for partially updating a user profile. All fields optional."""

    full_name: str | None = None
    role: str | None = None


class UserProfileResponse(BaseModel):
    """User profile returned to clients, populated from ORM objects."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: str = ""
    role: str = "operator"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class UserProfile(UserProfileResponse):
    """Alias of UserProfileResponse for internal/service-layer use."""
