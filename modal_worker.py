import modal
import os
import tempfile
import logging

# ---------------------------------------------------------------------------
# Image — debian slim + OpenCV headless + FFmpeg + Supabase client
# ---------------------------------------------------------------------------
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg", "libgl1", "libglib2.0-0")
    .pip_install(
        "opencv-python-headless==4.10.0.84",
        "numpy==1.26.4",
        "supabase==2.15.0",
        "requests==2.32.3",
    )
)

app = modal.App("lumos-maxim-ai-worker", image=image)

# ---------------------------------------------------------------------------
# Helpers (run inside container)
# ---------------------------------------------------------------------------

def _download_video(url: str, dest_path: str):
    import requests
    resp = requests.get(url, stream=True, timeout=120)
    resp.raise_for_status()
    with open(dest_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)


def _denoise(input_path: str, output_path: str):
    import cv2
    import subprocess

    cap = cv2.VideoCapture(input_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    temp_path = output_path.replace(".mp4", "_tmp.mp4")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(temp_path, fourcc, fps, (width, height))

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        out.write(cv2.GaussianBlur(frame, (5, 5), 0))

    cap.release()
    out.release()

    subprocess.run(
        ["ffmpeg", "-y", "-i", temp_path, "-i", input_path,
         "-c:v", "libx264", "-crf", "23", "-preset", "fast", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0?", output_path],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    os.remove(temp_path)


def _low_light(input_path: str, output_path: str):
    import cv2
    import numpy as np
    import subprocess

    cap = cv2.VideoCapture(input_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    temp_path = output_path.replace(".mp4", "_tmp.mp4")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(temp_path, fourcc, fps, (width, height))

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    table = (
        ((np.arange(0, 256) / 255.0) ** (1.0 / 1.5) * 255)
        .astype("uint8")
    )

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        gamma = cv2.LUT(frame, table)
        lab = cv2.cvtColor(gamma, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        enhanced = cv2.merge((clahe.apply(l), a, b))
        out.write(cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR))

    cap.release()
    out.release()

    subprocess.run(
        ["ffmpeg", "-y", "-i", temp_path, "-i", input_path,
         "-c:v", "libx264", "-crf", "23", "-preset", "fast", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0?", output_path],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    os.remove(temp_path)


def _upload_to_supabase(local_path: str, filename: str) -> str:
    """Upload to enhanced-videos bucket and return public URL."""
    from supabase import create_client

    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_KEY"]
    client = create_client(url, key)

    with open(local_path, "rb") as f:
        client.storage.from_("enhanced-videos").upload(
            filename, f, {"content-type": "video/mp4", "upsert": "true"}
        )

    return client.storage.from_("enhanced-videos").get_public_url(filename)


def _update_job(job_id: str, status: str, enhanced_url: str = None, error: str = None):
    from supabase import create_client

    client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    data = {"status": status}
    if enhanced_url:
        data["enhanced_url"] = enhanced_url
        data["completed_at"] = "now()"
    if error:
        data["error_log"] = error
    client.table("jobs").update(data).eq("id", job_id).execute()


# ---------------------------------------------------------------------------
# Main function — Modal invokes this
# ---------------------------------------------------------------------------

@app.function(
    secrets=[modal.Secret.from_name("supabase-credentials")],
    timeout=600,
    cpu=2,
    memory=2048,
)
def process_video(job_id: str, video_url: str, task_type: str = "denoising"):
    logging.basicConfig(level=logging.INFO)
    log = logging.getLogger(__name__)

    log.info(f"[{job_id}] Starting {task_type}")
    _update_job(job_id, "processing")

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = os.path.join(tmpdir, "input.mp4")
            output_filename = f"enhanced_{job_id}.mp4"
            output_path = os.path.join(tmpdir, output_filename)

            log.info(f"[{job_id}] Downloading video…")
            _download_video(video_url, input_path)

            log.info(f"[{job_id}] Processing ({task_type})…")
            if task_type == "low_light":
                _low_light(input_path, output_path)
            else:
                _denoise(input_path, output_path)

            log.info(f"[{job_id}] Uploading result…")
            public_url = _upload_to_supabase(output_path, output_filename)

        log.info(f"[{job_id}] Done → {public_url}")
        _update_job(job_id, "completed", enhanced_url=public_url)

    except Exception as exc:
        log.error(f"[{job_id}] Failed: {exc}")
        _update_job(job_id, "failed", error=str(exc))
        raise
