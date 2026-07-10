"""
Repositories package.
Exposes all repository classes for dependency injection and direct import.
"""
from app.repositories.base import BaseRepository
from app.repositories.user_repository import UserRepository
from app.repositories.machine_repository import MachineRepository
from app.repositories.sensor_repository import SensorRepository
from app.repositories.sensor_data_repository import SensorDataRepository
from app.repositories.prediction_repository import PredictionRepository
from app.repositories.alert_repository import AlertRepository
from app.repositories.maintenance_log_repository import MaintenanceLogRepository
from app.repositories.setting_repository import SettingRepository

__all__ = [
    "BaseRepository",
    "UserRepository",
    "MachineRepository",
    "SensorRepository",
    "SensorDataRepository",
    "PredictionRepository",
    "AlertRepository",
    "MaintenanceLogRepository",
    "SettingRepository",
]
