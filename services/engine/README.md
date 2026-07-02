# services/engine — Engagement engine (FastAPI)

Implements the `EngagementPredictor` surface (**docs/08**). The commercial default backend,
`saliency`, is **zero external cost**: pure `numpy` + `Pillow`, no model weights, no downloads, no
paid APIs, no network calls. The TRIBE double-gate guardrail and `X-Engine-Secret` auth are
unchanged from the original skeleton.

## Algorithm summary

**Saliency map — spectral residual (Hou & Zhang, 2007)**, `app/saliency/spectral_residual.py`:

1. Grayscale the image; resize to a small working size (long edge ≈ 128px).
2. 2D FFT → log-amplitude spectrum + phase.
3. Spectral residual = log-amplitude − its 3×3 local average (a cheap "blur" via padded shifted
   sums, no scipy/opencv dependency).
4. Inverse FFT using `exp(residual) * exp(i·phase)` (residual amplitude, **original** phase).
5. Saliency = squared magnitude of the inverse FFT.
6. Separable Gaussian smoothing (perceptual pooling), pure numpy.
7. Normalize to `[0, 1]`, resize back up to the original image resolution.

**Metrics — `app/saliency/metrics.py`** (all returned as `{value, band, confidence}` "Scored"
objects per `docs/03` §8.3 / `docs/08` §0.6 — never a bare number):

| Metric | Computation |
|---|---|
| `focalClarity` | Share of total saliency mass held by the top-decile (highest 10%) of pixels — concentration proxy; near 1.0 = one clear focal point. |
| `valuePropAttention` | mean saliency inside `headline`-role layer boxes ÷ global mean saliency, squashed via `x/(1+x)` to `[0,1)`. |
| `ctaAttention` | Same ratio/squash, but for `cta`-role layer boxes — the "killer feature" (real layer geometry, not a guess). |
| `clutter` | Fraction of pixels whose Sobel-like gradient magnitude exceeds 25% of the image's max gradient. |
| `stoppingPower` | `0.6 · norm_peak(S) + 0.4 · focalClarity`, where `norm_peak` = 92nd percentile of saliency (docs/08 §3.3/§7.2 convention). |
| `predictedCtrBand` | Deliberately wide, low-confidence (`confidence=0.2`) global-prior placeholder (`low≈0.004`–`high≈0.025`, nudged slightly by `stoppingPower`). Flagged `raw.uncalibrated=true` — there is no tenant `Result` data yet to calibrate against (docs/08 §9.6 "never overclaim"). |
| `attentionMap` | 12×12 grid of the saliency map (bilinear-downsampled, re-normalized to `[0,1]`), for UI heatmap rendering. |

Response shape (`POST /v1/score`): `{backend:"saliency", saliencySource:"saliency.spectral_residual",
modelVersion:"sr-1.0", focalClarity, valuePropAttention, ctaAttention, clutter, stoppingPower,
predictedCtrBand, attentionMap, scoredAt, raw:{uncalibrated:true, ...}}` — matches
`docs/03` §8.3 / `docs/08` §2.2 field names exactly.

### Request

`POST /v1/score` accepts either `image_b64` (base64 PNG/JPG, optionally a `data:` URL) or
`image_path` (local file path), plus an optional `layers` array of pixel-space boxes in the
**original** image's coordinate system:

```jsonc
{
  "image_b64": "iVBORw0KG...",
  "layers": [
    { "id": "cta1", "role": "cta", "x": 100, "y": 900, "w": 300, "h": 80 },
    { "id": "hl1",  "role": "headline", "x": 60, "y": 120, "w": 900, "h": 200 }
  ]
}
```

`role` ∈ `headline | cta | logo | legal | image | other`. Only `headline` and `cta` boxes affect
`valuePropAttention` / `ctaAttention` today; the rest are accepted for forward-compatibility with
`docs/08` §3.2 geometry extraction.

## Deviations from docs/08 (one-line justifications)

- **`saliency.spectral_residual` instead of `saliency.transalnet`** — the task requires zero
  external cost (no model downloads, no network calls); TranSalNet needs vendored model weights
  and a torch runtime, so we ship the classical, dependency-light Hou & Zhang spectral-residual
  algorithm as the default `saliency` driver instead. `saliencySource`/`modelVersion` are named
  accordingly (`saliency.spectral_residual` / `sr-1.0`) so the driver is swappable later without
  changing the response contract.
- **No calibration loop (docs/08 §9) yet** — there is no tenant `Result` data to fit against, so
  `predictedCtrBand` and per-metric `confidence` are hand-set, deliberately wide/low, and flagged
  `raw.uncalibrated=true`, per the §9.6 "never overclaim" rule.
- **`attentionMap` is inline data (list of lists), not a stored asset** — docs/08 §3.4 specifies
  persisting the heatmap to Supabase/R2 and referencing `{assetId, src}`; that persistence layer is
  outside `services/engine`'s scope for this change, so the 12×12 grid is returned inline for the
  UI to render directly. Swapping in `{assetId, src}` storage later is additive, not breaking.
- **`geometry.py`-style layer-tree extraction is simplified to a flat `layers` list** — the full
  `docs/03` layer-tree walk (groups, rotation, canvas scaling) is a larger `apps/web`-side concern;
  this service accepts already-flattened `{id, role, x, y, w, h}` boxes in render-pixel space,
  which is forward-compatible with a future `geometry.py` producing the same shape.

## Run

```bash
cd services/engine
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8000   # http://localhost:8000/health
```

- **Commercial default:** `ENGAGEMENT_BACKEND=saliency` (CPU-only, pure numpy+Pillow, zero
  external cost).
- **TRIBE v2 (CC-BY-NC-4.0):** research-only. Loads **only** when
  `ENGAGEMENT_BACKEND=tribe_research` **and** `RESEARCH_MODE=true`; never reachable on the
  commercial path (CANON §9). `/v1/score` also refuses `backend:"tribe_research"` in the request
  body with a 400 unless both flags are set.
- **Auth:** `apps/web` calls with header `X-Engine-Secret: $ENGINE_SHARED_SECRET`. Missing/wrong
  secret → 401.

## Test

```bash
cd services/engine
.venv/bin/python -m pytest tests/ -q
```

Covers: spectral-residual saliency correctness (blob vs. noise focal clarity + clutter), the
12×12 normalized `attentionMap`, CTA-box-over-blob vs. far-away-box `ctaAttention` ranking,
`X-Engine-Secret` auth (401 on missing/wrong secret), the `tribe_research` 400 gate, the
module-level fail-closed `RuntimeError` guardrail, and the full `/v1/score` response shape.
