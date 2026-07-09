"""
FastAPI local backend server.
Runs as a background thread, accepting sensor POSTs from ESP32 devices over HTTP.
The GUI subscribes to data via Qt signals; the API is also accessible for testing.
"""

import threading
import logging
import time
from typing import Optional, Callable

logger = logging.getLogger(__name__)

# Shared latest readings keyed by machine_id
_latest_readings: dict = {}
_on_data_callback: Optional[Callable] = None


def set_data_callback(callback: Callable):
    global _on_data_callback
    _on_data_callback = callback


def get_latest(machine_id: str) -> Optional[dict]:
    return _latest_readings.get(machine_id)


def create_app(db_manager=None):
    """Create and return the FastAPI app instance."""
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel

    app = FastAPI(title="PredMaint Local API", version="1.0.0")

    class SensorPayload(BaseModel):
        machine_id: str
        temperature: float = 0.0
        vibration: float = 0.0
        vibration_x: float = 0.0
        vibration_y: float = 0.0
        current: float = 0.0
        rpm: int = 0
        voltage: float = 220.0

    @app.post("/api/sensor-data")
    async def receive_sensor_data(payload: SensorPayload):
        """Endpoint for ESP32 HTTP POST."""
        reading = {
            "machine_id": payload.machine_id,
            "temperature": payload.temperature,
            "vibration_rms": payload.vibration or payload.vibration_x,
            "rms_x": payload.vibration_x or payload.vibration,
            "rms_y": payload.vibration_y or payload.vibration,
            "current": payload.current,
            "rpm": payload.rpm,
            "voltage": payload.voltage,
        }
        _latest_readings[payload.machine_id] = reading
        if _on_data_callback:
            _on_data_callback(reading)
        return {"status": "ok"}

    @app.get("/api/latest/{machine_id}")
    async def get_latest_reading(machine_id: str):
        r = get_latest(machine_id)
        if not r:
            raise HTTPException(status_code=404, detail="No data for this machine")
        return r

    @app.get("/api/machines")
    async def list_machines():
        if db_manager:
            return db_manager.get_machines()
        return []

    @app.get("/api/alerts")
    async def list_alerts():
        if db_manager:
            return db_manager.get_alerts()
        return []

    @app.get("/health")
    async def health():
        return {"status": "running", "timestamp": time.time()}

    return app


class ApiServer:
    """Wraps the FastAPI app in a background uvicorn server."""

    def __init__(self, host: str = "0.0.0.0", port: int = 8765, db_manager=None):
        self.host = host
        self.port = port
        self.db_manager = db_manager
        self._thread: Optional[threading.Thread] = None
        self._server = None

    def start(self, on_data: Optional[Callable] = None):
        if on_data:
            set_data_callback(on_data)
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        logger.info(f"API server starting on http://{self.host}:{self.port}")

    def _run(self):
        try:
            import uvicorn
            app = create_app(self.db_manager)
            config = uvicorn.Config(app, host=self.host, port=self.port,
                                    log_level="warning", loop="asyncio")
            self._server = uvicorn.Server(config)
            self._server.run()
        except Exception as e:
            logger.error(f"API server error: {e}")

    def stop(self):
        if self._server:
            self._server.should_exit = True
