"""
Sensor schemas.
Pydantic models for creating, updating, and returning sensor records that
mirror the `sensors` table. A sensor may be unassigned (machine_id is None)
or attached to a machine.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SensorBase(BaseModel):
    """Shared fields for a sensor."""

    user_id: str
    machine_id: str | None = None
    name: str
    type: str = "vibration"
    channel: str = "X"
    unit: str = "g"
    status: str = "active"
    sampling_rate: int = 1000
    min_value: float = 0
    max_value: float = 100
    description: str = ""


class SensorCreate(BaseModel):
    """Payload for creating a new sensor. `user_id` is set server-side from the token."""

    machine_id: str | None = None
    name: str
    type: str = "vibration"
    channel: str = "X"
    unit: str = "g"
    sampling_rate: int = 1000
    min_value: float = 0
    max_value: float = 100
    description: str = ""


class SensorUpdate(BaseModel):
    """Payload for partially updating a sensor. All fields optional."""

    machine_id: str | None = None
    name: str | None = None
    type: str | None = None
    channel: str | None = None
    unit: str | None = None
    status: str | None = None
    sampling_rate: int | None = None
    min_value: float | None = None
    max_value: float | None = None
    description: str | None = None


class SensorResponse(BaseModel):
    """Sensor record returned to clients, populated from ORM objects."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    machine_id: str | None = None
    name: str
    type: str = "vibration"
    channel: str = "X"
    unit: str = "g"
    status: str = "active"
    sampling_rate: int = 1000
    min_value: float = 0
    max_value: float = 100
    description: str = ""
    created_at: datetime
    updated_at: datetime


class Sensor(SensorResponse):
    """Alias of SensorResponse for internal/service-layer use."""


class SensorListResponse(BaseModel):
    """Paginated list of sensor responses."""

    items: list[SensorResponse]
    total: int
