"""
Brutal Ads — engagement engine (FastAPI). SKELETON.

Implements the EngagementPredictor surface (docs/08). The commercial default backend is
`saliency` (CPU-only, commercially-clean, e.g. TranSalNet MIT + grid heuristics). TRIBE v2 is a
flag-gated R&D backend that is NEVER reachable on the commercial path (CANON §9, docs/08 §6):
it loads only when BOTH ENGAGEMENT_BACKEND=tribe_research AND RESEARCH_MODE=true.

The factory replaces the mock scoring with the real saliency implementation per docs/08.
"""
import os

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

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


class ScoreRequest(BaseModel):
    kind: str                     # 'render' | 'video' | 'grid'
    asset_ids: list[str] = []
    render_url: str | None = None
    backend: str | None = None    # callers may pin; commercial path must be 'saliency'


class Band(BaseModel):
    low: float
    high: float
    confidence: float


class EngagementScores(BaseModel):
    focalClarity: float
    valuePropAttention: float
    ctaAttention: float
    clutter: float
    stoppingPower: float
    firstThreeSeconds: float | None = None
    predictedCtrBand: Band | None = None
    perSlide: list["EngagementScores"] = []
    backend: str
    raw: dict = {}


def _auth(secret: str | None) -> None:
    if not ENGINE_SHARED_SECRET or secret != ENGINE_SHARED_SECRET:
        raise HTTPException(status_code=401, detail="bad or missing X-Engine-Secret")


@app.get("/health")
def health() -> dict:
    return {"ok": True, "backend": ENGAGEMENT_BACKEND, "tribe_enabled": TRIBE_ENABLED}


@app.post("/v1/score", response_model=EngagementScores)
def score(req: ScoreRequest, x_engine_secret: str | None = Header(default=None)) -> EngagementScores:
    _auth(x_engine_secret)
    backend = req.backend or ENGAGEMENT_BACKEND
    if backend == "tribe_research" and not TRIBE_ENABLED:
        # Never allow the NC research backend on a commercial/billable call.
        raise HTTPException(status_code=400, detail="tribe_research backend not enabled (non-commercial only)")

    # TODO(factory): real saliency scoring per docs/08. Mock, clearly-flagged, decision-support-only bands.
    return EngagementScores(
        focalClarity=0.0,
        valuePropAttention=0.0,
        ctaAttention=0.0,
        clutter=0.0,
        stoppingPower=0.0,
        predictedCtrBand=Band(low=0.0, high=0.0, confidence=0.0),
        backend=backend,
        raw={"stub": True, "note": "replace with real saliency per docs/08"},
    )
