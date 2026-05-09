from fastapi import APIRouter, HTTPException, Header
from app.models.domain import JobCreate, JobResponse
from app.services import supabase_client, modal_service
from typing import Optional

router = APIRouter()

VALID_TASK_TYPES = {"denoising", "low_light"}

@router.post("/", response_model=JobResponse, status_code=202)
def create_enhancement_job(job_req: JobCreate, authorization: Optional[str] = Header(None)):
    """
    Submit a video for enhancement.
    This creates a database record and triggers the async GPU processing.
    """
    if job_req.task_type not in VALID_TASK_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid task_type. Must be one of: {VALID_TASK_TYPES}")

    video = supabase_client.create_video(
        filename=job_req.filename,
        original_url=job_req.video_url,
        size_mb=job_req.size_mb
    )
    if not video:
        raise HTTPException(status_code=500, detail="Failed to create video record")

    job = supabase_client.create_job(video_id=video["id"], task_type=job_req.task_type)

    if not job:
        raise HTTPException(status_code=500, detail="Failed to create job record")

    job_id = job["id"]

    # Trigger Modal processing asynchronously
    success = modal_service.trigger_enhancement_job(
        job_id=job_id,
        video_url=job_req.video_url,
        task_type=job_req.task_type
    )

    if not success:
        supabase_client.update_job_status(job_id, "failed", error="Failed to trigger GPU worker")
        raise HTTPException(status_code=500, detail="Failed to trigger processing worker")

    return JobResponse(
        job_id=job_id,
        status="processing",
        message="Video enhancement job submitted successfully."
    )

@router.get("/")
def list_jobs():
    """
    List all enhancement jobs.
    """
    return supabase_client.get_all_jobs()

@router.get("/{job_id}")
def get_job_status(job_id: str):
    """
    Retrieve the status of a specific job.
    """
    job = supabase_client.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job

@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: str):
    """
    Delete a job record.
    """
    job = supabase_client.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    supabase_client.delete_job(job_id)
    return
