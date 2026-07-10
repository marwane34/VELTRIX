"""
Models package.
Importing this package registers all SQLAlchemy models with the declarative Base
so that Alembic autogenerate can discover them.
"""
from app.models.user import UserProfile
from app.models.machine import Machine
from app.models.sensor import Sensor
from app.models.sensor_data import SensorData
from app.models.prediction import Prediction
from app.models.alert import Alert
from app.models.maintenance_log import MaintenanceLog
from app.models.setting import Setting

__all__ = [
    "UserProfile",
    "Machine",
    "Sensor",
    "SensorData",
    "Prediction",
    "Alert",
    "MaintenanceLog",
    "Setting",
]
