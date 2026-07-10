"""
Settings router.

Exposes per-user application settings as key/value pairs grouped by
category. Supports single and bulk upserts, category-based retrieval, and
deletion. All endpoints require a valid JWT; operations are scoped to the
authenticated user.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user_id
from app.schemas.setting import (
    SettingCreate,
    SettingResponse,
)
from app.services import SettingService

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/")
def get_settings(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return all settings for the authenticated user, ordered by category
    then key.
    """
    service = SettingService(db)
    settings = service.get_settings(user_id)
    return [SettingResponse.model_validate(s) for s in settings]


@router.get("/category/{category}")
def get_settings_by_category(
    category: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return all settings for the user within a specific category.
    """
    service = SettingService(db)
    settings = service.get_settings_by_category(user_id, category)
    return [SettingResponse.model_validate(s) for s in settings]


@router.get("/{key}")
def get_setting(
    key: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Return a single setting by key, or ``null`` if not found.
    """
    service = SettingService(db)
    setting = service.get_setting(user_id, key)
    if setting is None:
        return None
    return SettingResponse.model_validate(setting)


@router.post("/", status_code=status.HTTP_201_CREATED)
def save_setting(
    payload: SettingCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Insert or update a single setting (upsert by ``user_id`` + ``key``).
    """
    service = SettingService(db)
    setting = service.save_setting(
        user_id=user_id,
        key=payload.key,
        value=payload.value,
        category=payload.category,
    )
    return SettingResponse.model_validate(setting)


@router.put("/bulk")
def save_settings(
    payload: list[SettingCreate],
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Bulk upsert a list of settings for the user.

    Request body is a JSON array of ``SettingCreate`` objects. Returns the
    list of upserted settings in the same order as the input.
    """
    service = SettingService(db)
    settings_data = [item.model_dump() for item in payload]
    saved = service.save_settings(user_id, settings_data)
    return [SettingResponse.model_validate(s) for s in saved]


@router.delete("/{key}")
def delete_setting(
    key: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """
    Delete a setting by key, enforcing ownership.
    """
    service = SettingService(db)
    service.delete_setting(user_id, key)
    return {"success": True}
