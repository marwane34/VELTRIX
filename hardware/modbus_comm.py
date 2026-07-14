import struct
import socket
from typing import Optional, Callable
import logging

logger = logging.getLogger(__name__)

class ModbusTCPCommunication:
    def __init__(self, ip: str = "192.168.1.50", port: int = 502, unit_id: int = 1, register: int = 40001, function_code: int = 3):
        self.ip = ip
        self.port = port
        self.unit_id = unit_id
        self.register = register
        self.function_code = function_code
        self.sock: Optional[socket.socket] = None

    def connect(self) -> bool:
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.settimeout(5)
            self.sock.connect((self.ip, self.port))
            logger.info(f"Modbus TCP connected to {self.ip}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"Modbus connection failed: {e}")
            return False

    def disconnect(self):
        if self.sock:
            self.sock.close()
        logger.info("Modbus disconnected")

    def read_register(self, address: int = None, count: int = 1) -> list:
        if not self.sock:
            return []
        addr = address or self.register
        transaction_id = 1
        protocol_id = 0
        length = 6
        unit_id = self.unit_id
        fc = self.function_code

        packet = struct.pack('>HHHBBHH', transaction_id, protocol_id, length, unit_id, fc, addr - 1, count)
        try:
            self.sock.send(packet)
            response = self.sock.recv(1024)
            if len(response) >= 9:
                byte_count = response[8]
                values = []
                for i in range(byte_count // 2):
                    val = struct.unpack('>H', response[9 + i*2:11 + i*2])[0]
                    values.append(val)
                return values
        except Exception as e:
            logger.error(f"Modbus read error: {e}")
        return []
