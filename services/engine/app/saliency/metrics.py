"""
Commercially-clean STATIC metric computation over a spectral-residual saliency map.

Pure numpy. No model weights, no network calls. Produces the band+confidence "Scored"
objects described in docs/08 §0.6/§3.3 and docs/03 §8.3 ("never sell a number as truth").

This is a from-scratch, zero-external-cost implementation (no TranSalNet, no vendor API) —
see services/engine/README.md "Deviations from docs/08" for the one-line rationale.
"""
import math
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image

GRID_SIZE = 12  # attentionMap grid resolution (STEP 2 spec)
PEAK_PERCENTILE = 92.0  # docs/08 §3.3/§7.2: peak = 92nd percentile
GRADIENT_CLUTTER_THRESHOLD = 0.25  # fraction-of-max-gradient threshold for the clutter metric

Roles = ("headline", "cta", "logo", "legal", "image", "other")


def _clip01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def scored(value: float, half_width: float, confidence: float) -> Dict[str, Any]:
    """Build a {value, band, confidence} object (docs/03 §8.3 'Scored' shape)."""
    value = _clip01(value)
    confidence = max(0.0, min(1.0, float(confidence)))
    lo = _clip01(value - half_width)
    hi = _clip01(value + half_width)
    if lo > hi:
        lo, hi = hi, lo
    return {"value": round(value, 4), "band": [round(lo, 4), round(hi, 4)], "confidence": round(confidence, 4)}


def squash(x: float) -> float:
    """x / (1 + x): maps [0, inf) -> [0, 1), monotone, matches the STEP 2 spec exactly."""
    x = max(0.0, x)
    return x / (1.0 + x)


def _percentile(values: np.ndarray, pct: float) -> float:
    if values.size == 0:
        return 0.0
    return float(np.percentile(values, pct))


def focal_clarity(saliency: np.ndarray) -> float:
    """
    Saliency mass concentration: share of total saliency mass held by the top-decile
    (highest 10%) of cells, by saliency value. Near 1.0 => one clear focal point;
    near 0.1 (uniform floor for a 10%-mass-in-10%-of-pixels baseline) => spread out.
    """
    flat = saliency.flatten()
    total = float(flat.sum())
    if total <= 1e-12:
        return 0.0
    n = flat.size
    top_decile_n = max(1, int(math.ceil(n * 0.10)))
    # partition for the top-k largest values (faster & exact enough vs full sort)
    top_vals = np.partition(flat, n - top_decile_n)[n - top_decile_n:]
    return _clip01(float(top_vals.sum()) / total)


def _gradient_magnitude(gray: np.ndarray) -> np.ndarray:
    """Simple Sobel-like gradient magnitude, pure numpy."""
    gx = np.zeros_like(gray)
    gy = np.zeros_like(gray)
    gx[:, 1:-1] = gray[:, 2:] - gray[:, :-2]
    gx[:, 0] = gray[:, 1] - gray[:, 0]
    gx[:, -1] = gray[:, -1] - gray[:, -2]
    gy[1:-1, :] = gray[2:, :] - gray[:-2, :]
    gy[0, :] = gray[1, :] - gray[0, :]
    gy[-1, :] = gray[-1, :] - gray[-2, :]
    return np.sqrt(gx ** 2 + gy ** 2)


def clutter(gray: np.ndarray) -> float:
    """Fraction of pixels with gradient magnitude above a threshold (edge-density clutter proxy)."""
    grad = _gradient_magnitude(gray)
    max_grad = float(grad.max())
    if max_grad <= 1e-12:
        return 0.0
    normalized = grad / max_grad
    above = float(np.mean(normalized > GRADIENT_CLUTTER_THRESHOLD))
    return _clip01(above)


def _box_mean(saliency: np.ndarray, box: Tuple[int, int, int, int]) -> Optional[float]:
    x, y, w, h = box
    H, W = saliency.shape
    x0 = max(0, min(W, int(round(x))))
    y0 = max(0, min(H, int(round(y))))
    x1 = max(0, min(W, int(round(x + w))))
    y1 = max(0, min(H, int(round(y + h))))
    if x1 <= x0 or y1 <= y0:
        return None
    region = saliency[y0:y1, x0:x1]
    if region.size == 0:
        return None
    return float(region.mean())


def role_attention_ratio(saliency: np.ndarray, boxes: List[Tuple[int, int, int, int]]) -> Optional[float]:
    """mean saliency inside role boxes / global mean saliency. None if no boxes."""
    if not boxes:
        return None
    means = [m for m in (_box_mean(saliency, b) for b in boxes) if m is not None]
    if not means:
        return None
    global_mean = float(saliency.mean())
    if global_mean <= 1e-12:
        return 0.0
    return float(np.mean(means)) / global_mean


def stopping_power(saliency: np.ndarray) -> float:
    """Composite: normalized peak concentration + overall focal clarity, in [0,1]."""
    norm_peak = _clip01(_percentile(saliency, PEAK_PERCENTILE))
    fc = focal_clarity(saliency)
    return _clip01(0.6 * norm_peak + 0.4 * fc)


def attention_map_grid(saliency: np.ndarray, grid_size: int = GRID_SIZE) -> List[List[float]]:
    """Downsample saliency to a grid_size x grid_size grid, normalized to [0,1], for UI heatmap rendering."""
    img = Image.fromarray((_clip01_array(saliency) * 255.0).astype(np.uint8))
    small = img.resize((grid_size, grid_size), resample=Image.BILINEAR)
    arr = np.asarray(small, dtype=np.float64) / 255.0
    lo, hi = float(arr.min()), float(arr.max())
    span = hi - lo
    if span > 1e-12:
        arr = (arr - lo) / span
    else:
        arr = np.zeros_like(arr)
    return [[round(float(v), 4) for v in row] for row in arr.tolist()]


def _clip01_array(arr: np.ndarray) -> np.ndarray:
    return np.clip(arr, 0.0, 1.0)


def predicted_ctr_band(stopping_power_value: float) -> Dict[str, float]:
    """
    Uncalibrated, WIDE, low-confidence CTR band (docs/08 §9.6: never overclaim; no tenant
    Result data yet, so this is a global-prior placeholder, clearly flagged uncalibrated in `raw`).
    """
    base_low, base_high = 0.004, 0.025  # documented, deliberately wide global prior (STEP 2 spec)
    # Nudge slightly with stopping power, but keep the band wide regardless.
    shift = (stopping_power_value - 0.5) * 0.01
    low = max(0.0005, base_low + shift)
    high = max(low + 0.005, base_high + shift)
    return {"low": round(low, 5), "high": round(high, 5), "confidence": 0.2}
