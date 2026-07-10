"""
Setting schemas.
Pydantic models for creating, updating, and returning per-user application
settings that mirror the `settings` table (key/value pairs grouped by category).
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SettingBase(BaseModel):
    """Shared fields for a user-scoped setting."""

    user_id: str
    key: str
    value: str = ""
    category: str = "general"


class SettingCreate(BaseModel):
    """Payload for creating a setting. `user_id` is set server-side from the token."""

    key: str
    value: str = ""
    category: str = "general"


class SettingUpdate(BaseModel):
    """Payload for partially updating a setting. All fields optional."""

    value: str | None = None
    category: str | None = None


class SettingResponse(BaseModel):
    """Setting record returned to clients, populated from ORM objects."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    key: str
    value: str = ""
    category: str = "general"
    updated_at: datetime


class Setting(SettingResponse):
    """Alias of SettingResponse for internal/service-layer use."""


class SettingListResponse(BaseModel):
    """Paginated list of setting responses."""

    items: list[SettingResponse]
    total: int
