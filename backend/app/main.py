from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .routers import machines, alerts, analytics, communication, reports, health
import os

app = FastAPI(title="VELTRIX SCADA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(machines.router, prefix="/api/machines", tags=["machines"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(communication.router, prefix="/api/communication", tags=["communication"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])

@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"status": "ok", "message": "Connected to VELTRIX SCADA WebSocket"})
    except WebSocketDisconnect:
        pass
