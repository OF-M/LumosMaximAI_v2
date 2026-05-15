import modal
import os
import tempfile
import logging

# ---------------------------------------------------------------------------
# Model weight cache — downloaded once, reused across all invocations
# ---------------------------------------------------------------------------
model_volume = modal.Volume.from_name("lumos-models", create_if_missing=True)
MODEL_DIR = "/models"

# ---------------------------------------------------------------------------
# Pretrained weight URLs
#   Zero-DCE  : Li-Chongyi/Zero-DCE  (CVPR 2020) — committed directly in repo
#   DnCNN     : cszn/KAIR v1.0 release — direct GitHub release asset
# ---------------------------------------------------------------------------
ZERO_DCE_URL = (
    "https://raw.githubusercontent.com/Li-Chongyi/Zero-DCE"
    "/master/Zero-DCE_code/snapshots/Epoch99.pth"
)
# NAFNet-SIDD-width32 (39.72 dB on SIDD) — primary denoiser
# Simpler than DRUNet, better quality, 111 MB
NAFNET_URL = (
    "https://huggingface.co/mikestealth/nafnet-models/resolve/main/NAFNet-SIDD-width32.pth"
)
# DRUNet kept as fallback if NAFNet fails to load
DRUNET_URL = (
    "https://github.com/cszn/KAIR/releases/download/v1.0/drunet_color.pth"
)
DRUNET_SIGMA = 25

# ---------------------------------------------------------------------------
# Low-light post-processing blend factors (LAB colour space)
#   LL_BRIGHTNESS : portion of Zero-DCE brightness boost to keep  (0=no change, 1=full)
#   LL_COLOR      : portion of Zero-DCE colour shift to keep      (0=no change, 1=full)
# Reduce LL_COLOR if output looks too yellow/warm.
# Reduce LL_BRIGHTNESS if output looks over-exposed.
# ---------------------------------------------------------------------------
LL_BRIGHTNESS = 0.55
LL_COLOR      = 0.25

# ---------------------------------------------------------------------------
# Temporal smoothing — reduces frame-to-frame flicker in video output
#   TEMPORAL_ALPHA : weight of the CURRENT enhanced frame  (0=full blend, 1=no smoothing)
#   0.80 → 80 % current frame + 20 % previous frame  (subtle, preserves motion)
# ---------------------------------------------------------------------------
TEMPORAL_ALPHA = 0.80

# ---------------------------------------------------------------------------
# Unsharp masking — recovers fine detail lost during denoising (enhance mode only)
#   SHARPEN_AMOUNT : strength of sharpening  (0=none, 0.5=moderate, 1.0=strong)
#   SHARPEN_RADIUS : gaussian blur radius in pixels used to compute the mask
# ---------------------------------------------------------------------------
SHARPEN_AMOUNT = 0.7
SHARPEN_RADIUS = 1.5

# ---------------------------------------------------------------------------
# Denoising blend — prevents over-correction on clean/low-noise footage
#   DENOISE_BLEND : weight of model output  (0=original, 1=full model output)
#   0.65 → 65% NAFNet + 35% original — preserves detail, prevents darkening
# ---------------------------------------------------------------------------
DENOISE_BLEND = 0.65

# ---------------------------------------------------------------------------
# Container image — Debian Slim + CUDA PyTorch + OpenCV + Supabase
# ---------------------------------------------------------------------------
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libgl1", "libglib2.0-0")
    .run_commands(
        "pip install torch==2.3.0 torchvision==0.18.0 "
        "--index-url https://download.pytorch.org/whl/cu121 --quiet",
        "pip install opencv-python-headless==4.10.0.84 numpy==1.26.4 "
        "supabase==2.15.0 requests==2.32.3 --quiet",
    )
)

app = modal.App("lumos-maxim-ai-worker", image=image)


# ---------------------------------------------------------------------------
# Model architectures
# ---------------------------------------------------------------------------

