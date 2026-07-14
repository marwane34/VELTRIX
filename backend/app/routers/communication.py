from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
import logging

from ..services.supabase_client import get_supabase

router = APIRouter()
logger = logging.getLogger("veltrix.scada.communication")


class CommConfigCreate(BaseModel):
    protocol: str
    name: str = ""
    active: bool = False
    config: Dict[str, Any] = {}


@router.get("/")
async def list_configs():
    sb = get_supabase()
    result = sb.table("communication_configs").select("*").order("created_at").execute()
    return result.data


@router.post("/")
async def create_config(config: CommConfigCreate):
    sb = get_supabase()
    sb.table("communication_configs").update({"active": False}).neq("protocol", "__none__").execute()
    result = sb.table("communication_configs").insert(config.model_dump()).execute()
    if result.data:
        logger.info("Communication config created: %s", config.protocol)
        return result.data[0]
    return None


@router.put("/{config_id}")
async def update_config(config_id: str, config: CommConfigCreate):
    sb = get_supabase()
    result = sb.table("communication_configs").update(config.model_dump()).eq("id", config_id).execute()
    return result.data[0] if result.data else None


@router.delete("/{config_id}")
async def delete_config(config_id: str):
    sb = get_supabase()
    sb.table("communication_configs").delete().eq("id", config_id).execute()
    return {"status": "deleted"}


@router.post("/{protocol}/activate")
async def activate_protocol(protocol: str, config: Dict[str, Any] = {}):
    sb = get_supabase()
    sb.table("communication_configs").update({"active": False}).neq("protocol", "__none__").execute()
    existing = sb.table("communication_configs").select("*").eq("protocol", protocol).maybeSingle().execute()
    if existing.data:
        sb.table("communication_configs").update({"active": True, "config": config}).eq("id", existing.data["id"]).execute()
    else:
        sb.table("communication_configs").insert({"protocol": protocol, "name": protocol.replace("_", " ").upper(), "active": True, "config": config}).execute()
    logger.info("Protocol activated: %s", protocol)
    return {"status": "activated", "protocol": protocol}


@router.post("/deactivate")
async def deactivate_protocol():
    sb = get_supabase()
    sb.table("communication_configs").update({"active": False}).neq("protocol", "__none__").execute()
    logger.info("Protocol deactivated")
    return {"status": "deactivated"}
