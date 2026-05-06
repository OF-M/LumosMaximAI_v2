from fastapi import APIRouter, HTTPException, Request
from app.models.domain import ModalCallback
from app.services import supabase_client

router = APIRouter()

@router.post("/modal-callback")
async def modal_callback(callback_data: ModalCallback):
    """
    Webhook endpoint for Modal.com to send results back when GPU processing is done.
    """
    job_id = callback_data.job_id
    
    # Verify the job exists
    job = supabase_client.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Update database
    supabase_client.update_job_status(
        job_id=job_id,
        status=callback_data.status,
        enhanced_url=callback_data.enhanced_url,
        metrics=callback_data.metrics,
        error=callback_data.error
    )
    
    return {"message": "Webhook processed successfully"}
