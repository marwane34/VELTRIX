"""
Machine schemas.
Pydantic models for creating, updating, and returning machine records that
mirror the `machines` table, including configurable vibration/temperature/current
threshold ranges.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MachineBase(BaseModel):
    """Shared fields for a monitored machine."""

    user_id: str
    name: str
    location: str = ""
    description: str = ""
    status: str = "online"
    # Vibration (RMS) thresholds
    rms_min: float = 0.5
    rms_max: float = 3.0
    # Temperature thresholds (°C)
    temp_min: float = 20.0
    temp_max: float = 85.0
    # Current thresholds (A)
    current_min: float = 0.5
    current_max: float = 5.0


class MachineCreate(BaseModel):
    """Payload for creating a new machine. `user_id` is set server-side from the token."""

    name: str
    location: str = ""
    description: str = ""
    status: str = "online"
    # Vibration (RMS) thresholds
    rms_min: float = 0.5
    rms_max: float = 3.0
    # Temperature thresholds (°C)
    temp_min: float = 20.0
    temp_max: float = 85.0
    # Current thresholds (A)
    current_min: float = 0.5
    current_max: float = 5.0


class MachineUpdate(BaseModel):
    """Payload for partially updating a machine. All fields optional."""

    name: str | None = None
    location: str | None = None
    description: str | None = None
    status: str | None = None
    rms_min: float | None = None
    rms_max: float | None = None
    temp_min: float | None = None
    temp_max: float | None = None
    current_min: float | None = None
    current_max: float | None = None


class MachineResponse(BaseModel):
    """Machine record returned to clients, populated from ORM objects."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    location: str = ""
    description: str = ""
    status: str = "online"
    # Vibration (RMS) thresholds
    rms_min: float = 0.5
    rms_max: float = 3.0
    # Temperature thresholds (°C)
    temp_min: float = 20.0
    temp_max: float = 85.0
    # Current thresholds (A)
    current_min: float = 0.5
    current_max: float = 5.0
    created_at: datetime
    updated_at: datetime


class Machine(MachineResponse):
    """Alias of MachineResponse for internal/service-layer use."""


class MachineListResponse(BaseModel):
    """Paginated list of machine responses."""

    items: list[MachineResponse]
    total: int
