"""
Monitoring service.

Handles real-time and historical sensor-data ingestion and retrieval. The
service validates machine ownership before returning or recording readings,
supports both single-record and bulk ingestion paths, and computes
dashboard KPIs by aggregating across machines, sensors, alerts, and
predictions.
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.repositories.sensor_data_repository import SensorDataRepository
from app.repositories.machine_repository import MachineRepository
from app.repositories.sensor_repository import SensorRepository
from app.repositories.alert_repository import AlertRepository
from app.repositories.prediction_repository import PredictionRepository
from app.core.exceptions import NotFoundException, ValidationException
from app.models.sensor_data import SensorData


class MonitoringService:
    """
    Service handling sensor data monitoring and KPI computation.

    Combines SensorDataRepository (time-series reads/writes) with
    MachineRepository (ownership checks) and additional repositories for
    KPI aggregation.
    """

    def __init__(self, db: Session):
        """
        Initialize the service with a database session and all required
        repositories for data access and KPI computation.
        """
        self.db = db
        self.sensor_data_repo = SensorDataRepository(db)
        self.machine_repo = MachineRepository(db)
        self.sensor_repo = SensorRepository(db)
        self.alert_repo = AlertRepository(db)
        self.prediction_repo = PredictionRepository(db)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------
    def get_live_data(self, machine_id: str, user_id: str, limit: int = 50) -> list[SensorData]:
        """
        Return the most recent sensor readings for a machine.

        Args:
            machine_id: The machine ID.
            user_id: The requesting user's ID.
            limit: Maximum number of readings to return (default 50).

        Returns:
            A list of SensorData objects, newest first.

        Raises:
            NotFoundException: If the machine does not exist or is not owned.
        """
        machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        if limit < 1:
            limit = 50

        return self.sensor_data_repo.get_by_machine(machine_id, limit=limit)

    def get_latest_reading(self, machine_id: str, user_id: str) -> Optional[SensorData]:
        """
        Return the single most recent reading for a machine, or None.

        Args:
            machine_id: The machine ID.
            user_id: The requesting user's ID.

        Returns:
            The latest SensorData object, or None if no readings exist.

        Raises:
            NotFoundException: If the machine does not exist or is not owned.
        """
        machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        return self.sensor_data_repo.get_latest_by_machine(machine_id)

    def get_history(
        self,
        machine_id: str,
        user_id: str,
        start_time: datetime,
        end_time: datetime,
    ) -> list[SensorData]:
        """
        Return all readings for a machine within a time range.

        Results are ordered chronologically (oldest first) for charting.

        Args:
            machine_id: The machine ID.
            user_id: The requesting user's ID.
            start_time: Inclusive start of the time range.
            end_time: Inclusive end of the time range.

        Returns:
            A list of SensorData objects within [start_time, end_time].

        Raises:
            NotFoundException: If the machine does not exist or is not owned.
            ValidationException: If the time range is invalid.
        """
        machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        if start_time and end_time and start_time > end_time:
            raise ValidationException(detail="start_time must be before or equal to end_time")

        return self.sensor_data_repo.get_range(machine_id, start_time, end_time)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------
    def record_reading(self, user_id: str, data: dict) -> SensorData:
        """
        Record a single sensor reading.

        Args:
            user_id: The requesting user's ID.
            data: Field dict containing at least machine_id and sensor_id,
                plus value, unit, quality, and recorded_at.

        Returns:
            The newly created SensorData object.

        Raises:
            ValidationException: If required fields are missing.
            NotFoundException: If the machine or sensor is not found or not owned.
        """
        machine_id = data.get("machine_id")
        sensor_id = data.get("sensor_id")

        if not machine_id:
            raise ValidationException(detail="machine_id is required")
        if not sensor_id:
            raise ValidationException(detail="sensor_id is required")

        # Verify machine ownership
        machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        # Verify sensor ownership
        sensor = self.sensor_repo.get_by_id(sensor_id)
        if not sensor or sensor.user_id != user_id:
            raise NotFoundException(detail="Sensor not found")

        reading_data: dict = {
            "id": str(uuid.uuid4()),
            "sensor_id": sensor_id,
            "machine_id": machine_id,
            "user_id": user_id,
            "value": data.get("value", 0),
            "unit": data.get("unit", "g"),
            "quality": data.get("quality", "good"),
        }

        # Use provided recorded_at or let the database default to now()
        if data.get("recorded_at"):
            reading_data["recorded_at"] = data["recorded_at"]

        return self.sensor_data_repo.create(reading_data)

    def bulk_record(self, user_id: str, records: list[dict]) -> int:
        """
        Insert many sensor readings in a single transaction.

        Each record dict should contain at least machine_id and sensor_id.
        Ownership of the first machine is validated as a guard against
        cross-tenant ingestion; individual records are enriched with a
        generated UUID and the user_id.

        Args:
            user_id: The requesting user's ID.
            records: List of field dicts, one per reading.

        Returns:
            The number of rows inserted.
        """
        if not records:
            return 0

        enriched: list[dict] = []
        for record in records:
            machine_id = record.get("machine_id")
            sensor_id = record.get("sensor_id")

            if not machine_id or not sensor_id:
                continue

            # Verify machine ownership for each record
            machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
            if not machine:
                continue

            entry: dict = {
                "id": str(uuid.uuid4()),
                "sensor_id": sensor_id,
                "machine_id": machine_id,
                "user_id": user_id,
                "value": record.get("value", 0),
                "unit": record.get("unit", "g"),
                "quality": record.get("quality", "good"),
            }
            if record.get("recorded_at"):
                entry["recorded_at"] = record["recorded_at"]

            enriched.append(entry)

        if not enriched:
            return 0

        return self.sensor_data_repo.bulk_create(enriched)

    # ------------------------------------------------------------------
    # KPIs
    # ------------------------------------------------------------------
    def get_kpis(self, user_id: str) -> dict:
        """
        Compute dashboard KPIs for a user.

        Aggregates counts and metrics across machines, sensors, alerts,
        and predictions to provide a single-call dashboard summary.

        Args:
            user_id: The owner's user ID.

        Returns:
            A dict with:
                - total_machines: Count of the user's machines.
                - active_sensors: Count of sensors with status "active".
                - total_alerts: Count of all alerts for the user.
                - unread_alerts: Count of unread alerts.
                - avg_health_score: Mean health_score from the latest
                  prediction per machine (0 if no predictions exist).
                - critical_machines: Count of machines with status "critical".
        """
        # --- Machine counts ---
        machines = self.machine_repo.get_by_user(user_id, skip=0, limit=10000)
        total_machines = len(machines)
        critical_machines = sum(
            1 for m in machines if (m.status or "").lower() == "critical"
        )

        # --- Active sensors ---
        sensors = self.sensor_repo.get_by_user(user_id, skip=0, limit=10000)
        active_sensors = sum(
            1 for s in sensors if (s.status or "").lower() == "active"
        )

        # --- Alert counts ---
        all_alerts = self.alert_repo.get_by_user(user_id, limit=100000)
        total_alerts = len(all_alerts)
        unread_alerts = self.alert_repo.count_unread(user_id)

        # --- Average health score ---
        # Gather the latest prediction for each machine, then average.
        health_scores: list[float] = []
        for machine in machines:
            prediction = self.prediction_repo.get_latest_by_machine(machine.id)
            if prediction and prediction.health_score is not None:
                health_scores.append(prediction.health_score)

        avg_health_score = (
            sum(health_scores) / len(health_scores) if health_scores else 0.0
        )

        return {
            "total_machines": total_machines,
            "active_sensors": active_sensors,
            "total_alerts": total_alerts,
            "unread_alerts": unread_alerts,
            "avg_health_score": round(avg_health_score, 2),
            "critical_machines": critical_machines,
        }
