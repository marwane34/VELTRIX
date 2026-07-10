"""
Sensors router.

Exposes CRUD, paginated listing with search/type/status filters, machine
assignment, and per-machine sensor lookups. Every endpoint requires a valid
JWT; all operations are scoped to the authenticated user.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user_id
from app.schemas.sensor import (
    SensorCreate,
    SensorUpdate,
    SensorResponse,
)
from app.services import SensorService

router = APIRouter(prefix="/api/sensors", tags=["sensors"])


@router.get("/")
def list_sensors(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (1-100)"),
    search: str | None = Query(None, description="Search term for name/description"),
    sensor_type: str | None = Query(None, alias="type", description="Filter by sensor type"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return a paginated, optionally filtered list of the user's sensors.

    Query parameters:
        page: 1-indexed page number (default 1).
        page_size: Number of items per page (default 20, max 100).
        search: Optional free-text query (name/description).
        type: Optional sensor type filter (e.g. ``vibration``).
        status: Optional status filter (e.g. ``active``).

    Returns:
        ``{items, total, page, page_size, pages}``
    """
    service = SensorService(db)
    result = service.get_sensors(
        user_id=user_id,
        page=page,
        page_size=page_size,
        search=search,
        sensor_type=sensor_type,
        status=status_filter,
    )
    result["items"] = [
        SensorResponse.model_validate(s) for s in result["items"]
    ]
    return result


@router.get("/machine/{machine_id}")
def get_sensors_by_machine(
    machine_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return all sensors assigned to a machine, enforcing machine ownership.
    """
    service = SensorService(db)
    sensors = service.get_sensors_by_machine(machine_id, user_id)
    return [SensorResponse.model_validate(s) for s in sensors]


@router.get("/{sensor_id}")
def get_sensor(
    sensor_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return a single sensor by ID, enforcing ownership.
    """
    service = SensorService(db)
    sensor = service.get_sensor(sensor_id, user_id)
    return SensorResponse.model_validate(sensor)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_sensor(
    payload: SensorCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Create a new sensor for the authenticated user. Optionally link it
    to a machine by providing ``machine_id``.
    """
    service = SensorService(db)
    sensor = service.create_sensor(user_id, payload.model_dump())
    return SensorResponse.model_validate(sensor)


@router.put("/{sensor_id}")
def update_sensor(
    sensor_id: str,
    payload: SensorUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Update an existing sensor's fields. Only provided (non-None) fields
    are applied.
    """
    service = SensorService(db)
    sensor = service.update_sensor(sensor_id, user_id, payload.model_dump(exclude_unset=True))
    return SensorResponse.model_validate(sensor)


@router.put("/{sensor_id}/assign")
def assign_sensor(
    sensor_id: str,
    body: dict,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Assign a sensor to a machine, enforcing ownership of both the sensor
    and the target machine.

    Request body:
        ``{"machine_id": "<machine uuid>"}``
    """
    machine_id = body.get("machine_id")
    if not machine_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="machine_id is required",
        )
    service = SensorService(db)
    sensor = service.assign_sensor(sensor_id, machine_id, user_id)
    return SensorResponse.model_validate(sensor)


@router.delete("/{sensor_id}")
def delete_sensor(
    sensor_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Delete a sensor by ID, enforcing ownership.
    """
    service = SensorService(db)
    service.delete_sensor(sensor_id, user_id)
    return {"success": True}
