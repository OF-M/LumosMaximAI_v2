from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form, Depends
from app.models.domain import JobCreate, JobResponse
from app.services import supabase_client, modal_service
from typing import Optional
import uuid  # noqa: F401

router = APIRouter()

VALID_TASK_TYPES = {"denoising", "low_light", "enhance"}


def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization[7:]
    user = supabase_client.get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


@router.post("/upload", response_model=JobResponse, status_code=202)
async def upload_and_enhance(
    file: UploadFile = File(...),
    task_type: str = Form("denoising"),
    user=Depends(get_current_user),
):
    """
    Accept a video file, upload it to Supabase Storage via service_role key
    (bypasses RLS), then create a job and trigger processing.
    """
    if task_type not in VALID_TASK_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid task_type. Must be one of: {VALID_TASK_TYPES}")

    file_bytes = await file.read()
    ext = file.filename.split(".")[-1] if file.filename else "mp4"
    storage_path = f"{uuid.uuid4()}.{ext}"
    content_type = file.content_type or "video/mp4"

    # Upload using service_role key — bypasses RLS entirely
    upload_result = supabase_client.upload_to_storage(storage_path, file_bytes, content_type)
    if not upload_result:
        raise HTTPException(status_code=500, detail="Failed to upload video to storage")

    public_url = supabase_client.get_public_url(storage_path)

    video = supabase_client.create_video(
        filename=file.filename or storage_path,
        original_url=public_url,
        size_mb=len(file_bytes) / (1024 * 1024),
    )
    if not video:
        raise HTTPException(status_code=500, detail="Failed to create video record")

    job = supabase_client.create_job(video_id=video["id"], task_type=task_type, user_id=user.id)
    if not job:
        raise HTTPException(status_code=500, detail="Failed to create job record")

    job_id = job["id"]

    success = modal_service.trigger_enhancement_job(
        job_id=job_id,
        video_url=public_url,
        task_type=task_type,
    )
    if not success:
        supabase_client.update_job_status(job_id, "failed", error="Failed to trigger GPU worker")
        raise HTTPException(status_code=500, detail="Failed to trigger processing worker")

    return JobResponse(job_id=job_id, status="processing", message="Video enhancement job submitted successfully.")

@router.post("/", response_model=JobResponse, status_code=202)
def create_enhancement_job(job_req: JobCreate, authorization: Optional[str] = Header(None)):
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
def list_jobs(user=Depends(get_current_user)):
    """
    List enhancement jobs for the authenticated user.
    """
    return supabase_client.get_jobs_by_user(user.id)

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
def delete_job(job_id: str, user=Depends(get_current_user)):
    """
    Delete a job record (only the owner can delete).
    """
    job = supabase_client.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this job")

    supabase_client.delete_job(job_id)
    return
