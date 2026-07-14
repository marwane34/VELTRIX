"""
VELTRIX SCADA — Data Simulator

Generates realistic sensor readings for testing and development without
requiring physical hardware. Produces vibration, temperature, current,
RPM, and frequency data with configurable thresholds.
"""
import random
import time
from typing import Callable
import threading
import logging

logger = logging.getLogger("veltrix.ai.simulator")


class DataSimulator:
    """Simulates ESP32 sensor data for development and testing."""

    def __init__(self, rms_max: float = 3.0, temp_max: float = 85.0, current_max: float = 5.0):
        self.rms_max = rms_max
        self.temp_max = temp_max
        self.current_max = current_max
        self._running = False
        self._thread: threading.Thread | None = None
        self._callback: Callable | None = None
        self._phase = 0.0

    def generate_reading(self) -> dict:
        self._phase += 0.1
        now = time.time()
        return {
            "timestamp": now,
            "vibration": 0.8 + random.random() * 1.2 + (random.random() - 0.5) * 0.4 + 0.1 * sin(self._phase),
            "temperature": 40 + random.random() * 20 + (random.random() - 0.5) * 5 + 0.5 * sin(self._phase * 0.3),
            "current": 2 + random.random() * 2 + (random.random() - 0.5) * 0.8,
            "rpm": 1750 + random.random() * 100 + (random.random() - 0.5) * 50,
            "frequency": 50 + random.random() * 2 + (random.random() - 0.5) * 0.5,
        }

    def generate_frequency_data(self) -> list:
        return [
            0.6 + random.random() * 0.3 if i in (5, 6) else
            0.3 + random.random() * 0.2 if i in (12, 13) else
            random.random() * 0.15
            for i in range(32)
        ]

    def start(self, callback: Callable, interval: float = 2.0):
        self._callback = callback
        self._running = True
        self._thread = threading.Thread(target=self._loop, args=(interval,), daemon=True)
        self._thread.start()
        logger.info("Data simulator started with interval %.1fs", interval)

    def _loop(self, interval: float):
        while self._running:
            if self._callback:
                self._callback(self.generate_reading())
            time.sleep(interval)

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=2)
        logger.info("Data simulator stopped")


def sin(x: float) -> float:
    import math
    return math.sin(x)
