"""
VELTRIX SCADA API — Exception Handlers
"""
from fastapi import Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    status_code: int = 500
    detail: str = "Internal server error"

    def __init__(self, detail: str | None = None, status_code: int | None = None):
        if detail is not None:
            self.detail = detail
        if status_code is not None:
            self.status_code = status_code
        super().__init__(self.detail)


class NotFoundException(AppException):
    status_code = 404
    detail = "Resource not found"


class UnauthorizedException(AppException):
    status_code = 401
    detail = "Unauthorized"


class ForbiddenException(AppException):
    status_code = 403
    detail = "Forbidden"


class ValidationException(AppException):
    status_code = 422
    detail = "Validation error"


async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error": type(exc).__name__},
    )


async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )
