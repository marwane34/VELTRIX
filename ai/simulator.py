import random
import time
import math
from typing import Callable
import threading
import logging

logger = logging.getLogger(__name__)

class DataSimulator:
    def __init__(self, rms_max: float = 3.0, temp_max: float = 85.0, current_max: float = 5.0):
        self.rms_max = rms_max
        self.temp_max = temp_max
        self.current_max = current_max
        self._running = False
        self._thread = None
        self._callback: Callable = None

    def generate_reading(self) -> dict:
        now = time.time()
        return {
            "timestamp": now,
            "vibration": 0.8 + random.random() * 1.2 + (random.random() - 0.5) * 0.4,
            "temperature": 40 + random.random() * 20 + (random.random() - 0.5) * 5,
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

    def _loop(self, interval: float):
        while self._running:
            if self._callback:
                self._callback(self.generate_reading())
            time.sleep(interval)

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=2)
