"""
Sensor model — mirrors the `sensors` table.
Represents a sensor that can be assigned to a machine (or left unassigned)
and feeds readings into the sensor_data table.
"""
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Sensor(Base):
    """Represents a sensor attached (optionally) to a machine."""

    __tablename__ = "sensors"

    id = Column(String(36), primary_key=True)
    # Nullable FK: a sensor can exist before being assigned to a machine
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=True)
    user_id = Column(String(36), nullable=False)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False, default="vibration")
    channel = Column(String(10), nullable=False, default="X")
    unit = Column(String(20), nullable=False, default="g")
    status = Column(String(20), nullable=False, default="active")
    sampling_rate = Column(Integer, nullable=False, default=1000)
    min_value = Column(Float, nullable=False, default=0)
    max_value = Column(Float, nullable=False, default=100)
    description = Column(Text, nullable=False, default="")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # --- Relationships ---
    sensor_data = relationship(
        "SensorData", back_populates="sensor", cascade="all, delete-orphan"
    )
    machine = relationship(
        "Machine", back_populates="sensors", foreign_keys=[machine_id]
    )

    def __repr__(self) -> str:
        return f"<Sensor(id={self.id!r}, name={self.name!r}, type={self.type!r})>"
