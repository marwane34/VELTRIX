"""
MaintenanceLog schemas.
Pydantic models for creating, updating, and returning maintenance log records
that mirror the `maintenance_logs` table.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MaintenanceLogBase(BaseModel):
    """Shared fields for a maintenance log entry."""

    machine_id: str
    user_id: str
    action: str
    notes: str = ""
    performed_by: str = "System"
    performed_at: datetime | None = None
    next_maintenance_at: datetime | None = None
    scheduled_by: str = "System"


class MaintenanceLogCreate(BaseModel):
    """Payload for creating a maintenance log. `user_id` is set server-side from the token."""

    machine_id: str
    action: str
    notes: str = ""
    performed_by: str = "System"
    next_maintenance_at: datetime | None = None
    scheduled_by: str = "System"


class MaintenanceLogUpdate(BaseModel):
    """Payload for partially updating a maintenance log. All fields optional."""

    action: str | None = None
    notes: str | None = None
    performed_by: str | None = None
    next_maintenance_at: datetime | None = None
    scheduled_by: str | None = None


class MaintenanceLogResponse(BaseModel):
    """Maintenance log record returned to clients, populated from ORM objects."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    machine_id: str
    user_id: str
    action: str
    notes: str = ""
    performed_by: str = "System"
    performed_at: datetime
    next_maintenance_at: datetime | None = None
    scheduled_by: str = "System"


class MaintenanceLog(MaintenanceLogResponse):
    """Alias of MaintenanceLogResponse for internal/service-layer use."""


class MaintenanceLogListResponse(BaseModel):
    """Paginated list of maintenance log responses."""

    items: list[MaintenanceLogResponse]
    total: int
