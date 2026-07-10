"""
Prediction repository.

Provides read access to ML health predictions, scoped by machine or by
user. Predictions are append-only time-series rows; the "latest" helpers
return the most recent prediction for dashboard summaries.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.prediction import Prediction
from app.repositories.base import BaseRepository


class PredictionRepository(BaseRepository[Prediction]):
    """Repository for the `predictions` table."""

    def __init__(self, db: Session):
        super().__init__(Prediction, db)

    def get_by_machine(
        self,
        machine_id: str,
        limit: int = 20,
    ) -> list[Prediction]:
        """Return the most recent `limit` predictions for a machine."""
        return (
            self.db.query(Prediction)
            .filter(Prediction.machine_id == machine_id)
            .order_by(Prediction.predicted_at.desc())
            .limit(limit)
            .all()
        )

    def get_latest_by_machine(self, machine_id: str) -> Optional[Prediction]:
        """Return the single most recent prediction for a machine, or None."""
        return (
            self.db.query(Prediction)
            .filter(Prediction.machine_id == machine_id)
            .order_by(Prediction.predicted_at.desc())
            .first()
        )

    def get_by_user(
        self,
        user_id: str,
        limit: int = 50,
    ) -> list[Prediction]:
        """Return the most recent `limit` predictions across all of a user's machines."""
        return (
            self.db.query(Prediction)
            .filter(Prediction.user_id == user_id)
            .order_by(Prediction.predicted_at.desc())
            .limit(limit)
            .all()
        )
