"""
WiFi handler for ESP32 over HTTP and MQTT.
- HTTP polling: periodically GET /sensors from ESP32 IP
- MQTT subscriber: listen for sensor data on MQTT topic
"""

import json
import threading
import time
import logging
from typing import Optional, Callable

logger = logging.getLogger(__name__)


class HttpPoller:
    """Polls an ESP32 HTTP endpoint every `interval_s` seconds."""

    def __init__(self, on_data: Callable[[dict], None], on_error: Callable[[str], None]):
        self.on_data = on_data
        self.on_error = on_error
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self.url = ""
        self.interval = 5.0

    def start(self, ip: str, port: int = 80, path: str = "/sensors", interval: float = 5.0) -> bool:
        try:
            import requests as req
            self.url = f"http://{ip}:{port}{path}"
            self.interval = interval
            self._running = True
            self._thread = threading.Thread(target=self._poll_loop, daemon=True)
            self._thread.start()
            logger.info(f"HTTP poller started: {self.url}")
            return True
        except ImportError:
            self.on_error("requests library not available")
            return False

    def stop(self):
        self._running = False

    def is_running(self) -> bool:
        return self._running

    def _poll_loop(self):
        import requests as req
        while self._running:
            try:
                resp = req.get(self.url, timeout=3)
                if resp.ok:
                    data = resp.json()
                    self.on_data(data)
                else:
                    self.on_error(f"HTTP {resp.status_code} from ESP32")
            except Exception as e:
                if self._running:
                    self.on_error(f"HTTP poll error: {e}")
            time.sleep(self.interval)


class MqttSubscriber:
    """MQTT subscriber for sensor data topics."""

    def __init__(self, on_data: Callable[[dict], None], on_error: Callable[[str], None]):
        self.on_data = on_data
        self.on_error = on_error
        self._client = None
        self._connected = False

    def connect(self, broker: str, port: int = 1883, topic: str = "factory/machines/+/sensors",
                username: str = "", password: str = "") -> bool:
        try:
            import paho.mqtt.client as mqtt

            self._client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
            if username:
                self._client.username_pw_set(username, password)

            self._client.on_connect = self._on_connect
            self._client.on_message = self._on_message
            self._client.on_disconnect = self._on_disconnect
            self._topic = topic
            self._client.connect_async(broker, port, keepalive=60)
            self._client.loop_start()
            return True
        except Exception as e:
            self.on_error(f"MQTT connect error: {e}")
            return False

    def disconnect(self):
        if self._client:
            self._client.loop_stop()
            self._client.disconnect()

    def is_connected(self) -> bool:
        return self._connected

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            self._connected = True
            client.subscribe(self._topic)
            logger.info(f"MQTT connected, subscribed to {self._topic}")
        else:
            self.on_error(f"MQTT connect failed: {reason_code}")

    def _on_message(self, client, userdata, msg):
        try:
            data = json.loads(msg.payload.decode())
            self.on_data(data)
        except Exception as e:
            logger.warning(f"MQTT parse error: {e}")

    def _on_disconnect(self, client, userdata, disconnect_flags, reason_code, properties):
        self._connected = False
        if reason_code != 0:
            self.on_error(f"MQTT disconnected unexpectedly: {reason_code}")
