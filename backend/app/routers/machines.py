from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import logging

from ..services.supabase_client import get_supabase
from ..exceptions import NotFoundException

router = APIRouter()
logger = logging.getLogger("veltrix.scada.machines")


class MachineCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    location: str = Field("", max_length=200)
    description: str = Field("", max_length=500)
    status: str = Field("online", pattern="^(online|offline|warning|critical)$")


class MachineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    location: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[str] = Field(None, pattern="^(online|offline|warning|critical)$")
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
        raise NotFoundException(detail="Machine not found")
    return result.data


@router.post("/")
async def create_machine(machine: MachineCreate):
    sb = get_supabase()
    result = sb.table("machines").insert(machine.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create machine")
    logger.info("Machine created: %s", machine.name)
    return result.data[0]


@router.put("/{machine_id}")
async def update_machine(machine_id: str, machine: MachineUpdate):
    sb = get_supabase()
    update_data = {k: v for k, v in machine.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = sb.table("machines").update(update_data).eq("id", machine_id).execute()
    if not result.data:
        raise NotFoundException(detail="Machine not found")
    return result.data[0]


@router.delete("/{machine_id}")
async def delete_machine(machine_id: str):
    sb = get_supabase()
    sb.table("machines").delete().eq("id", machine_id).execute()
    logger.info("Machine deleted: %s", machine_id)
    return {"status": "deleted"}
