# 08 — Engagement Testing (`EngagementPredictor` + `services/engine`)

> **Read `handoff/CANON.md` first.** This document is the build spec for the engagement-testing
> subsystem: the pluggable `EngagementPredictor` (CANON §6), the commercially-clean **STATIC** path
> (saliency + grid heuristics) that is the **production default**, per-slide carousel scoring, the VIDEO
> path + first-3-seconds, the flag-gated **TRIBE v2** R&D backend (CANON §9), the FastAPI service API in
> `services/engine` (CANON §4), the calibration loop against real LinkedIn `Result` rows (CANON §5/§6/§9),
> and how the `amirmushichge/tribeV2_ViralAnalyser` repo informs the design.
>
> **This document uses ONLY canonical names** from CANON §5/§6/§9/§10: `EngagementPredictor`,
> `EngagementScores`, `ProviderBus.predictor(job)`, `ENGAGEMENT_BACKEND` (`saliency|tribe_research`),
> `RESEARCH_MODE`, `ENGINE_URL`, `services/engine`, `packages/shared`, `packages/render`,
> `Variant.engagement{}`, `Result`, `Experiment`, `ExperimentArm`, `Render`, `EngagementAnalyst`,
> `CarouselArchitect`. Do not rename any of these.
>
> Where research (R4) suggests deviation from a naive reading, it is tagged **⚑ RECOMMENDATION**.
> Every drift-prone external fact is tagged **VERIFY before coding**. Every assumption is tagged
> **[ASSUMPTION]**.

---

## 0. TL;DR — the ten load-bearing decisions

1. **One interface, many drivers.** Everything scores through the canonical `EngagementPredictor.score()`
   (CANON §6). `ProviderBus.predictor(job)` picks the driver from a policy table with override + fallback.
2. **Production default is 100% commercially clean:** our own **grid/clutter/CTA heuristics** (a reimplemented
   classical-CV algorithm) fed by **TranSalNet (MIT, self-hosted)** as the saliency backend. No TRIBE, ever,
   on this path.
3. **The layer tree is our killer feature.** Because we own the JSON layer tree (CANON §5), we know the exact
   pixel bbox of the `cta`, headline/value-prop `text`, and `logo` layers — so we score attention *inside those
   boxes*, which pixel-only vendors cannot. `ctaAttention` and `valuePropAttention` are computed from real
   layer geometry, not guessed.
4. **TRIBE v2 is legally radioactive and quarantined.** `facebook/tribev2` is **CC-BY-NC-4.0
   (non-commercial)**; the reference repo is **all-rights-reserved**. TRIBE is a **flag-gated R&D backend**
   behind **two** gates (`ENGAGEMENT_BACKEND=tribe_research` **and** `RESEARCH_MODE=true`), physically isolated
   in an optional dependency group, and the router **hard-errors** if it would ever resolve on a tenant/billable
   path. (CANON §9.)
5. **Reimplement, never copy.** The reference repo's grid/landing math is an *algorithm* we may study and
   reimplement; its *source code* is unlicensed. We reimplement `visual_grid_analysis.py`'s math in our own
   code. We never `cp` or vendor its files.
6. **Never sell a number as truth.** Every score ships as **bands + confidence**
   (`predictedCtrBand{low,high,confidence}` and per-metric `{value,band,confidence}`), calibrated against the
   tenant's **real LinkedIn `Result` rows** over time (CANON §6/§9).
7. **Carousel = per-slide + narrative continuity.** Each `Slide` scored independently → `perSlide[]`; plus a
   trough-detection continuity check (slide 1 must be the thumb-stopper; CTA slide must have high
   `ctaAttention`) — our own code, the static analogue of TRIBE's weak-moment detection.
8. **Video = first-3-seconds heuristic now, paid API later.** `video.heuristic` (frame saliency + motion/cut +
   subtitle-legibility) computes `firstThreeSeconds`; paid upgrade routes to Neurons "Predict Video" /
   Dragonfly. TRIBE never touches a paid video path.
9. **Cache everything.** Score cache key = `(saliency_source, model_version, render_hash)` (CANON §4 caching;
   `render_hash` already defined on `render`, `docs/03` §5).
10. **`apps/web` never calls TRIBE.** Only `services/engine` in `RESEARCH_MODE` can. `ENGINE_URL` requests from
    web never carry a research flag.

---

## 1. Where this lives in the repo (CANON §4)

```
services/engine/                         # Python 3.11 + FastAPI (CANON §4)
  pyproject.toml                         # base deps only; [research] extra is OPTIONAL (§6)
  app/
    main.py                              # FastAPI app factory, /healthz, mounts routers
    settings.py                          # pydantic-settings: reads CANON §10 env vars
    api/
      v1/
        score.py                         # POST /v1/score  (single image / video / grid dispatch)
        score_carousel.py                # POST /v1/score/carousel
        grid.py                          # POST /v1/score/grid   (4–12 option ranking)
        calibrate.py                     # POST /v1/calibrate/run, GET /v1/calibrate/status
        landing.py                       # POST /v1/score/landing  (optional module, §5.6)
    predictor/
      base.py                            # EngagementPredictor protocol (mirrors CANON §6) + registry
      bus.py                             # ProviderBus.predictor(job) — policy table, override, fallback
      scores.py                          # EngagementScores pydantic model (mirrors CANON §6 exactly)
      geometry.py                        # layer-tree bbox extraction (CTA/value-prop/logo) — §3.2
      drivers/
        saliency_transalnet.py           # id: saliency.transalnet   (MIT, self-hosted; DEFAULT)
        saliency_expoze.py               # id: saliency.expoze        (Expoze.io API; paid upgrade)
        saliency_neurons.py              # id: saliency.neurons       (Neurons API; premium + video)
        saliency_dragonfly.py            # id: saliency.dragonfly     (Dragonfly AI API; enterprise)
        heuristic_grid.py                # id: heuristic.grid         (reimpl of §7.2 math — OUR CODE)
        video_heuristic.py               # id: video.heuristic        (first-3s; OUR CODE)
    saliency/
      transalnet/                        # self-hosted TranSalNet inference (MIT) — §4
      motion.py                          # OpenCV motion-magnitude / cut-density (video) — §5.5
      subtitle.py                        # subtitle-legibility check (muted-first mandate) — §5.5
    calibration/
      features.py                        # EngagementScores → feature vector (§9.2)
      model.py                           # isotonic/logistic/GBM calibrator; empirical-Bayes shrink (§9)
      store.py                           # calibrator versioning + persistence
      backtest.py                        # predicted-vs-actual reliability (§9.5)
    guards/
      license_guard.py                   # LICENSE_GUARD — quarantines NC outputs (§6, §8)
    clients/
      web_callback.py                    # POST scores back to apps/web -> Variant.engagement{}
      supabase.py                        # read Render/layer_tree, read Result, write AuditLog
    research/                            # ⚠ OPTIONAL EXTRA — NOT in production image (§6)
      __init__.py                        # raises if imported without RESEARCH_MODE=true
      tribe/
        runtime.py                       # TRIBE v2 inference wrapper (R&D only) — id: research.tribe
        brain_curve.py                   # brain-response curve + weak-moment (trough) detection
        calibration_research.py          # OFFLINE correlation of TRIBE curves vs our heuristic vs Result
  tests/
    test_geometry.py  test_grid_heuristic.py  test_scores_bands.py
    test_bus_refuses_tribe.py            # asserts router hard-errors on tenant-facing research.tribe
    test_license_guard.py
  Dockerfile                             # builds WITHOUT [research] extra by default
  Dockerfile.research                    # builds WITH [research]; used only in RESEARCH_MODE deploys
```

