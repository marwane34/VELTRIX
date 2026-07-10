"""
Alert model — mirrors the `alerts` table.
Represents notifications generated when sensor readings or predictions
cross configured thresholds, with read/resolved tracking.
"""
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Alert(Base):
    """Represents an alert raised for a machine."""

    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False)
    user_id = Column(String(36), nullable=False)
    type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False, default="warning")
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # --- Relationships ---
    machine = relationship("Machine", back_populates="alerts")

    def __repr__(self) -> str:
        return (
            f"<Alert(id={self.id!r}, machine_id={self.machine_id!r}, "
            f"type={self.type!r}, severity={self.severity!r}, is_read={self.is_read!r})>"
        )
