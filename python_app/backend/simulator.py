"""
Real-time sensor data simulator.
Generates realistic vibration, temperature, current, and RPM values.
Supports normal and anomaly (high load) modes.
"""

import math
import random
import time
import threading
from typing import Callable, Optional, List
from dataclasses import dataclass


@dataclass
class SimulatedReading:
    machine_id: str
    temperature: float
    rms_x: float
    rms_y: float
    vibration_rms: float
    current: float
    rpm: int
    voltage: float
    timestamp: float


def _noise(scale: float) -> float:
    return (random.random() - 0.5) * 2 * scale


def simulate_reading(machine_id: str, tick: int, anomaly_level: float = 0.3) -> SimulatedReading:
    """Generate one simulated sensor reading."""
    al = max(0.0, min(1.0, anomaly_level))
    t = tick * 0.1

    # Temperature: slow drift + occasional spike
    temp_base = 40.0 + al * 42.0
    temperature = temp_base + math.sin(t * 0.05) * 1.5 + _noise(0.3)

    # Vibration RMS (X, Y axes)
    rms_x_base = 0.8 + al * 1.6
    rms_y_base = 2.1 + al * 0.9
    rms_x = max(0.01, rms_x_base + math.sin(t * 0.3 + 1.2) * 0.15 + _noise(0.08))
    rms_y = max(0.01, rms_y_base + math.sin(t * 0.45 + 0.8) * 0.12 + _noise(0.06))
    vibration_rms = math.sqrt((rms_x**2 + rms_y**2) / 2)

    # Current: ramps up with load + ripple
    current_base = 1.0 + al * 3.8
    current = max(0.0, current_base + math.sin(t * 0.18) * 0.3 + _noise(0.1))

    # RPM: near-nominal with slight oscillation
    rpm_base = 1450 + al * 120
    rpm = max(0, int(rpm_base + math.sin(t * 0.25) * 15 + _noise(8)))

    # Voltage: relatively stable
    voltage = 220.0 + _noise(2.5)

    return SimulatedReading(
        machine_id=machine_id,
        temperature=round(temperature, 2),
        rms_x=round(rms_x, 4),
        rms_y=round(rms_y, 4),
        vibration_rms=round(vibration_rms, 4),
        current=round(current, 3),
        rpm=rpm,
        voltage=round(voltage, 1),
        timestamp=time.time(),
    )


# ── Waveform generators (for live chart display) ──────────────────────────────

def generate_vibration_waveform(tick: int, anomaly_level: float = 0.3) -> List[tuple]:
    """Returns list of (t, x, y) for the time-domain vibration chart."""
    points = []
    al = anomaly_level
    for i in range(200):
        t = (i / 200) * 6.0
        to = t + tick * 0.03
        x = (math.sin(2 * math.pi * to * 1.2) * (1.8 + al * 1.4)
             + math.sin(2 * math.pi * to * 2.4) * (0.5 + al * 0.9)
             + math.sin(2 * math.pi * to * 0.6) * 0.9
             + _noise(0.3 + al * 0.5))
        y = (math.sin(2 * math.pi * to * 1.8 + 1.2) * (1.4 + al * 0.8)
             + math.sin(2 * math.pi * to * 3.0 + 0.8) * 0.4
             + _noise(0.25 + al * 0.4))
        points.append((t, x, y))
    return points


def generate_frequency_bars(anomaly_level: float = 0.3) -> List[tuple]:
    """Returns list of (freq, amplitude, is_fault) for the frequency spectrum chart."""
    al = anomaly_level
    freqs = [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6,
             2.8, 3.0, 3.2, 3.4, 3.6, 3.8, 4.0, 4.2, 4.6, 4.8, 5.0, 5.2, 5.4]
    bars = []
    for f in freqs:
        amp = random.random() * 0.1 + 0.02
        fault = False
        if 0.9 <= f <= 1.1:
            amp = 0.42 + _noise(0.04)
        elif 1.9 <= f <= 2.2:
            amp = 0.60 + al * 0.28 + _noise(0.05)
            fault = True
        elif 4.6 <= f <= 5.4:
            amp = 0.50 + al * 0.35 + _noise(0.06)
            fault = True
        elif 3.0 <= f <= 3.4:
            amp = 0.16 + al * 0.22 + _noise(0.04)
            fault = al > 0.4
        bars.append((f, min(amp, 0.99), fault))
    return bars


def generate_current_trend(tick: int, target_current: float, n_points: int = 80) -> List[tuple]:
    """Returns list of (index, value) for current trend chart."""
    points = []
    for i in range(n_points):
        t = i / n_points
        base = (target_current - 1.5) * t + 1.0
        noise = _noise(0.15) + math.sin(t * 12 + tick * 0.1) * 0.08
        points.append((i, max(0.0, base + noise)))
    return points


def generate_temp_trend(tick: int, target_temp: float, n_points: int = 20) -> List[tuple]:
    """Returns list of (index, value) for temperature trend chart."""
    points = []
    for i in range(n_points):
        t = i / n_points
        base = (target_temp - 3) + t * 3
        noise = math.sin(t * 8 + tick * 0.05) * 0.3 + _noise(0.15)
        points.append((i, base + noise))
    return points


# ── Background simulation thread ──────────────────────────────────────────────

class Simulator:
    def __init__(self, on_reading: Callable[[SimulatedReading], None]):
        self.on_reading = on_reading
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self.anomaly_level = 0.3
        self.machine_id = ""
        self._tick = 0
        self.interval = 0.2  # seconds

    def start(self, machine_id: str):
        self.machine_id = machine_id
        self._running = True
        self._tick = 0
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    def set_anomaly_level(self, level: float):
        self.anomaly_level = max(0.0, min(1.0, level))

    def _loop(self):
        while self._running:
            reading = simulate_reading(self.machine_id, self._tick, self.anomaly_level)
            self.on_reading(reading)
            self._tick += 1
            time.sleep(self.interval)
