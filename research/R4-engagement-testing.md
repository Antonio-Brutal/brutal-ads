# R4 — Engagement / Neuro Testing Module (grounding research)

> Grounding research for the **`EngagementPredictor`** provider and the `services/engine`
> engagement engine (CANON §4, §6 `EngagementScores`, §9, §10 `ENGAGEMENT_BACKEND`).
> **Read `handoff/CANON.md` first.** This doc conforms to canonical names
> (`EngagementPredictor`, `EngagementScores`, `ProviderBus.predictor(job)`, `ENGAGEMENT_BACKEND`,
> `RESEARCH_MODE`, `services/engine`). Where research suggests a deviation, it is tagged
> **⚑ RECOMMENDATION**. Every drift-prone fact is tagged **VERIFY before coding**.
>
> Research window: **mid-2026 (June–July 2026)**. All external facts are cited inline.

---

## 0. TL;DR / decisions

1. **TRIBE v2 is legally radioactive for the commercial path.** Meta `facebook/tribev2` is **CC-BY-NC-4.0** (non-commercial). The reference repo `amirmushichge/tribeV2_ViralAnalyser` is **all-rights-reserved, non-commercial evaluation code** and inherits the NC restriction. It **must never sit on a revenue path**. It is kept as a **flag-gated R&D backend** (`ENGAGEMENT_BACKEND=tribe_research` + `RESEARCH_MODE=true`) inside `services/engine`, isolated from the shipping predictor. (CANON §9 already locks this — confirmed correct.) [S1][S2][S3][S12]
2. **The production static path is 100% ownable and commercially clean:** our **own grid-salience heuristics** (the reference repo's `visual_grid_analysis.py` math is a plain OpenCV/NumPy heuristic — an *algorithm*, freely reimplementable; only its specific *source code* is unlicensed, so **reimplement, don't copy**) + a **commercially-licensed saliency map** as the `attention_mean/attention_peak` input. Two clean saliency sources: **(a) a paid vendor API** (Expoze.io / Neurons / Dragonfly AI / 3M VAS) or **(b) an MIT-licensed open model** (TranSalNet, MIT). The **research-only** open models (DeepGaze weights, UMSI) are **excluded from the commercial path**. [S4][S13][S14][S16]
3. **Recommended production routing:** static image + carousel per-slide → **TranSalNet (MIT, self-hosted) as the default saliency backend**, with **Expoze.io API** as a higher-fidelity paid upgrade for tenants who want it; video first-3-seconds → **heuristic on first-frame saliency + motion/cut analysis** now, **Neurons "Predict Video" API** or **Dragonfly AI** as the paid video upgrade. TRIBE v2 stays R&D-only.
4. **Never sell a number as truth.** Every score ships as **bands + confidence** (`predictedCtrBand{low,high,confidence}`) and is **calibrated against the tenant's real LinkedIn results** over time (CANON §6, §9).

---

## 1. Reference repo — `amirmushichge/tribeV2_ViralAnalyser` ("TRIBE Review MVP")

A local **FastAPI** app that wraps Meta TRIBE v2 for creative review. Precisely, it computes three things. [S1][S2]

### 1.1 Video — brain-response curves + weak-moment detection
- Runs the **official TRIBE v2 inference path** on an uploaded video, producing a **predicted brain-response curve** over the timeline + a **3D brain visualization** (which cortical zones activate) and **temporal (frame-by-frame) heatmaps**. [S1][S2]
- **Weak-moment detection** = find **real dips in the response curve**; the UI lets you click the dip timestamp and inspect nearby frames. It is *curve-trough detection over the predicted response*, not a separate model. [S1][S2]
- Files: `app.py` (entry), `tribe_runtime.py` (inference wrapper), `brain_visualization.py`, `review_engine.py` (comparison/"find weak moments"), `official_report.py` / `pdf_report.py` (exports), `report_localization.py`. **Whisper** provides word-level timing hints; **Ollama** is optional for rewriting the recommendation text. [S1][S2]

### 1.2 Static image-grid salience ranking — `visual_grid_analysis.py`
Ranks 4–12 options **inside one uploaded image grid** and returns per-cell scores + a plain-language reason ("winner is stronger from contrast, color, position, focus, or lower visual clutter"). **This is a classical CV heuristic — no neural net of its own** (it consumes an attention heat map as one input). Exact math (extracted; **reimplement, do not copy the source — repo is unlicensed**): [S2]

