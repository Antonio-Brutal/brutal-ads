"""
Spectral-residual saliency (Hou & Zhang, 2007), pure numpy + Pillow.

NO model weights, NO downloads, NO network calls. This is the zero-external-cost
`saliency.spectral_residual` driver (docs/08 §4 commercial default substitute — see
services/engine/README.md for the licensing rationale vs TranSalNet).

Algorithm (docs/08 STEP 2 spec):
    1. grayscale, resize to a small working size (~128px on the long edge)
    2. FFT -> log amplitude spectrum + phase
    3. "spectral residual" = log amplitude minus its 3x3 local-average (blurred) version
    4. inverse FFT using the residual amplitude + the ORIGINAL phase
    5. saliency = squared magnitude of that inverse FFT
    6. Gaussian-smooth the result (perceptual pooling, per Hou & Zhang)
    7. normalize to [0, 1]
    8. resize back up to the original image size
"""
from typing import Tuple

import numpy as np
from PIL import Image

WORKING_SIZE = 128  # long-edge working resolution, per spec


def _to_grayscale_array(img: Image.Image) -> np.ndarray:
    return np.asarray(img.convert("L"), dtype=np.float64)


def _resize_for_processing(gray: np.ndarray, working_size: int = WORKING_SIZE) -> Tuple[np.ndarray, Tuple[int, int]]:
    """Resize to a small working size (long edge = working_size), preserving aspect ratio."""
    h, w = gray.shape
    original_size = (h, w)
    if max(h, w) <= 0:
        return gray, original_size
    scale = working_size / float(max(h, w))
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    img = Image.fromarray(gray.astype(np.uint8))
    resized = img.resize((new_w, new_h), resample=Image.BILINEAR)
    return np.asarray(resized, dtype=np.float64), original_size


def _box_blur_3x3(arr: np.ndarray) -> np.ndarray:
    """3x3 local average via padding + shifted sums (pure numpy, no scipy dependency)."""
    padded = np.pad(arr, 1, mode="edge")
    out = np.zeros_like(arr)
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            out += padded[dy: dy + arr.shape[0], dx: dx + arr.shape[1]]
    return out / 9.0


def _gaussian_kernel_1d(sigma: float, radius: int) -> np.ndarray:
    x = np.arange(-radius, radius + 1, dtype=np.float64)
    kernel = np.exp(-(x ** 2) / (2.0 * sigma ** 2))
    kernel /= kernel.sum()
    return kernel


def _gaussian_blur(arr: np.ndarray, sigma: float = 3.0) -> np.ndarray:
    """Separable Gaussian smoothing, pure numpy (no scipy/opencv dependency)."""
    radius = max(1, int(round(3 * sigma)))
    kernel = _gaussian_kernel_1d(sigma, radius)
    # horizontal pass
    padded = np.pad(arr, ((0, 0), (radius, radius)), mode="edge")
    out = np.zeros_like(arr)
    for i, k in enumerate(kernel):
        out += k * padded[:, i: i + arr.shape[1]]
    # vertical pass
    padded = np.pad(out, ((radius, radius), (0, 0)), mode="edge")
    out2 = np.zeros_like(arr)
    for i, k in enumerate(kernel):
        out2 += k * padded[i: i + arr.shape[0], :]
    return out2


def _normalize01(arr: np.ndarray) -> np.ndarray:
    lo, hi = float(arr.min()), float(arr.max())
    span = hi - lo
    if span < 1e-12:
        return np.zeros_like(arr)
    return (arr - lo) / span


def compute_saliency_map(image: Image.Image, working_size: int = WORKING_SIZE) -> np.ndarray:
    """
    Compute a spectral-residual saliency map for `image`.

    Returns a float64 array shape (orig_h, orig_w), values normalized to [0, 1].
    """
    gray = _to_grayscale_array(image)
    orig_h, orig_w = gray.shape

    small, _ = _resize_for_processing(gray, working_size)

    fft = np.fft.fft2(small)
    amplitude = np.abs(fft)
    phase = np.angle(fft)

    log_amplitude = np.log(amplitude + 1e-8)
    avg_log_amplitude = _box_blur_3x3(log_amplitude)
    spectral_residual = log_amplitude - avg_log_amplitude

    # Reconstruct with residual amplitude + original phase.
    reconstructed = np.exp(spectral_residual) * np.exp(1j * phase)
    inverse = np.fft.ifft2(reconstructed)
    saliency_small = np.abs(inverse) ** 2

    saliency_small = _gaussian_blur(saliency_small, sigma=3.0)
    saliency_small = _normalize01(saliency_small)

    # Resize back up to the original image resolution.
    small_img = Image.fromarray((saliency_small * 255.0).astype(np.uint8))
    full_img = small_img.resize((orig_w, orig_h), resample=Image.BILINEAR)
    saliency_full = np.asarray(full_img, dtype=np.float64) / 255.0
    return _normalize01(saliency_full)