def _build_zero_dce():
    """
    Zero-DCE (CVPR 2020) — architecture matches Li-Chongyi/Zero-DCE weights.
    Input/output: RGB float32 in [0, 1], any spatial size.
    """
    import torch
    import torch.nn as nn

    class ZeroDCENet(nn.Module):
        def __init__(self):
            super().__init__()
            self.relu = nn.ReLU(inplace=True)
            nf = 32
            self.e_conv1 = nn.Conv2d(3, nf, 3, 1, 1, bias=True)
            self.e_conv2 = nn.Conv2d(nf, nf, 3, 1, 1, bias=True)
            self.e_conv3 = nn.Conv2d(nf, nf, 3, 1, 1, bias=True)
            self.e_conv4 = nn.Conv2d(nf, nf, 3, 1, 1, bias=True)
            self.e_conv5 = nn.Conv2d(nf * 2, nf, 3, 1, 1, bias=True)
            self.e_conv6 = nn.Conv2d(nf * 2, nf, 3, 1, 1, bias=True)
            self.e_conv7 = nn.Conv2d(nf * 2, 24, 3, 1, 1, bias=True)

        def forward(self, x):
            f1 = self.relu(self.e_conv1(x))
            f2 = self.relu(self.e_conv2(f1))
            f3 = self.relu(self.e_conv3(f2))
            f4 = self.relu(self.e_conv4(f3))
            f5 = self.relu(self.e_conv5(torch.cat([f3, f4], 1)))
            f6 = self.relu(self.e_conv6(torch.cat([f2, f5], 1)))
            curves = torch.tanh(self.e_conv7(torch.cat([f1, f6], 1)))
            img = x
            for r in torch.split(curves, 3, dim=1):
                img = img + r * (img * img - img)
            return img.clamp(0, 1)

    return ZeroDCENet()


def _build_drunet(sigma: int = DRUNET_SIGMA):
    """
    DRUNet — U-Net + ResBlocks, real-world denoising (cszn/KAIR drunet_color).
    Architecture: m_head → m_down1/2/3 (ResBlocks + strideconv) → m_body → m_up3/2/1
    (transposeconv + ResBlocks) → m_tail. NO bias, NO BatchNorm.
    Input: 4-channel (RGB + noise level map σ/255). Output: denoised RGB.
    Wrapper accepts 3-channel input and appends a constant noise map internally,
    so the rest of the pipeline (`_process_frames_gpu`) stays unchanged.
    """
    import torch
    import torch.nn as nn
    import numpy as np

    class ResBlock(nn.Module):
        def __init__(self, ch):
            super().__init__()
            self.res = nn.Sequential(
                nn.Conv2d(ch, ch, 3, 1, 1, bias=False),
                nn.ReLU(inplace=True),
                nn.Conv2d(ch, ch, 3, 1, 1, bias=False),
            )

        def forward(self, x):
            return x + self.res(x)

    class DRUNet(nn.Module):
        def __init__(self, in_nc=4, out_nc=3, nc=(64, 128, 256, 512), nb=4):
            super().__init__()
            self.m_head = nn.Conv2d(in_nc, nc[0], 3, 1, 1, bias=False)
            self.m_down1 = nn.Sequential(
                *[ResBlock(nc[0]) for _ in range(nb)],
                nn.Conv2d(nc[0], nc[1], 2, 2, 0, bias=False),
            )
            self.m_down2 = nn.Sequential(
                *[ResBlock(nc[1]) for _ in range(nb)],
                nn.Conv2d(nc[1], nc[2], 2, 2, 0, bias=False),
            )
            self.m_down3 = nn.Sequential(
                *[ResBlock(nc[2]) for _ in range(nb)],
                nn.Conv2d(nc[2], nc[3], 2, 2, 0, bias=False),
            )
            self.m_body = nn.Sequential(*[ResBlock(nc[3]) for _ in range(nb)])
            self.m_up3 = nn.Sequential(
                nn.ConvTranspose2d(nc[3], nc[2], 2, 2, 0, bias=False),
                *[ResBlock(nc[2]) for _ in range(nb)],
            )
            self.m_up2 = nn.Sequential(
                nn.ConvTranspose2d(nc[2], nc[1], 2, 2, 0, bias=False),
                *[ResBlock(nc[1]) for _ in range(nb)],
            )
            self.m_up1 = nn.Sequential(
                nn.ConvTranspose2d(nc[1], nc[0], 2, 2, 0, bias=False),
                *[ResBlock(nc[0]) for _ in range(nb)],
            )
            self.m_tail = nn.Conv2d(nc[0], out_nc, 3, 1, 1, bias=False)

        def forward(self, x0):
            h, w = x0.shape[-2:]
            pb = int(np.ceil(h / 8) * 8 - h)
            pr = int(np.ceil(w / 8) * 8 - w)
            x0 = nn.ReplicationPad2d((0, pr, 0, pb))(x0)
            x1 = self.m_head(x0)
            x2 = self.m_down1(x1)
            x3 = self.m_down2(x2)
            x4 = self.m_down3(x3)
            x = self.m_body(x4)
            x = self.m_up3(x + x4)
            x = self.m_up2(x + x3)
            x = self.m_up1(x + x2)
            x = self.m_tail(x + x1)
            return x[..., :h, :w]

    class DRUNetWrapper(nn.Module):
        """Adapts DRUNet's 4-channel input API to the 3-channel pipeline."""
        def __init__(self, sigma):
            super().__init__()
            self.drunet = DRUNet()
            self.register_buffer("sigma", torch.tensor(sigma / 255.0))

        def forward(self, x):
            b, _, h, w = x.shape
            noise_map = self.sigma.expand(b, 1, h, w)
            return self.drunet(torch.cat([x, noise_map], dim=1)).clamp(0, 1)

    return DRUNetWrapper(sigma=sigma)


