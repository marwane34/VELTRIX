"""
Serial (COM port) handler for ESP32 sensor nodes.
Reads newline-delimited JSON from the serial port in a background thread.
Emits parsed sensor data via Qt signals.
"""

import json
import threading
import time
import logging
from typing import Optional, Callable, List

logger = logging.getLogger(__name__)


def list_serial_ports() -> List[str]:
    """Return available COM port names."""
    try:
        import serial.tools.list_ports
        return [p.device for p in serial.tools.list_ports.comports()]
    except ImportError:
        return []


class SerialHandler:
    """
    Background thread that reads JSON lines from a serial port.

    JSON format expected from ESP32:
    {
        "machine_id": "M1",
        "temperature": 78.5,
        "vibration": 2.3,
        "vibration_x": 1.8,
        "vibration_y": 2.1,
        "current": 3.2,
        "rpm": 1450,
        "voltage": 220
    }
    """

    def __init__(self, on_data: Callable[[dict], None], on_error: Callable[[str], None]):
        self.on_data = on_data
        self.on_error = on_error
        self._serial = None
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self.port = ""
        self.baud = 115200

    def connect(self, port: str, baud: int = 115200) -> bool:
        try:
            import serial
            self.port = port
            self.baud = baud
            self._serial = serial.Serial(port, baud, timeout=2)
            self._running = True
            self._thread = threading.Thread(target=self._read_loop, daemon=True)
            self._thread.start()
            logger.info(f"Serial connected: {port} @ {baud}")
            return True
        except Exception as e:
            self.on_error(f"Serial connection failed: {e}")
            return False

    def disconnect(self):
        self._running = False
        if self._serial and self._serial.is_open:
            try:
                self._serial.close()
            except Exception:
                pass

    def is_connected(self) -> bool:
        return self._serial is not None and self._serial.is_open and self._running

    def _read_loop(self):
        while self._running:
            try:
                if not self._serial or not self._serial.is_open:
                    break
                line = self._serial.readline()
                if not line:
                    continue
                text = line.decode("utf-8", errors="replace").strip()
                if text.startswith("{"):
                    data = json.loads(text)
                    self.on_data(data)
            except json.JSONDecodeError:
                pass
            except Exception as e:
                if self._running:
                    self.on_error(f"Serial read error: {e}")
                    time.sleep(1)
