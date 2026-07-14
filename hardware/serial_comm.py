from typing import Optional, Callable
import threading
import logging

logger = logging.getLogger(__name__)

try:
    import serial
    import serial.tools.list_ports
    _SERIAL_AVAILABLE = True
except ImportError:
    _SERIAL_AVAILABLE = False
    serial = None

class SerialCommunication:
    def __init__(self, port: str = None, baud_rate: int = 115200, data_bits: int = 8, parity: str = "none", stop_bits: int = 1):
        self.port = port
        self.baud_rate = baud_rate
        self.data_bits = data_bits
        self.parity = parity
        self.stop_bits = stop_bits
        self.serial_conn: Optional[serial.Serial] = None
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._callback: Optional[Callable] = None

    @staticmethod
    def list_ports() -> list:
        return [{"port": p.device, "description": p.description, "hwid": p.hwid} for p in serial.tools.list_ports.comports()]

    def connect(self) -> bool:
        try:
            self.serial_conn = serial.Serial(
                port=self.port, baudrate=self.baud_rate,
                bytesize=self.data_bits, parity=self.parity[:1].upper() if self.parity != "none" else serial.PARITY_NONE,
                stopbits=self.stop_bits, timeout=1
            )
            logger.info(f"Connected to {self.port} at {self.baud_rate} baud")
            return True
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False

    def disconnect(self):
        self._running = False
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()
        logger.info("Disconnected")

    def start_reading(self, callback: Callable):
        self._callback = callback
        self._running = True
        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start()

    def _read_loop(self):
        while self._running and self.serial_conn and self.serial_conn.is_open:
            try:
                if self.serial_conn.in_waiting > 0:
                    line = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
                    if line and self._callback:
                        self._callback(line)
            except Exception as e:
                logger.error(f"Read error: {e}")
                break

    def send(self, data: str) -> bool:
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.write(data.encode('utf-8'))
            return True
        return False
