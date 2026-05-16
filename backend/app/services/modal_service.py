try:
    import modal
    _modal_available = True
except ImportError:
    _modal_available = False

def trigger_enhancement_job(job_id: str, video_url: str, task_type: str = "denoising"):
    """
    Triggers the Serverless GPU worker on Modal.com asynchronously.
    """
    if not _modal_available:
        print("Modal not installed — skipping GPU trigger")
        return False
    try:
        process_video = modal.Function.from_name("lumos-maxim-ai-worker", "process_video")

        # .spawn() runs the function in the background and returns immediately
        process_video.spawn(
            job_id=job_id,
            video_url=video_url,
            task_type=task_type,
        )
        return True
    except Exception as e:
        print(f"Failed to spawn Modal job: {e}")
        return False
