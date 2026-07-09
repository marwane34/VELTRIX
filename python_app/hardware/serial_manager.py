"""
Serial Manager Module
=====================
Thread-safe serial communication handler for ESP32.
Uses QThread to keep GUI responsive.
"""

import json
import time
import logging
from typing import Optional, List, Callable
from dataclasses import dataclass

from PySide6.QtCore import QObject, Signal, QThread, QTimer

logger = logging.getLogger(__name__)


@dataclass
class SensorPacket:
    """Validated sensor data packet from ESP32."""
    temperature: float
    current: float
    vibration: float
    rpm: int
    timestamp: float
    raw: str


def list_available_ports() -> List[str]:
    """Return list of available COM port names."""
    try:
        import serial.tools.list_ports
        ports = [p.device for p in serial.tools.list_ports.comports()]
        return ports if ports else []
    except ImportError:
        logger.error("pyserial not installed")
        return []
    except Exception as e:
        logger.error(f"Error listing ports: {e}")
        return []


class SerialWorker(QThread):
    """
    Background thread that reads from serial port.
    Emits validated sensor packets via signals.
    """

    packet_received = Signal(object)   # SensorPacket
    error_occurred  = Signal(str)      # error message
    connection_lost = Signal()
    bytes_received  = Signal(int)      # byte count for stats

    def __init__(self, port: str, baud_rate: int = 115200, parent=None):
        super().__init__(parent)
        self.port_name = port
        self.baud_rate = baud_rate
        self._serial = None
        self._running = False
        self._reconnect_enabled = True
        self._reconnect_delay = 2.0  # seconds

    def run(self):
        """Main loop - read lines until stopped."""
        self._running = True

        while self._running:
            try:
                # Attempt connection
                if not self._connect():
                    if not self._running:
                        break
                    time.sleep(self._reconnect_delay)
                    continue

                # Read loop
                while self._running and self._serial and self._serial.is_open:
                    try:
                        line = self._serial.readline()
                        if not line:
                            continue

                        self.bytes_received.emit(len(line))

                        # Decode and validate
                        text = line.decode('utf-8', errors='replace').strip()
                        if not text:
                            continue

                        packet = self._parse_packet(text)
                        if packet:
                            self.packet_received.emit(packet)
                        else:
                            logger.debug(f"Invalid packet ignored: {text[:50]}")

                    except Exception as e:
                        if "timeout" not in str(e).lower():
                            logger.warning(f"Read error: {e}")
                        continue

            except Exception as e:
                logger.error(f"Serial error: {e}")
                self.error_occurred.emit(str(e))
                self._disconnect()

                if self._reconnect_enabled and self._running:
                    self.error_occurred.emit(f"Reconnecting in {self._reconnect_delay}s...")
                    time.sleep(self._reconnect_delay)
                else:
                    break

        self._disconnect()

    def _connect(self) -> bool:
        """Open serial connection. Returns True on success."""
        try:
            import serial

            if self._serial and self._serial.is_open:
                return True

            self._serial = serial.Serial(
                port=self.port_name,
                baudrate=self.baud_rate,
                timeout=1.0,
                write_timeout=1.0,
                exclusive=False
            )

            # Wait for ESP32 to stabilize after connection
            time.sleep(0.5)

            logger.info(f"Connected to {self.port_name} @ {self.baud_rate}")
            return True

        except Exception as e:
            logger.error(f"Connection failed: {e}")
            self.error_occurred.emit(f"Connection failed: {e}")
            return False

    def _disconnect(self):
        """Close serial connection safely."""
        try:
            if self._serial and self._serial.is_open:
                self._serial.close()
                logger.info(f"Disconnected from {self.port_name}")
        except Exception as e:
            logger.warning(f"Disconnect error: {e}")
        finally:
            self._serial = None

    def _parse_packet(self, text: str) -> Optional[SensorPacket]:
        """Parse and validate JSON packet from ESP32."""
        try:
            if not text.startswith('{'):
                return None

            data = json.loads(text)

            # Validate required fields
            temperature = float(data.get('temperature', 0))
            current = float(data.get('current', 0))
            vibration = float(data.get('vibration', 0))
            rpm = int(data.get('rpm', 0))

            # Basic sanity checks
            if temperature < -50 or temperature > 300:
                return None
            if current < 0 or current > 100:
                return None
            if vibration < 0 or vibration > 50:
                return None
            if rpm < 0 or rpm > 20000:
                return None

            return SensorPacket(
                temperature=temperature,
                current=current,
                vibration=vibration,
                rpm=rpm,
                timestamp=time.time(),
                raw=text
            )

        except (json.JSONDecodeError, ValueError, TypeError) as e:
            logger.debug(f"Parse error: {e}")
            return None

    def stop(self):
        """Stop the worker thread."""
        self._running = False
        self._reconnect_enabled = False
        self._disconnect()

    def is_connected(self) -> bool:
        return self._serial is not None and self._serial.is_open


