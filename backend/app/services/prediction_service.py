"""
Prediction service.

Handles ML health-prediction storage and retrieval, and hosts the
deterministic AI analysis algorithm ported from the frontend useAI.ts
hook. The analysis computes bearing-wear, overheating risk, failure risk,
a composite health score, remaining-useful-life (RUL), anomaly flags,
and a human-readable recommendation from raw sensor readings and machine
thresholds.
"""
import math
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.repositories.prediction_repository import PredictionRepository
from app.repositories.machine_repository import MachineRepository
from app.core.exceptions import NotFoundException, ValidationException
from app.models.prediction import Prediction


def _clamp(value: float, min_val: float, max_val: float) -> float:
    """Clamp a value to the [min_val, max_val] range."""
    return min(max_val, max(min_val, value))


class PredictionService:
    """
    Service handling prediction lifecycle and AI analysis.

    The `run_ai_analysis` method is a pure function that mirrors the
    frontend's runAIAnalysis logic so backend and frontend produce
    identical results from the same inputs.
    """

    def __init__(self, db: Session):
        """Initialize the service with prediction and machine repositories."""
        self.db = db
        self.prediction_repo = PredictionRepository(db)
        self.machine_repo = MachineRepository(db)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------
    def get_predictions(
        self,
        machine_id: str,
        user_id: str,
        limit: int = 20,
    ) -> list[Prediction]:
        """
        Return the most recent predictions for a machine.

        Args:
            machine_id: The machine ID.
            user_id: The requesting user's ID.
            limit: Maximum number of predictions to return (default 20).

        Returns:
            A list of Prediction objects, newest first.

        Raises:
            NotFoundException: If the machine does not exist or is not owned.
        """
        machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        if limit < 1:
            limit = 20

        return self.prediction_repo.get_by_machine(machine_id, limit=limit)

    def get_latest_prediction(
        self,
        machine_id: str,
        user_id: str,
    ) -> Optional[Prediction]:
        """
        Return the single most recent prediction for a machine, or None.

        Args:
            machine_id: The machine ID.
            user_id: The requesting user's ID.

        Returns:
            The latest Prediction object, or None if none exist.

        Raises:
            NotFoundException: If the machine does not exist or is not owned.
        """
        machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        return self.prediction_repo.get_latest_by_machine(machine_id)

    def get_all_predictions(self, user_id: str, limit: int = 50) -> list[Prediction]:
        """
        Return the most recent predictions across all of a user's machines.

        Args:
            user_id: The requesting user's ID.
            limit: Maximum number of predictions to return (default 50).

        Returns:
            A list of Prediction objects, newest first.
        """
        if limit < 1:
            limit = 50

        return self.prediction_repo.get_by_user(user_id, limit=limit)

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------
    def create_prediction(self, user_id: str, data: dict) -> Prediction:
        """
        Create and persist a new prediction record.

        Args:
            user_id: The requesting user's ID.
            data: Field dict containing machine_id and the prediction
                attributes (health_score, status, bearing_wear_pct,
                overheating_risk_pct, failure_risk_pct, rul_hours).

        Returns:
            The newly created Prediction object.

        Raises:
            ValidationException: If required fields are missing.
            NotFoundException: If the machine does not exist or is not owned.
        """
        machine_id = data.get("machine_id")
        if not machine_id:
            raise ValidationException(detail="machine_id is required")

        # Verify machine ownership
        machine = self.machine_repo.get_by_id_and_user(machine_id, user_id)
        if not machine:
            raise NotFoundException(detail="Machine not found")

        prediction_data: dict = {
            "id": str(uuid.uuid4()),
            "machine_id": machine_id,
            "user_id": user_id,
            "health_score": data.get("health_score", 100),
            "status": data.get("status", "healthy"),
            "bearing_wear_pct": data.get("bearing_wear_pct", 0),
            "overheating_risk_pct": data.get("overheating_risk_pct", 0),
            "failure_risk_pct": data.get("failure_risk_pct", 0),
            "rul_hours": data.get("rul_hours", 9999),
        }

        return self.prediction_repo.create(prediction_data)

    # ------------------------------------------------------------------
    # AI Analysis (ported from frontend useAI.ts)
    # ------------------------------------------------------------------
    def run_ai_analysis(self, reading: dict, machine: dict) -> dict:
        """
        Run the deterministic AI health-analysis algorithm.

        This is a direct port of the frontend `runAIAnalysis` function from
        `src/hooks/useAI.ts`. Given a sensor reading and a machine's
        threshold configuration, it computes:

            - combinedRms: root-mean-square of the X and Y vibration axes.
            - Normalized excess values for temperature, RMS, and current
              beyond the machine's configured max thresholds.
            - Component-level risks: bearing wear, overheating risk, and
              a combined failure risk.
            - A composite health score (0-100, higher is healthier).
            - A status label: healthy (>=70), warning (>=40), critical (<40).
            - Remaining Useful Life (RUL) in operating hours.
            - A list of anomaly description strings.
            - A human-readable recommendation string.

        Args:
            reading: A dict with keys: temperature, rmsX, rmsY, current, rpm.
            machine: A dict with threshold keys: temp_max, rms_max,
                current_max (and optionally temp_min, rms_min, current_min).

        Returns:
            A dict with keys:
                - health_score (int)
                - status (str: "healthy" | "warning" | "critical")
                - bearing_wear_pct (int)
                - overheating_risk_pct (int)
                - failure_risk_pct (int)
                - rul_hours (int)
                - anomalies (list[str])
                - recommendation (str)
        """
        # --- Extract reading values (with safe defaults) ---
        temperature = float(reading.get("temperature", 0))
        rms_x = float(reading.get("rmsX", 0))
        rms_y = float(reading.get("rmsY", 0))
        current = float(reading.get("current", 0))

        # --- Extract machine thresholds (with safe defaults) ---
        temp_max = float(machine.get("temp_max", 85.0))
        rms_max = float(machine.get("rms_max", 3.0))
        current_max = float(machine.get("current_max", 5.0))

        # --- Combined RMS across both axes ---
        combined_rms = math.sqrt((rms_x * rms_x + rms_y * rms_y) / 2)

        # --- Normalized excess beyond thresholds (0 = at threshold, 1 = fully exceeded) ---
        # Guard against division by zero with max(..., 0.01)
        temp_excess = _clamp(
            (temperature - temp_max) / (temp_max * 0.15),
            0,
            1,
        )
        rms_excess = _clamp(
            (combined_rms - rms_max) / (rms_max * 0.3),
            0,
            1,
        )
        curr_excess = _clamp(
            (current - current_max) / (current_max * 0.2),
            0,
            1,
        )

        # --- Component-level risks ---
        # Bearing wear: driven by RMS anomaly + axis imbalance (rmsX/rmsY ratio)
        axis_imbalance = abs(rms_x - rms_y) / max(rms_x, rms_y, 0.01)
        bearing_wear = _clamp(
            rms_excess * 0.6 + axis_imbalance * 0.3 + curr_excess * 0.1,
            0,
            1,
        )

        # Overheating risk: temperature excess + current excess (high load)
        overheat_risk = _clamp(
            temp_excess * 0.7 + curr_excess * 0.3,
            0,
            1,
        )

        # Failure risk: combined weighted
        failure_risk = _clamp(
            bearing_wear * 0.45 + overheat_risk * 0.35 + rms_excess * 0.2,
            0,
            1,
        )

        # --- Health score: inverse of failure risk, tempered by individual factors ---
        raw_health = 100 - (
            failure_risk * 45
            + rms_excess * 25
            + temp_excess * 20
            + curr_excess * 10
        )
        health_score = int(_clamp(round(raw_health), 0, 100))

        # --- Status classification ---
        if health_score >= 70:
            status = "healthy"
        elif health_score >= 40:
            status = "warning"
        else:
            status = "critical"

        # --- Remaining useful life (hours) — simplified linear model ---
        if status == "healthy":
            rul_hours = round(2000 - failure_risk * 1000)
        elif status == "warning":
            rul_hours = round(500 - failure_risk * 400)
        else:
            rul_hours = round(50 - failure_risk * 40)

        # --- Anomaly descriptions ---
        anomalies: list[str] = []
        if bearing_wear > 0.35:
            anomalies.append("Bearing Wear Detected (2x RPM peak elevated)")
        if overheat_risk > 0.3:
            anomalies.append(f"Temperature Elevated ({temperature:.1f}°C)")
        if curr_excess > 0.2:
            anomalies.append(f"Current Spike ({current:.1f} A)")
        if rms_excess > 0.25:
            anomalies.append(f"Abnormal Vibration RMS ({combined_rms:.2f} g)")
        if axis_imbalance > 0.4:
            anomalies.append("Axis Imbalance Detected")

        # --- Recommendation ---
        recommendation = "System operating normally. Continue scheduled monitoring."
        if status == "warning":
            if anomalies:
                # Mirror the frontend: take the first anomaly's first word
                first_anomaly_word = anomalies[0].split(" ")[0]
                recommendation = (
                    f"Inspect {first_anomaly_word} — schedule maintenance within 2 weeks."
                )
            else:
                recommendation = "Monitor closely. Elevated readings detected."
        elif status == "critical":
            recommendation = (
                "IMMEDIATE ATTENTION REQUIRED. Risk of imminent failure. "
                "Take offline for inspection."
            )

        return {
            "health_score": health_score,
            "status": status,
            "bearing_wear_pct": round(bearing_wear * 100),
            "overheating_risk_pct": round(overheat_risk * 100),
            "failure_risk_pct": round(failure_risk * 100),
            "rul_hours": rul_hours,
            "anomalies": anomalies,
            "recommendation": recommendation,
        }
