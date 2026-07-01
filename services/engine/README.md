# services/engine — Engagement engine (FastAPI)

Implements the `EngagementPredictor` surface (**docs/08**). Skeleton with a health route, an authed
`/v1/score` stub, and the TRIBE double-gate guardrail already in place.

```bash
cd services/engine
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # http://localhost:8000/health
```

- **Commercial default:** `ENGAGEMENT_BACKEND=saliency` (CPU-only; factory adds TranSalNet (MIT) + grid
  heuristics + landing capture per docs/08).
- **TRIBE v2 (CC-BY-NC-4.0):** research-only. Loads **only** when `ENGAGEMENT_BACKEND=tribe_research` **and**
  `RESEARCH_MODE=true`; it is never reachable on the commercial path (CANON §9). Its deps live in an optional
  `[research]` group the commercial image must not install.
- Auth: `apps/web` calls with header `X-Engine-Secret: $ENGINE_SHARED_SECRET`.
