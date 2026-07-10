"""
MaintenanceLog model — mirrors the `maintenance_logs` table.
Records maintenance actions performed on a machine, including who performed it,
optional notes, and optional next-maintenance scheduling.
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class MaintenanceLog(Base):
    """Represents a maintenance action log entry for a machine."""

    __tablename__ = "maintenance_logs"

    id = Column(String(36), primary_key=True)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False)
    user_id = Column(String(36), nullable=False)
    action = Column(String(255), nullable=False)
    notes = Column(Text, nullable=False, default="")
    performed_by = Column(String(255), nullable=False, default="System")
    performed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    next_maintenance_at = Column(DateTime(timezone=True), nullable=True)
    scheduled_by = Column(String(255), nullable=False, default="System")

    # --- Relationships ---
    machine = relationship("Machine", back_populates="maintenance_logs")

    def __repr__(self) -> str:
        return (
            f"<MaintenanceLog(id={self.id!r}, machine_id={self.machine_id!r}, "
            f"action={self.action!r}, performed_by={self.performed_by!r})>"
        )
