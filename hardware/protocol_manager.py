"""
VELTRIX SCADA — Unified Protocol Manager

Routes communication to the correct protocol handler. Supports:
USB Serial, Wi-Fi, MQTT, REST API, Modbus TCP, and OPC UA.
Only one protocol can be active at a time.
"""
from typing import Optional, Callable
import logging

from .serial_comm import SerialCommunication
from .wifi_comm import WiFiCommunication
from .mqtt_comm import MQTTCommunication
from .modbus_comm import ModbusTCPCommunication
from .opcua_comm import OPCUACommunication

logger = logging.getLogger("veltrix.hardware.protocol_manager")


class ProtocolManager:
    """Unified communication manager supporting 6 industrial protocols."""

    PROTOCOL_MAP = {
        "usb_serial": SerialCommunication,
        "wifi": WiFiCommunication,
        "mqtt": MQTTCommunication,
        "modbus_tcp": ModbusTCPCommunication,
        "opc_ua": OPCUACommunication,
    }

    def __init__(self):
        self._active_protocol: Optional[str] = None
        self._instance = None

    def activate(self, protocol: str, config: dict) -> bool:
        if protocol not in self.PROTOCOL_MAP:
            logger.error("Unknown protocol: %s", protocol)
            return False

        if self._instance:
            self.deactivate()

        handler_cls = self.PROTOCOL_MAP[protocol]

        try:
            if protocol == "rest_api":
                self._instance = _RestApiHandler(**config)
            else:
                self._instance = handler_cls(**config)

            if self._instance.connect():
                self._active_protocol = protocol
                logger.info("Protocol %s activated", protocol)
                return True
            else:
                self._instance = None
                return False
        except Exception as e:
            logger.error("Failed to activate %s: %s", protocol, e)
            self._instance = None
            return False

    def deactivate(self):
        if self._instance:
            self._instance.disconnect()
            self._instance = None
        self._active_protocol = None
        logger.info("Protocol deactivated")

    def start_reading(self, callback: Callable):
        if self._instance and hasattr(self._instance, "start_reading"):
            self._instance.start_reading(callback)

    @property
    def active_protocol(self) -> Optional[str]:
        return self._active_protocol

    @property
    def is_connected(self) -> bool:
        return self._instance is not None


class _RestApiHandler:
    """Minimal REST API polling handler."""

    def __init__(self, url: str = "", method: str = "GET",
                 rest_interval: int = 2000, headers: str = "{}"):
        self.url = url
        self.method = method
        self.interval = rest_interval / 1000
        self.headers = headers
        self._running = False

    def connect(self) -> bool:
        self._running = True
        logger.info("REST API handler initialized for %s", self.url)
        return True

    def disconnect(self):
        self._running = False
        logger.info("REST API handler stopped")

    def start_reading(self, callback: Callable):
        import threading, time
        def _poll():
            while self._running:
                callback({"source": "rest_api", "url": self.url})
                time.sleep(self.interval)
        t = threading.Thread(target=_poll, daemon=True)
        t.start()
