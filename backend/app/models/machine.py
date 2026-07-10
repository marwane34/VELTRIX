"""
Machine model — mirrors the `machines` table.
Represents a physical machine being monitored by sensors, with configurable
threshold ranges for vibration (rms), temperature, and current.
"""
from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Machine(Base):
    """Represents a monitored machine and its alert/prediction thresholds."""

    __tablename__ = "machines"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), nullable=False)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False, default="")
    description = Column(Text, nullable=False, default="")
    status = Column(String(20), nullable=False, default="online")

    # Vibration (RMS) thresholds
    rms_min = Column(Float, nullable=False, default=0.5)
    rms_max = Column(Float, nullable=False, default=3.0)

    # Temperature thresholds (°C)
    temp_min = Column(Float, nullable=False, default=20.0)
    temp_max = Column(Float, nullable=False, default=85.0)

    # Current thresholds (A)
    current_min = Column(Float, nullable=False, default=0.5)
    current_max = Column(Float, nullable=False, default=5.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # --- Relationships (cascade delete so removing a machine cleans up children) ---
    sensors = relationship(
        "Sensor",
        back_populates="machine",
        cascade="all, delete-orphan",
        foreign_keys="Sensor.machine_id",
    )
    alerts = relationship(
        "Alert", back_populates="machine", cascade="all, delete-orphan"
    )
    predictions = relationship(
        "Prediction", back_populates="machine", cascade="all, delete-orphan"
    )
    maintenance_logs = relationship(
        "MaintenanceLog", back_populates="machine", cascade="all, delete-orphan"
    )
    sensor_data = relationship(
        "SensorData", back_populates="machine", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Machine(id={self.id!r}, name={self.name!r}, status={self.status!r})>"
