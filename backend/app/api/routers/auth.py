"""
Auth router.

Exposes registration, login, profile retrieval, and profile update
endpoints. All endpoints are prefixed with ``/api/auth``. The ``/me`` and
``/profile`` endpoints require a valid JWT bearer token; ``/register`` and
``/login`` are public.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_current_user_id
from app.core.exceptions import (
    UnauthorizedException,
    ConflictException,
    ValidationException,
    NotFoundException,
)
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.user import UserProfileUpdate, UserProfileResponse
from app.services import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])

# OAuth2 scheme — referenced by the Swagger UI "Authorize" button so that
# the token obtained from /api/auth/login is sent on subsequent requests.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ----------------------------------------------------------------------
# Public endpoints
# ----------------------------------------------------------------------
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Register a new user account.

    Returns an access token and the newly created user's basic info so
    the frontend can authenticate immediately without a separate login.
    """
    service = AuthService(db)
    result = service.register(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
    )
    return result


@router.post("/login")
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticate a user and return a JWT access token.

    The token must be sent as ``Authorization: Bearer <token>`` on
    protected endpoints.
    """
    service = AuthService(db)
    result = service.login(
        email=payload.email,
        password=payload.password,
    )
    return result


# ----------------------------------------------------------------------
# Authenticated endpoints
# ----------------------------------------------------------------------
@router.get("/me")
def get_me(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return the authenticated user's full profile.

    Uses the ``user_id`` extracted from the JWT to load the profile from
    the database, ensuring the response always reflects the persisted
    state (not just the token claims).
    """
    service = AuthService(db)
    profile = service.get_profile(user["user_id"])
    return UserProfileResponse.model_validate(profile)


@router.put("/profile")
def update_profile(
    payload: UserProfileUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update the authenticated user's profile (full_name, role).

    Only the fields provided in the request body are applied; omitted
    fields retain their current values.
    """
    service = AuthService(db)
    updated = service.update_profile(
        user_id=user["user_id"],
        full_name=payload.full_name,
        role=payload.role,
    )
    return UserProfileResponse.model_validate(updated)
