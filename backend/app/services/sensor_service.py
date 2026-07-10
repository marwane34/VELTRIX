"""
Sensor service.

Handles sensor lifecycle: paginated listing with search/type/status filters,
CRUD operations, machine assignment, and per-machine sensor lookups. All
operations validate ownership via user_id so sensors are always scoped to
their owner.
"""
import math
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.repositories.sensor_repository import SensorRepository
from app.repositories.machine_repository import MachineRepository
from app.core.exceptions import NotFoundException, ValidationException
from app.models.sensor import Sensor


class SensorService:
    """
    Service handling sensor operations.

    Sensor ownership is determined by the `user_id` column on each sensor
    row. When assigning a sensor to a machine, the service additionally
    verifies that the machine belongs to the same user.
    """

    def __init__(self, db: Session):
        """Initialize the service with database session, sensor and machine repositories."""
        self.db = db
        self.sensor_repo = SensorRepository(db)
        self.machine_repo = MachineRepository(db)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------
    def get_sensors(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        sensor_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> dict:
        """
        Return a paginated, optionally filtered list of the user's sensors.

        Args:
            user_id: The owner's user ID.
            page: 1-indexed page number (must be >= 1).
            page_size: Number of items per page (must be >= 1).
            search: Optional free-text query (name/description).
            sensor_type: Optional sensor type filter (e.g. "vibration").
            status: Optional status filter (e.g. "active").

        Returns:
            A dict with pagination metadata:
                - items: list[Sensor] for the current page.
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

        rows, total = self.sensor_repo.search(
            user_id=user_id,
            query=search,
            sensor_type=sensor_type,
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

    def get_sensor(self, id: str, user_id: str) -> Sensor:
        """
        Fetch a single sensor, enforcing ownership.

        Args:
            id: The sensor ID.
            user_id: The requesting user's ID.

        Returns:
            The Sensor object.

        Raises:
            NotFoundException: If the sensor does not exist or does not
                belong to the user.
        """
        sensor = self.sensor_repo.get_by_id(id)
        if not sensor or sensor.user_id != user_id:
            raise NotFoundException(detail="Sensor not found")
        return sensor

    def get_sensors_by_machine(self, machine_id: str, user_id: str) -> list[Sensor]:
        """
        Return all sensors assigned to a machine, enforcing machine ownership.

        Args:
            machine_id: The machine ID.
            user_id: The requesting user's ID.

        Returns:
            A list of Sensor objects assigned to the machine.

        Raises:
            NotFoundException: If the machine does not exist or is not owned.
        """
        machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        return self.sensor_repo.get_by_machine(machine_id)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------
    def create_sensor(self, user_id: str, data: dict) -> Sensor:
        """
        Create a new sensor for the given user.

        Args:
            user_id: The owner's user ID.
            data: Field dict with sensor attributes (name, type, channel,
                unit, status, sampling_rate, min_value, max_value,
                description, machine_id).

        Returns:
            The newly created Sensor object.

        Raises:
            ValidationException: If required fields (name) are missing.
            NotFoundException: If machine_id is provided but the machine is
                not found or not owned by the user.
        """
        if not data.get("name") or not data["name"].strip():
            raise ValidationException(detail="Sensor name is required")

        # If a machine_id is provided, verify ownership before linking
        machine_id = data.get("machine_id")
        if machine_id:
            machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
            if not machine:
                raise NotFoundException(detail="Machine not found")

        sensor_data: dict = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": data["name"].strip(),
            "type": data.get("type") or "vibration",
            "channel": data.get("channel") or "X",
            "unit": data.get("unit") or "g",
            "status": data.get("status") or "active",
            "sampling_rate": data.get("sampling_rate", 1000),
            "min_value": data.get("min_value", 0),
            "max_value": data.get("max_value", 100),
            "description": (data.get("description") or "").strip(),
            "machine_id": machine_id,
        }

        return self.sensor_repo.create(sensor_data)

    def update_sensor(self, id: str, user_id: str, data: dict) -> Sensor:
        """
        Update an existing sensor's fields, enforcing ownership.

        Only the provided (non-None) fields in `data` are applied.

        Args:
            id: The sensor ID.
            user_id: The requesting user's ID.
            data: Field dict of attributes to update.

        Returns:
            The refreshed Sensor object.

        Raises:
            NotFoundException: If the sensor does not exist or is not owned.
        """
        sensor = self.sensor_repo.get_by_id(id)
        if not sensor or sensor.user_id != user_id:
            raise NotFoundException(detail="Sensor not found")

        update_data: dict = {}
        for field in (
            "name",
            "type",
            "channel",
            "unit",
            "status",
            "sampling_rate",
            "min_value",
            "max_value",
            "description",
            "machine_id",
        ):
            if field in data and data[field] is not None:
                update_data[field] = data[field]

        # If machine_id is being changed, verify the new machine is owned
        if "machine_id" in update_data and update_data["machine_id"]:
            machine = self.machine_repo.get_by_id_and_user(
                update_data["machine_id"], user_id
            )
            if not machine:
                raise NotFoundException(detail="Machine not found")

        updated = self.sensor_repo.update(id, update_data)
        if not updated:
            raise NotFoundException(detail="Sensor not found")
        return updated

    def delete_sensor(self, id: str, user_id: str) -> bool:
        """
        Delete a sensor, enforcing ownership.

        Args:
            id: The sensor ID.
            user_id: The requesting user's ID.

        Returns:
            True if the sensor was deleted.

        Raises:
            NotFoundException: If the sensor does not exist or is not owned.
        """
        sensor = self.sensor_repo.get_by_id(id)
        if not sensor or sensor.user_id != user_id:
            raise NotFoundException(detail="Sensor not found")

        return self.sensor_repo.delete(id)

    def assign_sensor(self, id: str, machine_id: str, user_id: str) -> Sensor:
        """
        Assign a sensor to a machine, enforcing ownership of both.

        Args:
            id: The sensor ID.
            machine_id: The target machine ID.
            user_id: The requesting user's ID.

        Returns:
            The refreshed Sensor object, now linked to the machine.

        Raises:
            NotFoundException: If the sensor or machine does not exist or
                is not owned by the user.
        """
        sensor = self.sensor_repo.get_by_id(id)
        if not sensor or sensor.user_id != user_id:
            raise NotFoundException(detail="Sensor not found")

        machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        updated = self.sensor_repo.assign_to_machine(id, machine_id)
        if not updated:
            raise NotFoundException(detail="Sensor not found")
        return updated
