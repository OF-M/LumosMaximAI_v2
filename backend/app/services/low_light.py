import cv2
import os
import numpy as np
import logging
from app.services.denoise import run_ffmpeg

logger = logging.getLogger(__name__)

def enhance_low_light(input_path: str, output_path: str):
    """
    Low-light enhancement for Phase 2 MVP.
    This acts as a fast placeholder for Zero-DCE/MIRNet by applying 
    Adaptive Histogram Equalization (CLAHE) and Gamma Correction to simulate
    the deep learning curve estimation.
    """
    logger.info(f"Starting low-light enhancement for {input_path}")
    
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {input_path}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    temp_output = output_path.replace(".mp4", "_temp_ll.mp4")

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_output, fourcc, fps, (width, height))

    # Setup CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))

    # Pre-compute Gamma Correction lookup table for speed (Gamma = 1.5)
    gamma = 1.5
    invGamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** invGamma) * 255
        for i in np.arange(0, 256)]).astype("uint8")

    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Apply Gamma Correction
        gamma_corrected = cv2.LUT(frame, table)

        # Convert to LAB color space to apply CLAHE to the L-channel (Lightness)
        lab = cv2.cvtColor(gamma_corrected, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE to L-channel
        cl = clahe.apply(l)
        
        # Merge channels
        limg = cv2.merge((cl, a, b))
        
        # Convert back to BGR
        enhanced_frame = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        
        # Write frame
        out.write(enhanced_frame)
        
        frame_count += 1
        if frame_count % 30 == 0:
            logger.info(f"Low-Light: Processed {frame_count}/{total_frames} frames")

    cap.release()
    out.release()
    logger.info("Low-light enhancement complete. Merging audio now.")

    # Re-attach original audio using FFmpeg
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-i", temp_output,
        "-i", input_path,
        "-c:v", "copy",     # Copy video stream we just encoded
        "-c:a", "aac",      # AAC audio codec
        "-map", "0:v:0",    # Use video from input 1
        "-map", "1:a:0?",   # Use audio from input 2 if it exists
        output_path
    ]
    
    run_ffmpeg(ffmpeg_cmd)

    # Cleanup temp video
    if os.path.exists(temp_output):
        os.remove(temp_output)

    logger.info(f"Low-light processing complete. Saved to: {output_path}")
    return output_path