- **Grid detection:** fixed **N×M uniform split** (not contour detection). `_resolve_grid_shape()` picks from `COMMON_GRID_SHAPES` (2×2 … 4×4) by minimizing aspect-ratio penalty; `_build_cells()` slices pixel bounds.
- **Per-cell metrics** (`_cell_metrics()`):
  | Metric | Computation |
  |---|---|
  | Contrast | `np.std(gray_crop)` (grayscale std-dev) |
  | Colorfulness | `mean(max_channel − min_channel)` per RGB pixel |
  | Focus | `attention_peak − attention_mean` (concentration) |
  | Center bias | `exp(-(((x−0.5)²/0.18) + ((y−0.42)²/0.28)))` (favors center, slightly upper) |
  | Edge density | `np.mean(edge_crop)` (gradient magnitude; clutter proxy) |
  | Attention mean/peak | from `_attention_heat()`; **peak = 92nd percentile** |
- **Final score** (`_cell_score()`):
  ```
  raw = attention_mean*0.46 + attention_peak*0.24
      + min(contrast*2.2, 1.0)*0.12 + min(colorfulness*2.4, 1.0)*0.10
      + center_bias*0.08 - max(edge_density-0.18, 0.0)*0.16
  score = round(clamp(raw, 0, 1) * 100)
  ```
  → attention dominates (~70%), contrast+color ~22%, center bias 8%, edge-clutter penalty above a 0.18 threshold. **This is exactly the "commercially-clean grid heuristic" CANON §9 wants us to own** — the weights are a starting calibration point, not sacred. [S2]

### 1.3 Landing-page attention capture — `website_capture.py` + `website_analysis.py`
- Captures a landing page in a **local browser** (Chrome/Edge), **auto-closes GDPR/cookie banners**, **desktop + mobile** dual capture, **before/after URL** comparison, parses **fold sections**. [S1][S2]
- Builds a **visual attention estimate from page structure, contrast, color, and layout signals** — **explicitly not eye-tracking** and not TRIBE. (So the landing-page mode is *also* commercially reimplementable heuristic, only the browser-capture plumbing is bespoke.) [S1][S2]

### 1.4 Hardware & license (the reference repo itself)
- **RAM ≥16 GB; NVIDIA GPU 6 GB VRAM min, 12 GB+ preferred; disk ≥30 GB (SSD); modern 8-core CPU.** [S1][S2]
- **License: "No open-source license is granted yet. Treat this repository as private, all-rights-reserved, non-commercial evaluation code."** GitHub API returns **no SPDX license** for the repo. **⇒ We cannot copy its code into a commercial product.** We may study the algorithm and reimplement the heuristic ourselves. [S2][S12]

---

## 2. Meta TRIBE v2 (`facebook/tribev2`) — capability, I/O, cost, license

**What it is:** a Transformer-based **multimodal → fMRI brain-encoding** foundation model. Given naturalistic **video / audio / text**, it predicts the **fMRI response on the cortical surface**. [S3][S5][S6][S7]

| Property | Value | Source |
|---|---|---|
| Output surface | **fsaverage5 cortical mesh, ~20,000 vertices** | [S3][S6] |
| Output shape | `(n_timesteps, n_vertices)` | [S3] |
| **Hemodynamic lag** | Predictions **offset 5 s into the past** to compensate for blood-flow lag | [S3][S6] |
| Feature extractors | **LLaMA 3.2-3B** (text) · **V-JEPA2** (video) · **Wav2Vec-BERT 2.0** (audio) | [S6] |
| Text input | auto-converted to speech + transcribed for **word-level timings** | [S3][S6] |
| Training data | fMRI from **>700 healthy volunteers** across images/podcasts/videos/text; **~70× resolution vs v1** (v1 mapped ~1,000 regions, v2 ~20k vertices); **zero-shot to new subjects/languages/tasks** | [S5][S6][S7] |
| Runtime | **Python 3.11+**; `pip install -e .`; input via `model.get_events_dataframe(video_path=…)` | [S3] |
| **License** | **CC-BY-NC-4.0** (Creative Commons Attribution-**NonCommercial** 4.0) | [S3][S5][S6][S7] |

**VERIFY before coding:** exact **VRAM / model parameter count is not published** on the HF/GitHub/blog pages. The *reference wrapper* recommends **6 GB min / 12 GB+ VRAM**, but that's for the wrapped pipeline including video feature extraction (V-JEPA2), Whisper, etc. — treat **12 GB+ (e.g. an A10/L4-class GPU)** as the safe floor and **benchmark before committing Modal/Replicate GPU tier.** [S1][S2][S3]

