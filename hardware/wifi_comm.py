import socket
from typing import Optional, Callable
import threading
import logging

logger = logging.getLogger(__name__)

class WiFiCommunication:
    def __init__(self, ip: str = "192.168.1.100", port: int = 8080):
        self.ip = ip
        self.port = port
        self.sock: Optional[socket.socket] = None
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._callback: Optional[Callable] = None

    def connect(self) -> bool:
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.settimeout(5)
            self.sock.connect((self.ip, self.port))
            logger.info(f"Connected to {self.ip}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"WiFi connection failed: {e}")
            return False

    def disconnect(self):
        self._running = False
        if self.sock:
            self.sock.close()
        logger.info("Disconnected")

    def start_reading(self, callback: Callable):
        self._callback = callback
        self._running = True
        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start()

    def _read_loop(self):
        while self._running and self.sock:
            try:
                data = self.sock.recv(1024)
                if data and self._callback:
                    self._callback(data.decode('utf-8', errors='ignore'))
            except socket.timeout:
                continue
            except Exception as e:
                logger.error(f"Read error: {e}")
                break

    def send(self, data: str) -> bool:
        if self.sock:
            self.sock.sendall(data.encode('utf-8'))
            return True
        return False
