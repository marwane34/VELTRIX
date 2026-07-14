from pydantic import BaseModel
from typing import Optional, Dict, Any

class MachineBase(BaseModel):
    name: str
    location: str
    description: str = ""
    status: str = "online"

class MachineLimits(BaseModel):
    rms_min: Optional[float] = None
    rms_max: Optional[float] = None
    temp_min: Optional[float] = None
    temp_max: Optional[float] = None
    current_min: Optional[float] = None
    current_max: Optional[float] = None

class ReportBase(BaseModel):
    report_name: str
    machine_id: Optional[str] = None
    export_type: str = "pdf"
    created_by: str = ""
    file_path: str = ""
    file_size: int = 0
    metadata: Dict[str, Any] = {}

class CommConfigBase(BaseModel):
    protocol: str
    name: str = ""
    active: bool = False
    config: Dict[str, Any] = {}
