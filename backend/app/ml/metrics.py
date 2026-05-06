import cv2
from skimage.metrics import structural_similarity as ssim

def calculate_psnr(original_frame, enhanced_frame):
    """
    Calculates the Peak Signal-to-Noise Ratio (PSNR) between two frames.
    Higher values are better.
    """
    return cv2.PSNR(original_frame, enhanced_frame)

def calculate_ssim(original_frame, enhanced_frame):
    """
    Calculates the Structural Similarity Index (SSIM) between two frames.
    Values range from 0 to 1, where 1 means perfect similarity.
    """
    gray_orig = cv2.cvtColor(original_frame, cv2.COLOR_BGR2GRAY)
    gray_enh = cv2.cvtColor(enhanced_frame, cv2.COLOR_BGR2GRAY)
    
    # Calculate SSIM across the whole image
    ssim_value, _ = ssim(gray_orig, gray_enh, full=True)
    return ssim_value

def evaluate_video(original_video_path: str, enhanced_video_path: str):
    """
    Iterates through both videos frame by frame to calculate average PSNR and SSIM.
    This is highly intensive and should run on the GPU worker.
    """
    cap_orig = cv2.VideoCapture(original_video_path)
    cap_enh = cv2.VideoCapture(enhanced_video_path)
    
    psnr_total = 0
    ssim_total = 0
    frame_count = 0
    
    while True:
        ret1, frame1 = cap_orig.read()
        ret2, frame2 = cap_enh.read()
        
        if not ret1 or not ret2:
            break
            
        psnr_total += calculate_psnr(frame1, frame2)
        ssim_total += calculate_ssim(frame1, frame2)
        frame_count += 1
        
    cap_orig.release()
    cap_enh.release()
    
    if frame_count == 0:
        return {"psnr": 0.0, "ssim": 0.0}
        
    return {
        "psnr": round(psnr_total / frame_count, 2),
        "ssim": round(ssim_total / frame_count, 4)
    }