class SerialManager(QObject):
    """
    High-level serial manager with auto-reconnect.
    GUI-safe - all operations are non-blocking.
    """

    # Signals for GUI updates
    connected     = Signal(str)       # port name
    disconnected  = Signal()
    packet_ready  = Signal(object)    # SensorPacket
    error         = Signal(str)
    stats_updated  = Signal(int, int, str)  # packets, bytes, last_raw

    def __init__(self, parent=None):
        super().__init__(parent)

        self._worker: Optional[SerialWorker] = None
        self._port_name = ""
        self._baud_rate = 115200

        # Statistics
        self._packet_count = 0
        self._byte_count = 0
        self._last_packet_str = ""
        self._connect_time: Optional[float] = None

        # Auto-connect timer (checks for cable reconnection)
        self._watchdog = QTimer(self)
        self._watchdog.setInterval(3000)  # 3 seconds
        self._watchdog.timeout.connect(self._check_connection)

    @property
    def is_connected(self) -> bool:
        return self._worker is not None and self._worker.is_connected()

    @property
    def port_name(self) -> str:
        return self._port_name

    @property
    def baud_rate(self) -> int:
        return self._baud_rate

    @property
    def connect_time(self) -> Optional[float]:
        return self._connect_time

    @property
    def packet_count(self) -> int:
        return self._packet_count

    @property
    def last_packet_str(self) -> str:
        return self._last_packet_str

    def get_available_ports(self) -> List[str]:
        """Return list of available COM ports."""
        return list_available_ports()

    def connect(self, port: str, baud_rate: int = 115200) -> bool:
        """
        Connect to serial port.
        Returns True if connection started (actual connection is async).
        """
        if self.is_connected:
            self.disconnect()

        self._port_name = port
        self._baud_rate = baud_rate

        # Create and start worker thread
        self._worker = SerialWorker(port, baud_rate)
        self._worker.packet_received.connect(self._on_packet)
        self._worker.error_occurred.connect(self._on_error)
        self._worker.bytes_received.connect(self._on_bytes)

        # Reset stats
        self._packet_count = 0
        self._byte_count = 0
        self._last_packet_str = ""
        self._connect_time = time.time()

        self._worker.start()
        self._watchdog.start()

        self.connected.emit(port)
        logger.info(f"Connection started to {port}")
        return True

    def disconnect(self):
        """Disconnect from serial port."""
        self._watchdog.stop()

        if self._worker:
            self._worker.stop()
            self._worker.wait(2000)  # Wait up to 2s for thread to finish
            self._worker.deleteLater()
            self._worker = None

        self._connect_time = None
        self.disconnected.emit()
        logger.info("Disconnected")

    def _on_packet(self, packet: SensorPacket):
        """Handle received packet."""
        self._packet_count += 1
        self._last_packet_str = packet.raw

        self.stats_updated.emit(
            self._packet_count,
            self._byte_count,
            packet.raw
        )

        self.packet_ready.emit(packet)

    def _on_error(self, msg: str):
        """Handle error from worker."""
        self.error.emit(msg)

    def _on_bytes(self, count: int):
        """Handle byte count update."""
        self._byte_count += count

    def _check_connection(self):
        """Watchdog - check if connection is still alive."""
        if self._worker and not self._worker.is_connected():
            logger.warning("Connection lost, attempting reconnect...")
            self.error.emit("Connection lost - reconnecting...")
            # Worker will auto-reconnect due to _reconnect_enabled
