import math
import time
from typing import Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

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

class PredictionEngine:
    def __init__(self, rms_max: float = 3.0, temp_max: float = 85.0, current_max: float = 5.0):
        self.rms_max = rms_max
        self.temp_max = temp_max
        self.current_max = current_max
        self._history: list = []

    def update_limits(self, rms_max: float = None, temp_max: float = None, current_max: float = None):
        if rms_max: self.rms_max = rms_max
        if temp_max: self.temp_max = temp_max
        if current_max: self.current_max = current_max

    def predict(self, readings: list) -> Optional[PredictionResult]:
        if len(readings) < 5:
            return None
        recent = readings[-20:]
        avg_vib = sum(r.get("vibration", 0) for r in recent) / len(recent)
        avg_temp = sum(r.get("temperature", 0) for r in recent) / len(recent)
        avg_curr = sum(r.get("current", 0) for r in recent) / len(recent)

        vib_ratio = avg_vib / self.rms_max if self.rms_max > 0 else 0
        temp_ratio = avg_temp / self.temp_max if self.temp_max > 0 else 0
        curr_ratio = avg_curr / self.current_max if self.current_max > 0 else 0

        bearing_wear = min(100, vib_ratio * 60 + 5)
        overheat_risk = min(100, temp_ratio * 70 + 3)
        failure_risk = min(100, (vib_ratio * 0.4 + temp_ratio * 0.35 + curr_ratio * 0.25) * 100)
        rul_hours = max(1, round(8760 - failure_risk * 70))
        confidence = 85 + 10 * (1 - abs(failure_risk - 50) / 50)
        trend = "degrading" if failure_risk > 50 else ("improving" if failure_risk < 20 else "stable")
        health_score = max(0, min(100, 100 - failure_risk))

        self._history.append(health_score)
        if len(self._history) > 60:
            self._history = self._history[-60:]

        return PredictionResult(
            bearing_wear=bearing_wear, overheat_risk=overheat_risk,
            failure_risk=failure_risk, rul_hours=rul_hours,
            confidence=confidence, trend=trend, health_score=health_score,
            timestamp=time.time()
        )

    @property
    def health_history(self) -> list:
        return self._history
