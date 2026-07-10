"""
SensorData model — mirrors the `sensor_data` table.
Stores individual sensor readings (time-series data) linked to both a sensor and a machine.
"""
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class SensorData(Base):
    """Represents a single sensor reading at a point in time."""

    __tablename__ = "sensor_data"

    id = Column(String(36), primary_key=True)
    sensor_id = Column(String(36), ForeignKey("sensors.id"), nullable=False)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False)
    user_id = Column(String(36), nullable=False)
    value = Column(Float, nullable=False, default=0)
    unit = Column(String(20), nullable=False, default="g")
    quality = Column(String(20), nullable=False, default="good")
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # --- Relationships ---
    sensor = relationship("Sensor", back_populates="sensor_data")
    machine = relationship("Machine", back_populates="sensor_data")

    def __repr__(self) -> str:
        return (
            f"<SensorData(id={self.id!r}, sensor_id={self.sensor_id!r}, "
            f"value={self.value!r}, recorded_at={self.recorded_at!r})>"
        )
