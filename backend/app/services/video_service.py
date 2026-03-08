import time
import logging
import os
from sqlalchemy.orm import Session
from app.db.models import VideoJob
from app.services.denoise import process_video_denoising
from app.services.low_light import enhance_low_light

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Using simple BackgroundTasks for MVP (Phase 1)
# Can be easily refactored to use Celery tasks using @celery.task decorator

def process_video_task(job_id: int, input_path: str, task_type: str, db: Session):
    """
    Placeholder for background video processing.
    """
    logger.info(f"Starting job {job_id}: {task_type} on {input_path}")
    
    # Define output path
    output_filename = f"processed_{os.path.basename(input_path)}"
    output_path = os.path.join(os.path.dirname(input_path), output_filename)
    
    try:
        # Call OpenCV/PyTorch models via FFmpeg integration
        if task_type == "low_light":
            enhance_low_light(input_path, output_path)
        else:
            process_video_denoising(input_path, output_path)
            
        logger.info(f"Job {job_id} completed.")
        
        # Update job status in DB to "completed"
        job = db.query(VideoJob).filter(VideoJob.id == job_id).first()
        if job:
            job.status = "completed"
            job.processed_video_path = output_path
            db.commit()
    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")
        job = db.query(VideoJob).filter(VideoJob.id == job_id).first()
        if job:
            job.status = "failed"
            db.commit()
        
    return {"status": "success", "job_id": job_id}
