from fastapi import APIRouter, HTTPException, BackgroundTasks, Header
from app.models.domain import JobCreate, JobResponse
from app.services import supabase_client, modal_service
from typing import Optional

router = APIRouter()

@router.post("/", response_model=JobResponse, status_code=202)
def create_enhancement_job(job_req: JobCreate, authorization: Optional[str] = Header(None)):
    """
    Submit a video for enhancement.
    This creates a database record and triggers the async GPU processing.
    """
    # In a real scenario, you'd validate the JWT from the Authorization header
    # and extract the user_id. For now, we simulate a dummy user_id if not provided.
    user_id = "00000000-0000-0000-0000-000000000000" # Dummy user
    
    # We assume video_id is created, or we create it here.
    # For simplicity, we just create the job directly (in real app, insert Video first)
    job = supabase_client.create_job(video_id=job_req.video_url, user_id=user_id)
    
    if not job:
        raise HTTPException(status_code=500, detail="Failed to create job record")
        
    job_id = job["id"]
    
    # Trigger Modal processing asynchronously
    success = modal_service.trigger_enhancement_job(job_id=job_id, video_url=job_req.video_url)
    
    if not success:
        # Revert or update to failed
        supabase_client.update_job_status(job_id, "failed", error="Failed to trigger GPU worker")
        raise HTTPException(status_code=500, detail="Failed to trigger processing worker")

    return JobResponse(
        job_id=job_id,
        status="processing",
        message="Video enhancement job submitted successfully."
    )

@router.get("/{job_id}")
def get_job_status(job_id: str):
    """
    Retrieve the status of a specific job.
    """
    job = supabase_client.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return job
