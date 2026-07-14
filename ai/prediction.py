"""
VELTRIX SCADA — AI Prediction Engine

Computes bearing wear, overheat risk, failure risk, remaining useful life (RUL),
confidence, trend, and health score from sensor readings. Maintains prediction
history for trend analysis.
"""
import math
import time
from typing import Optional
from dataclasses import dataclass, field
import logging

logger = logging.getLogger("veltrix.ai.prediction")


@dataclass
class PredictionResult:
    bearing_wear: float
    overheat_risk: float
    failure_risk: float
    rul_hours: float
    confidence: float
    trend: str
    health_score: float
    timestamp: float


@dataclass
class PredictionHistoryEntry:
    timestamp: float
    health_score: float
    failure_risk: float
    rul_hours: float
    bearing_wear: float


class PredictionEngine:
    """Engine for computing predictive maintenance metrics from sensor data."""

    MAX_HISTORY = 120

    def __init__(self, rms_max: float = 3.0, temp_max: float = 85.0, current_max: float = 5.0):
        self.rms_max = rms_max
        self.temp_max = temp_max
        self.current_max = current_max
        self._history: list[PredictionHistoryEntry] = []
        self._prev_failure_risk: float = 0.0

    def update_limits(self, rms_max: float = None, temp_max: float = None, current_max: float = None):
        if rms_max is not None:
            self.rms_max = rms_max
        if temp_max is not None:
            self.temp_max = temp_max
        if current_max is not None:
            self.current_max = current_max

    def predict(self, readings: list) -> Optional[PredictionResult]:
        if len(readings) < 5:
            return None

        recent = readings[-20:]
        avg_vib = sum(r.get("vibration", 0) for r in recent) / len(recent)
        avg_temp = sum(r.get("temperature", 0) for r in recent) / len(recent)
        avg_curr = sum(r.get("current", 0) for r in recent) / len(recent)

        vib_ratio = min(avg_vib / self.rms_max, 1.5) if self.rms_max > 0 else 0
        temp_ratio = min(avg_temp / self.temp_max, 1.5) if self.temp_max > 0 else 0
        curr_ratio = min(avg_curr / self.current_max, 1.5) if self.current_max > 0 else 0

        bearing_wear = min(100, vib_ratio * 60 + 5)
        overheat_risk = min(100, temp_ratio * 70 + 3)
        failure_risk = min(100, (vib_ratio * 0.4 + temp_ratio * 0.35 + curr_ratio * 0.25) * 100)

        rul_hours = max(1, round(8760 - failure_risk * 70))
        confidence = max(70, min(99, 85 + 10 * (1 - abs(failure_risk - 50) / 50)))

        if self._prev_failure_risk > 0:
            if failure_risk > self._prev_failure_risk + 2:
                trend = "degrading"
            elif failure_risk < self._prev_failure_risk - 2:
                trend = "improving"
            else:
                trend = "stable"
        else:
            trend = "degrading" if failure_risk > 50 else ("improving" if failure_risk < 20 else "stable")
        self._prev_failure_risk = failure_risk

        health_score = max(0, min(100, 100 - failure_risk))

        self._history.append(PredictionHistoryEntry(
            timestamp=time.time(), health_score=health_score,
            failure_risk=failure_risk, rul_hours=rul_hours, bearing_wear=bearing_wear,
        ))
        if len(self._history) > self.MAX_HISTORY:
            self._history = self._history[-self.MAX_HISTORY:]

        return PredictionResult(
            bearing_wear=bearing_wear, overheat_risk=overheat_risk,
            failure_risk=failure_risk, rul_hours=rul_hours,
            confidence=confidence, trend=trend, health_score=health_score,
            timestamp=time.time(),
        )

    @property
    def history(self) -> list[PredictionHistoryEntry]:
        return self._history

    def get_health_trend(self) -> list[tuple[float, float]]:
        return [(e.timestamp, e.health_score) for e in self._history]

    def get_rul_trend(self) -> list[tuple[float, float]]:
        return [(e.timestamp, e.rul_hours) for e in self._history]
