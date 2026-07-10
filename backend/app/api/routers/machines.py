"""
Machines router.

Exposes CRUD, paginated listing with search/status filters, threshold-limit
updates, and aggregate statistics for monitored machines. Every endpoint
requires a valid JWT; all operations are scoped to the authenticated user.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user_id
from app.schemas.machine import (
    MachineCreate,
    MachineUpdate,
    MachineResponse,
)
from app.services import MachineService

router = APIRouter(prefix="/api/machines", tags=["machines"])


@router.get("/")
def list_machines(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (1-100)"),
    search: str | None = Query(None, description="Search term for name/location"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return a paginated, optionally filtered list of the user's machines.

    Query parameters:
        page: 1-indexed page number (default 1).
        page_size: Number of items per page (default 20, max 100).
        search: Optional free-text query matched against name/location.
        status: Optional status filter (e.g. ``online``, ``warning``).

    Returns:
        ``{items, total, page, page_size, pages}``
    """
    service = MachineService(db)
    result = service.get_machines(
        user_id=user_id,
        page=page,
        page_size=page_size,
        search=search,
        status=status_filter,
    )
    # Serialize ORM objects to response models so the API returns clean JSON
    result["items"] = [
        MachineResponse.model_validate(m) for m in result["items"]
    ]
    return result


@router.get("/stats")
def get_machine_stats(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return aggregate machine-status statistics for the dashboard.

    Returns:
        ``{total, online, warning, critical, offline}``
    """
    service = MachineService(db)
    return service.get_machine_stats(user_id)


@router.get("/{machine_id}")
def get_machine(
    machine_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return a single machine by ID, enforcing ownership.
    """
    service = MachineService(db)
    machine = service.get_machine(machine_id, user_id)
    return MachineResponse.model_validate(machine)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_machine(
    payload: MachineCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Create a new machine for the authenticated user.
    """
    service = MachineService(db)
    machine = service.create_machine(user_id, payload.model_dump())
    return MachineResponse.model_validate(machine)


@router.put("/{machine_id}")
def update_machine(
    machine_id: str,
    payload: MachineUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Update an existing machine's fields. Only provided (non-None) fields
    are applied.
    """
    service = MachineService(db)
    machine = service.update_machine(machine_id, user_id, payload.model_dump(exclude_unset=True))
    return MachineResponse.model_validate(machine)


@router.put("/{machine_id}/limits")
def set_limits(
    machine_id: str,
    limits: dict,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Update a machine's alert/prediction threshold limits.

    The request body may contain any subset of:
    ``rms_min, rms_max, temp_min, temp_max, current_min, current_max``.
    """
    service = MachineService(db)
    machine = service.set_limits(machine_id, user_id, limits)
    return MachineResponse.model_validate(machine)


@router.delete("/{machine_id}")
def delete_machine(
    machine_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Delete a machine by ID, enforcing ownership.
    """
    service = MachineService(db)
    service.delete_machine(machine_id, user_id)
    return {"success": True}
