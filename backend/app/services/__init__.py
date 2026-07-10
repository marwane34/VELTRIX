"""
Services package.
Exposes all service classes for dependency injection and direct import.
Each service encapsulates business logic and orchestrates repository calls,
ownership validation, and domain-specific computations.
"""
from app.services.auth_service import AuthService
from app.services.machine_service import MachineService
from app.services.sensor_service import SensorService
from app.services.monitoring_service import MonitoringService
from app.services.prediction_service import PredictionService
from app.services.alert_service import AlertService
from app.services.maintenance_service import MaintenanceService
from app.services.setting_service import SettingService

__all__ = [
    "AuthService",
    "MachineService",
    "SensorService",
    "MonitoringService",
    "PredictionService",
    "AlertService",
    "MaintenanceService",
    "SettingService",
]
