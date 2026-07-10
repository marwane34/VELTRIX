"""
Alert repository.

Handles alert queries and lifecycle: listing by user/machine, unread
counts and listings, marking alerts read (individually or in bulk), and
multi-field filtering for the alerts dashboard.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.repositories.base import BaseRepository


class AlertRepository(BaseRepository[Alert]):
    """Repository for the `alerts` table."""

    def __init__(self, db: Session):
        super().__init__(Alert, db)

    def get_by_user(
        self,
        user_id: str,
        limit: int = 100,
    ) -> list[Alert]:
        """Return the most recent `limit` alerts for a user."""
        return (
            self.db.query(Alert)
            .filter(Alert.user_id == user_id)
            .order_by(Alert.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_by_machine(
        self,
        machine_id: str,
        limit: int = 50,
    ) -> list[Alert]:
        """Return the most recent `limit` alerts for a machine."""
        return (
            self.db.query(Alert)
            .filter(Alert.machine_id == machine_id)
            .order_by(Alert.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_unread(self, user_id: str) -> list[Alert]:
        """Return all unread alerts for a user, newest first."""
        return (
            self.db.query(Alert)
            .filter(Alert.user_id == user_id, Alert.is_read.is_(False))
            .order_by(Alert.created_at.desc())
            .all()
        )

    def count_unread(self, user_id: str) -> int:
        """Count unread alerts for a user (for badge / notification counts)."""
        return (
            self.db.query(Alert)
            .filter(Alert.user_id == user_id, Alert.is_read.is_(False))
            .count()
        )

    def mark_all_read(self, user_id: str) -> int:
        """
        Mark every unread alert for a user as read in a single UPDATE.
        Returns the number of rows that were updated.
        """
        rows = (
            self.db.query(Alert)
            .filter(Alert.user_id == user_id, Alert.is_read.is_(False))
            .all()
        )
        updated = 0
        for alert in rows:
            alert.is_read = True
            updated += 1
        self.db.commit()
        return updated

    def mark_read(self, alert_id: str) -> Optional[Alert]:
        """
        Mark a single alert as read. Returns the refreshed alert, or None
        if no alert with that id exists.
        """
        alert = (
            self.db.query(Alert)
            .filter(Alert.id == alert_id)
            .first()
        )
        if not alert:
            return None
        alert.is_read = True
        self.db.commit()
        self.db.refresh(alert)
        return alert

    def filter_alerts(
        self,
        user_id: str,
        severity: Optional[str] = None,
        is_read: Optional[bool] = None,
        machine_id: Optional[str] = None,
        limit: int = 100,
    ) -> list[Alert]:
        """
        Multi-field filter for the alerts dashboard. All filters are
        optional and combined with AND. Results are newest-first.
        """
        stmt = self.db.query(Alert).filter(Alert.user_id == user_id)

        if severity is not None:
            stmt = stmt.filter(Alert.severity == severity)

        if is_read is not None:
            stmt = stmt.filter(Alert.is_read.is_(is_read))

        if machine_id is not None:
            stmt = stmt.filter(Alert.machine_id == machine_id)

        return (
            stmt.order_by(Alert.created_at.desc())
            .limit(limit)
            .all()
        )