`apps/web` calls this service over HTTP at `ENGINE_URL` (CANON §10). The `EngagementAnalyst` agent
(CANON §7) is the **only** consumer in `apps/web` that interprets scores; it calls the client wrapper in
`apps/web/src/server/engine/predictor.ts` (§10.3), never the drivers directly.

---

## 2. The canonical interface (`EngagementPredictor`) — do not rename

### 2.1 TypeScript (in `packages/shared` — matches CANON §6 verbatim)

```ts
// packages/shared/src/providers/engagement.ts
export type Modality = 'image' | 'video' | 'audio';        // CANON §6

// The three input shapes score() accepts (CANON §6 signature):
export interface RenderRef { kind: 'render'; renderId: string; variantId: string; workspaceId: string; }
export interface VideoRef  { kind: 'video';  renderId: string; variantId: string; workspaceId: string; }
export interface GridRef   { kind: 'grid';   assetId: string;  workspaceId: string;   // one composited grid image
  options: { variantId?: string; renderId?: string; label?: string }[]; }             // 4–12 cells

export interface EngagementPredictor {                     // CANON §6 — DO NOT RENAME
  id: string;
  score(input: RenderRef | VideoRef | GridRef): Promise<EngagementScores>;
}

// EngagementScores — CANON §6 shape. Every metric is a BAND, never a bare number (§0.6).
export interface Scored { value: number; band: [number, number]; confidence: number; } // 0–1 unless noted
export interface EngagementScores {
  attentionMap?:       { assetId: string; src: string };   // saliency heatmap stored to Supabase/R2 (§3.4)
  focalClarity:        Scored;      // peak/mean concentration over primary subject bbox
  valuePropAttention:  Scored;      // mean saliency inside headline/value-prop text-layer bbox
  ctaAttention:        Scored;      // mean saliency inside the `cta` layer bbox — KILLER FEATURE (§3.2)
  clutter:             Scored;      // edge-density / distributed-saliency (higher = worse)
  stoppingPower:       Scored;      // normalized peak saliency + subject dominance
  firstThreeSeconds?:  Scored;      // VIDEO ONLY (CANON §6) — stopping power over t∈[0,3s]
  predictedCtrBand?:   { low: number; high: number; confidence: number };  // CANON §6 — BANDS ONLY (§9)
  perSlide?: PerSlideScore[];       // CAROUSEL ONLY (CANON §6) — one entry per Slide (§5.4)
  // metadata (mirrors variant.engagement §8.3 of docs/03):
  backend: 'saliency' | 'tribe_research';   // ENGAGEMENT_BACKEND used (CANON §10)
  saliencySource: string;                    // driver id, e.g. 'saliency.transalnet'
  modelVersion: string;
  scoredAt: string;                          // ISO 8601
  raw: unknown;                              // CANON §6 EngagementScores.raw — driver raw payload
}
export interface PerSlideScore {
  position: number;                          // 0-based slide index
  role?: 'hook' | 'reframe' | 'close';       // aligns to CarouselArchitect (CANON §7)
  stoppingPower?: Scored; ctaAttention?: Scored; focalClarity?: Scored;
  valuePropAttention?: Scored; clutter?: Scored;
  continuityFlag?: 'ok' | 'stopping_power_dip' | 'weak_hook' | 'weak_cta';  // §5.4 trough detection
}

// ProviderBus.predictor(job) — CANON §6. Selects the driver from a policy table with override + fallback.
export interface PredictorJob {
  input: RenderRef | VideoRef | GridRef;
  tenantFacing: boolean;     // true for anything a paying workspace reads/bills — GATES OUT research.tribe (§8)
  billable: boolean;
  preferDriver?: string;     // manual override (CANON §6 "override always available")
  workspaceId: string;
}
```

> **[ASSUMPTION — cross-document]** `packages/shared` exports the `EngagementPredictor`, `EngagementScores`,
> `Modality`, and `ProviderBus` types (CANON §6). This document treats `docs/05` (shared types) as the owner
> of the zod schemas for these; here we specify the **runtime shape and semantics**. The JSONB persisted
> form is already locked in `docs/03` §8.3 (`variant.engagement`) and this document is byte-consistent with it.

### 2.2 Python (in `services/engine` — mirrors CANON §6)

```python
# services/engine/app/predictor/scores.py  — pydantic mirror of CANON §6 EngagementScores
from pydantic import BaseModel, Field, conlist
from typing import Literal, Optional, Any

class Scored(BaseModel):
    value: float                                  # 0–1 (or CTR fraction where noted)
    band: conlist(float, min_length=2, max_length=2)
    confidence: float = Field(ge=0, le=1)

class PerSlideScore(BaseModel):
    position: int
    role: Optional[Literal['hook','reframe','close']] = None
    stoppingPower: Optional[Scored] = None
    ctaAttention: Optional[Scored] = None
    focalClarity: Optional[Scored] = None
    valuePropAttention: Optional[Scored] = None
    clutter: Optional[Scored] = None
    continuityFlag: Optional[Literal['ok','stopping_power_dip','weak_hook','weak_cta']] = None

class PredictedCtrBand(BaseModel):
    low: float; high: float; confidence: float = Field(ge=0, le=1)

class EngagementScores(BaseModel):                # CANON §6 — DO NOT RENAME fields
    attentionMap: Optional[dict] = None           # {"assetId","src"}
    focalClarity: Scored
    valuePropAttention: Scored
    ctaAttention: Scored
    clutter: Scored
    stoppingPower: Scored
    firstThreeSeconds: Optional[Scored] = None
    predictedCtrBand: Optional[PredictedCtrBand] = None
    perSlide: Optional[list[PerSlideScore]] = None
    backend: Literal['saliency','tribe_research']
    saliencySource: str
    modelVersion: str
    scoredAt: str
    raw: Any = None

# services/engine/app/predictor/base.py  — the driver protocol (mirrors EngagementPredictor)
from typing import Protocol
class EngagementDriver(Protocol):
    id: str
    tenant_safe: bool          # False ONLY for research.tribe (§8) — router refuses it on tenant paths
    modalities: set[str]       # {'image'} | {'image','video'} | {'grid'} …
    async def score(self, input: dict, ctx: "ScoreContext") -> EngagementScores: ...
```

---

## 3. STATIC path — single image (the shipping production default)

This is the **default** every workspace gets. It is commercially clean end-to-end.

### 3.1 Pipeline

```
RenderRef ──► fetch Render(kind=png, ratio) from Supabase  ──► PNG bytes
          └─► fetch Variant.layer_tree (JSON)              ──► layer bboxes (§3.2)
   1. saliency_map = driver.saliency(png)          # default saliency.transalnet (§4)
   2. bboxes       = geometry.extract(layer_tree, render.width, render.height)   # §3.2
   3. metrics      = compute_static_metrics(saliency_map, bboxes)                 # §3.3
   4. bands        = calibration.apply(features(metrics), workspace_id)           # §9
   5. attentionMap = persist_heatmap(saliency_map)  # Supabase/R2; NEVER a vendor URL (§3.4)
   6. return EngagementScores(...)                  # bands + confidence (§0.6)
```

