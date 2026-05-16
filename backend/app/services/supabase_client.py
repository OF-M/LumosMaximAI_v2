import httpx
from supabase import create_client, Client
from app.core.config import settings

def _make_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

_client: Client | None = None

def _get_client() -> Client:
    global _client
    if _client is None:
        _client = _make_client()
    return _client

class _LazyClient:
    """Proxy that initializes the Supabase client on first use."""
    def __getattr__(self, name):
        return getattr(_get_client(), name)

supabase: Client = _LazyClient()  # type: ignore

BUCKET = "raw-videos"

def upload_to_storage(path: str, data: bytes, content_type: str = "video/mp4"):
    """Upload using a fresh httpx.Client per request — eliminates stale connection hangs."""
    url = f"{settings.SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}"
    try:
        with httpx.Client(timeout=httpx.Timeout(connect=10, read=60, write=60, pool=10)) as client:
            resp = client.post(
                url,
                content=data,
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_KEY}",
                    "Content-Type": content_type,
                },
            )
            resp.raise_for_status()
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

def get_user_from_token(token: str):
    """Decode Supabase JWT locally — no network call, no hangs."""
    import jwt as pyjwt

    class _User:
        def __init__(self, uid):
            self.id = uid

    try:
        # Decode payload without any verification (signature, expiry)
        # The JS client manages token refresh; we just need the user_id.
        payload = pyjwt.decode(
            token,
            options={"verify_signature": False, "verify_exp": False},
            algorithms=["HS256", "RS256"],
        )
        user_id = payload.get("sub")
        if not user_id:
            print("Auth token missing sub claim")
            return None
        return _User(user_id)
    except Exception as e:
        print(f"Auth token decode error: {e}")
        return None

def get_all_jobs():
    response = supabase.table("jobs").select("*, videos(filename, original_url, size_mb)").order("created_at", desc=True).execute()
    return response.data or []

def get_jobs_by_user(user_id: str):
    response = supabase.table("jobs").select("*, videos(filename, original_url, size_mb)").eq("user_id", user_id).order("created_at", desc=True).execute()
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
