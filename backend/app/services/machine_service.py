"""
Machine service.

Encapsulates all machine-related business logic: paginated listing with
search/filter, CRUD operations scoped to the owning user, threshold/limit
updates, and aggregate statistics for dashboard widgets. Every method
validates ownership so a user can never access or mutate another tenant's
machines.
"""
import math
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.repositories.machine_repository import MachineRepository
from app.core.exceptions import NotFoundException, ValidationException
from app.models.machine import Machine


class MachineService:
    """
    Service handling machine lifecycle and queries.

    All operations are scoped to the user_id passed in by the caller
    (typically extracted from the JWT), enforcing per-user isolation.
    """

    def __init__(self, db: Session):
        """Initialize the service with a database session and machine repository."""
        self.db = db
        self.machine_repo = MachineRepository(db)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------
    def get_machines(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> dict:
        """
        Return a paginated, optionally filtered list of the user's machines.

        Args:
            user_id: The owner's user ID.
            page: 1-indexed page number (must be >= 1).
            page_size: Number of items per page (must be >= 1).
            search: Optional free-text query matched against name/location.
            status: Optional status filter (e.g. "online", "warning").

        Returns:
            A dict with pagination metadata:
                - items: list[Machine] for the current page.
                - total: Total matching record count.
                - page: Current page number.
                - page_size: Items per page.
                - pages: Total number of pages.
        """
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 20

        skip = (page - 1) * page_size

        rows, total = self.machine_repo.search(
            user_id=user_id,
            query=search,
            status=status,
            skip=skip,
            limit=page_size,
        )

        pages = math.ceil(total / page_size) if total > 0 else 0

        return {
            "items": rows,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": pages,
        }

    def get_machine(self, id: str, user_id: str) -> Machine:
        """
        Fetch a single machine, enforcing ownership.

        Args:
            id: The machine ID.
            user_id: The requesting user's ID.

        Returns:
            The Machine object.

        Raises:
            NotFoundException: If the machine does not exist or does not
                belong to the user.
        """
        machine = self.machine_repo.get_by_id_and_user(id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")
        return machine

    def get_machine_stats(self, user_id: str) -> dict:
        """
        Compute aggregate machine-status statistics for a user's dashboard.

        Args:
            user_id: The owner's user ID.

        Returns:
            A dict with counts:
                - total: Total machines.
                - online: Machines with status "online".
                - warning: Machines with status "warning".
                - critical: Machines with status "critical".
                - offline: Machines with status "offline".
        """
        machines = self.machine_repo.get_by_user(user_id, skip=0, limit=10000)

        stats = {
            "total": len(machines),
            "online": 0,
            "warning": 0,
            "critical": 0,
            "offline": 0,
        }

        for machine in machines:
            status = (machine.status or "offline").lower()
            if status in stats:
                stats[status] += 1
            else:
                # Unknown statuses count as offline for safety
                stats["offline"] += 1

        return stats

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------
    def create_machine(self, user_id: str, data: dict) -> Machine:
        """
        Create a new machine for the given user.

        Args:
            user_id: The owner's user ID.
            data: Field dict with machine attributes (name, location,
                description, status, thresholds, etc.).

        Returns:
            The newly created Machine object.

        Raises:
            ValidationException: If required fields (name) are missing.
        """
        if not data.get("name") or not data["name"].strip():
            raise ValidationException(detail="Machine name is required")

        machine_data: dict = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": data["name"].strip(),
            "location": (data.get("location") or "").strip(),
            "description": (data.get("description") or "").strip(),
            "status": data.get("status") or "online",
            # Vibration (RMS) thresholds
            "rms_min": data.get("rms_min", 0.5),
            "rms_max": data.get("rms_max", 3.0),
            # Temperature thresholds (°C)
            "temp_min": data.get("temp_min", 20.0),
            "temp_max": data.get("temp_max", 85.0),
            # Current thresholds (A)
            "current_min": data.get("current_min", 0.5),
            "current_max": data.get("current_max", 5.0),
        }

        return self.machine_repo.create(machine_data)

    def update_machine(self, id: str, user_id: str, data: dict) -> Machine:
        """
        Update an existing machine's fields, enforcing ownership.

        Only the provided (non-None) fields in `data` are applied.

        Args:
            id: The machine ID.
            user_id: The requesting user's ID.
            data: Field dict of attributes to update.

        Returns:
            The refreshed Machine object.

        Raises:
            NotFoundException: If the machine does not exist or is not owned.
        """
        machine = self.machine_repo.get_by_id_and_user(id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        update_data: dict = {}
        for field in (
            "name",
            "location",
            "description",
            "status",
            "rms_min",
            "rms_max",
            "temp_min",
            "temp_max",
            "current_min",
            "current_max",
        ):
            if field in data and data[field] is not None:
                update_data[field] = data[field]

        updated = self.machine_repo.update(id, update_data)
        if not updated:
            raise NotFoundException(detail="Machine not found")
        return updated

    def delete_machine(self, id: str, user_id: str) -> bool:
        """
        Delete a machine, enforcing ownership.

        Args:
            id: The machine ID.
            user_id: The requesting user's ID.

        Returns:
            True if the machine was deleted.

        Raises:
            NotFoundException: If the machine does not exist or is not owned.
        """
        machine = self.machine_repo.get_by_id_and_user(id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        return self.machine_repo.delete(id)

    def set_limits(self, id: str, user_id: str, limits: dict) -> Machine:
        """
        Update a machine's alert/prediction threshold limits.

        Only the threshold fields present in `limits` are updated:
        rms_min, rms_max, temp_min, temp_max, current_min, current_max.

        Args:
            id: The machine ID.
            user_id: The requesting user's ID.
            limits: Dict of threshold values to apply.

        Returns:
            The refreshed Machine object.

        Raises:
            NotFoundException: If the machine does not exist or is not owned.
            ValidationException: If no valid limit fields are provided.
        """
        machine = self.machine_repo.get_by_id_and_user(id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        update_data: dict = {}
        for field in (
            "rms_min",
            "rms_max",
            "temp_min",
            "temp_max",
            "current_min",
            "current_max",
        ):
            if field in limits and limits[field] is not None:
                update_data[field] = limits[field]

        if not update_data:
            raise ValidationException(detail="No valid limit fields provided")

        updated = self.machine_repo.update(id, update_data)
        if not updated:
            raise NotFoundException(detail="Machine not found")
        return updated
