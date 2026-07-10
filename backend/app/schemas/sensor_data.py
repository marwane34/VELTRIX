"""
SensorData schemas.
Pydantic models for creating and returning time-series sensor readings that
mirror the `sensor_data` table.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SensorDataBase(BaseModel):
    """Shared fields for a sensor reading."""

    sensor_id: str
    machine_id: str
    user_id: str
    value: float
    unit: str = "g"
    quality: str = "good"
    recorded_at: datetime | None = None


class SensorDataCreate(BaseModel):
    """Payload for ingesting a sensor reading. `user_id` is set server-side from the token."""

    sensor_id: str
    machine_id: str
    value: float
    unit: str = "g"
    quality: str = "good"


class SensorDataResponse(BaseModel):
    """Sensor reading returned to clients, populated from ORM objects."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    sensor_id: str
    machine_id: str
    user_id: str
    value: float
    unit: str = "g"
    quality: str = "good"
    recorded_at: datetime


class SensorData(SensorDataResponse):
    """Alias of SensorDataResponse for internal/service-layer use."""


class SensorDataListResponse(BaseModel):
    """Paginated list of sensor data responses."""

    items: list[SensorDataResponse]
    total: int
