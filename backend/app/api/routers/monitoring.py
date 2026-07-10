"""
Monitoring router.

Exposes real-time and historical sensor-data endpoints, single and bulk
ingestion paths, and dashboard KPI computation. All endpoints require a
valid JWT; data access is scoped to the authenticated user.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user_id
from app.schemas.sensor_data import (
    SensorDataCreate,
    SensorDataResponse,
)
from app.services import MonitoringService

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


@router.get("/{machine_id}/live")
def get_live_data(
    machine_id: str,
    limit: int = Query(50, ge=1, le=1000, description="Maximum number of readings to return"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return the most recent sensor readings for a machine (newest first).
    """
    service = MonitoringService(db)
    readings = service.get_live_data(machine_id, user_id, limit=limit)
    return [SensorDataResponse.model_validate(r) for r in readings]


@router.get("/{machine_id}/latest")
def get_latest_reading(
    machine_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return the single most recent reading for a machine, or ``null`` if
    no readings exist.
    """
    service = MonitoringService(db)
    reading = service.get_latest_reading(machine_id, user_id)
    if reading is None:
        return None
    return SensorDataResponse.model_validate(reading)


@router.get("/{machine_id}/history")
def get_history(
    machine_id: str,
    start: datetime = Query(..., description="Inclusive start of the time range (ISO 8601)"),
    end: datetime = Query(..., description="Inclusive end of the time range (ISO 8601)"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return all readings for a machine within ``[start, end]``, ordered
    chronologically (oldest first) for charting.
    """
    service = MonitoringService(db)
    readings = service.get_history(machine_id, user_id, start, end)
    return [SensorDataResponse.model_validate(r) for r in readings]


@router.post("/record", status_code=status.HTTP_201_CREATED)
def record_reading(
    payload: SensorDataCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Record a single sensor reading. The ``user_id`` is set server-side
    from the JWT; the client provides ``sensor_id``, ``machine_id``,
    ``value``, ``unit``, and ``quality``.
    """
    service = MonitoringService(db)
    reading = service.record_reading(user_id, payload.model_dump())
    return SensorDataResponse.model_validate(reading)


@router.post("/bulk-record")
def bulk_record(
    payload: list[SensorDataCreate],
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Insert many sensor readings in a single transaction.

    Request body is a JSON array of ``SensorDataCreate`` objects. Returns
    ``{"count": <number of rows inserted>}``.
    """
    service = MonitoringService(db)
    records = [item.model_dump() for item in payload]
    count = service.bulk_record(user_id, records)
    return {"count": count}


@router.get("/kpis")
def get_kpis(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Compute and return dashboard KPIs for the authenticated user.

    Returns:
        ``{total_machines, active_sensors, total_alerts, unread_alerts,
        avg_health_score, critical_machines}``
    """
    service = MonitoringService(db)
    return service.get_kpis(user_id)
