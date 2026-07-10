"""
Combined API dependencies.

Re-exports the database session provider and authentication/authorization
dependencies from their respective modules, along with all application
exception classes. This gives every router a single, convenient import
location for the cross-cutting concerns it needs.
"""
from app.database import get_db
from app.core.dependencies import (
    get_current_user,
    get_current_user_id,
    require_admin,
)
from app.core.exceptions import (
    AppException,
    NotFoundException,
    UnauthorizedException,
    ForbiddenException,
    ConflictException,
    ValidationException,
)

__all__ = [
    "get_db",
    "get_current_user",
    "get_current_user_id",
    "require_admin",
    "AppException",
    "NotFoundException",
    "UnauthorizedException",
    "ForbiddenException",
    "ConflictException",
    "ValidationException",
]
