"""
Predictions router.

Exposes ML health-prediction storage, retrieval (per-machine and
cross-machine), and the deterministic AI analysis endpoint. All endpoints
require a valid JWT; data access is scoped to the authenticated user.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user_id
from app.schemas.prediction import (
    PredictionCreate,
    PredictionResponse,
)
from app.services import PredictionService

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.get("/")
def get_all_predictions(
    limit: int = Query(50, ge=1, le=1000, description="Maximum number of predictions to return"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return the most recent predictions across all of the user's machines
    (newest first).
    """
    service = PredictionService(db)
    predictions = service.get_all_predictions(user_id, limit=limit)
    return [PredictionResponse.model_validate(p) for p in predictions]


@router.get("/{machine_id}")
def get_predictions(
    machine_id: str,
    limit: int = Query(20, ge=1, le=1000, description="Maximum number of predictions to return"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return the most recent predictions for a specific machine (newest
    first), enforcing machine ownership.
    """
    service = PredictionService(db)
    predictions = service.get_predictions(machine_id, user_id, limit=limit)
    return [PredictionResponse.model_validate(p) for p in predictions]


@router.get("/{machine_id}/latest")
def get_latest_prediction(
    machine_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return the single most recent prediction for a machine, or ``null``
    if none exist.
    """
    service = PredictionService(db)
    prediction = service.get_latest_prediction(machine_id, user_id)
    if prediction is None:
        return None
    return PredictionResponse.model_validate(prediction)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_prediction(
    payload: PredictionCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Create and persist a new prediction record. The ``user_id`` is set
    server-side from the JWT.
    """
    service = PredictionService(db)
    prediction = service.create_prediction(user_id, payload.model_dump())
    return PredictionResponse.model_validate(prediction)


@router.post("/analyze")
def run_ai_analysis(
    body: dict,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Run the deterministic AI health-analysis algorithm.

    Request body:
        ``{"reading": {...}, "machine": {...}}``

    The ``reading`` dict should contain keys: ``temperature``, ``rmsX``,
    ``rmsY``, ``current`` (and optionally ``rpm``).

    The ``machine`` dict should contain threshold keys: ``temp_max``,
    ``rms_max``, ``current_max`` (and optionally ``temp_min``, ``rms_min``,
    ``current_min``).

    Returns:
        ``{health_score, status, bearing_wear_pct, overheating_risk_pct,
        failure_risk_pct, rul_hours, anomalies, recommendation}``
    """
    reading = body.get("reading")
    machine = body.get("machine")
    if reading is None or machine is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Both 'reading' and 'machine' fields are required",
        )
    service = PredictionService(db)
    return service.run_ai_analysis(reading, machine)
