import modal
from app.core.config import settings

def trigger_enhancement_job(job_id: str, video_url: str):
    """
    Triggers the Serverless GPU worker on Modal.com asynchronously.
    """
    try:
        # Lookup the deployed function
        f = modal.Function.lookup("lumos-maxim-ai-worker", "process_video")
        
        # .spawn() runs the function in the background and returns immediately
        f.spawn(
            job_id=job_id, 
            video_url=video_url, 
            callback_url=f"{settings.BACKEND_URL}{settings.API_V1_STR}/webhooks/modal-callback"
        )
        return True
    except Exception as e:
        print(f"Failed to spawn Modal job: {e}")
        return False
