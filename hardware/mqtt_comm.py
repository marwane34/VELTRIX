import paho.mqtt.client as mqtt
from typing import Optional, Callable
import logging

logger = logging.getLogger(__name__)

class MQTTCommunication:
    def __init__(self, broker: str = "broker.hivemq.com", port: int = 1883, topic: str = "veltrix/sensors/+", client_id: str = "veltrix_client", username: str = None, password: str = None):
        self.broker = broker
        self.port = port
        self.topic = topic
        self.client_id = client_id
        self.username = username
        self.password = password
        self.client: Optional[mqtt.Client] = None
        self._callback: Optional[Callable] = None

    def connect(self) -> bool:
        try:
            self.client = mqtt.Client(client_id=self.client_id)
            if self.username and self.password:
                self.client.username_pw_set(self.username, self.password)
            self.client.on_connect = self._on_connect
            self.client.on_message = self._on_message
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
            logger.info(f"MQTT connected to {self.broker}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"MQTT connection failed: {e}")
            return False

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            client.subscribe(self.topic)
            logger.info(f"Subscribed to {self.topic}")
        else:
            logger.error(f"MQTT connect failed with code {rc}")

    def _on_message(self, client, userdata, msg):
        if self._callback:
            try:
                payload = msg.payload.decode('utf-8')
                self._callback(payload)
            except Exception as e:
                logger.error(f"Message parse error: {e}")

    def start_reading(self, callback: Callable):
        self._callback = callback

    def disconnect(self):
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
        logger.info("MQTT disconnected")

    def publish(self, topic: str, data: str) -> bool:
        if self.client:
            self.client.publish(topic, data)
            return True
        return False
