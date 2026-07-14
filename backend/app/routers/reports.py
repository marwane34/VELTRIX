from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from ..services.supabase_client import get_supabase

router = APIRouter()

class ReportCreate(BaseModel):
    report_name: str
    machine_id: Optional[str] = None
    export_type: str = "pdf"
    created_by: str = ""
    file_path: str = ""
    file_size: int = 0
    metadata: Dict[str, Any] = {}

@router.get("/")
async def list_reports():
    sb = get_supabase()
    result = sb.table("reports").select("*").order("created_at", desc=True).execute()
    return result.data

@router.post("/")
async def create_report(report: ReportCreate):
    sb = get_supabase()
    result = sb.table("reports").insert(report.model_dump()).execute()
    return result.data[0] if result.data else None

@router.delete("/{report_id}")
async def delete_report(report_id: str):
    sb = get_supabase()
    sb.table("reports").delete().eq("id", report_id).execute()
    return {"status": "deleted"}
