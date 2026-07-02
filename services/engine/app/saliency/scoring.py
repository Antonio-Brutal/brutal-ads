"""
Orchestrates the `saliency` backend end-to-end: decode image -> saliency map -> per-role
metrics (using optional layer boxes) -> band+confidence EngagementScores payload.

Zero external cost: no model downloads, no network calls, pure numpy + Pillow.
"""
import base64
import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image

from app.saliency.metrics import (
    attention_map_grid,
    clutter as clutter_metric,
    focal_clarity,
    predicted_ctr_band,
    role_attention_ratio,
    scored,
    squash,
    stopping_power,
)
from app.saliency.spectral_residual import compute_saliency_map

MODEL_VERSION = "sr-1.0"
SALIENCY_SOURCE = "saliency.spectral_residual"


class ScoringError(ValueError):
    """Raised for bad/unusable image input."""


def _decode_image(image_b64: Optional[str], image_path: Optional[str]) -> Image.Image:
    if image_b64:
        payload = image_b64
        if "," in payload and payload.strip().startswith("data:"):
            # tolerate data: URLs (data:image/png;base64,....)
            payload = payload.split(",", 1)[1]
        try:
            raw = base64.b64decode(payload, validate=False)
        except Exception as exc:  # noqa: BLE001
            raise ScoringError(f"invalid base64 image_b64: {exc}") from exc
        try:
            return Image.open(io.BytesIO(raw)).convert("RGB")
        except Exception as exc:  # noqa: BLE001
            raise ScoringError(f"could not decode image bytes: {exc}") from exc
    if image_path:
        try:
            return Image.open(image_path).convert("RGB")
        except Exception as exc:  # noqa: BLE001
            raise ScoringError(f"could not open image_path {image_path!r}: {exc}") from exc
    raise ScoringError("one of image_b64 or image_path is required")


def _layer_boxes_by_role(layers: Optional[List[Dict[str, Any]]], role: str) -> List[Tuple[int, int, int, int]]:
    if not layers:
        return []
    boxes = []
    for layer in layers:
        if layer.get("role") == role:
            try:
                boxes.append((float(layer["x"]), float(layer["y"]), float(layer["w"]), float(layer["h"])))
            except (KeyError, TypeError, ValueError):
                continue
    return boxes


def score_image(
    image_b64: Optional[str] = None,
    image_path: Optional[str] = None,
    layers: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Score a single image with the zero-cost spectral-residual saliency backend.

    Returns a dict matching the EngagementScores shape (docs/03 §8.3 / docs/08 §2.2),
    plus backend/saliencySource/modelVersion/scoredAt/raw metadata (STEP 2 response shape).
    """
    image = _decode_image(image_b64, image_path)
    gray = np.asarray(image.convert("L"), dtype=np.float64)

    saliency = compute_saliency_map(image)

    fc = focal_clarity(saliency)
    clut = clutter_metric(gray)
    sp = stopping_power(saliency)

    headline_boxes = _layer_boxes_by_role(layers, "headline")
    cta_boxes = _layer_boxes_by_role(layers, "cta")

    headline_ratio = role_attention_ratio(saliency, headline_boxes)
    cta_ratio = role_attention_ratio(saliency, cta_boxes)

    value_prop_value = squash(headline_ratio) if headline_ratio is not None else 0.0
    cta_value = squash(cta_ratio) if cta_ratio is not None else 0.0

    # Confidence is intentionally modest and uncalibrated: no tenant Result data has been
    # fed back yet (docs/08 §9.6 "never overclaim"). Metrics driven by real layer boxes get
    # slightly higher confidence than metrics with no boxes to anchor them.
    base_confidence = 0.55
    has_headline = headline_ratio is not None
    has_cta = cta_ratio is not None

    scores: Dict[str, Any] = {
        "backend": "saliency",
        "saliencySource": SALIENCY_SOURCE,
        "modelVersion": MODEL_VERSION,
        "focalClarity": scored(fc, half_width=0.10, confidence=base_confidence),
        "valuePropAttention": scored(
            value_prop_value, half_width=0.15, confidence=base_confidence + 0.05 if has_headline else 0.25
        ),
        "ctaAttention": scored(
            cta_value, half_width=0.15, confidence=base_confidence + 0.05 if has_cta else 0.25
        ),
        "clutter": scored(clut, half_width=0.08, confidence=0.6),
        "stoppingPower": scored(sp, half_width=0.12, confidence=0.5),
        "predictedCtrBand": predicted_ctr_band(sp),
        "attentionMap": attention_map_grid(saliency),
        "scoredAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "raw": {
            "uncalibrated": True,
            "note": "global-prior placeholder; no tenant Result data yet (docs/08 §9.6)",
            "saliencyStats": {
                "peak": round(float(np.percentile(saliency, 92.0)), 4),
                "mean": round(float(saliency.mean()), 4),
            },
            "imageSize": {"width": image.width, "height": image.height},
            "layerCounts": {
                "headline": len(headline_boxes),
                "cta": len(cta_boxes),
            },
        },
    }
    return scores
