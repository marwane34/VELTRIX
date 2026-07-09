"""
AI Anomaly Detection Engine
----------------------------
Rules-based + statistical anomaly detection for predictive maintenance.
Detects: bearing wear, overheating, abnormal vibration, current spikes, RPM anomalies.
Outputs: health score (0-100), status, risk percentages, RUL estimate.
"""

import math
from dataclasses import dataclass, field
from typing import List, Dict, Tuple


@dataclass
class SensorReading:
    temperature: float = 0.0
    rms_x: float = 0.0
    rms_y: float = 0.0
    current: float = 0.0
    rpm: float = 0.0
    voltage: float = 220.0


@dataclass
class MachineThresholds:
    rms_min: float = 0.5
    rms_max: float = 3.0
    temp_min: float = 20.0
    temp_max: float = 85.0
    current_min: float = 0.5
    current_max: float = 5.0
    rpm_min: float = 1200.0
    rpm_max: float = 1800.0


@dataclass
class AIResult:
    health_score: float = 100.0
    status: str = "healthy"       # healthy | warning | critical
    bearing_wear: float = 0.0     # 0-100%
    overheat_risk: float = 0.0    # 0-100%
    failure_risk: float = 0.0     # 0-100%
    rul_hours: int = 9999
    anomalies: List[str] = field(default_factory=list)
    recommendation: str = ""
    alert_type: str = ""          # bearing_wear | overheating | abnormal_vibration | current_spike
    alert_severity: str = ""      # warning | critical


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def analyze(reading: SensorReading, thresholds: MachineThresholds) -> AIResult:
    t  = reading.temperature
    rx = reading.rms_x
    ry = reading.rms_y
    i  = reading.current
    n  = reading.rpm

    combined_rms = math.sqrt((rx * rx + ry * ry) / 2.0)

    # ── Normalised excess factors (0 = at threshold, 1 = fully exceeded) ──────
    temp_excess  = _clamp((t - thresholds.temp_max)    / max(thresholds.temp_max * 0.15, 1), 0, 1)
    rms_excess   = _clamp((combined_rms - thresholds.rms_max) / max(thresholds.rms_max * 0.3, 0.1), 0, 1)
    curr_excess  = _clamp((i - thresholds.current_max) / max(thresholds.current_max * 0.2, 0.1), 0, 1)
    rpm_excess   = 0.0
    if n > 0:
        if n > thresholds.rpm_max:
            rpm_excess = _clamp((n - thresholds.rpm_max) / (thresholds.rpm_max * 0.1), 0, 1)
        elif n < thresholds.rpm_min:
            rpm_excess = _clamp((thresholds.rpm_min - n) / (thresholds.rpm_min * 0.1), 0, 1)

    # Axis imbalance (bearing indicator)
    max_rms = max(rx, ry, 0.001)
    axis_imbalance = _clamp(abs(rx - ry) / max_rms, 0, 1)

    # ── Component risks ───────────────────────────────────────────────────────
    bearing_wear  = _clamp(rms_excess * 0.55 + axis_imbalance * 0.3 + curr_excess * 0.15, 0, 1)
    overheat_risk = _clamp(temp_excess * 0.70 + curr_excess * 0.30, 0, 1)
    failure_risk  = _clamp(bearing_wear * 0.45 + overheat_risk * 0.35 + rms_excess * 0.20, 0, 1)

    # ── Health score ──────────────────────────────────────────────────────────
    raw_health = 100.0 - (failure_risk * 45 + rms_excess * 25 + temp_excess * 20 + curr_excess * 10)
    health_score = _clamp(round(raw_health, 1), 0, 100)

    # ── Status ────────────────────────────────────────────────────────────────
    if health_score >= 70:
        status = "healthy"
    elif health_score >= 40:
        status = "warning"
    else:
        status = "critical"

    # ── RUL estimate ──────────────────────────────────────────────────────────
    if status == "healthy":
        rul_hours = int(2000 - failure_risk * 1000)
    elif status == "warning":
        rul_hours = int(500 - failure_risk * 400)
    else:
        rul_hours = max(5, int(50 - failure_risk * 40))

    # ── Anomaly descriptions ──────────────────────────────────────────────────
    anomalies: List[str] = []
    alert_type = ""
    alert_severity = ""

    if bearing_wear > 0.35:
        anomalies.append(f"Bearing Wear Detected (2x RPM peak elevated, RMS={combined_rms:.2f}g)")
        alert_type = alert_type or "bearing_wear"

    if overheat_risk > 0.30:
        anomalies.append(f"Temperature Elevated ({t:.1f}°C — limit {thresholds.temp_max}°C)")
        alert_type = alert_type or "overheating"

    if curr_excess > 0.20:
        anomalies.append(f"Current Spike ({i:.2f}A — limit {thresholds.current_max}A)")
        alert_type = alert_type or "current_spike"

    if rms_excess > 0.25:
        anomalies.append(f"Abnormal Vibration RMS ({combined_rms:.3f}g — limit {thresholds.rms_max}g)")
        alert_type = alert_type or "abnormal_vibration"

    if axis_imbalance > 0.45:
        anomalies.append(f"Axis Imbalance (X={rx:.2f}g vs Y={ry:.2f}g)")

    if rpm_excess > 0.2:
        anomalies.append(f"RPM Out of Range ({int(n)} RPM — range {int(thresholds.rpm_min)}-{int(thresholds.rpm_max)})")
        alert_type = alert_type or "rpm_anomaly"

    if alert_type:
        alert_severity = "critical" if status == "critical" else "warning"

    # ── Recommendation ────────────────────────────────────────────────────────
    if status == "healthy":
        recommendation = "System operating normally. Continue scheduled monitoring."
    elif status == "warning":
        first = anomalies[0].split(" (")[0] if anomalies else "Elevated readings"
        recommendation = f"{first} — schedule inspection within 2 weeks. RUL: {rul_hours}h."
    else:
        recommendation = "IMMEDIATE ATTENTION REQUIRED. Risk of imminent failure. Take offline for inspection."

    return AIResult(
        health_score=health_score,
        status=status,
        bearing_wear=round(bearing_wear * 100, 1),
        overheat_risk=round(overheat_risk * 100, 1),
        failure_risk=round(failure_risk * 100, 1),
        rul_hours=rul_hours,
        anomalies=anomalies,
        recommendation=recommendation,
        alert_type=alert_type,
        alert_severity=alert_severity,
    )
