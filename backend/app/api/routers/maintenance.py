"""
Maintenance router.

Exposes maintenance-log listing (per-machine and cross-machine), CRUD,
upcoming-maintenance queries, and scheduled-maintenance creation. All
endpoints require a valid JWT; operations are scoped to the authenticated
user.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user_id
from app.schemas.maintenance_log import (
    MaintenanceLogCreate,
    MaintenanceLogUpdate,
    MaintenanceLogResponse,
)
from app.services import MaintenanceService

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])


@router.get("/")
def get_all_logs(
    limit: int = Query(100, ge=1, le=10000, description="Maximum number of logs to return"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return maintenance logs across all of the user's machines (newest
    first).
    """
    service = MaintenanceService(db)
    logs = service.get_all_logs(user_id, limit=limit)
    return [MaintenanceLogResponse.model_validate(log) for log in logs]


@router.get("/upcoming")
def get_upcoming(
    limit: int = Query(10, ge=1, le=1000, description="Maximum number of upcoming logs to return"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return scheduled maintenance with upcoming ``next_maintenance_at``
    dates, ordered by soonest first.
    """
    service = MaintenanceService(db)
    logs = service.get_upcoming(user_id, limit=limit)
    return [MaintenanceLogResponse.model_validate(log) for log in logs]


@router.get("/{machine_id}")
def get_logs(
    machine_id: str,
    limit: int = Query(50, ge=1, le=10000, description="Maximum number of logs to return"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return maintenance logs for a specific machine (newest first),
    enforcing machine ownership.
    """
    service = MaintenanceService(db)
    logs = service.get_logs(machine_id, user_id, limit=limit)
    return [MaintenanceLogResponse.model_validate(log) for log in logs]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_log(
    payload: MaintenanceLogCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Create a new maintenance log entry. The ``user_id`` is set server-side
    from the JWT.
    """
    service = MaintenanceService(db)
    log = service.create_log(user_id, payload.model_dump())
    return MaintenanceLogResponse.model_validate(log)


@router.put("/{log_id}")
def update_log(
    log_id: str,
    payload: MaintenanceLogUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Update an existing maintenance log's fields. Only provided (non-None)
    fields are applied.
    """
    service = MaintenanceService(db)
    log = service.update_log(log_id, user_id, payload.model_dump(exclude_unset=True))
    return MaintenanceLogResponse.model_validate(log)


@router.delete("/{log_id}")
def delete_log(
    log_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Delete a maintenance log by ID, enforcing ownership.
    """
    service = MaintenanceService(db)
    service.delete_log(log_id, user_id)
    return {"success": True}


@router.post("/schedule", status_code=status.HTTP_201_CREATED)
def schedule_maintenance(
    body: dict,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Schedule a future maintenance action for a machine.

    Request body:
        ``{"machine_id": "...", "action": "...", "scheduled_date": "...",
           "performed_by": "...", "notes": "..."}``

    ``scheduled_date`` should be an ISO 8601 datetime string. The
    ``performed_by`` and ``notes`` fields are optional.

    Returns:
        The newly created ``MaintenanceLogResponse``.
    """
    machine_id = body.get("machine_id")
    action = body.get("action")
    scheduled_date = body.get("scheduled_date")
    performed_by = body.get("performed_by", "System")
    notes = body.get("notes", "")

    if not machine_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="machine_id is required",
        )
    if not action:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="action is required",
        )
    if not scheduled_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="scheduled_date is required",
        )

    # Parse the ISO 8601 datetime string
    if isinstance(scheduled_date, str):
        scheduled_date = datetime.fromisoformat(scheduled_date)

    service = MaintenanceService(db)
    log = service.schedule_maintenance(
        machine_id=machine_id,
        user_id=user_id,
        action=action,
        scheduled_date=scheduled_date,
        performed_by=performed_by,
        notes=notes,
    )
    return MaintenanceLogResponse.model_validate(log)
