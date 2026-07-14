from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..services.supabase_client import get_supabase

router = APIRouter()

class MachineCreate(BaseModel):
    name: str
    location: str
    description: str = ""
    status: str = "online"

class MachineUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    rms_min: Optional[float] = None
    rms_max: Optional[float] = None
    temp_min: Optional[float] = None
    temp_max: Optional[float] = None
    current_min: Optional[float] = None
    current_max: Optional[float] = None

@router.get("/")
async def list_machines():
    sb = get_supabase()
    result = sb.table("machines").select("*").order("created_at").execute()
    return result.data

@router.get("/{machine_id}")
async def get_machine(machine_id: str):
    sb = get_supabase()
    result = sb.table("machines").select("*").eq("id", machine_id).maybeSingle().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Machine not found")
    return result.data

@router.post("/")
async def create_machine(machine: MachineCreate):
    sb = get_supabase()
    result = sb.table("machines").insert(machine.model_dump()).execute()
    return result.data[0] if result.data else None

@router.put("/{machine_id}")
async def update_machine(machine_id: str, machine: MachineUpdate):
    sb = get_supabase()
    update_data = {k: v for k, v in machine.model_dump().items() if v is not None}
    result = sb.table("machines").update(update_data).eq("id", machine_id).execute()
    return result.data[0] if result.data else None

@router.delete("/{machine_id}")
async def delete_machine(machine_id: str):
    sb = get_supabase()
    sb.table("machines").delete().eq("id", machine_id).execute()
    return {"status": "deleted"}
