"""
SensorData repository.

Handles time-series sensor readings. Read paths support per-sensor,
per-machine, latest-by-machine, and time-range queries. The write path
exposes `bulk_create` for high-throughput ingestion of many readings at
once (e.g. from an edge function or ingestion worker).
"""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.sensor_data import SensorData
from app.repositories.base import BaseRepository


class SensorDataRepository(BaseRepository[SensorData]):
    """Repository for the `sensor_data` table."""

    def __init__(self, db: Session):
        super().__init__(SensorData, db)

    def get_by_sensor(
        self,
        sensor_id: str,
        limit: int = 100,
    ) -> list[SensorData]:
        """Return the most recent `limit` readings for a sensor."""
        return (
            self.db.query(SensorData)
            .filter(SensorData.sensor_id == sensor_id)
            .order_by(SensorData.recorded_at.desc())
            .limit(limit)
            .all()
        )

    def get_by_machine(
        self,
        machine_id: str,
        limit: int = 100,
    ) -> list[SensorData]:
        """Return the most recent `limit` readings across all sensors on a machine."""
        return (
            self.db.query(SensorData)
            .filter(SensorData.machine_id == machine_id)
            .order_by(SensorData.recorded_at.desc())
            .limit(limit)
            .all()
        )

    def get_latest_by_machine(self, machine_id: str) -> Optional[SensorData]:
        """Return the single most recent reading for a machine, or None."""
        return (
            self.db.query(SensorData)
            .filter(SensorData.machine_id == machine_id)
            .order_by(SensorData.recorded_at.desc())
            .first()
        )

    def get_range(
        self,
        machine_id: str,
        start_time: datetime,
        end_time: datetime,
    ) -> list[SensorData]:
        """
        Return all readings for a machine within [start_time, end_time],
        ordered chronologically (oldest first) for charting / analysis.
        """
        return (
            self.db.query(SensorData)
            .filter(
                SensorData.machine_id == machine_id,
                SensorData.recorded_at >= start_time,
                SensorData.recorded_at <= end_time,
            )
            .order_by(SensorData.recorded_at.asc())
            .all()
        )

    def bulk_create(self, records: list[dict]) -> int:
        """
        Insert many sensor readings in a single transaction.

        Each dict in `records` should contain the column values for one
        SensorData row (id, sensor_id, machine_id, user_id, value, unit,
        quality, recorded_at). Returns the number of rows inserted.
        """
        if not records:
            return 0
        objects = [SensorData(**record) for record in records]
        self.db.bulk_save_objects(objects)
        self.db.commit()
        return len(objects)