def _build_nafnet(width: int = 32):
    """
    NAFNet-SIDD-width32 — 39.72 dB on SIDD, outperforms DRUNet (38.87 dB).
    Architecture: U-Net with NAFBlocks (SimpleGate + channel attention, no Swin Transformer).
    Input/output: RGB float32 in [0, 1]. Adds input residually.
    """
    import torch, torch.nn as nn, torch.nn.functional as F

    class SimpleGate(nn.Module):
        def forward(self, x):
            x1, x2 = x.chunk(2, dim=1)
            return x1 * x2

    class LayerNorm2d(nn.LayerNorm):
        def forward(self, x):
            return super().forward(x.permute(0, 2, 3, 1)).permute(0, 3, 1, 2)

    class NAFBlock(nn.Module):
        def __init__(self, c, DW_Expand=2, FFN_Expand=2):
            super().__init__()
            dw = c * DW_Expand
            self.conv1 = nn.Conv2d(c, dw, 1)
            self.conv2 = nn.Conv2d(dw, dw, 3, 1, 1, groups=dw)
            self.conv3 = nn.Conv2d(dw // 2, c, 1)
            self.sca   = nn.Sequential(nn.AdaptiveAvgPool2d(1), nn.Conv2d(dw // 2, dw // 2, 1))
            self.conv4 = nn.Conv2d(c, FFN_Expand * c, 1)
            self.conv5 = nn.Conv2d(FFN_Expand * c // 2, c, 1)
            self.norm1 = LayerNorm2d(c)
            self.norm2 = LayerNorm2d(c)
            self.gate  = SimpleGate()
            self.beta  = nn.Parameter(torch.zeros(1, c, 1, 1))
            self.gamma = nn.Parameter(torch.zeros(1, c, 1, 1))

        def forward(self, inp):
            x = self.gate(self.conv2(self.conv1(self.norm1(inp))))
            x = x * self.sca(x)
            y = inp + self.conv3(x) * self.beta
            x = self.gate(self.conv4(self.norm2(y)))
            return y + self.conv5(x) * self.gamma

    class NAFNet(nn.Module):
        def __init__(self, w=32, mid=12, enc=(2, 2, 4, 8), dec=(2, 2, 2, 2)):
            super().__init__()
            self.intro   = nn.Conv2d(3, w, 3, 1, 1)
            self.ending  = nn.Conv2d(w, 3, 3, 1, 1)
            self.encoders = nn.ModuleList()
            self.downs    = nn.ModuleList()
            self.ups      = nn.ModuleList()
            self.decoders = nn.ModuleList()
            chan = w
            for n in enc:
                self.encoders.append(nn.ModuleList([NAFBlock(chan) for _ in range(n)]))
                self.downs.append(nn.Conv2d(chan, chan * 2, 2, 2))
                chan *= 2
            self.middle_blks = nn.ModuleList([NAFBlock(chan) for _ in range(mid)])
            for n in dec:
                self.ups.append(nn.Sequential(nn.Conv2d(chan, chan * 2, 1, bias=False), nn.PixelShuffle(2)))
                chan //= 2
                self.decoders.append(nn.ModuleList([NAFBlock(chan) for _ in range(n)]))
            self.pad = 2 ** len(enc)

        def forward(self, inp):
            B, C, H, W = inp.shape
            hp = (-H) % self.pad
            wp = (-W) % self.pad
            # Save padded input for residual — slicing inp directly would give wrong shape
            # when H or W are not multiples of self.pad (e.g. 1080p: 1080 % 16 = 8)
            inp_padded = F.pad(inp, (0, wp, 0, hp))
            x = self.intro(inp_padded)
            encs = []
            for enc, down in zip(self.encoders, self.downs):
                for blk in enc:
                    x = blk(x)
                encs.append(x)
                x = down(x)
            for blk in self.middle_blks:
                x = blk(x)
            for dec, up, skip in zip(self.decoders, self.ups, reversed(encs)):
                x = up(x) + skip
                for blk in dec:
                    x = blk(x)
            x = self.ending(x) + inp_padded
            return x[:, :, :H, :W].clamp(0, 1)

    return NAFNet(w=width)


# ---------------------------------------------------------------------------
# Weight download & load helpers
# ---------------------------------------------------------------------------

def _fetch_weights(filename: str, url: str) -> str:
    """Download weights to MODEL_DIR (cached — only downloads once)."""
    import requests
    path = os.path.join(MODEL_DIR, filename)
    if os.path.exists(path):
        return path

    os.makedirs(MODEL_DIR, exist_ok=True)
    logging.info(f"Downloading weights from {url} …")
    resp = requests.get(url, timeout=180)
    resp.raise_for_status()

    # Reject Git LFS pointer files (plain text, not a real checkpoint)
    if len(resp.content) < 50_000:
        preview = resp.content[:80].decode("utf-8", errors="ignore")
        if "git-lfs" in preview or "<html" in preview.lower():
            raise RuntimeError(
                f"Weight download returned a pointer/page instead of binary "
                f"({len(resp.content)} bytes). URL: {url}"
            )

    with open(path, "wb") as f:
        f.write(resp.content)
    model_volume.commit()
    return path


def _load_zero_dce(device):
    import torch
    path = _fetch_weights("zero_dce_epoch99.pth", ZERO_DCE_URL)
    model = _build_zero_dce()
    state = torch.load(path, map_location=device)
    model.load_state_dict(state, strict=True)
    return model.eval().to(device)


def _load_nafnet(device):
    """Primary denoiser: NAFNet-SIDD-width32 (39.72 dB > DRUNet 38.87 dB)."""
    import torch
    path = _fetch_weights("nafnet_sidd_width32.pth", NAFNET_URL)
    state = torch.load(path, map_location=device, weights_only=False)
    if isinstance(state, dict) and "params" in state:
        state = state["params"]
    model = _build_nafnet(width=32)
    model.load_state_dict(state, strict=True)
    logging.info("NAFNet-width32 loaded (39.72 dB SIDD)")
    return model.eval().to(device)


def _load_drunet(device):
    """Fallback denoiser if NAFNet fails."""
    import torch
    path = _fetch_weights("drunet_color.pth", DRUNET_URL)
    state = torch.load(path, map_location=device)
    wrapper = _build_drunet()
    wrapper.drunet.load_state_dict(state, strict=True)
    logging.info(f"DRUNet loaded as fallback (sigma={DRUNET_SIGMA})")
    return wrapper.eval().to(device)


def _load_denoiser(device):
    """Try NAFNet first; fall back to DRUNet."""
    try:
        return _load_nafnet(device)
    except Exception as exc:
        logging.warning(f"NAFNet failed ({exc}), falling back to DRUNet")
        return _load_drunet(device)


# ---------------------------------------------------------------------------
# GPU batch frame processing
# ---------------------------------------------------------------------------

def _lab_blend(original_rgb, enhanced_rgb, brightness: float, color: float):
    """
    Blend Zero-DCE output with original in LAB space.
    L channel  → controls brightness boost  (LL_BRIGHTNESS)
    A/B channels → controls colour shift    (LL_COLOR)
    Returns RGB uint8.
    """
    import cv2
    import numpy as np
    orig = cv2.cvtColor(original_rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    enh  = cv2.cvtColor(enhanced_rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    result = orig.copy()
    result[..., 0] = orig[..., 0] + brightness * (enh[..., 0] - orig[..., 0])
    result[..., 1] = orig[..., 1] + color     * (enh[..., 1] - orig[..., 1])
    result[..., 2] = orig[..., 2] + color     * (enh[..., 2] - orig[..., 2])
    return cv2.cvtColor(np.clip(result, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)


def _unsharp_mask(frame, amount: float = SHARPEN_AMOUNT, radius: float = SHARPEN_RADIUS):
    """Recover fine detail lost during denoising via unsharp masking."""
    import cv2
    import numpy as np
    blurred = cv2.GaussianBlur(frame, (0, 0), radius)
    return np.clip(cv2.addWeighted(frame, 1.0 + amount, blurred, -amount, 0), 0, 255).astype(np.uint8)


def _temporal_blend(current, prev, alpha: float):
    """Blend current enhanced frame with previous to reduce flicker."""
    import numpy as np
    return (current.astype(np.float32) * alpha + prev.astype(np.float32) * (1.0 - alpha)).clip(0, 255).astype(np.uint8)


def _process_frames_gpu(input_path: str, output_path: str, model, device,
                        batch_size: int = 4, postprocess_fn=None,
                        temporal_alpha: float = TEMPORAL_ALPHA):
    """Read → batch on GPU → post-process → temporal smoothing → write → mux audio."""
    import cv2
    import numpy as np
    import subprocess
    import torch

    cap = cv2.VideoCapture(input_path)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    tmp = output_path.replace(".mp4", "_tmp.mp4")
    writer = cv2.VideoWriter(tmp, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))

    buf = []
    processed = 0
    prev_frame = [None]  # mutable container so flush() can update it

    def flush(buf):
        originals = np.stack(buf)                                # (B, H, W, 3) uint8 RGB
        t = torch.from_numpy(originals).permute(0, 3, 1, 2).float().div(255.0).to(device)
        with torch.no_grad():
            out = model(t)
        out_np = (out.permute(0, 2, 3, 1).cpu().numpy() * 255).clip(0, 255).astype(np.uint8)
        for orig, enhanced in zip(originals, out_np):
            result = postprocess_fn(orig, enhanced) if postprocess_fn else enhanced
            if prev_frame[0] is not None:
                result = _temporal_blend(result, prev_frame[0], temporal_alpha)
            prev_frame[0] = result
            writer.write(cv2.cvtColor(result, cv2.COLOR_RGB2BGR))

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        buf.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        if len(buf) == batch_size:
            flush(buf)
            buf = []
        processed += 1
        if processed % 150 == 0:
            logging.info(f"  {processed}/{total} frames processed")

    if buf:
        flush(buf)

    cap.release()
    writer.release()

    subprocess.run(
        ["ffmpeg", "-y",
         "-i", tmp, "-i", input_path,
         "-c:v", "libx264", "-crf", "20", "-preset", "fast", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0?",
         output_path],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    os.remove(tmp)


def _process_frames_gpu_combined(input_path: str, output_path: str,
                                  ll_model, dn_model, device, batch_size: int = 2):
    """
    Combined pipeline: Zero-DCE (low-light) → LAB blend → DRUNet (denoise).
    Both models run on GPU in a single frame pass — no intermediate temp file.
    batch_size=2 keeps VRAM comfortable when two large models are resident.
    """
    import cv2
    import numpy as np
    import subprocess
    import torch

    cap = cv2.VideoCapture(input_path)
    w     = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h     = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps   = cap.get(cv2.CAP_PROP_FPS)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    tmp    = output_path.replace(".mp4", "_tmp.mp4")
    writer = cv2.VideoWriter(tmp, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))

    buf       = []
    processed = 0
    prev_frame = [None]

    def flush(buf):
        originals = np.stack(buf)                                       # (B,H,W,3) uint8 RGB

        # ── Step 1: Zero-DCE low-light enhancement ──────────────────────
        t = torch.from_numpy(originals).permute(0, 3, 1, 2).float().div(255.0).to(device)
        with torch.no_grad():
            ll_out = ll_model(t)
        ll_np = (ll_out.permute(0, 2, 3, 1).cpu().numpy() * 255).clip(0, 255).astype(np.uint8)

        # ── Step 2: LAB blend — tone down colour shift & brightness ─────
        blended = np.stack([
            _lab_blend(orig, enh, LL_BRIGHTNESS, LL_COLOR)
            for orig, enh in zip(originals, ll_np)
        ])

        # ── Step 3: NAFNet denoising + blend to preserve detail ─────────
        t2 = torch.from_numpy(blended).permute(0, 3, 1, 2).float().div(255.0).to(device)
        with torch.no_grad():
            dn_out = dn_model(t2)
        dn_raw = (dn_out.permute(0, 2, 3, 1).cpu().numpy() * 255).clip(0, 255).astype(np.uint8)
        dn_np = np.clip(
            DENOISE_BLEND * dn_raw.astype(np.float32) +
            (1.0 - DENOISE_BLEND) * blended.astype(np.float32),
            0, 255
        ).astype(np.uint8)

        # ── Step 4: Temporal smoothing ───────────────────────────────────
        # ── Step 5: Unsharp mask — recover detail lost by denoiser ─────
        for f in dn_np:
            if prev_frame[0] is not None:
                f = _temporal_blend(f, prev_frame[0], TEMPORAL_ALPHA)
            prev_frame[0] = f
            f = _unsharp_mask(f)
            writer.write(cv2.cvtColor(f, cv2.COLOR_RGB2BGR))

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        buf.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        if len(buf) == batch_size:
            flush(buf)
            buf = []
        processed += 1
        if processed % 150 == 0:
            logging.info(f"  {processed}/{total} frames processed")

    if buf:
        flush(buf)

    cap.release()
    writer.release()

    subprocess.run(
        ["ffmpeg", "-y",
         "-i", tmp, "-i", input_path,
         "-c:v", "libx264", "-crf", "20", "-preset", "fast", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0?",
         output_path],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    os.remove(tmp)


# ---------------------------------------------------------------------------
# Traditional fallbacks (better than original MVP versions)
# ---------------------------------------------------------------------------

def _low_light_fallback(input_path: str, output_path: str):
    """Improved CLAHE + gamma fallback if Zero-DCE weights unavailable."""
    import cv2
    import numpy as np
    import subprocess

    cap = cv2.VideoCapture(input_path)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    tmp = output_path.replace(".mp4", "_tmp.mp4")
    out = cv2.VideoWriter(tmp, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    table = (((np.arange(256) / 255.0) ** (1.0 / 1.8)) * 255).astype("uint8")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        gamma = cv2.LUT(frame, table)
        lab = cv2.cvtColor(gamma, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        out.write(cv2.cvtColor(cv2.merge((clahe.apply(l), a, b)), cv2.COLOR_LAB2BGR))

    cap.release()
    out.release()
    subprocess.run(
        ["ffmpeg", "-y",
         "-i", tmp, "-i", input_path,
         "-c:v", "libx264", "-crf", "20", "-preset", "fast", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0?",
         output_path],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    os.remove(tmp)


def _denoise_fallback(input_path: str, output_path: str):
    """Non-Local Means fallback if DnCNN weights unavailable."""
    import cv2
    import subprocess

    cap = cv2.VideoCapture(input_path)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    tmp = output_path.replace(".mp4", "_tmp.mp4")
    out = cv2.VideoWriter(tmp, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        out.write(cv2.fastNlMeansDenoisingColored(frame, None, 10, 10, 7, 21))

    cap.release()
    out.release()
    subprocess.run(
        ["ffmpeg", "-y",
         "-i", tmp, "-i", input_path,
         "-c:v", "libx264", "-crf", "20", "-preset", "fast", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0?",
         output_path],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    os.remove(tmp)


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------

def _download_video(url: str, dest_path: str):
    import requests
    resp = requests.get(url, stream=True, timeout=120)
    resp.raise_for_status()
    with open(dest_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)


def _upload_to_supabase(local_path: str, filename: str) -> str:
    from supabase import create_client
    client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    with open(local_path, "rb") as f:
        client.storage.from_("enhanced-videos").upload(
            filename, f, {"content-type": "video/mp4", "upsert": "true"}
        )
    return client.storage.from_("enhanced-videos").get_public_url(filename)


def _update_job(job_id: str, status: str, enhanced_url: str = None, error: str = None):
    from supabase import create_client
    from datetime import datetime, timezone
    client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    data = {"status": status}
    if enhanced_url:
        data["enhanced_url"] = enhanced_url
        data["completed_at"] = datetime.now(timezone.utc).isoformat()
    if error:
        data["error_log"] = error
    client.table("jobs").update(data).eq("id", job_id).execute()


# ---------------------------------------------------------------------------
# Main Modal function — T4 GPU
# ---------------------------------------------------------------------------

@app.function(
    gpu="T4",
    secrets=[modal.Secret.from_name("supabase-credentials")],
    timeout=600,
    volumes={MODEL_DIR: model_volume},
)
def process_video(job_id: str, video_url: str, task_type: str = "denoising"):
    logging.basicConfig(level=logging.INFO)
    log = logging.getLogger(__name__)

    import torch
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    log.info(f"[{job_id}] Starting '{task_type}' | device={device}")
    _update_job(job_id, "processing")

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = os.path.join(tmpdir, "input.mp4")
            output_filename = f"enhanced_{job_id}.mp4"
            output_path = os.path.join(tmpdir, output_filename)

            log.info(f"[{job_id}] Downloading video…")
            _download_video(video_url, input_path)

            log.info(f"[{job_id}] Running {task_type} enhancement…")

            if task_type == "low_light":
                try:
                    model = _load_zero_dce(device)
                    log.info(f"[{job_id}] Zero-DCE loaded — running GPU inference… (brightness={LL_BRIGHTNESS}, color={LL_COLOR})")
                    _process_frames_gpu(
                        input_path, output_path, model, device,
                        postprocess_fn=lambda o, e: _lab_blend(o, e, LL_BRIGHTNESS, LL_COLOR),
                    )
                except Exception as exc:
                    log.warning(f"[{job_id}] Zero-DCE failed ({exc}) — using CLAHE fallback")
                    _low_light_fallback(input_path, output_path)

            elif task_type == "enhance":
                try:
                    ll_model = _load_zero_dce(device)
                    dn_model = _load_denoiser(device)
                    log.info(f"[{job_id}] Both models loaded — running combined GPU pipeline…")
                    _process_frames_gpu_combined(input_path, output_path, ll_model, dn_model, device)
                except Exception as exc:
                    log.warning(f"[{job_id}] Combined pipeline failed ({exc}) — running fallback chain")
                    _low_light_fallback(input_path, output_path)

            else:
                try:
                    import numpy as np
                    model = _load_denoiser(device)
                    log.info(f"[{job_id}] Denoiser loaded — running GPU inference (blend={DENOISE_BLEND})…")
                    def _denoise_postprocess(orig, enhanced):
                        return np.clip(
                            DENOISE_BLEND * enhanced.astype(np.float32) +
                            (1.0 - DENOISE_BLEND) * orig.astype(np.float32),
                            0, 255
                        ).astype(np.uint8)
                    _process_frames_gpu(
                        input_path, output_path, model, device,
                        batch_size=2,
                        postprocess_fn=_denoise_postprocess,
                    )
                except Exception as exc:
                    log.warning(f"[{job_id}] Denoiser failed ({exc}) — using NL-Means fallback")
                    _denoise_fallback(input_path, output_path)

            log.info(f"[{job_id}] Uploading result…")
            public_url = _upload_to_supabase(output_path, output_filename)

        log.info(f"[{job_id}] Done → {public_url}")
        _update_job(job_id, "completed", enhanced_url=public_url)

    except Exception as exc:
        log.error(f"[{job_id}] Failed: {exc}")
        _update_job(job_id, "failed", error=str(exc))
        raise