### 3.2 Layer-tree bbox extraction — the killer feature (`geometry.py`)

We own the layer tree (CANON §5). Coordinates are **px, top-left origin**, in the canvas space defined by
`layer_tree.canvas.{width,height}` (`docs/03` §6.1/§6.2: every layer has `{x, y, width, height}`). The saliency
map is computed on the **rendered PNG** whose pixel dimensions are `render.width × render.height`. We map layer
coords → saliency-map coords with a uniform scale.

```python
# services/engine/app/predictor/geometry.py
def extract(layer_tree: dict, render_w: int, render_h: int) -> dict:
    cw = layer_tree["canvas"]["width"]; ch = layer_tree["canvas"]["height"]
    sx = render_w / cw; sy = render_h / ch                      # px-space scale factor
    out = {"cta": [], "value_prop": [], "logo": [], "primary_subject": None, "legal": []}
    for ly in _flatten(layer_tree["layers"]):                    # recurse into type:"group"
        if not ly.get("visible", True): continue
        box = _to_px(ly, sx, sy)                                  # {x,y,w,h} in RENDER px, rotation-aware
        t = ly["type"]
        if t == "cta":                       out["cta"].append(box)
        elif t == "logo":                    out["logo"].append(box)
        elif t == "legal":                   out["legal"].append(box)
        elif t == "text":
            # value-prop = the headline/value-prop text layer. Identify by role tag if present, else the
            # largest-area text layer above the "see more" fold (layer_tree.safeZones.seeMoreFold).
            if _is_value_prop(ly, layer_tree): out["value_prop"].append(box)
    # primary_subject bbox = the top image layer's salient blob (fallback: full image-layer bbox).
    out["primary_subject"] = _primary_subject_bbox(layer_tree, sx, sy)
    return out
```

> **[ASSUMPTION — cross-document]** Value-prop identification: this doc assumes the `CompositorPlanner`
> (CANON §7) tags the primary headline/value-prop text layer with `custom.role = "value_prop"` (or `"headline"`)
> and the CTA is always `type:"cta"` (locked in `docs/03` §6.3). If no role tag exists, we fall back to the
> largest-area visible `text` layer whose bbox lies above `safeZones.seeMoreFold`. **⚑ RECOMMENDATION:** add
> `custom.role ∈ {value_prop, headline, subhead, cta, legal, ...}` to the `CompositorPlanner` output contract
> in `docs/05`/`docs/06` so bbox mapping is deterministic rather than heuristic. Coordinate with `docs/06`
> (editor/compositor) which already owns `custom` passthrough.

### 3.3 Static metric computation (`compute_static_metrics`)

All inputs normalized to `[0,1]`. `S` = saliency map (float32, `[0,1]`, `render_h × render_w`).

| Metric (CANON §6) | Definition | Notes |
|---|---|---|
| `focalClarity` | `peak(S ∩ subject) − mean(S ∩ subject)` over the primary-subject bbox | concentration; mirrors ref repo `focus = attention_peak − attention_mean` (§7.2). `peak` = 92nd percentile. |
| `valuePropAttention` | `mean(S)` inside the value-prop text bbox(es), area-weighted | uses real layer geometry (§3.2) |
| `ctaAttention` | `mean(S)` inside the `cta` layer bbox(es) | **killer feature** — exact CTA box, not a guess (R4 §5.3) |
| `clutter` | `mean(edge_density_outside_primary_subject)` + `1 − gini(S)` (distributed-saliency) blended 0.6/0.4 | higher = worse; edge term uses Sobel/Canny (§7.2 edge term) |
| `stoppingPower` | `0.6·norm_peak(S) + 0.4·subject_dominance` where `subject_dominance = sum(S ∩ subject)/sum(S)` | pre-calibration raw; calibrated in §9 |

`norm_peak(S)` = 92nd-percentile of `S`. All five raw metrics feed the calibrator (§9) which produces the
`{value, band, confidence}` triples and the `predictedCtrBand`. **We never return a raw metric as a bare
truth-value** — even before enough tenant data exists, we return the raw value with a **wide band + low
confidence** from the global prior (§9.3).

### 3.4 Attention-map persistence (never trust vendor URLs)

- The saliency heatmap PNG is stored to **Supabase Storage / R2** and referenced as
  `attentionMap = {assetId, src:"storage://…"}` (matches `docs/03` §8.3).
- **Vendor URLs expire.** Neurons heatmap URLs expire ~5 min (R4 §3.2 [S18]); Expoze delivers via
  `expectedOutputUri` (R4 §3.3). **Any paid-driver heatmap MUST be downloaded and re-stored immediately**;
  we never persist a vendor URL into `Variant.engagement{}`.

---

## 4. Default saliency backend — TranSalNet (MIT, self-hosted)

`saliency.transalnet` is the **production default** (R4 §5.2, §8). It runs inside `services/engine` on the
GPU-optional runtime (Modal/Replicate, CANON §4).

