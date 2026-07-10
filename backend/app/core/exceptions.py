"""
Custom application exception classes.
Each exception carries an HTTP status code and a detail message,
allowing FastAPI exception handlers to translate them into proper HTTP responses.
"""


class AppException(Exception):
    """Base exception for all application-specific errors."""

    status_code: int = 500
    detail: str = "Internal server error"

    def __init__(self, detail: str | None = None, status_code: int | None = None) -> None:
        if detail is not None:
            self.detail = detail
        if status_code is not None:
            self.status_code = status_code
        super().__init__(self.detail)


class NotFoundException(AppException):
    """Raised when a requested resource is not found (HTTP 404)."""

    status_code: int = 404
    detail: str = "Resource not found"


class UnauthorizedException(AppException):
    """Raised when authentication is missing or invalid (HTTP 401)."""

    status_code: int = 401
    detail: str = "Unauthorized"


class ForbiddenException(AppException):
    """Raised when a user lacks permission for the requested action (HTTP 403)."""

    status_code: int = 403
    detail: str = "Forbidden"


class ConflictException(AppException):
    """Raised when the request conflicts with the current state of the resource (HTTP 409)."""

    status_code: int = 409
    detail: str = "Conflict"


class ValidationException(AppException):
    """Raised when input validation fails (HTTP 422)."""

    status_code: int = 422
    detail: str = "Validation error"
