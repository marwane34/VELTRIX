"""
MaintenanceLog repository.

Read-only helpers for maintenance history (by machine or by user) and an
"upcoming" query that returns scheduled maintenance whose
`next_maintenance_at` is in the future — used for the upcoming-maintenance
dashboard widget.
"""
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.maintenance_log import MaintenanceLog
from app.repositories.base import BaseRepository


class MaintenanceLogRepository(BaseRepository[MaintenanceLog]):
    """Repository for the `maintenance_logs` table."""

    def __init__(self, db: Session):
        super().__init__(MaintenanceLog, db)

    def get_by_machine(
        self,
        machine_id: str,
        limit: int = 50,
    ) -> list[MaintenanceLog]:
        """Return the most recent `limit` maintenance log entries for a machine."""
        return (
            self.db.query(MaintenanceLog)
            .filter(MaintenanceLog.machine_id == machine_id)
            .order_by(MaintenanceLog.performed_at.desc())
            .limit(limit)
            .all()
        )

    def get_by_user(
        self,
        user_id: str,
        limit: int = 100,
    ) -> list[MaintenanceLog]:
        """Return the most recent `limit` maintenance log entries across a user's machines."""
        return (
            self.db.query(MaintenanceLog)
            .filter(MaintenanceLog.user_id == user_id)
            .order_by(MaintenanceLog.performed_at.desc())
            .limit(limit)
            .all()
        )

    def get_upcoming(
        self,
        user_id: str,
        limit: int = 10,
    ) -> list[MaintenanceLog]:
        """
        Return scheduled maintenance for a user where `next_maintenance_at`
        is strictly in the future relative to now, ordered by soonest first.
        """
        now = datetime.utcnow()
        return (
            self.db.query(MaintenanceLog)
            .filter(
                MaintenanceLog.user_id == user_id,
                MaintenanceLog.next_maintenance_at.isnot(None),
                MaintenanceLog.next_maintenance_at > now,
            )
            .order_by(MaintenanceLog.next_maintenance_at.asc())
            .limit(limit)
            .all()
        )
