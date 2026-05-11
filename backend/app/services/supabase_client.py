from supabase import create_client, Client
from app.core.config import settings

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

BUCKET = "raw-videos"

def upload_to_storage(path: str, data: bytes, content_type: str = "video/mp4"):
    try:
        supabase.storage.from_(BUCKET).upload(path, data, {"content-type": content_type})
        return True
    except Exception as e:
        print(f"Storage upload error: {e}")
        return False

def get_public_url(path: str) -> str:
    return supabase.storage.from_(BUCKET).get_public_url(path)

def get_job(job_id: str):
    response = supabase.table("jobs").select("*, videos(filename, original_url, size_mb)").eq("id", job_id).execute()
    if response.data:
        return response.data[0]
    return None

def create_video(filename: str, original_url: str, size_mb: float = None):
    data = {
        "filename": filename,
        "original_url": original_url,
        "size_mb": size_mb
    }
    response = supabase.table("videos").insert(data).execute()
    if response.data:
        return response.data[0]
    return None

def get_all_jobs():
    response = supabase.table("jobs").select("*, videos(filename, original_url, size_mb)").order("created_at", desc=True).execute()
    return response.data or []

def create_job(video_id: str, user_id: str = None, task_type: str = "denoising"):
    data = {
        "video_id": video_id,
        "status": "pending",
        "task_type": task_type,
    }
    if user_id:
        data["user_id"] = user_id
    response = supabase.table("jobs").insert(data).execute()
    if response.data:
        return response.data[0]
    return None

def delete_job(job_id: str):
    response = supabase.table("jobs").delete().eq("id", job_id).execute()
    return bool(response.data)

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
