"""
Brutal Ads — engagement engine (FastAPI).

Implements the EngagementPredictor surface (docs/08). The commercial default backend is
`saliency`: a zero-external-cost, pure numpy+Pillow spectral-residual saliency implementation
(Hou & Zhang 2007, `app/saliency/spectral_residual.py`) plus our own layer-geometry-aware grid
heuristics (`app/saliency/metrics.py`). No model weights, no downloads, no paid APIs. TRIBE v2 is
a flag-gated R&D backend that is NEVER reachable on the commercial path (CANON §9, docs/08 §6):
it loads only when BOTH ENGAGEMENT_BACKEND=tribe_research AND RESEARCH_MODE=true.

Python 3.9 compatible: typing.Optional/typing.List used throughout (no `X | Y`, no bare `list[str]`
in pydantic models), per the runtime this service targets.
"""
import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from app.saliency.scoring import ScoringError, score_image

app = FastAPI(title="Brutal Ads Engagement Engine", version="0.1.0")

ENGAGEMENT_BACKEND = os.getenv("ENGAGEMENT_BACKEND", "saliency")
RESEARCH_MODE = os.getenv("RESEARCH_MODE", "false").lower() == "true"
ENGINE_SHARED_SECRET = os.getenv("ENGINE_SHARED_SECRET", "")

# Fail-closed guardrail (defense-in-depth, docs/08 §6): TRIBE only under BOTH flags.
TRIBE_ENABLED = ENGAGEMENT_BACKEND == "tribe_research" and RESEARCH_MODE
if ENGAGEMENT_BACKEND == "tribe_research" and not RESEARCH_MODE:
    raise RuntimeError(
        "ENGAGEMENT_BACKEND=tribe_research requires RESEARCH_MODE=true (non-commercial only). Refusing to start."
    )


class LayerBox(BaseModel):
    id: Optional[str] = None
    role: str                     # 'headline' | 'cta' | 'logo' | 'legal' | 'image' | 'other'
    x: float
    y: float
    w: float
    h: float


class ScoreRequest(BaseModel):
    kind: str = "render"                     # 'render' | 'video' | 'grid'
    asset_ids: List[str] = []
    render_url: Optional[str] = None
    backend: Optional[str] = None             # callers may pin; commercial path must be 'saliency'
    image_b64: Optional[str] = None           # base64 PNG/JPG bytes (optionally a data: URL)
    image_path: Optional[str] = None          # local file path (alternative to image_b64)
    layers: Optional[List[LayerBox]] = None   # pixel-space layer boxes in ORIGINAL image coords


class Band(BaseModel):
    low: float
    high: float
    confidence: float


class Scored(BaseModel):
    value: float
    band: List[float]
    confidence: float


class EngagementScores(BaseModel):
    backend: str
    saliencySource: Optional[str] = None
    modelVersion: Optional[str] = None
    attentionMap: Optional[Any] = None
    focalClarity: Scored
    valuePropAttention: Scored
    ctaAttention: Scored
    clutter: Scored
    stoppingPower: Scored
    firstThreeSeconds: Optional[Scored] = None
    predictedCtrBand: Optional[Band] = None
    perSlide: List["EngagementScores"] = []
    scoredAt: Optional[str] = None
    raw: Dict[str, Any] = {}


def _auth(secret: Optional[str]) -> None:
    if not ENGINE_SHARED_SECRET or secret != ENGINE_SHARED_SECRET:
        raise HTTPException(status_code=401, detail="bad or missing X-Engine-Secret")


@app.get("/health")
def health() -> dict:
    return {"ok": True, "backend": ENGAGEMENT_BACKEND, "tribe_enabled": TRIBE_ENABLED}


@app.post("/v1/score", response_model=EngagementScores)
def score(req: ScoreRequest, x_engine_secret: Optional[str] = Header(default=None)) -> EngagementScores:
    _auth(x_engine_secret)
    backend = req.backend or ENGAGEMENT_BACKEND
    if backend == "tribe_research" and not TRIBE_ENABLED:
        # Never allow the NC research backend on a commercial/billable call.
        raise HTTPException(status_code=400, detail="tribe_research backend not enabled (non-commercial only)")

    if not req.image_b64 and not req.image_path:
        raise HTTPException(status_code=400, detail="image_b64 or image_path is required for the saliency backend")

    layers = [layer.dict() for layer in req.layers] if req.layers else None
    try:
        result = score_image(image_b64=req.image_b64, image_path=req.image_path, layers=layers)
    except ScoringError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return EngagementScores(**result)