### 2.1 License implications — **the load-bearing legal fact**
- **CC-BY-NC-4.0 forbids commercial use.** "Commercial" = "primarily intended for or directed toward commercial advantage or monetary compensation." A paid SaaS that scores ads is squarely commercial. Using TRIBE v2 (weights **or** derived outputs) in the shipping product is a **license breach**. [S3][S5][S8]
- **The ViralAnalyser inherits this** and is itself all-rights-reserved. **Both are excluded from the commercial path.** [S2][S3]
- **NC taints derived outputs too:** the safest reading is that heatmaps/curves *produced by* an NC model are also NC and cannot be sold or shown to paying customers. Do not surface TRIBE outputs in the product UI on any paid workspace. [S8]
- **⚑ RECOMMENDATION:** keep TRIBE strictly for **internal offline calibration research** (e.g., correlating TRIBE curves against our heuristic and against real LinkedIn CTR to *tune the heuristic's weights*), gated by `RESEARCH_MODE=true` **and** a workspace flag, **never** exposed to a tenant. This is the only defensible use, and even then log it as R&D. **A lawyer should sign off before any TRIBE-derived signal informs a shipped model** (VERIFY before coding).

---

## 3. Commercial attention / saliency vendors (APIs)

All of the below are **licensed for commercial use via their paid plans / API terms** (that's the product). Prices/terms drift — **VERIFY before coding** on each vendor's live pricing + API-terms page and get the API tier quote in writing.

### 3.1 Comparison table

| Vendor | Modality | API? | Auth | Accuracy claim | Public price (mid-2026) | API pricing | Best for | Sources |
|---|---|---|---|---|---|---|---|---|
| **Neurons "Predict"** | image, video, animated/VAST | **Yes**, REST, built for DSP/CMS/dashboards | `X-API-Key` header; base `https://api.neuronsinc.com` | neuro-calibrated | Standard **€15,000/yr / 5 seats** (incl. API) | key from CSM; enterprise quote | **Richest metric set** (focus, cognitive demand, clarity, engagement, memory, intent, trust, avoidance) + AOI; video support | [S9][S10][S11][S17][S18] |
| **Attention Insight** | image (+ video) | **Yes** (developer API) | API key | "90% accuracy", 5.5M fixations | Solo **$23/mo**, Team **$479/mo** | contact sales | Cheap heatmaps, Figma/PS plugins | [S19][S20] |
| **Expoze.io** (alpha.one) | image, video | **Yes**, REST | **JWT bearer** (`POST /auth/token`); base `https://api.expoze.app` | 0.87 MIT/Tübingen benchmark; "95%" vs eye-tracking | Core **€24.99/mo** (50 img), Pro **€449.99/mo** (1k img + 11 min video) | **custom** ("no standard price") | Clean per-AOI `score`, cheap entry, good API ergonomics | [S13][S14][S15] |
| **Dragonfly AI** | image, video (creative testing) | **Yes**, API-driven integration | enterprise | **89% vs pro eye-tracking (~39 participants)**; per-pixel saliency | Basic/Pro/Enterprise (undisclosed) | enterprise contract | Portfolio-scale creative testing, benchmarking | [S21][S22] |
| **3M™ VAS** (Visual Attention Software) | image | plug-in + web app (limited API) | per-seat license | **92% first-glance accuracy** | **$550–600/user/yr** ($225–300 after rebate) | n/a (seat license) | Cheapest per-seat, Adobe plug-in; weak for automation | [S23][S24] |
| **Realeyes** | **video** (attention + emotion, webcam panels) | enterprise API (custom quote) | enterprise | scene-level attention/emotion peaks | **managed studies $5K–50K each** | custom | Human-panel video testing; **not embeddable per-request** | [S25] |
| **VAS = 3M VAS** (above) | — | — | — | — | — | — | (same as 3M row) | [S23] |

**Read:** For a **per-request, in-product API** the realistic shortlist is **Expoze.io** (cheapest clean API + JWT), **Neurons** (richest metrics, best for a premium tier + video), **Dragonfly AI** (creative-testing/benchmarking angle). **3M VAS** is seat-licensed (poor fit for automated scoring). **Realeyes** is a managed-study house, not an embeddable API. **Attention Insight** is a low-cost heatmap option but thinner metric surface. [S9][S13][S19][S21][S23][S25]

### 3.2 Neurons "Predict" — endpoint/auth/request/response skeleton
**VERIFY before coding** against `https://apidocs.neuronsinc.com` (OpenAPI at `/llms.txt`); key is issued by a Customer Success Manager. [S17][S18]

- **Auth:** header `X-API-Key: <key>`. Base `https://api.neuronsinc.com`. [S17]
- **Image flow (async):**
  - Upload+predict: `POST /predict/v2/images` — `multipart/form-data`, `accept: application/json` → returns `media_id`. [S17][S18]
  - (or) run predict on existing media: `PUT /predict/v2/images/{media_id}/predict`. [S18]
  - Poll: `GET /media` / `GET /media/{media_id}` until `status: "done"`. [S11]
  - AOIs: `Detect Image Aois`, `Detect Video Aois`, `Update Video Aois` (sync). [S11]
- **Image response fields** (all 0–100 %): `cognitive_demand`, `focus`, `focus_first_two`, `focus_last_two`, `clarity`, `engagement`, `engagement_new`, `memory`, `intent`, `trust`, `avoidance`; plus a `results` object of heatmap URLs: `heat`, `clarity_heat`, `engagement_heat`, `cognitive_demand_heat`, `memory_heat`, `intent_heat`, `trust_heat`, `avoidance_heat`, `fog`, `formatted`, `first_two_heat`, `first_two_fog`, `last_two_heat`, `last_two_fog`, `engagement_new_heat`. **⚠ Heatmap URLs expire after ~5 minutes — download immediately to our own storage.** [S18]
- **Video:** `PUT /predict/v2/videos/{media_id}/predict` → `{media_id}`; async (`init → started → done`), polled via `GET /media`; videos normalized to **24 fps**, downscaled to **1024 px** max side; re-trigger while running → `202 "Prediction already started"`. Per-second time-series field names **not published on the reference page — VERIFY**. [S26]

```jsonc
// Neurons image predict — illustrative (verify field set against live OpenAPI)
// POST https://api.neuronsinc.com/predict/v2/images   (multipart: file=@ad.png)
{
  "media_id": "0d1aeafa-…",
  "status": "done",
  "type": "image",
  "focus": 63, "focus_first_two": 71, "clarity": 58,
  "cognitive_demand": 41, "engagement": 55, "memory": 60,
  "intent": 47, "trust": 66, "avoidance": 12,
  "results": { "heat": "https://…(expires 5min)", "engagement_heat": "https://…" }
}
```

### 3.3 Expoze.io — endpoint/auth/request/response skeleton
**VERIFY before coding** against `support.expoze.io` API docs + Postman collection from `expoze.app`. [S14][S15]

- **Auth:** JWT — `POST /auth/token` (username/password) → bearer; then `Authorization: Bearer <token>`. Base (inferred) `https://api.expoze.app`. [S14]
- **Upload:** `POST /spaces/{spaceId}/upload` (or `/developer/upload`), `multipart/form-data`, field `file` → `{ mediaId }`. Accepts `.jpeg/.png/.mp4/.mov` or base64. [S14][S15]
- **Predict/heatmap (async):** `POST /jobs.json` body `{ media, colormap, alpha, boost, preset }` → `{ id, status:"queued", progress:0 }`; poll job `status`/`progressStatus`; result via `expectedOutputUri`. [S14]
- **AOIs / score:** `POST /a_o_is.json` (rect/circle/triangle) → `{ id }`; `PUT /a_o_is.json/{id}` with coords → response includes **`score`** (attention % for that area). Overall salience under a `salience.score`. [S14][S15]

```jsonc
// Expoze — illustrative flow (verify)
// 1) POST /auth/token {username,password} -> {token}
// 2) POST /developer/upload  (file) -> {mediaId}
// 3) POST /jobs.json {media:mediaId, preset:"default"} -> {id, status:"queued"}
// 4) poll job.id until status=="done" ; download heatmap from expectedOutputUri
// 5) POST /a_o_is.json {job, shape:"rectangle", x,y,w,h} -> {id, score: 0.41}
```

---

## 4. Open saliency models — capability + **license verdict**

| Model | What it predicts | Code license | Weights / data caveat | **Commercial verdict** | Sources |
|---|---|---|---|---|---|
| **TranSalNet** (`LJOVO/TranSalNet`) | Image saliency (transformer over CNN); ResNet-50 / DenseNet-161 backbones | **MIT** ✅ (GitHub API confirms `spdx: MIT`) | Backbones = ImageNet weights (torchvision, BSD); trained on **SALICON** (annotations **CC-BY-4.0**, commercial-OK; source images = Flickr/MS-COCO ToU) | **✅ USABLE** (verify torchvision backbone + SALICON image ToU; retrain/fine-tune on clean data if paranoid) | [S16][S27][S4] |
| **DeepGaze IIE / III / MSDB** (`matthias-k/DeepGaze`) | SOTA image saliency + scanpath (III); MSDB uses CLIP+DINOv2 | **No SPDX license** on repo (GitHub API returns none); README states no explicit license | Weights are the research artifact; **DeepGaze II historically CC-BY-NC-ND**; needs centerbias | **❌ EXCLUDE from commercial path** — unlicensed code + NC lineage. R&D only. | [S28][S29][S30] |
| **UMSI** (predimportance, MIT/`diviz-mit`) | Visual **importance** across posters/infographics/UIs/**ads**/webpages | **BSD-3 modified — "non-commercial research purposes only"**; commercial licensing via `hertzman@adobe.com` | — | **❌ NON-COMMERCIAL** (contact Adobe to license) | [S31][S4] |
| **OpenSALICON** | SALICON saliency reimpl | license not clearly stated | based on SALICON | **⚠ VERIFY** — do not assume clean | [S4][S27] |
| **Meta TRIBE v2** | fMRI brain response (§2) | **CC-BY-NC-4.0** | NC taints outputs | **❌ NON-COMMERCIAL** | [S3] |

**Verdict:** the **only clean-to-ship open saliency model** among the usual suspects is **TranSalNet (MIT)**. DeepGaze and UMSI are **research-only** and belong behind the same `RESEARCH_MODE` fence as TRIBE. **SALICON annotations are CC-BY-4.0 (commercial OK)**, so a model *we* train/fine-tune on SALICON is defensible — the residual risk is the **Flickr/COCO source-image ToU**, not the fixation labels. **VERIFY before coding:** (a) TranSalNet `LICENSE` text still MIT at build time; (b) torchvision backbone weight license; (c) SALICON image ToU for the fine-tune corpus. [S16][S4][S27]

---

## 5. Design — the pluggable `EngagementPredictor` (CANON §6, §9)

### 5.1 Interface (canonical — do not rename)
```ts
// packages/shared — matches CANON §6 exactly
interface EngagementPredictor {
  id: string;
  score(input: RenderRef | VideoRef | GridRef): Promise<EngagementScores>;
}
// EngagementScores (CANON §6):
// { attentionMap?, focalClarity, valuePropAttention, ctaAttention, clutter,
//   stoppingPower, firstThreeSeconds?, predictedCtrBand?{low,high,confidence},
//   perSlide?: [...], raw }
```
`ProviderBus.predictor(job)` selects the driver from a **policy table** with override + fallback (CANON §6). `ENGAGEMENT_BACKEND ∈ {saliency, tribe_research}` (CANON §10) selects the *engine mode*; the router additionally picks the *saliency source* within `saliency` mode.

### 5.2 Backends (drivers behind the one interface)

| Driver `id` | Path | Saliency source | Commercial? | `ENGAGEMENT_BACKEND` |
|---|---|---|---|---|
| `saliency.transalnet` | static + per-slide | **TranSalNet (MIT), self-hosted in `services/engine`** | ✅ **default** | `saliency` |
| `saliency.expoze` | static + per-slide + video | **Expoze.io API** | ✅ paid upgrade | `saliency` |
| `saliency.neurons` | static + **video** | **Neurons API** | ✅ premium/video | `saliency` |
| `saliency.dragonfly` | static + video benchmarking | **Dragonfly AI API** | ✅ enterprise | `saliency` |
| `heuristic.grid` | **grid ranking + clutter/CTA/focus** (our reimpl of §1.2 math) | consumes any saliency map above | ✅ (our code) | `saliency` |
| `video.heuristic` | first-3s: first-frame saliency + motion/cut/subtitle-legibility | our code + saliency | ✅ | `saliency` |
| `research.tribe` | video brain-curve + weak-moment (R&D only) | **TRIBE v2** | ❌ **NC** | `tribe_research` |

### 5.3 Static path (single image) — the shipping default
1. `RenderRef` (Polotno store JSON → PNG via `packages/render`) + the **layer tree** (we know where CTA/headline/logo layers are — big advantage over pixel-only vendors).
2. Compute a **saliency map** via the selected driver (default `saliency.transalnet`).
3. Map to `EngagementScores`:
   - `attentionMap` = saliency heatmap (store to Supabase/R2; never rely on vendor URLs that expire, cf. Neurons 5-min URLs [S18]).
   - `focalClarity` = peak/mean concentration over the **primary subject** bbox (our `focus` = `attention_peak − attention_mean`, §1.2).
   - `valuePropAttention` = mean saliency inside the **headline/value-prop text-layer** bbox.
   - `ctaAttention` = mean saliency inside the **`cta` layer** bbox (CANON §5 layer types). *This is our killer feature vs vendors — we have exact layer bboxes.*
   - `clutter` = edge-density / distributed-saliency measure (§1.2 edge term).
   - `stoppingPower` = normalized peak saliency + subject dominance (calibrated, §7).
   - `predictedCtrBand{low,high,confidence}` from the calibration model (§7). **Bands, never point values.**

### 5.4 Per-slide carousel scoring
- Score **each `Slide`'s** layer tree independently → `perSlide: [{ focalClarity, ctaAttention, clutter, stoppingPower, … }]`.
- Add **narrative continuity** checks aligned to CANON §7 `CarouselArchitect` (hook→reframe→close): **slide 1 must have the highest `stoppingPower`** (it's the thumb-stopper); CTA slide must have high `ctaAttention`. Flag any slide whose `stoppingPower` is a **dip** relative to neighbors (the static analogue of TRIBE's weak-moment detection — implemented as **trough detection over the per-slide `stoppingPower` sequence**, our own code, no NC dependency).
- **Grid mode** (`heuristic.grid`): when the `EngagementAnalyst` compares 4–12 variant thumbnails, run the reimplemented §1.2 grid ranker over a composited option grid → ranked cells + reason string. **Reimplement the math; do not copy the repo.**

### 5.5 Video path + first-3-seconds
- **Now (commercial, no TRIBE):** `video.heuristic` — sample frames (esp. **t≤3s**), run saliency per sampled frame, add **motion magnitude / cut density** (OpenCV) and **subtitle-legibility** check (muted-first mandate, CANON §8/§1). `firstThreeSeconds` = aggregate stopping-power over t∈[0,3s]; `stoppingPower` weighted heavily on the first frame + first cut.
- **Paid upgrade:** route video jobs to **Neurons "Predict Video"** or **Dragonfly AI** for a proper per-second attention curve; map their time-series → `firstThreeSeconds` + a `raw` curve. (Neurons normalizes to 24 fps / 1024 px, async-poll [S26].)
- **R&D only:** `research.tribe` reproduces the reference repo's brain-response curve + weak-moment detection for **offline calibration** — behind `ENGAGEMENT_BACKEND=tribe_research` **and** `RESEARCH_MODE=true`, **never returned to a tenant**.

### 5.6 Landing-page attention (bonus, matches reference §1.3)
Reimplement the structure/contrast/layout heuristic (our code) + reuse the saliency driver; capture desktop+mobile screenshots headless in `services/engine`. Commercially clean (no TRIBE). Optional module; not on the critical path.

---

## 6. TRIBE isolation — exact flag-gating in `services/engine`

**Requirement (CANON §9):** TRIBE v2 is a **flag-gated R&D backend, never on the commercial path.**

- **Two independent gates, both required** to load TRIBE:
  1. `ENGAGEMENT_BACKEND=tribe_research` (CANON §10), **and**
  2. `RESEARCH_MODE=true` (CANON §10).
- **Physical isolation:** TRIBE code lives in a separate package/module, e.g. `services/engine/research/tribe/` with its **own optional dependency group** (`pip install ".[research]"`), so a production image built **without** the `research` extra **cannot import** V-JEPA2 / TRIBE weights at all. The default production container ships **without** the research extra.
- **Router refuses TRIBE on paid paths:** `ProviderBus.predictor(job)` must **hard-error** if `job` is tenant-facing/billable and the resolved driver is `research.tribe`. Add a startup assertion: if `RESEARCH_MODE!=true`, the `research.tribe` driver is **not registered** in the policy table at all.
- **Licensing guardrails in code:** a `LICENSE_GUARD` check that logs `AuditLog` + `cost_usd` and stamps any TRIBE-derived artifact `commercial_use=false`; block it from ever being attached to a `Variant.engagement{}` that a tenant reads.
- **Output taint:** TRIBE outputs may inform **our heuristic's weight calibration offline**, but the calibration *coefficients* we ship must be **defensibly derived from real LinkedIn results + a clean saliency model**, not directly from TRIBE curves. **⚑ RECOMMENDATION: legal sign-off before any TRIBE-influenced coefficient ships.** (VERIFY before coding.)
- **Never call TRIBE from `apps/web`.** Only `services/engine` in `RESEARCH_MODE` can. `ENGINE_URL` from web never carries a research flag.

---

## 7. Calibration loop vs the tenant's real LinkedIn results

**Principle (CANON §6/§9):** report **bands + confidence**, calibrated per tenant over time. Raw saliency/vendor scores are *inputs*, not the CTR claim.

1. **Log predictions** on every scored `Variant`: `engagement{}` with the raw features (focalClarity, ctaAttention, clutter, stoppingPower, firstThreeSeconds, saliency-source id, model_version).
2. **Ingest actuals:** pull real **LinkedIn** results into `Result` per `ExperimentArm` (impressions, clicks → CTR; optionally CPC/CVR). (Ingestion pathway is R6/LinkedIn-API scope; here we consume `Result`.)
3. **Fit per-tenant (and global-prior) calibrator:** a simple, auditable model (isotonic / logistic / small GBM) mapping features → **CTR band**. Start from a **global prior** (cold-start) and **shrink toward the tenant's own data** (empirical-Bayes) as `Result` volume grows → `predictedCtrBand{low,high,confidence}` where **confidence rises with tenant sample size** and the **band widens when data is thin**.
4. **Recalibrate on a schedule** (job in `services/engine`); version the calibrator; store `model_version` on each prediction for backtesting. Surface **calibration quality** (e.g., predicted-vs-actual reliability) to the `EngagementAnalyst`.
5. **Never overclaim:** if tenant data is insufficient, return a **wide band + low confidence** and label the number as a **directional estimate**, not a guarantee (matches every vendor's own hedging and keeps us legally clean). [S9][S19][S21]

---

## 8. Recommendation — job → provider routing policy

**Default production posture:** own the static path with **TranSalNet (MIT) + our grid/clutter/CTA heuristics**; offer paid API upgrades; keep TRIBE R&D-only.

| Job | Primary | Fallback | Paid upgrade | Never |
|---|---|---|---|---|
| Single-image score | `saliency.transalnet` (self-host) | `heuristic.grid` on cached saliency | `saliency.expoze` → `saliency.neurons` | TRIBE |
| Carousel per-slide | `saliency.transalnet` + per-slide + trough detection | `heuristic.grid` | `saliency.expoze` | TRIBE |
| Variant grid ranking (4–12) | `heuristic.grid` (reimpl §1.2) over TranSalNet maps | — | `saliency.expoze` per-AOI `score` | TRIBE |
| Video first-3s / stopping power | `video.heuristic` (frame saliency + motion/cut) | first-frame `saliency.transalnet` | `saliency.neurons` (Predict Video) / `saliency.dragonfly` | TRIBE on paid |
| Landing-page attention | own structure/contrast heuristic + saliency | — | `saliency.expoze` | TRIBE |
| Brain-response / weak-moment R&D | `research.tribe` **iff** `RESEARCH_MODE=true` **and** `ENGAGEMENT_BACKEND=tribe_research` | — | — | any tenant-facing use |

**Cost note:** TranSalNet self-hosted is ~free per call (GPU amortized on Modal/Replicate, CANON §4); Expoze entry ~€25/mo (50 img) scaling to €449.99/mo (1k img + video); Neurons €15k/yr; both API tiers require a written quote — **VERIFY before coding**. Cache all scores by `(saliency_source, model_version, render_hash)` (CANON §4 caching).

---

## 9. "VERIFY before coding" checklist
1. **TRIBE VRAM/params** — not published; benchmark before choosing Modal/Replicate GPU tier. [S3]
2. **TRIBE license** — reconfirm CC-BY-NC-4.0 on `facebook/tribev2` at build time; **legal sign-off** for any offline-calibration use of TRIBE-derived signal. [S3]
3. **Neurons** — confirm base URL, `/predict/v2/images`, `PUT …/predict`, poll `GET /media`, full image field set + **video per-second field names** (undocumented on the ref page), heatmap URL expiry (~5 min). Get API-tier price in writing. [S17][S18][S26]
4. **Expoze.io** — confirm base `api.expoze.app`, `/auth/token` JWT, `/developer/upload`, `/jobs.json`, `/a_o_is.json` + `score` field; get custom API price. [S14][S15]
5. **TranSalNet** — confirm `LICENSE` still **MIT**; check torchvision backbone weight license; check SALICON **source-image** ToU for any fine-tune corpus. [S16][S27][S4]
6. **DeepGaze / UMSI** — reconfirm **no clean commercial license** before using anywhere but `RESEARCH_MODE`. [S28][S31]
7. **Dragonfly AI / 3M VAS / Realeyes** — confirm current pricing + API availability + commercial terms before selecting. [S21][S23][S25]
8. **Reimplement, don't copy** the reference repo's grid/landing math — it is **unlicensed, all-rights-reserved**. [S2][S12]
9. **SALICON annotations CC-BY-4.0** (commercial OK) but **source images Flickr ToU** — verify before shipping a model trained on it. [S4][S27]

---

## Sources
- [S1] TRIBE Review MVP repo (GitHub page): https://github.com/amirmushichge/tribeV2_ViralAnalyser
- [S2] TRIBE Review MVP README + `visual_grid_analysis.py` (raw): https://raw.githubusercontent.com/amirmushichge/tribeV2_ViralAnalyser/main/README.md · https://raw.githubusercontent.com/amirmushichge/tribeV2_ViralAnalyser/main/visual_grid_analysis.py
- [S3] Meta TRIBE v2 model card: https://huggingface.co/facebook/tribev2
- [S4] SALICON dataset (annotations CC-BY-4.0; Flickr image ToU): https://www.salicon.net/ · https://paperswithcode.com/dataset/salicon
- [S5] MarkTechPost, TRIBE v2 release: https://www.marktechpost.com/2026/03/26/meta-releases-tribe-v2-a-brain-encoding-model-that-predicts-fmri-responses-across-video-audio-and-text-stimuli/
- [S6] Progressive Robot, TRIBE v2 facts (vertices/lag/extractors): https://www.progressiverobot.com/2026/04/16/tribe-v2-model/
- [S7] Meta AI blog, TRIBE v2: https://ai.meta.com/blog/tribe-v2-brain-predictive-foundation-model/
- [S8] Creative Commons BY-NC-4.0 deed: https://creativecommons.org/licenses/by-nc/4.0/
- [S9] Neurons pricing: https://www.neuronsinc.com/pricing · Capterra: https://www.capterra.com/p/233868/Predict/
- [S10] Neurons API product page: https://www.neuronsinc.com/api
- [S11] Neurons API reference (endpoint index / rate limiting / AOIs): https://apidocs.neuronsinc.com/reference/welcome · https://apidocs.neuronsinc.com/llms.txt
- [S12] GitHub API license metadata (ViralAnalyser = no SPDX; DeepGaze = none; TranSalNet = MIT): https://api.github.com/repos/amirmushichge/tribeV2_ViralAnalyser · …/matthias-k/DeepGaze · …/LJOVO/TranSalNet
- [S13] Expoze.io / alpha.one product + pricing: https://www.alpha.one/products/expoze-io/pricing
- [S14] Expoze.io API developer docs: https://support.expoze.io/article/214-api-developer-documentation
- [S15] Expoze.io getting-started with the API: https://support.expoze.io/article/217-getting-started-with-the-api
- [S16] TranSalNet repo (MIT; ResNet-50/DenseNet-161 backbones): https://github.com/LJOVO/TranSalNet
- [S17] Neurons API get-started (auth `X-API-Key`, base URL): https://apidocs.neuronsinc.com/reference/get-started
- [S18] Neurons API predict-image (fields + 5-min heatmap URLs): https://apidocs.neuronsinc.com/reference/predict-image
- [S19] Attention Insight API: https://attentioninsight.com/api/
- [S20] Attention Insight pricing: https://attentioninsight.com/billing-plans/ · Capterra: https://www.capterra.com/p/184334/Attention-Insight/
- [S21] Dragonfly AI: https://dragonflyai.co/ · FAQs: https://dragonflyai.co/faqs
- [S22] Dragonfly AI vs Attention Insight (accuracy comparison): https://attentioninsight.com/dragonfly-ai-vs-attention-insight/
- [S23] 3M VAS product + pricing: https://www.3m.com/3M/en_US/visual-attention-software-us/ · https://www.3m.com/3M/en_US/visual-attention-software-us/pricing-sign-up/
- [S24] 3M VAS features: https://www.3m.com/3M/en_US/visual-attention-software-us/features/
- [S25] Realeyes technology / how-it-works: https://www.realeyesit.com/technology/how-it-works/ · https://www.softwaresuggest.com/realeyes
- [S26] Neurons API predict-video (async, 24fps/1024px normalization): https://apidocs.neuronsinc.com/reference/predict-video
- [S27] OpenSALICON / SALICON model background: https://arxiv.org/abs/1606.00110
- [S28] DeepGaze repo (no SPDX license; DeepGaze IIE/III/MSDB): https://github.com/matthias-k/DeepGaze
- [S29] DeepGaze IIE paper: https://arxiv.org/abs/2105.12441
- [S30] DeepGaze II license note (CC-BY-NC-ND lineage): https://jov.arvojournals.org/article.aspx?articleid=2652017
- [S31] UMSI / predimportance ("non-commercial research only"; Adobe license contact): https://predimportance.mit.edu/ · https://arxiv.org/abs/2008.02912

<!-- Conforms to CANON §4/§6/§9/§10. Canonical names used verbatim: EngagementPredictor, EngagementScores, ProviderBus.predictor(job), ENGAGEMENT_BACKEND (saliency|tribe_research), RESEARCH_MODE, services/engine, packages/shared, packages/render. Deviations flagged ⚑ RECOMMENDATION. -->
