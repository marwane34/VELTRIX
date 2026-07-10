"""
Alerts router.

Exposes alert listing with multi-field filtering, CRUD, read-status
management (single and bulk), and unread counts. All endpoints require a
valid JWT; operations are scoped to the authenticated user.

Route ordering matters: static paths (``/unread-count``, ``/read-all``)
are registered before the dynamic ``/{alert_id}`` path so they are not
shadowed by the parameter route.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user_id
from app.schemas.alert import (
    AlertCreate,
    AlertUpdate,
    AlertResponse,
)
from app.services import AlertService

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


# ----------------------------------------------------------------------
# Static-path routes (registered first to avoid shadowing by /{alert_id})
# ----------------------------------------------------------------------
@router.get("/")
def list_alerts(
    severity: str | None = Query(None, description="Filter by severity (info, warning, critical)"),
    is_read: bool | None = Query(None, description="Filter by read status"),
    machine_id: str | None = Query(None, description="Filter by machine ID"),
    limit: int = Query(100, ge=1, le=10000, description="Maximum number of alerts to return"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return alerts for the user with optional multi-field filtering.

    All filter parameters are optional and combined with AND.
    """
    service = AlertService(db)
    alerts = service.get_alerts(
        user_id=user_id,
        severity=severity,
        is_read=is_read,
        machine_id=machine_id,
        limit=limit,
    )
    return [AlertResponse.model_validate(a) for a in alerts]


@router.get("/unread-count")
def get_unread_count(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return the count of unread alerts for the authenticated user.

    Returns:
        ``{"count": <int>}``
    """
    service = AlertService(db)
    count = service.get_unread_count(user_id)
    return {"count": count}


@router.put("/read-all")
def mark_all_read(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Mark all unread alerts for the user as read.

    Returns:
        ``{"count": <number of alerts marked>}``
    """
    service = AlertService(db)
    count = service.mark_all_read(user_id)
    return {"count": count}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_alert(
    payload: AlertCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Create a new alert. The ``user_id`` is set server-side from the JWT.
    """
    service = AlertService(db)
    alert = service.create_alert(user_id, payload.model_dump())
    return AlertResponse.model_validate(alert)


# ----------------------------------------------------------------------
# Dynamic-path routes (registered after all static paths)
# ----------------------------------------------------------------------
@router.get("/{alert_id}")
def get_alert(
    alert_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return a single alert by ID, enforcing ownership.
    """
    service = AlertService(db)
    alert = service.get_alert(alert_id, user_id)
    return AlertResponse.model_validate(alert)


@router.put("/{alert_id}")
def update_alert(
    alert_id: str,
    payload: AlertUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Update an existing alert's fields (severity, is_read, resolved_at).
    Only provided (non-None) fields are applied.
    """
    service = AlertService(db)
    alert = service.update_alert(alert_id, user_id, payload.model_dump(exclude_unset=True))
    return AlertResponse.model_validate(alert)


@router.put("/{alert_id}/read")
def mark_read(
    alert_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Mark a single alert as read, enforcing ownership.
    """
    service = AlertService(db)
    alert = service.mark_read(alert_id, user_id)
    return AlertResponse.model_validate(alert)


@router.delete("/{alert_id}")
def delete_alert(
    alert_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Delete an alert by ID, enforcing ownership.
    """
    service = AlertService(db)
    service.delete_alert(alert_id, user_id)
    return {"success": True}
