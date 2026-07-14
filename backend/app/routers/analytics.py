from fastapi import APIRouter
from ..services.supabase_client import get_supabase

router = APIRouter()

@router.get("/{machine_id}/prediction")
async def get_prediction(machine_id: str):
    return {"machine_id": machine_id, "prediction": None, "message": "AI prediction computed in real-time"}

@router.get("/{machine_id}/health-trend")
async def get_health_trend(machine_id: str):
    return {"machine_id": machine_id, "trend": [], "message": "Health trend computed in real-time"}
