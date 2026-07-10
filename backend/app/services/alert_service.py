"""
Alert service.

Handles alert lifecycle: filtered listing, CRUD, read-status management,
and unread counts. All operations validate ownership via user_id so alerts
are always scoped to their owner.
"""
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.repositories.alert_repository import AlertRepository
from app.repositories.machine_repository import MachineRepository
from app.core.exceptions import NotFoundException, ValidationException
from app.models.alert import Alert


class AlertService:
    """
    Service handling alert operations.

    Alert ownership is determined by the `user_id` column on each alert
    row. When creating or filtering by machine_id, the service additionally
    verifies that the machine belongs to the same user.
    """

    def __init__(self, db: Session):
        """Initialize the service with alert and machine repositories."""
        self.db = db
        self.alert_repo = AlertRepository(db)
        self.machine_repo = MachineRepository(db)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------
    def get_alerts(
        self,
        user_id: str,
        severity: Optional[str] = None,
        is_read: Optional[bool] = None,
        machine_id: Optional[str] = None,
        limit: int = 100,
    ) -> list[Alert]:
        """
        Return alerts for a user with optional multi-field filtering.

        All filter parameters are optional and combined with AND.

        Args:
            user_id: The requesting user's ID.
            severity: Optional severity filter (e.g. "info", "warning", "critical").
            is_read: Optional read-status filter (True/False).
            machine_id: Optional machine filter.
            limit: Maximum number of alerts to return (default 100).

        Returns:
            A list of Alert objects, newest first.

        Raises:
            NotFoundException: If machine_id is provided but the machine is
                not found or not owned by the user.
        """
        if limit < 1:
            limit = 100

        # If filtering by machine, verify ownership
        if machine_id:
            machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
            if not machine:
                raise NotFoundException(detail="Machine not found")

        return self.alert_repo.filter_alerts(
            user_id=user_id,
            severity=severity,
            is_read=is_read,
            machine_id=machine_id,
            limit=limit,
        )

    def get_alert(self, id: str, user_id: str) -> Alert:
        """
        Fetch a single alert, enforcing ownership.

        Args:
            id: The alert ID.
            user_id: The requesting user's ID.

        Returns:
            The Alert object.

        Raises:
            NotFoundException: If the alert does not exist or does not
                belong to the user.
        """
        alert = self.alert_repo.get_by_id(id)
        if not alert or alert.user_id != user_id:
            raise NotFoundException(detail="Alert not found")
        return alert

    def get_unread_count(self, user_id: str) -> int:
        """
        Count unread alerts for a user (for badges/notification counts).

        Args:
            user_id: The requesting user's ID.

        Returns:
            The number of unread alerts.
        """
        return self.alert_repo.count_unread(user_id)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------
    def create_alert(self, user_id: str, data: dict) -> Alert:
        """
        Create a new alert.

        Args:
            user_id: The requesting user's ID.
            data: Field dict containing machine_id, type, severity, message,
                and optionally is_read and resolved_at.

        Returns:
            The newly created Alert object.

        Raises:
            ValidationException: If required fields (machine_id, type, message) are missing.
            NotFoundException: If the machine does not exist or is not owned.
        """
        machine_id = data.get("machine_id")
        if not machine_id:
            raise ValidationException(detail="machine_id is required")
        if not data.get("type"):
            raise ValidationException(detail="type is required")
        if not data.get("message"):
            raise ValidationException(detail="message is required")

        # Verify machine ownership
        machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        alert_data: dict = {
            "id": str(uuid.uuid4()),
            "machine_id": machine_id,
            "user_id": user_id,
            "type": data["type"],
            "severity": data.get("severity", "warning"),
            "message": data["message"],
            "is_read": data.get("is_read", False),
            "resolved_at": data.get("resolved_at"),
        }

        return self.alert_repo.create(alert_data)

    def update_alert(self, id: str, user_id: str, data: dict) -> Alert:
        """
        Update an existing alert's fields, enforcing ownership.

        Only the provided (non-None) fields in `data` are applied.

        Args:
            id: The alert ID.
            user_id: The requesting user's ID.
            data: Field dict of attributes to update (severity, is_read,
                resolved_at, message, type).

        Returns:
            The refreshed Alert object.

        Raises:
            NotFoundException: If the alert does not exist or is not owned.
        """
        alert = self.alert_repo.get_by_id(id)
        if not alert or alert.user_id != user_id:
            raise NotFoundException(detail="Alert not found")

        update_data: dict = {}
        for field in ("type", "severity", "message", "is_read", "resolved_at"):
            if field in data and data[field] is not None:
                update_data[field] = data[field]

        updated = self.alert_repo.update(id, update_data)
        if not updated:
            raise NotFoundException(detail="Alert not found")
        return updated

    def delete_alert(self, id: str, user_id: str) -> bool:
        """
        Delete an alert, enforcing ownership.

        Args:
            id: The alert ID.
            user_id: The requesting user's ID.

        Returns:
            True if the alert was deleted.

        Raises:
            NotFoundException: If the alert does not exist or is not owned.
        """
        alert = self.alert_repo.get_by_id(id)
        if not alert or alert.user_id != user_id:
            raise NotFoundException(detail="Alert not found")

        return self.alert_repo.delete(id)

    # ------------------------------------------------------------------
    # Read-status management
    # ------------------------------------------------------------------
    def mark_read(self, id: str, user_id: str) -> Alert:
        """
        Mark a single alert as read, enforcing ownership.

        Args:
            id: The alert ID.
            user_id: The requesting user's ID.

        Returns:
            The refreshed Alert object with is_read=True.

        Raises:
            NotFoundException: If the alert does not exist or is not owned.
        """
        alert = self.alert_repo.get_by_id(id)
        if not alert or alert.user_id != user_id:
            raise NotFoundException(detail="Alert not found")

        updated = self.alert_repo.mark_read(id)
        if not updated:
            raise NotFoundException(detail="Alert not found")
        return updated

    def mark_all_read(self, user_id: str) -> int:
        """
        Mark all unread alerts for a user as read.

        Args:
            user_id: The requesting user's ID.

        Returns:
            The number of alerts that were marked as read.
        """
        return self.alert_repo.mark_all_read(user_id)
