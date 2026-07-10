"""
Prediction schemas.
Pydantic models for creating and returning ML-based machine health
predictions that mirror the `predictions` table, including Remaining Useful
Life (RUL) and per-failure-mode risk percentages.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PredictionBase(BaseModel):
    """Shared fields for a machine health prediction."""

    machine_id: str
    user_id: str
    health_score: float = 100
    status: str = "healthy"
    bearing_wear_pct: float = 0
    overheating_risk_pct: float = 0
    failure_risk_pct: float = 0
    rul_hours: int = 9999


class PredictionCreate(BaseModel):
    """Payload for creating a prediction. `user_id` is set server-side from the token."""

    machine_id: str
    health_score: float = 100
    status: str = "healthy"
    bearing_wear_pct: float = 0
    overheating_risk_pct: float = 0
    failure_risk_pct: float = 0
    rul_hours: int = 9999


class PredictionResponse(BaseModel):
    """Prediction record returned to clients, populated from ORM objects."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    machine_id: str
    user_id: str
    health_score: float = 100
    status: str = "healthy"
    bearing_wear_pct: float = 0
    overheating_risk_pct: float = 0
    failure_risk_pct: float = 0
    rul_hours: int = 9999
    predicted_at: datetime


class Prediction(PredictionResponse):
    """Alias of PredictionResponse for internal/service-layer use."""


class PredictionListResponse(BaseModel):
    """Paginated list of prediction responses."""

    items: list[PredictionResponse]
    total: int
