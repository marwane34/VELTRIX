"""
Schemas package.
Re-exports all Pydantic models for convenient import across the API, service,
and repository layers.
"""
from app.schemas.user import UserProfile, UserProfileCreate, UserProfileUpdate, UserProfileResponse
from app.schemas.machine import Machine, MachineCreate, MachineUpdate, MachineResponse, MachineListResponse
from app.schemas.sensor import Sensor, SensorCreate, SensorUpdate, SensorResponse, SensorListResponse
from app.schemas.sensor_data import SensorData, SensorDataCreate, SensorDataResponse, SensorDataListResponse
from app.schemas.prediction import Prediction, PredictionCreate, PredictionResponse, PredictionListResponse
from app.schemas.alert import Alert, AlertCreate, AlertUpdate, AlertResponse, AlertListResponse
from app.schemas.maintenance_log import MaintenanceLog, MaintenanceLogCreate, MaintenanceLogUpdate, MaintenanceLogResponse, MaintenanceLogListResponse
from app.schemas.setting import Setting, SettingCreate, SettingUpdate, SettingResponse, SettingListResponse
from app.schemas.auth import Token, TokenData, LoginRequest, RegisterRequest
from app.schemas.common import PaginationParams, PaginatedResponse

__all__ = [
    # User
    "UserProfile",
    "UserProfileCreate",
    "UserProfileUpdate",
    "UserProfileResponse",
    # Machine
    "Machine",
    "MachineCreate",
    "MachineUpdate",
    "MachineResponse",
    "MachineListResponse",
    # Sensor
    "Sensor",
    "SensorCreate",
    "SensorUpdate",
    "SensorResponse",
    "SensorListResponse",
    # SensorData
    "SensorData",
    "SensorDataCreate",
    "SensorDataResponse",
    "SensorDataListResponse",
    # Prediction
    "Prediction",
    "PredictionCreate",
    "PredictionResponse",
    "PredictionListResponse",
    # Alert
    "Alert",
    "AlertCreate",
    "AlertUpdate",
    "AlertResponse",
    "AlertListResponse",
    # MaintenanceLog
    "MaintenanceLog",
    "MaintenanceLogCreate",
    "MaintenanceLogUpdate",
    "MaintenanceLogResponse",
    "MaintenanceLogListResponse",
    # Setting
    "Setting",
    "SettingCreate",
    "SettingUpdate",
    "SettingResponse",
    "SettingListResponse",
    # Auth
    "Token",
    "TokenData",
    "LoginRequest",
    "RegisterRequest",
    # Common
    "PaginationParams",
    "PaginatedResponse",
]
