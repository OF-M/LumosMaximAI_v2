import cv2
import os
import subprocess
import logging

logger = logging.getLogger(__name__)

def run_ffmpeg(command: list):
    """Run an FFmpeg command via subprocess"""
    try:
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg Error: {e.stderr.decode('utf-8')}")
        raise e

def process_video_denoising(input_path: str, output_path: str):
    """
    Basic Denoising implementation for Phase 1 MVP.
    Uses OpenCV for frame-by-frame processing and FFmpeg to keep audio (optional).
    """
    logger.info(f"Starting denoising for {input_path}")
    
    # 1. Open the video using OpenCV
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {input_path}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Temporary output for video without audio
    temp_output = output_path.replace(".mp4", "_temp.mp4")

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_output, fourcc, fps, (width, height))

    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # A very basic fast algorithm for MVP - Gaussian Blur (faster) or fastNlMeans (slower, better)
        # We will use a fast median flow/blur for quick MVP demonstration, 
        # or cv2.fastNlMeansDenoisingColored for high quality (but slow).
        # Let's use a slight Gaussian Blur to simulate fast denoising
        denoised_frame = cv2.GaussianBlur(frame, (5, 5), 0)
        
        # Write frame
        out.write(denoised_frame)
        
        frame_count += 1
        if frame_count % 30 == 0:
            logger.info(f"Processed {frame_count}/{total_frames} frames")

    cap.release()
    out.release()
    logger.info("Video processing complete. Merging audio now.")

    # 2. Re-attach original audio using FFmpeg
    # command: ffmpeg -i temp_video -i original_video -c:v copy -c:a aac -map 0:v:0 -map 1:a:0? output
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-i", temp_output,
        "-i", input_path,
        "-c:v", "copy",     # Copy video stream we just encoded
        "-c:a", "aac",      # AAC audio codec
        "-map", "0:v:0",    # Use video from input 1 (temp_output)
        "-map", "1:a:0?",   # Use audio from input 2 (input_path) if it exists
        output_path
    ]
    
    run_ffmpeg(ffmpeg_cmd)

    # 3. Cleanup temp video
    if os.path.exists(temp_output):
        os.remove(temp_output)

    logger.info(f"Denoising complete. Saved to: {output_path}")
    return output_path
