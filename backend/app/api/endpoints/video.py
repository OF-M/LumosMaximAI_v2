import os
import uuid
import aiofiles
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models
from app.services.video_service import process_video_task

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    task_type: str = Form("denoising"),
    db: Session = Depends(get_db)
):
    valid_tasks = ["denoising", "low_light"]
    if task_type not in valid_tasks:
        raise HTTPException(status_code=400, detail="Invalid task type")

    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File provided is not a video")

    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file asynchronously
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)

    # Create Job in Database (Using a dummy user_id 1 for MVP)
    # Ensure a dummy user exists first, or make user_id nullable. For now let's create the job without strict user FK check if possible, or add a stub.
    new_job = models.VideoJob(
        # user_id=1,  # Omitting for simple MVP upload unless user auth is hooked up
        original_video_path=file_path,
        status="pending",
        task_type=task_type
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # Add background task for processing
    background_tasks.add_task(process_video_task, new_job.id, file_path, task_type, db)

    # Update state to processing immediately as it's handed to background task
    new_job.status = "processing"
    db.commit()

    return {
        "message": "Video uploaded successfully and is being processed",
        "job_id": new_job.id,
        "filename": unique_filename
    }

@router.get("/status/{job_id}")
def get_job_status(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "job_id": job.id,
        "status": job.status,
        "original_video_path": job.original_video_path,
        "processed_video_path": job.processed_video_path
    }

@router.get("/jobs")
def get_all_jobs(db: Session = Depends(get_db)):
    """
    Returns all jobs. For MVP we don't filter by user, 
    but eventually this would use user authentication.
    """
    jobs = db.query(models.VideoJob).order_by(models.VideoJob.created_at.desc()).all()
    
    return [
        {
            "id": job.id,
            "status": job.status,
            "task_type": job.task_type,
            "created_at": job.created_at,
            "original_video_path": os.path.basename(job.original_video_path) if job.original_video_path else None,
            "processed_video_path": os.path.basename(job.processed_video_path) if job.processed_video_path else None
        }
        for job in jobs
    ]

@router.get("/download/{job_id}")
def download_video(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job.status != "completed" or not job.processed_video_path or not os.path.exists(job.processed_video_path):
        raise HTTPException(status_code=404, detail="Video is not processed or file is missing")
        
    return FileResponse(
        path=job.processed_video_path,
        filename=os.path.basename(job.processed_video_path),
        media_type="video/mp4" # Assuming mp4 for MVP
    )

@router.get("/stream/original/{job_id}")
def stream_original_video(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job or not job.original_video_path or not os.path.exists(job.original_video_path):
        raise HTTPException(status_code=404, detail="Original video not found")
        
    return FileResponse(
        path=job.original_video_path,
        media_type="video/mp4"
    )
    
@router.get("/stream/processed/{job_id}")
def stream_processed_video(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job or not job.processed_video_path or not os.path.exists(job.processed_video_path):
        raise HTTPException(status_code=404, detail="Processed video not found")
        
    return FileResponse(
        path=job.processed_video_path,
        media_type="video/mp4"
    )
