"""
VELTRIX SCADA API — Main Application
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware import RateLimitMiddleware
from app.exceptions import AppException, app_exception_handler, generic_exception_handler
from app.routers import machines, alerts, analytics, communication, reports, health

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("veltrix.scada")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    yield
    logger.info("Shutting down %s", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

api_prefix = "/api/v1"
app.include_router(health.router, prefix=f"{api_prefix}/health", tags=["health"])
app.include_router(machines.router, prefix=f"{api_prefix}/machines", tags=["machines"])
app.include_router(alerts.router, prefix=f"{api_prefix}/alerts", tags=["alerts"])
app.include_router(analytics.router, prefix=f"{api_prefix}/analytics", tags=["analytics"])
app.include_router(communication.router, prefix=f"{api_prefix}/communication", tags=["communication"])
app.include_router(reports.router, prefix=f"{api_prefix}/reports", tags=["reports"])


@app.websocket("/ws/v1/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"status": "ok", "message": "Connected to VELTRIX SCADA WebSocket"})
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
