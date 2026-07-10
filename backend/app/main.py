"""
FastAPI application entry point.

Creates the FastAPI app, configures CORS middleware, registers a global
exception handler for all ``AppException`` subclasses, includes every
router module, and exposes a simple health-check endpoint.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.exceptions import AppException
from app.api.routers import (
    auth,
    machines,
    sensors,
    monitoring,
    predictions,
    alerts,
    maintenance,
    settings as settings_router,
)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Predictive maintenance backend API for industrial machine monitoring, "
    "AI-driven health predictions, alerting, and maintenance scheduling.",
)

# ----------------------------------------------------------------------
# CORS
# ----------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------------
# Global exception handler for application-specific exceptions
# ----------------------------------------------------------------------
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """
    Translate any ``AppException`` subclass into a JSON error response
    with the appropriate HTTP status code and detail message.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


# ----------------------------------------------------------------------
# Routers
# ----------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(machines.router)
app.include_router(sensors.router)
app.include_router(monitoring.router)
app.include_router(predictions.router)
app.include_router(alerts.router)
app.include_router(maintenance.router)
app.include_router(settings_router.router)


# ----------------------------------------------------------------------
# Health check
# ----------------------------------------------------------------------
@app.get("/api/health", tags=["health"])
def health_check():
    """
    Lightweight health-check endpoint for load balancers and uptime
    monitors. Does not require authentication.
    """
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
