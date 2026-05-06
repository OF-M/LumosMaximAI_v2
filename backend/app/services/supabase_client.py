from supabase import create_client, Client
from app.core.config import settings

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_job(job_id: str):
    response = supabase.table("jobs").select("*").eq("id", job_id).execute()
    if response.data:
        return response.data[0]
    return None

def create_job(video_id: str, user_id: str):
    data = {
        "video_id": video_id,
        "user_id": user_id,
        "status": "pending"
    }
    response = supabase.table("jobs").insert(data).execute()
    if response.data:
        return response.data[0]
    return None

def update_job_status(job_id: str, status: str, enhanced_url: str = None, metrics: dict = None, error: str = None):
    data = {"status": status}
    if enhanced_url:
        data["enhanced_url"] = enhanced_url
    if metrics:
        data["metrics"] = metrics
    if error:
        data["error_log"] = error
        
    if status == "completed" or status == "failed":
        # we would also set completed_at but keeping simple for now
        pass

    response = supabase.table("jobs").update(data).eq("id", job_id).execute()
    if response.data:
        return response.data[0]
    return None
