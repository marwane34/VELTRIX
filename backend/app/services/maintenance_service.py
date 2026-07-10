"""
Maintenance service.

Handles maintenance-log lifecycle: listing by machine or user, CRUD
operations, upcoming-maintenance queries, and scheduled-maintenance
creation. All operations validate ownership via user_id so maintenance
logs are always scoped to their owner.
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.repositories.maintenance_log_repository import MaintenanceLogRepository
from app.repositories.machine_repository import MachineRepository
from app.core.exceptions import NotFoundException, ValidationException
from app.models.maintenance_log import MaintenanceLog


class MaintenanceService:
    """
    Service handling maintenance-log operations.

    MaintenanceLog ownership is determined by the `user_id` column on each
    log row. When creating or listing by machine, the service additionally
    verifies that the machine belongs to the same user.
    """

    def __init__(self, db: Session):
        """Initialize the service with maintenance-log and machine repositories."""
        self.db = db
        self.maintenance_repo = MaintenanceLogRepository(db)
        self.machine_repo = MachineRepository(db)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------
    def get_logs(self, machine_id: str, user_id: str, limit: int = 50) -> list[MaintenanceLog]:
        """
        Return maintenance logs for a specific machine.

        Args:
            machine_id: The machine ID.
            user_id: The requesting user's ID.
            limit: Maximum number of logs to return (default 50).

        Returns:
            A list of MaintenanceLog objects, newest first.

        Raises:
            NotFoundException: If the machine does not exist or is not owned.
        """
        machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        if limit < 1:
            limit = 50

        return self.maintenance_repo.get_by_machine(machine_id, limit=limit)

    def get_all_logs(self, user_id: str, limit: int = 100) -> list[MaintenanceLog]:
        """
        Return maintenance logs across all of a user's machines.

        Args:
            user_id: The requesting user's ID.
            limit: Maximum number of logs to return (default 100).

        Returns:
            A list of MaintenanceLog objects, newest first.
        """
        if limit < 1:
            limit = 100

        return self.maintenance_repo.get_by_user(user_id, limit=limit)

    def get_upcoming(self, user_id: str, limit: int = 10) -> list[MaintenanceLog]:
        """
        Return scheduled maintenance with upcoming next-maintenance dates.

        Returns logs where next_maintenance_at is in the future, ordered by
        soonest first.

        Args:
            user_id: The requesting user's ID.
            limit: Maximum number of logs to return (default 10).

        Returns:
            A list of MaintenanceLog objects with upcoming schedules.
        """
        if limit < 1:
            limit = 10

        return self.maintenance_repo.get_upcoming(user_id, limit=limit)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------
    def create_log(self, user_id: str, data: dict) -> MaintenanceLog:
        """
        Create a new maintenance log entry.

        Args:
            user_id: The requesting user's ID.
            data: Field dict containing machine_id, action, and optionally
                notes, performed_by, performed_at, next_maintenance_at,
                scheduled_by.

        Returns:
            The newly created MaintenanceLog object.

        Raises:
            ValidationException: If required fields (machine_id, action) are missing.
            NotFoundException: If the machine does not exist or is not owned.
        """
        machine_id = data.get("machine_id")
        if not machine_id:
            raise ValidationException(detail="machine_id is required")
        if not data.get("action"):
            raise ValidationException(detail="action is required")

        # Verify machine ownership
        machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        log_data: dict = {
            "id": str(uuid.uuid4()),
            "machine_id": machine_id,
            "user_id": user_id,
            "action": data["action"],
            "notes": data.get("notes", ""),
            "performed_by": data.get("performed_by", "System"),
            "scheduled_by": data.get("scheduled_by", "System"),
            "next_maintenance_at": data.get("next_maintenance_at"),
        }

        # Use provided performed_at or let the database default to now()
        if data.get("performed_at"):
            log_data["performed_at"] = data["performed_at"]

        return self.maintenance_repo.create(log_data)

    def update_log(self, id: str, user_id: str, data: dict) -> MaintenanceLog:
        """
        Update an existing maintenance log's fields, enforcing ownership.

        Only the provided (non-None) fields in `data` are applied.

        Args:
            id: The maintenance log ID.
            user_id: The requesting user's ID.
            data: Field dict of attributes to update (action, notes,
                performed_by, performed_at, next_maintenance_at, scheduled_by).

        Returns:
            The refreshed MaintenanceLog object.

        Raises:
            NotFoundException: If the log does not exist or is not owned.
        """
        log = self.maintenance_repo.get_by_id(id)
        if not log or log.user_id != user_id:
            raise NotFoundException(detail="Maintenance log not found")

        update_data: dict = {}
        for field in (
            "action",
            "notes",
            "performed_by",
            "performed_at",
            "next_maintenance_at",
            "scheduled_by",
        ):
            if field in data and data[field] is not None:
                update_data[field] = data[field]

        updated = self.maintenance_repo.update(id, update_data)
        if not updated:
            raise NotFoundException(detail="Maintenance log not found")
        return updated

    def delete_log(self, id: str, user_id: str) -> bool:
        """
        Delete a maintenance log, enforcing ownership.

        Args:
            id: The maintenance log ID.
            user_id: The requesting user's ID.

        Returns:
            True if the log was deleted.

        Raises:
            NotFoundException: If the log does not exist or is not owned.
        """
        log = self.maintenance_repo.get_by_id(id)
        if not log or log.user_id != user_id:
            raise NotFoundException(detail="Maintenance log not found")

        return self.maintenance_repo.delete(id)

    # ------------------------------------------------------------------
    # Scheduling
    # ------------------------------------------------------------------
    def schedule_maintenance(
        self,
        machine_id: str,
        user_id: str,
        action: str,
        scheduled_date: datetime,
        performed_by: str = "System",
        notes: str = "",
    ) -> MaintenanceLog:
        """
        Schedule a future maintenance action for a machine.

        Creates a maintenance log entry with the performed_at set to now
        (recording when the schedule was created) and next_maintenance_at
        set to the scheduled date.

        Args:
            machine_id: The machine ID.
            user_id: The requesting user's ID.
            action: Description of the maintenance action.
            scheduled_date: When the maintenance should be performed.
            performed_by: Who/what created the schedule (default "System").
            notes: Optional notes about the scheduled maintenance.

        Returns:
            The newly created MaintenanceLog object.

        Raises:
            NotFoundException: If the machine does not exist or is not owned.
            ValidationException: If action or scheduled_date are missing.
        """
        if not action or not action.strip():
            raise ValidationException(detail="action is required")
        if not scheduled_date:
            raise ValidationException(detail="scheduled_date is required")

        # Verify machine ownership
        machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        log_data: dict = {
            "id": str(uuid.uuid4()),
            "machine_id": machine_id,
            "user_id": user_id,
            "action": action.strip(),
            "notes": notes,
            "performed_by": performed_by,
            "performed_at": datetime.utcnow(),
            "next_maintenance_at": scheduled_date,
            "scheduled_by": performed_by,
        }

        return self.maintenance_repo.create(log_data)