| Property | Value |
|---|---|
| Repo | `LJOVO/TranSalNet` |
| License | **MIT** (GitHub API `spdx: MIT`) — **VERIFY `LICENSE` still MIT at build time** (R4 §9.5 [S16]) |
| Model | Transformer over CNN; ResNet-50 / DenseNet-161 backbones |
| Input | RGB image (resize to model's expected input, typically 384×288 — **VERIFY** from repo) |
| Output | single-channel saliency map, `[0,1]`, resized back to render dims |
| GPU | runs on CPU (slow) or any small GPU; amortize on Modal/Replicate (CANON §4) |

**VERIFY before coding (R4 §9.5):** (a) TranSalNet `LICENSE` is still MIT; (b) the **torchvision backbone
weight license** (ImageNet weights, typically BSD-style) is clean; (c) if you fine-tune, the **SALICON
source-image (Flickr/COCO) ToU** — SALICON *annotations* are CC-BY-4.0 (commercial OK), but the source images
are not the annotations (R4 §9.9 [S4][S27]).

```python
# services/engine/app/saliency/transalnet/infer.py  (skeleton — VERIFY exact preprocessing from repo)
import torch, numpy as np, cv2
_MODEL = None
def _load():
    global _MODEL
    if _MODEL is None:
        _MODEL = torch.load(MODEL_PATH, map_location=DEVICE).eval()   # weights vendored at build (MIT)
    return _MODEL

@torch.inference_mode()
def saliency_map(png_bytes: bytes, out_w: int, out_h: int) -> np.ndarray:
    img = _decode(png_bytes)                        # HxWx3, RGB
    x   = _preprocess(img)                          # resize 384x288, normalize (VERIFY dims from repo)
    y   = _load()(x.to(DEVICE)).squeeze().cpu().numpy()   # HxW saliency
    y   = cv2.resize(y, (out_w, out_h), interpolation=cv2.INTER_CUBIC)
    y   = (y - y.min()) / (y.ptp() + 1e-8)          # normalize to [0,1]
    return y.astype(np.float32)                     # modelVersion = "transalnet-1.0"
```

**Paid saliency upgrades** (same `saliency.*` interface, `saliency` mode; commercially licensed via paid plan):
`saliency.expoze` (Expoze.io, JWT, cheapest clean API), `saliency.neurons` (richest metrics + video),
`saliency.dragonfly` (enterprise creative-testing). Endpoint/auth/request/response skeletons in **§7.5**.
All are **VERIFY before coding** against their live docs.

---

## 5. STATIC grid ranking + CAROUSEL + VIDEO paths

### 5.1 Grid ranking (`heuristic.grid`) — reimplement §7.2, do not copy

When the `EngagementAnalyst` compares **4–12 variant thumbnails** (a `GridRef`), we run our **reimplemented**
grid-salience ranker (§7.2 math) over a composited option grid → ranked cells + a plain-language reason string
("winner is stronger from contrast, color, position, focus, or lower visual clutter").

- **Reimplement the math (§7.2); never copy the reference repo's `visual_grid_analysis.py`** — it is
  unlicensed, all-rights-reserved (R4 §1.4, §9.8).
- Grid detection is a **fixed N×M uniform split** (not contour detection), chosen from `COMMON_GRID_SHAPES`
  (2×2 … 4×4) by minimizing aspect-ratio penalty (§7.2).
- Output: `perCell[]` with `{cellIndex, score(0–100), metrics, reason}` and a `winnerIndex`.

### 5.2 Carousel — per-slide scoring (`POST /v1/score/carousel`)

Each `Slide` (CANON §5) carries **its own layer tree** (`docs/03` §4). We score each slide's rendered PNG
independently through the static path (§3), producing one `PerSlideScore` per slide → `perSlide[]`
(CANON §6, matches `docs/03` §8.3).

```
for each slide in variant.slides (ordered by position):
    render = Render(kind=png) for this slide  ──► static-path metrics (§3.3)
    perSlide[i] = { position, role, stoppingPower, ctaAttention, focalClarity, ... }
```

### 5.3 Carousel — narrative continuity (trough detection, our own code)

Aligned to `CarouselArchitect` (CANON §7, hook→reframe→close). This is the **static analogue of TRIBE's
weak-moment detection**, implemented as **trough detection over the per-slide `stoppingPower` sequence** — our
own code, **no NC dependency**.

| Rule | Check | `continuityFlag` on violation |
|---|---|---|
| Thumb-stopper | `slide[0].stoppingPower.value` must be the **max** over all slides | slide 0 gets `weak_hook` |
| CTA landing | the `close`/CTA slide must have `ctaAttention.value ≥ ctaThreshold` (default 0.35) | that slide gets `weak_cta` |
| No mid-dip | any slide whose `stoppingPower` is a **local trough** vs both neighbors by `> dipDelta` (default 0.15) | that slide gets `stopping_power_dip` |

```python
# services/engine/app/predictor/drivers/heuristic_grid.py  (continuity — carousel)
def continuity_flags(per_slide: list[PerSlideScore], cta_threshold=0.35, dip_delta=0.15):
    sp = [s.stoppingPower.value for s in per_slide]
    if sp and sp[0] != max(sp):
        per_slide[0].continuityFlag = 'weak_hook'
    for i in range(1, len(sp) - 1):                       # local trough vs both neighbors
        if sp[i] < sp[i-1] - dip_delta and sp[i] < sp[i+1] - dip_delta:
            per_slide[i].continuityFlag = 'stopping_power_dip'
    for s in per_slide:                                   # CTA slide(s)
        if s.role == 'close' and s.ctaAttention and s.ctaAttention.value < cta_threshold:
            s.continuityFlag = 'weak_cta'
    return per_slide
```

The `EngagementAnalyst` (CANON §7) turns these flags into concrete recommendations ("slide 3 loses attention —
increase subject contrast or tighten copy") for the human-approve gate.

### 5.4 VIDEO path + first-3-seconds (`video.heuristic` — commercial default, no TRIBE)

Muted-first mandate (CANON §8): burned-in subtitles carry the story; first 3 seconds carry stopping power.

```
VideoRef ──► fetch Render(kind=mp4) ──► sample frames (dense over t∈[0,3s], sparse after)
  1. per-frame saliency (saliency.transalnet on each sampled frame)          # §4
  2. motion magnitude + cut density (OpenCV, motion.py)                       # optical flow / frame diff
  3. subtitle legibility (subtitle.py): contrast of burned-in subs vs bg      # muted-first (CANON §8)
  4. firstThreeSeconds = aggregate stopping-power over t∈[0,3s]
       weight first frame + first cut heavily
  5. stoppingPower = overall (weighted toward first 3s)
  6. raw = { curve: [...], cuts: [...], subtitleContrast: [...] }
```

| Signal | Computation |
|---|---|
| Frame stopping-power | `norm_peak(S_frame) · subject_dominance` (§3.3) per sampled frame |
| Motion magnitude | mean optical-flow magnitude (Farnebäck) or frame-diff energy per interval |
| Cut density | scene-cut count in `[0,3s]` (histogram-difference threshold) |
| `firstThreeSeconds` | `0.5·mean(stopping-power over t≤3s) + 0.3·first_frame_sp + 0.2·first_cut_impact` |
| Subtitle legibility | min contrast ratio of subtitle text vs local background across the clip (WCAG-style) |

**Paid upgrade (proper per-second attention curve):** route the same `VideoRef` to `saliency.neurons`
("Predict Video") or `saliency.dragonfly`; map their time-series → `firstThreeSeconds` + a `raw` curve.
Neurons normalizes to **24 fps / 1024 px** and is async-polled (R4 §3.2 [S26]). **VERIFY before coding**
the per-second field names (undocumented on the reference page — R4 §9.3).

**TRIBE never touches a paid/tenant video path** (§8). The only brain-response curve TRIBE produces is R&D
(`research.tribe`, §8), returned to no tenant.

### 5.5 Landing-page attention (optional module, §5.6 of R4)

Reimplement the reference repo's **structure/contrast/layout heuristic** (our code) + reuse the saliency
driver; capture **desktop + mobile** screenshots headless in `services/engine` (auto-close cookie banners).
Commercially clean (no TRIBE). **Not on the critical path** — ship behind a feature flag. `POST /v1/score/landing`.

---

## 6. Provider routing — `ProviderBus.predictor(job)` policy table

`ProviderBus.predictor(job)` (CANON §6) resolves the driver from a **policy table** with **override + fallback**.
`ENGAGEMENT_BACKEND ∈ {saliency, tribe_research}` (CANON §10) selects the *engine mode*; within `saliency`
mode the router picks the *saliency source*.

### 6.1 Drivers behind the one interface (R4 §5.2)

| Driver `id` | Path | Saliency source | Commercial? | `ENGAGEMENT_BACKEND` | `tenant_safe` |
|---|---|---|---|---|---|
| `saliency.transalnet` | static + per-slide | TranSalNet (MIT, self-hosted) | ✅ **default** | `saliency` | ✅ |
| `saliency.expoze` | static + per-slide + video | Expoze.io API | ✅ paid upgrade | `saliency` | ✅ |
| `saliency.neurons` | static + **video** | Neurons API | ✅ premium/video | `saliency` | ✅ |
| `saliency.dragonfly` | static + video benchmarking | Dragonfly AI API | ✅ enterprise | `saliency` | ✅ |
| `heuristic.grid` | grid ranking + clutter/CTA/focus (reimpl §7.2) | consumes any saliency map above | ✅ (our code) | `saliency` | ✅ |
| `video.heuristic` | first-3s: frame saliency + motion/cut/subtitle | our code + saliency | ✅ | `saliency` | ✅ |
| `research.tribe` | video brain-curve + weak-moment (R&D only) | **TRIBE v2** | ❌ **NC** | `tribe_research` | ❌ |

### 6.2 Routing policy (R4 §8)

| Job | Primary | Fallback | Paid upgrade | Never |
|---|---|---|---|---|
| Single-image score | `saliency.transalnet` | `heuristic.grid` on cached saliency | `saliency.expoze` → `saliency.neurons` | TRIBE |
| Carousel per-slide | `saliency.transalnet` + per-slide + trough detection | `heuristic.grid` | `saliency.expoze` | TRIBE |
| Variant grid ranking (4–12) | `heuristic.grid` (reimpl §7.2) over TranSalNet maps | — | `saliency.expoze` per-AOI `score` | TRIBE |
| Video first-3s / stopping power | `video.heuristic` (frame saliency + motion/cut) | first-frame `saliency.transalnet` | `saliency.neurons` (Predict Video) / `saliency.dragonfly` | TRIBE on paid |
| Landing-page attention | own structure/contrast heuristic + saliency | — | `saliency.expoze` | TRIBE |
| Brain-response / weak-moment **R&D** | `research.tribe` **iff** `RESEARCH_MODE=true` **and** `ENGAGEMENT_BACKEND=tribe_research` | — | — | **any tenant-facing use** |

### 6.3 Resolver (the hard guardrail)

```python
# services/engine/app/predictor/bus.py
class ProviderBus:
    def __init__(self, settings, registry):
        self.settings = settings
        self.registry = registry     # only registers research.tribe if RESEARCH_MODE=true (§8)

    def predictor(self, job: PredictorJob) -> EngagementDriver:
        driver = self._resolve(job)                          # policy table + job.preferDriver override
        # ── HARD GUARDRAIL (CANON §9): TRIBE can NEVER reach the commercial path ──
        if not driver.tenant_safe and (job.tenantFacing or job.billable):
            raise LicenseGuardError(
                f"driver '{driver.id}' is non-commercial (CC-BY-NC-4.0); refused on tenant/billable job")
        if driver.id == 'research.tribe' and not (
                self.settings.RESEARCH_MODE and self.settings.ENGAGEMENT_BACKEND == 'tribe_research'):
            raise LicenseGuardError("research.tribe requires RESEARCH_MODE=true AND "
                                    "ENGAGEMENT_BACKEND=tribe_research (CANON §9/§10)")
        return driver
```

---

## 7. Commercially-clean STATIC math — reimplemented grid heuristic (§7.2)

> **Legal note (CANON §9, R4 §1.2/§1.4):** The reference repo's `visual_grid_analysis.py` is a **classical CV
> heuristic** (plain OpenCV/NumPy) — an *algorithm*, which is freely reimplementable. Only the repo's *specific
> source code* is unlicensed (all-rights-reserved, no SPDX). We **reimplement the math from the extracted spec
> below; we never copy, vendor, or `cp` the repo's files.** The weights are a **starting calibration point, not
> sacred** — they are re-tuned by the calibration loop (§9).

### 7.1 Grid detection (fixed uniform split)

- **N×M uniform split** (not contour detection). Pick `(rows, cols)` from `COMMON_GRID_SHAPES = [(2,2),(2,3),
  (3,2),(2,4),(4,2),(3,3),(3,4),(4,3),(4,4)]` by minimizing aspect-ratio penalty vs the image aspect and the
  requested option count (4–12). Slice pixel bounds uniformly.

### 7.2 Per-cell metrics + final score (reimplement exactly this math)

| Metric | Computation (our reimpl) |
|---|---|
| Contrast | `np.std(gray_crop)` (grayscale std-dev) |
| Colorfulness | `mean(max_channel − min_channel)` per RGB pixel |
| Focus | `attention_peak − attention_mean` (concentration) |
| Center bias | `exp(-(((x−0.5)²/0.18) + ((y−0.42)²/0.28)))` (favors center, slightly upper) |
| Edge density | `np.mean(edge_crop)` (Sobel/Canny gradient magnitude; clutter proxy) |
| Attention mean/peak | from the saliency map; **peak = 92nd percentile** |

```python
# services/engine/app/predictor/drivers/heuristic_grid.py  (OUR reimplementation of §7.2 math)
def cell_score(attention_mean, attention_peak, contrast, colorfulness, center_bias, edge_density) -> int:
    raw = (attention_mean * 0.46
         + attention_peak * 0.24
         + min(contrast   * 2.2, 1.0) * 0.12
         + min(colorfulness * 2.4, 1.0) * 0.10
         + center_bias * 0.08
         - max(edge_density - 0.18, 0.0) * 0.16)          # clutter penalty above 0.18 threshold
    return round(max(0.0, min(raw, 1.0)) * 100)           # 0–100
```

Interpretation: **attention dominates (~70%)**, contrast+color ~22%, center bias 8%, edge-clutter penalty
above a 0.18 threshold. The `reason` string names the winning driver ("stronger from contrast / color /
position / focus / lower clutter") by comparing the winner's per-metric contribution to the runner-up's.

---

## 8. TRIBE isolation — the exact flag-gating (CANON §9)

> **The load-bearing legal fact (R4 §2.1, §0.4):** Meta `facebook/tribev2` is **CC-BY-NC-4.0** — commercial use
> is forbidden. "Commercial" = "primarily intended for or directed toward commercial advantage or monetary
> compensation." **A paid SaaS that scores ads is squarely commercial.** Using TRIBE v2 (weights **or** derived
> outputs — the NC restriction taints outputs) in the shipping product is a **license breach**. The reference
> repo `amirmushichge/tribeV2_ViralAnalyser` is separately **all-rights-reserved** (no SPDX license) and
> inherits the NC restriction. **Both are excluded from the commercial path.** State this plainly to any
> operator: *TRIBE outputs may never be shown to, or sold to, a paying workspace.* (R4 §1.4, §2.1 [S3][S5][S8].)

### 8.1 Two independent gates, BOTH required

TRIBE loads **only** when **both** are true:
1. `ENGAGEMENT_BACKEND=tribe_research` (CANON §10), **and**
2. `RESEARCH_MODE=true` (CANON §10).

### 8.2 Physical isolation (cannot even import on production)

- TRIBE code lives in `services/engine/app/research/tribe/` with its **own optional dependency group**:
  `pip install ".[research]"` (V-JEPA2, TRIBE weights, Whisper, etc.).
- The **default production container** (`Dockerfile`) is built **without** the `research` extra, so it
  **cannot import** V-JEPA2 / TRIBE weights at all. `Dockerfile.research` (with the extra) is used **only** for
  a `RESEARCH_MODE` deploy on separate, non-billable infrastructure.
- `app/research/__init__.py` raises at import time if `RESEARCH_MODE != "true"`:

```python
# services/engine/app/research/__init__.py
import os
if os.environ.get("RESEARCH_MODE", "false").lower() != "true":
    raise RuntimeError("services/engine/app/research is R&D-only and requires RESEARCH_MODE=true (CANON §9). "
                       "It must NEVER be importable in the production/commercial container.")
```

### 8.3 Router refuses TRIBE on paid paths (§6.3)

- `ProviderBus.predictor(job)` **hard-errors** (`LicenseGuardError`) if the resolved driver is not
  `tenant_safe` and the job is `tenantFacing` or `billable` (§6.3).
- **Startup assertion:** if `RESEARCH_MODE != true`, the `research.tribe` driver is **not registered** in the
  policy table at all (`registry` skips it). It cannot be selected even by `preferDriver`.

### 8.4 `LICENSE_GUARD` — code-level guardrails (`guards/license_guard.py`)

- Any TRIBE run logs an `AuditLog` row (via `clients/supabase.py`) with `cost_usd` and stamps every
  TRIBE-derived artifact `commercial_use=false`.
- A `commercial_use=false` artifact is **blocked from ever being attached** to a `Variant.engagement{}` that a
  tenant reads (the web callback in §10.4 rejects `backend == "tribe_research"` payloads with a 4xx).
- **Never call TRIBE from `apps/web`.** Only `services/engine` in `RESEARCH_MODE` can. `ENGINE_URL` requests
  from web never carry a research flag; the FastAPI `/v1/score*` endpoints **ignore** any `backend` hint and
  force `saliency` mode unless the whole service is a `RESEARCH_MODE` deploy (§10.1).

### 8.5 Output taint & the only defensible R&D use

- **⚑ RECOMMENDATION (R4 §2.1, §6):** TRIBE outputs may inform **our heuristic's weight calibration OFFLINE**
  (e.g., correlating TRIBE brain-response curves against our heuristic and against real LinkedIn CTR to *tune*
  the §7.2/§3.3 weights). Even this is done in `research/tribe/calibration_research.py`, gated by both flags,
  logged as R&D, and **never returned to a tenant**.
- The calibration **coefficients we ship** must be **defensibly derived from real LinkedIn `Result` rows + a
  clean saliency model (TranSalNet)** — **not** directly from TRIBE curves.
- **⚑ RECOMMENDATION:** **A lawyer must sign off before any TRIBE-influenced coefficient ships.**
  **VERIFY before coding.** (R4 §2.1, §9.2.)

### 8.6 TRIBE v2 facts (for the R&D backend only — VERIFY before coding)

| Property | Value | Note |
|---|---|---|
| Model | `facebook/tribev2` — multimodal → fMRI brain-encoding | R4 §2 [S3] |
| Output surface | fsaverage5 cortical mesh, ~20,000 vertices; shape `(n_timesteps, n_vertices)` | [S3][S6] |
| Hemodynamic lag | predictions offset **5 s into the past** | [S3][S6] |
| Feature extractors | LLaMA 3.2-3B (text) · V-JEPA2 (video) · Wav2Vec-BERT 2.0 (audio) | [S6] |
| Runtime | Python 3.11+; `pip install -e .`; `model.get_events_dataframe(video_path=…)` | [S3] |
| **License** | **CC-BY-NC-4.0** | [S3][S5][S6][S7] |
| Hardware | ref wrapper: RAM ≥16 GB, GPU ≥6 GB (12 GB+ preferred), disk ≥30 GB SSD | **VRAM/params not published — benchmark before choosing Modal/Replicate tier** (R4 §9.1) |

The R&D backend reproduces the reference repo's **video brain-response curve + weak-moment detection**
(weak-moment = **trough detection over the predicted response curve**, not a separate model — R4 §1.1).

---

## 9. Calibration loop against real LinkedIn `Result` rows (CANON §6/§9)

**Principle:** report **bands + confidence**, calibrated per tenant over time. Raw saliency/vendor scores are
*inputs*, not the CTR claim. **Never sell a number as truth.**

### 9.1 Data flow

```
1. LOG predictions on every scored Variant  → variant.engagement{} (raw features + saliencySource + modelVersion)
2. INGEST actuals                            → Result rows per ExperimentArm (impressions, clicks → ctr; cpc; cvr)
   (ingestion pathway = LinkedIn-API scope, out of THIS doc; here we CONSUME `Result` — docs/03 §5, R4 §7)
3. FIT per-tenant (+ global-prior) calibrator: features → CTR band  (isotonic / logistic / small GBM)
4. RECALIBRATE on a schedule (pg_cron dispatch → POST /v1/calibrate/run); version the calibrator
5. BACKTEST: predicted-vs-actual reliability surfaced to EngagementAnalyst
```

- **Inputs (read):** `variant.engagement` (predicted features + `modelVersion`), `experiment_arm` (links
  `variant_id` → arm, carries `linkedin_creative_urn`), `result` (real `impressions/clicks/ctr/cpc/cvr` over
  time — `docs/03` §5). CTR is auto-computed on `result` insert/update (`docs/03` trigger `trg_result_ctr`).
- **Output (write):** a versioned calibrator artifact + the `predictedCtrBand{low,high,confidence}` written
  back onto each new prediction.

### 9.2 Feature vector (`calibration/features.py`)

```python
features = [
    focalClarity.value, valuePropAttention.value, ctaAttention.value,
    clutter.value, stoppingPower.value,
    firstThreeSeconds.value if video else 0.0,
    ratio_onehot(...),            # 1:1 | 1.91:1 | 4:5 | 16:9 | 9:16 (CANON §8)
    doc_type_onehot(...),         # single_image | carousel | video (CANON §5)
    n_slides if carousel else 1,
    brand_kit_version_bucket,     # lineage (CANON §5)
]
# target = observed CTR from Result (clicks/impressions), weighted by impressions (Wilson-style variance)
```

### 9.3 Calibrator model (`calibration/model.py`) — simple, auditable

- **Model class:** isotonic regression **or** logistic regression **or** a small GBM (auditable; no black box).
  Start with **logistic** on the feature vector → predicted CTR; wrap with **isotonic** for monotone
  recalibration. (R4 §7.3.)
- **Cold-start:** begin from a **global prior** (all-tenant pooled fit, or a hand-set conservative prior).
- **Empirical-Bayes shrinkage:** **shrink the per-tenant fit toward the global prior**; the shrink weight
  → 0 (fully tenant-specific) as the tenant's `Result` volume grows. Confidence rises with tenant sample size;
  the **band widens when data is thin**.

```python
def predicted_ctr_band(features, tenant_stats, calibrator) -> PredictedCtrBand:
    mu    = calibrator.predict(features)                 # point estimate (CTR fraction)
    n     = tenant_stats.n_results                       # tenant sample size
    # empirical-Bayes: shrink tenant estimate toward global prior by sample size
    w     = n / (n + PRIOR_STRENGTH)                     # 0 (cold) → 1 (rich)
    mu    = w * mu + (1 - w) * GLOBAL_PRIOR_CTR
    # band width shrinks with n; floor keeps us honest even when data is rich
    half  = max(BAND_FLOOR, BASE_WIDTH / sqrt(n + 1))    # wide when n small
    conf  = min(0.9, w * 0.9 + 0.05)                     # confidence rises with n, capped < 1
    return PredictedCtrBand(low=max(0.0, mu - half), high=mu + half, confidence=conf)
```

### 9.4 Versioning & scheduling

- **Schedule:** a **pg_cron** dispatch (already provisioned, `docs/03` — `create extension pg_cron`) enqueues a
  recalibration job that `apps/web` (or a worker) turns into a `POST /v1/calibrate/run` to `services/engine`.
- **Version the calibrator**; store `modelVersion` on **every** prediction (in `variant.engagement.modelVersion`)
  so predictions are **backtestable**. Never mutate an old prediction's `modelVersion`.

### 9.5 Backtest / reliability (`calibration/backtest.py`)

- Compute a **reliability diagram** (predicted band vs realized CTR bucketed) and a calibration error metric
  (e.g., expected calibration error). Surface `calibrationQuality` to the `EngagementAnalyst` (CANON §7) so it
  can hedge language appropriately.

### 9.6 Never overclaim (the rule)

- If tenant data is insufficient → **wide band + low confidence**, and the `EngagementAnalyst` labels the number
  a **directional estimate**, not a guarantee. This matches every vendor's own hedging and keeps us legally
  clean (R4 §7.5). **We never render a bare CTR point value in the UI** — only `predictedCtrBand`.

---

## 10. FastAPI service API (`services/engine`) — endpoints, request/response

Base URL = `ENGINE_URL` (CANON §10). **Auth:** `apps/web` → engine is a **service-to-service** call; use a
shared secret bearer (`ENGINE_SHARED_SECRET`) — **[ASSUMPTION]** this env var is not in CANON §10's enumerated
list; **⚑ RECOMMENDATION:** add `ENGINE_SHARED_SECRET` to `docs/11` (env vars) and `.env.example`. The engine
itself uses `SUPABASE_SERVICE_ROLE_KEY` (CANON §10) to read `Render`/`layer_tree`/`Result` and write
`AuditLog` under RLS-bypass, but **all writes back to `Variant.engagement{}` go through `apps/web`** (§10.4) so
web owns tenant RLS.

> **VERIFY before coding:** FastAPI/pydantic v2 API surface (this doc assumes pydantic v2 field syntax).

### 10.1 Endpoint index

| Method | Path | Purpose | Sync/async |
|---|---|---|---|
| GET  | `/healthz` | liveness + `{backend, researchMode, drivers[]}` | sync |
| POST | `/v1/score` | score a single image **or** video (dispatch by `input.kind`) | async (job) |
| POST | `/v1/score/carousel` | per-slide scoring + continuity (§5.2/§5.3) | async (job) |
| POST | `/v1/score/grid` | rank 4–12 options (`heuristic.grid`, §5.1) | sync-ish |
| POST | `/v1/score/landing` | landing-page attention (optional, §5.5) | async (job) |
| GET  | `/v1/score/{jobId}` | poll a score job → `EngagementScores` when done | sync |
| POST | `/v1/calibrate/run` | (re)fit the calibrator for a workspace (§9) | async (job) |
| GET  | `/v1/calibrate/status` | calibrator version + reliability (§9.5) | sync |

- **All `/v1/score*` endpoints force `saliency` mode** and ignore any `backend` hint unless the entire service
  is a `RESEARCH_MODE` deploy (§8.4). Research/TRIBE has **no public tenant endpoint**; it runs only via an
  internal CLI / offline job in a `RESEARCH_MODE` deploy.

### 10.2 `POST /v1/score` — request / response

```jsonc
// Request  (application/json)
{
  "input": {                              // RenderRef | VideoRef (CANON §6)
    "kind": "render",                     // "render" (single image) | "video"
    "renderId": "rnd_...",                // the Render row (kind=png/mp4) to score (docs/03 §5)
    "variantId": "var_...",
    "workspaceId": "ws_..."
  },
  "tenantFacing": true,                   // gates out research.tribe (§8.3)
  "billable": true,
  "preferDriver": null,                   // optional override, e.g. "saliency.expoze" (CANON §6)
  "callbackUrl": "https://app.../api/engine/score-callback"   // apps/web writes Variant.engagement{} (§10.4)
}
```

```jsonc
// Response 202 (job accepted)
{ "jobId": "esj_...", "status": "queued" }

// GET /v1/score/{jobId} when done → EngagementScores (CANON §6; byte-consistent with docs/03 §8.3)
{
  "backend": "saliency",
  "saliencySource": "saliency.transalnet",
  "modelVersion": "transalnet-1.0+cal-2026.07",
  "attentionMap": { "assetId": "as_saliency_01", "src": "storage://…" },
  "focalClarity":       { "value": 0.72, "band": [0.65, 0.79], "confidence": 0.6 },
  "valuePropAttention": { "value": 0.58, "band": [0.50, 0.66], "confidence": 0.6 },
  "ctaAttention":       { "value": 0.41, "band": [0.33, 0.49], "confidence": 0.6 },
  "clutter":            { "value": 0.22, "band": [0.18, 0.28], "confidence": 0.7 },
  "stoppingPower":      { "value": 0.66, "band": [0.55, 0.77], "confidence": 0.5 },
  "firstThreeSeconds":  null,             // set only for VideoRef
  "predictedCtrBand":   { "low": 0.008, "high": 0.021, "confidence": 0.35 },
  "perSlide":           null,             // set only for carousel
  "scoredAt": "2026-07-01T09:00:00Z",
  "raw": { "saliencyStats": { "peak": 0.91, "mean": 0.18 } }
}
```

### 10.3 `POST /v1/score/carousel` and `POST /v1/score/grid`

```jsonc
// POST /v1/score/carousel  request
{ "input": { "kind": "render", "variantId": "var_...", "workspaceId": "ws_...",
             "slideRenderIds": ["rnd_s0","rnd_s1","rnd_s2"] },     // one PNG Render per Slide, in order
  "tenantFacing": true, "billable": true }
// response → EngagementScores with perSlide[] populated (+ continuityFlag per slide, §5.3)

// POST /v1/score/grid  request  (GridRef — 4–12 options)
{ "input": { "kind": "grid", "assetId": "as_optiongrid_01", "workspaceId": "ws_...",
             "options": [ {"variantId":"var_a","label":"A"}, {"variantId":"var_b","label":"B"}, … ] },
  "gridShape": null }                     // optional; else auto (§7.1)
// response
{ "winnerIndex": 2,
  "perCell": [ { "cellIndex": 0, "score": 61, "reason": "runner-up: lower focus",
                 "metrics": { "attentionMean": 0.31, "attentionPeak": 0.72, "contrast": 0.18,
                              "colorfulness": 0.22, "centerBias": 0.64, "edgeDensity": 0.14 } }, … ],
  "saliencySource": "saliency.transalnet", "modelVersion": "transalnet-1.0" }
```

### 10.4 Callback → `apps/web` writes `Variant.engagement{}`

The engine **never writes `Variant.engagement{}` directly** (web owns tenant RLS). On job completion the engine
POSTs the `EngagementScores` to `callbackUrl`; the `apps/web` route validates and persists it into
`variant.engagement` (JSONB, `docs/03` §8.3) and updates the board ranking index
(`variant((engagement->'stoppingPower'->>'value')::numeric)`, `docs/03` §4).

```
// apps/web/src/server/engine/predictor.ts  — the ONLY web-side consumer of the engine
export async function scoreVariant(job: PredictorJob): Promise<{ jobId: string }> {
  return fetch(`${process.env.ENGINE_URL}/v1/score`, {
    method: 'POST',
    headers: { 'authorization': `Bearer ${process.env.ENGINE_SHARED_SECRET}`,   // ⚑ add to docs/11
               'content-type': 'application/json' },
    body: JSON.stringify(job),
  }).then(r => r.json());
}
// The score-callback route REJECTS any payload with backend === 'tribe_research' (§8.4) with a 400.
```

### 10.5 Caching (CANON §4)

Every score is cached by **`(saliency_source, model_version, render_hash)`** — `render_hash` is already computed
on the `render` row as `hash(layer_tree, ratio, brand_kit_version)` (`docs/03` §5). A cache hit returns the
stored `EngagementScores` without re-running saliency. This mirrors the generation cache key discipline
(CANON §4).

---

## 11. How the `amirmushichge/tribeV2_ViralAnalyser` repo informs this design

The reference repo is a **local FastAPI app** that wraps Meta TRIBE v2 for creative review. It informs us in
three ways — **as a design reference and algorithm source only**; we copy no code (R4 §1, §9.8).

| Reference capability | What we take from it | What we build |
|---|---|---|
| **Video brain-response curves + weak-moment detection** (`tribe_runtime.py`, `review_engine.py`) | The *concept* of a stopping-power curve over time and **trough detection** for weak moments | Commercial `video.heuristic` (§5.4) computes `firstThreeSeconds`; carousel continuity (§5.3) is the static analogue (trough detection over per-slide `stoppingPower`). TRIBE's own curve is **R&D-only** (§8). |
| **Static image-grid salience ranking** (`visual_grid_analysis.py`) | The exact **classical-CV math** (grid split, per-cell metrics, weighted score — §7.2) — an algorithm we may reimplement | `heuristic.grid` (§5.1, §7.2) — **reimplemented from the extracted spec, not copied** (repo is unlicensed). |
| **Landing-page attention capture** (`website_capture.py`, `website_analysis.py`) | The *heuristic* (page structure/contrast/layout, desktop+mobile, auto-close cookie banners) — **explicitly not eye-tracking, not TRIBE** | Optional `POST /v1/score/landing` (§5.5) — reimplemented, commercially clean. |

**What we deliberately do NOT take:** the TRIBE v2 inference on any commercial path, and any of the repo's
source code. The repo is **all-rights-reserved, non-commercial evaluation code** with no SPDX license
(GitHub API returns none, R4 §1.4 [S12]); we **study the algorithm and reimplement** (R4 §9.8).

---

## 12. "VERIFY before coding" checklist (consolidated — R4 §9)

1. **TRIBE VRAM/params** — not published; benchmark before choosing Modal/Replicate GPU tier (§8.6). [S3]
2. **TRIBE license** — reconfirm **CC-BY-NC-4.0** on `facebook/tribev2` at build time; **legal sign-off** for
   any offline-calibration use of a TRIBE-derived signal (§8.5). [S3]
3. **Neurons API** — confirm base `https://api.neuronsinc.com`, `X-API-Key` auth, `POST /predict/v2/images`,
   `PUT …/predict`, poll `GET /media`, full image field set + **video per-second field names** (undocumented on
   the reference page), heatmap URL expiry (~5 min → download immediately, §3.4). Get API-tier price in writing.
   [S17][S18][S26]
4. **Expoze.io API** — confirm base `https://api.expoze.app`, `POST /auth/token` JWT, `/developer/upload`,
   `/jobs.json`, `/a_o_is.json` + `score` field; get custom API price. [S14][S15]
5. **TranSalNet** — confirm `LICENSE` still **MIT**; check torchvision backbone weight license; check SALICON
   **source-image** ToU for any fine-tune corpus (§4). [S16][S27][S4]
6. **DeepGaze / UMSI** — reconfirm **no clean commercial license** before using anywhere but `RESEARCH_MODE`
   (both are R&D-only, behind the same fence as TRIBE). [S28][S31]
7. **Dragonfly AI / 3M VAS / Realeyes** — confirm current pricing + API availability + commercial terms before
   selecting a paid upgrade. [S21][S23][S25]
8. **Reimplement, don't copy** the reference repo's grid/landing math — unlicensed, all-rights-reserved
   (§7, §11). [S2][S12]
9. **SALICON annotations CC-BY-4.0** (commercial OK) but **source images Flickr/COCO ToU** — verify before
   shipping a model trained on it. [S4][S27]
10. **`ENGINE_SHARED_SECRET`** — [ASSUMPTION] add this service-auth env var to `docs/11` + `.env.example`
    (§10). [internal]
11. **FastAPI/pydantic v2** — verify field/validator syntax against current docs (§2.2, §10). [external]

---

## 13. External source index (from R4)

| Ref | Source |
|---|---|
| [S1][S2] | TRIBE Review MVP repo + README + `visual_grid_analysis.py`: `github.com/amirmushichge/tribeV2_ViralAnalyser` |
| [S3] | Meta TRIBE v2 model card: `huggingface.co/facebook/tribev2` |
| [S4][S27] | SALICON dataset (annotations CC-BY-4.0; Flickr image ToU): `salicon.net` |
| [S5][S6][S7] | TRIBE v2 facts (vertices/lag/extractors): MarkTechPost / Progressive Robot / Meta AI blog |
| [S8] | CC BY-NC-4.0 deed: `creativecommons.org/licenses/by-nc/4.0/` |
| [S9][S10][S11][S17][S18][S26] | Neurons "Predict" pricing/API/predict-image/predict-video: `neuronsinc.com` / `apidocs.neuronsinc.com` |
| [S13][S14][S15] | Expoze.io / alpha.one product + API docs: `alpha.one` / `support.expoze.io` |
| [S16] | TranSalNet (MIT): `github.com/LJOVO/TranSalNet` |
| [S19][S20] | Attention Insight API + pricing: `attentioninsight.com` |
| [S21][S22] | Dragonfly AI: `dragonflyai.co` |
| [S23][S24] | 3M VAS: `3m.com/.../visual-attention-software-us` |
| [S25] | Realeyes: `realeyesit.com` |
| [S28][S29][S30] | DeepGaze (no SPDX; NC lineage): `github.com/matthias-k/DeepGaze` |
| [S31] | UMSI / predimportance ("non-commercial research only"): `predimportance.mit.edu` |

<!-- Conforms to CANON §4/§5/§6/§9/§10. Canonical names used verbatim: EngagementPredictor, EngagementScores,
     ProviderBus.predictor(job), ENGAGEMENT_BACKEND (saliency|tribe_research), RESEARCH_MODE, ENGINE_URL,
     services/engine, packages/shared, packages/render, Variant.engagement{}, Result, Experiment, ExperimentArm,
     Render, EngagementAnalyst, CarouselArchitect, Slide, Layer types. Byte-consistent with docs/03 §5/§8.3.
     Deviations flagged ⚑ RECOMMENDATION; assumptions flagged [ASSUMPTION]; drift-prone facts VERIFY before coding. -->
