"""
Prediction model — mirrors the `predictions` table.
Stores ML-based health assessments for a machine, including Remaining Useful
Life (RUL) and per-failure-mode risk percentages.
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Prediction(Base):
    """Represents a health prediction for a machine at a point in time."""

    __tablename__ = "predictions"

    id = Column(String(36), primary_key=True)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False)
    user_id = Column(String(36), nullable=False)

    # Overall health score (0-100, higher is healthier)
    health_score = Column(Float, nullable=False, default=100)
    # Human-readable status label
    status = Column(String(20), nullable=False, default="healthy")

    # Per-mode risk percentages (0-100)
    bearing_wear_pct = Column(Float, nullable=False, default=0)
    overheating_risk_pct = Column(Float, nullable=False, default=0)
    failure_risk_pct = Column(Float, nullable=False, default=0)

    # Remaining Useful Life in operating hours
    rul_hours = Column(Integer, nullable=False, default=9999)

    predicted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # --- Relationships ---
    machine = relationship("Machine", back_populates="predictions")

    def __repr__(self) -> str:
        return (
            f"<Prediction(id={self.id!r}, machine_id={self.machine_id!r}, "
            f"health_score={self.health_score!r}, status={self.status!r})>"
        )
