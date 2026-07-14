"""
VELTRIX SCADA — Anomaly Detection Engine

Detects anomalies in sensor readings by comparing values against
configurable thresholds. Supports vibration, temperature, and current
anomaly detection with severity classification.
"""
from typing import Optional
from dataclasses import dataclass
import time
import logging

logger = logging.getLogger("veltrix.ai.anomaly")


@dataclass
class Anomaly:
    id: str
    type: str
    severity: str
    message: str
    value: float
    threshold: float
    timestamp: float


class AnomalyDetector:
    """Threshold-based anomaly detector for sensor readings."""

    def __init__(self, rms_max: float = 3.0, temp_max: float = 85.0, current_max: float = 5.0):
        self.rms_max = rms_max
        self.temp_max = temp_max
        self.current_max = current_max

    def update_limits(self, rms_max: float = None, temp_max: float = None, current_max: float = None):
        if rms_max is not None:
            self.rms_max = rms_max
        if temp_max is not None:
            self.temp_max = temp_max
        if current_max is not None:
            self.current_max = current_max

    def check(self, reading: dict) -> list[Anomaly]:
        anomalies = []
        now = time.time()

        vib = reading.get("vibration", 0)
        temp = reading.get("temperature", 0)
        curr = reading.get("current", 0)

        if vib > self.rms_max * 0.8:
            sev = "critical" if vib > self.rms_max else "warning"
            anomalies.append(Anomaly(
                f"anom-vib-{now}", "vibration", sev,
                "Vibration exceeding threshold",
                vib, self.rms_max, now,
            ))

        if temp > self.temp_max * 0.8:
            sev = "critical" if temp > self.temp_max else "warning"
            anomalies.append(Anomaly(
                f"anom-temp-{now}", "temperature", sev,
                "Temperature approaching limit",
                temp, self.temp_max, now,
            ))

        if curr > self.current_max * 0.85:
            sev = "critical" if curr > self.current_max else "warning"
            anomalies.append(Anomaly(
                f"anom-curr-{now}", "current", sev,
                "Current draw high",
                curr, self.current_max, now,
            ))

        if anomalies:
            logger.warning("Detected %d anomalies", len(anomalies))

        return anomalies
