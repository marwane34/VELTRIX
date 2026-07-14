from fastapi import APIRouter
router = APIRouter()

@router.get("/")
async def health_check():
    return {"status": "healthy", "service": "VELTRIX SCADA API", "version": "1.0.0"}
