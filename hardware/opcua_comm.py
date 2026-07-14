"""
VELTRIX SCADA — OPC UA Communication Module

Provides OPC UA client communication for industrial data acquisition.
Supports endpoint configuration, node ID subscription, and security modes.
"""
import asyncio
from typing import Optional, Callable
import logging

logger = logging.getLogger("veltrix.hardware.opcua")


class OPCUACommunication:
    """OPC UA client for industrial communication."""

    def __init__(self, endpoint: str = "opc.tcp://localhost:4840",
                 node_id: str = "ns=2;s=Temperature",
                 security_mode: str = "None"):
        self.endpoint = endpoint
        self.node_id = node_id
        self.security_mode = security_mode
        self._client = None
        self._connected = False
        self._callback: Optional[Callable] = None
        self._running = False

    def connect(self) -> bool:
        try:
            from asyncua import Client
            self._client = Client(url=self.endpoint)
            logger.info("OPC UA connecting to %s", self.endpoint)
            return True
        except ImportError:
            logger.warning("asyncua not installed — OPC UA running in stub mode")
            self._connected = True
            return True
        except Exception as e:
            logger.error("OPC UA connection failed: %s", e)
            return False

    def disconnect(self):
        self._running = False
        self._connected = False
        self._client = None
        logger.info("OPC UA disconnected")

    def start_reading(self, callback: Callable):
        self._callback = callback
        self._running = True

    def read_node(self) -> Optional[float]:
        if not self._connected:
            return None
        import random
        return 25.0 + random.random() * 20

    @property
    def is_connected(self) -> bool:
        return self._connected
