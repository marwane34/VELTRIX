from typing import Optional, Callable
import logging
from .serial_comm import SerialCommunication
from .wifi_comm import WiFiCommunication
from .mqtt_comm import MQTTCommunication
from .modbus_comm import ModbusTCPCommunication

logger = logging.getLogger(__name__)

class ProtocolManager:
    def __init__(self):
        self._active_protocol: Optional[str] = None
        self._handlers = {
            "usb_serial": SerialCommunication,
            "wifi": WiFiCommunication,
            "mqtt": MQTTCommunication,
            "modbus_tcp": ModbusTCPCommunication,
        }
        self._instance = None

    def activate(self, protocol: str, config: dict) -> bool:
        if protocol not in self._handlers:
            logger.error(f"Unknown protocol: {protocol}")
            return False
        if self._instance:
            self.deactivate()
        handler_cls = self._handlers[protocol]
        self._instance = handler_cls(**config)
        if self._instance.connect():
            self._active_protocol = protocol
            logger.info(f"Protocol {protocol} activated")
            return True
        self._instance = None
        return False

    def deactivate(self):
        if self._instance:
            self._instance.disconnect()
            self._instance = None
        self._active_protocol = None
        logger.info("Protocol deactivated")

    def start_reading(self, callback: Callable):
        if self._instance and hasattr(self._instance, 'start_reading'):
            self._instance.start_reading(callback)

    @property
    def active_protocol(self) -> Optional[str]:
        return self._active_protocol

    @property
    def is_connected(self) -> bool:
        return self._instance is not None
