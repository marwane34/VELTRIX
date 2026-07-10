"""
Alert schemas.
Pydantic models for creating, updating, and returning alert records that
mirror the `alerts` table, with read/resolved tracking.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AlertBase(BaseModel):
    """Shared fields for an alert."""

    machine_id: str
    user_id: str
    type: str
    severity: str = "warning"
    message: str
    is_read: bool = False
    resolved_at: datetime | None = None


class AlertCreate(BaseModel):
    """Payload for creating a new alert. `user_id` is set server-side from the token."""

    machine_id: str
    type: str
    severity: str = "warning"
    message: str


class AlertUpdate(BaseModel):
    """Payload for partially updating an alert. All fields optional."""

    is_read: bool | None = None
    resolved_at: datetime | None = None
    severity: str | None = None


class AlertResponse(BaseModel):
    """Alert record returned to clients, populated from ORM objects."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    machine_id: str
    user_id: str
    type: str
    severity: str = "warning"
    message: str
    is_read: bool = False
    resolved_at: datetime | None = None
    created_at: datetime


class Alert(AlertResponse):
    """Alias of AlertResponse for internal/service-layer use."""


class AlertListResponse(BaseModel):
    """Paginated list of alert responses."""

    items: list[AlertResponse]
    total: int
