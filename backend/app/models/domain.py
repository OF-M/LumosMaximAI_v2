from pydantic import BaseModel
from typing import Optional, Dict

class JobCreate(BaseModel):
    video_url: str
    filename: str
    size_mb: Optional[float] = None

class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str

class ModalCallback(BaseModel):
    job_id: str
    status: str
    enhanced_url: Optional[str] = None
    metrics: Optional[Dict[str, float]] = None
    error: Optional[str] = None
