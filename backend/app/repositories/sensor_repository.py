"""
Sensor repository.

Handles sensor-scoped queries: listing by user, listing by machine,
assigning an unassigned sensor to a machine, and filtered search. Search
returns a (rows, total) tuple for pagination metadata.
"""
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.sensor import Sensor
from app.repositories.base import BaseRepository


class SensorRepository(BaseRepository[Sensor]):
    """Repository for the `sensors` table."""

    def __init__(self, db: Session):
        super().__init__(Sensor, db)

    def get_by_user(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Sensor]:
        """Return all sensors belonging to a user, paginated."""
        return (
            self.db.query(Sensor)
            .filter(Sensor.user_id == user_id)
            .order_by(Sensor.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_machine(self, machine_id: str) -> list[Sensor]:
        """Return every sensor currently assigned to a machine."""
        return (
            self.db.query(Sensor)
            .filter(Sensor.machine_id == machine_id)
            .order_by(Sensor.created_at.desc())
            .all()
        )

    def assign_to_machine(
        self,
        sensor_id: str,
        machine_id: str,
    ) -> Optional[Sensor]:
        """
        Assign (or re-assign) a sensor to a machine. Returns the updated
        sensor or None if the sensor does not exist.
        """
        sensor = (
            self.db.query(Sensor)
            .filter(Sensor.id == sensor_id)
            .first()
        )
        if not sensor:
            return None
        sensor.machine_id = machine_id
        self.db.commit()
        self.db.refresh(sensor)
        return sensor

    def search(
        self,
        user_id: str,
        query: Optional[str] = None,
        sensor_type: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[Sensor], int]:
        """
        Search a user's sensors by free-text query (name or description),
        sensor type, and status. Returns (rows, total).
        """
        stmt = self.db.query(Sensor).filter(Sensor.user_id == user_id)

        if query:
            pattern = f"%{query}%"
            stmt = stmt.filter(
                or_(
                    Sensor.name.ilike(pattern),
                    Sensor.description.ilike(pattern),
                )
            )

        if sensor_type:
            stmt = stmt.filter(Sensor.type == sensor_type)

        if status:
            stmt = stmt.filter(Sensor.status == status)

        total = stmt.count()

        rows = (
            stmt.order_by(Sensor.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return rows, total
