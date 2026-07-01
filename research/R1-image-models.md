# R1 — Image-Generation Model & API Landscape (mid-2026)

> Grounding research for **Brutal Ads**. Scope: models/APIs that produce LinkedIn ad **imagery**
> (backgrounds / scenes / subjects / product-in-scene). **All legible on-brand text (headline, subhead,
> CTA, logo, legal, price, slide copy) is composited as an editable vector/text layer on the Polotno
> layer tree — never baked into pixels** (CANON §2 load-bearing decision). In-image text generation is
> therefore a **rare / exceptional** job here, not the default.
>
> Conforms to `CANON.md`: object model, `ImageProvider`/`GenSpec`/`GenResult` contracts (§6), agent names
> (§7), env var names (§10), and provider list (§4). Divergences from CANON are flagged **⚑ RECOMMENDATION**.
> Every price/endpoint that can drift is tagged **[VERIFY]** — re-check before coding; APIs moved fast between
> the CANON snapshot and this research.

---

## 0. TL;DR routing decision (read this first)

- **Primary hero / scene / product imagery → BFL DIRECT (FLUX.2 [pro]).** The client already lives on
  BFL/FLUX; FLUX.2 is now the shipping family. Direct API = lowest per-image cost, first-party webhooks,
  full model breadth (pro/max/flex/klein + Kontext edit + Tools: outpaint/erase). Use **Fal as the
  multi-model fallback + single-billing aggregator** for models BFL doesn't host (Seedream, Ideogram,
  Recraft, Luma, Reve, background-removal utilities).
- **Brand-consistent instruct-edit / "change only this" / subject-consistency → Gemini 3 "Nano Banana"
  image (instruct-edit + up to 14 refs)** first, **FLUX.1 Kontext [pro/max]** second. Client already uses
  nano-banana.
- **In-image text (rare) → Ideogram 3.0** (best legibility) or **Recraft V3** (brand/design + **true SVG
  vector** output) — but prefer compositing text as a Polotno layer and only fall back to generated text
  for stylized textures baked into a scene.
- **Fast/cheap draft (board thumbnails, ideation) → Luma Photon Flash ($0.002)** or **FLUX.2 [klein]
  / gpt-image mini**.
- **Utilities → Bria** (commercially-licensed background-removal / expand / relight, indemnified) over
  Clipdrop; **FLUX Tools** (outpaint/erase) when already on BFL.

Full ranked policy table in §9.

---

## 1. Model-family status changes vs CANON snapshot (flag these to the factory)

CANON was written against an earlier snapshot. Verified current (mid-2026) state:

| CANON says | Current reality (mid-2026) | Action |
|---|---|---|
| FLUX `flux-pro-1.1`, `1.1-ultra`, "FLUX.2 if available" | **FLUX.2 family shipped** and is the default: `[pro]`, `[max]`, `[flex]`, `[klein] 4B/9B`. FLUX1.1 `[pro]`/`[pro] ultra` still available (legacy fixed-credit pricing). | ⚑ **RECOMMENDATION**: default to **FLUX.2 [pro]**; keep FLUX1.1 as a cheap legacy fallback. Endpoints currently served under `*-preview` slugs (see §2). |
| FLUX.1 Kontext for instruct-edit | Still current: **FLUX.1 Kontext [pro]/[max]** on BFL; FLUX.2 also natively does multi-ref edit. | Keep Kontext as the BFL edit path; consider FLUX.2 edit. |
| "nano-banana / Gemini image" | **Gemini 2.5 Flash Image = original "Nano Banana"** (now legacy). Current: **Gemini 3 Pro Image = "Nano Banana Pro"** (`gemini-3-pro-image-preview`) + **Gemini 3.1 Flash Image** + **3.1 Flash Lite**. | ⚑ Update client default to **`gemini-3-pro-image`** (quality) / **`gemini-3.1-flash-image`** (workhorse). |
| OpenAI **gpt-image-1** | gpt-image-1 **deprecating 2026-10-23**. Current lineup: **GPT Image 2** (flagship), **GPT Image 1.5**, **GPT Image 1 Mini**. | ⚑ Use **GPT Image 1.5 / Mini** for new code; do NOT hardcode `gpt-image-1`. Keep env var `OPENAI_API_KEY` (CANON §10) unchanged. |
| ByteDance **Seedream 4.0** | **Seedream 4.5** shipped (same fal price, 30–40% faster, better text). | ⚑ Default to **v4.5**; keep `SEEDREAM_API_KEY` name. |

None of these change the **CANON object model, provider contracts, agent names, or env var names** — only
the concrete `model` / `model_version` strings passed inside `GenSpec.model` and stored in `Variant` lineage.

---

## 2. FLUX via Black Forest Labs — DIRECT API

**Client already uses this (primary imagery). This is the default provider.**

- **Base URL (global):** `https://api.bfl.ai` — global routing + auto-failover. Regional:
  `https://api.eu.bfl.ai` (GDPR), `https://api.us.bfl.ai`. **[VERIFY]** Some docs still show legacy
  `docs.bfl.ml`; API host is `api.bfl.ai`. For DE law-firm tenant, prefer **`api.eu.bfl.ai`** for GDPR.
- **Auth header:** `x-key: ${BFL_API_KEY}` (CANON env `BFL_API_KEY`). ⚠️ Not `Authorization: Bearer`.
- **Async model:** create → returns `{id, polling_url}` → **poll `polling_url`** (or `GET /v1/get_result?id=`)
  until `status:"Ready"` → `result.sample` is a **signed URL valid ~10 min** (download immediately, re-host in
  Supabase/R2 per CANON §4). Or use webhooks.
- **Concurrency / rate limit:** **max 24 concurrent active tasks** on most endpoints; **`flux-kontext-max`
  = 6**. Exponential backoff on HTTP 429. **[VERIFY]** exact caps at build time.

### 2.1 Model endpoints & pricing (BFL direct)

| Model | Endpoint slug (`POST /v1/…`) | Price | Notes |
|---|---|---|---|
| FLUX.2 [pro] | `flux-2-pro-preview` **[VERIFY slug]** (stable: `flux-2-pro`) | **from $0.03** / MP (first MP flat, then per-MP) | **Default hero model.** MP-metered: 1MP≈$0.03, larger costs more. Ref-image input billed ~$0.015/MP. |
| FLUX.2 [max] | `flux-2-max-preview` / `flux-2-max` | **from $0.07** / first MP (+$0.03/MP) | Highest fidelity; reserve for finals. |
| FLUX.2 [flex] | `flux-2-flex-preview` / `flux-2-flex` | **from $0.05** | Tunable steps/guidance. |
| FLUX.2 [klein] 9B / 4B | `flux-2-klein-9b-preview` / `flux-2-klein-4b-preview` | **from $0.015 / $0.014** | **Cheap draft** tier. |
| FLUX1.1 [pro] | `flux-1-1-pro` | **$0.04** (4 credits) | Legacy fallback. |
| FLUX1.1 [pro] Ultra | `flux-1-1-pro-ultra` | **$0.06** (6 credits) | 4MP, high-res legacy. |
| FLUX.1 Kontext [pro] | `flux-kontext-pro` | **$0.04** (4 credits) | **Instruct-edit** (text-prompt edits, char consistency). |
| FLUX.1 Kontext [max] | `flux-kontext-max` | **$0.08** (8 credits) | Best edit adherence; concurrency cap 6. |
| FLUX Tools | `flux-pro-1.0-fill` / `-expand` / outpaint/erase (see §8) | varies | Inpaint/outpaint/eraser. |

> **[VERIFY]** MP-metered FLUX.2 pricing means a single "1200×1200" LinkedIn 1:1 (1.44 MP) costs slightly
> more than the "from $X" floor. Compute per-tenant cost from the **BFL pricing calculator** at build; store
> the resolved `costUsd` in `GenResult.costUsd` / `Variant.engagement`/lineage.

### 2.2 Create + poll skeleton (verbatim shape)

```bash
# 1) CREATE
curl -X POST 'https://api.bfl.ai/v1/flux-2-pro-preview' \
  -H 'accept: application/json' \
  -H "x-key: ${BFL_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "editorial documentary photo, muted dark palette, ...",
    "aspect_ratio": "1:1",          // supported alongside width/height  [VERIFY enum vs px]
    "width": 1440, "height": 1440,   // or set width/height directly
    "seed": 12345,                   // deterministic; store in lineage
    "output_format": "png",
    "safety_tolerance": 2,
    "webhook_url": "https://app…/api/webhooks/bfl",   // optional
    "webhook_secret": "…"                              // optional, for signature verify [VERIFY]
  }'
# → { "id": "…", "polling_url": "https://api…/v1/get_result?id=…" }
```
```bash
# 2) POLL (until status == "Ready")
curl -X GET "${polling_url}" -H 'accept: application/json' -H "x-key: ${BFL_API_KEY}"
# → { "id":"…","status":"Ready","result": { "sample":"https://signed-url…(10 min TTL)" } }
```
FLUX.2 [pro] accepts `guidance, steps, seed, aspect_ratio, safety_tolerance, output_format`. **[VERIFY]** the
exact `aspect_ratio` enum (some FLUX endpoints take `aspect_ratio` strings, others only `width`/`height`); the
1.91:1 / 4:5 LinkedIn ratios (CANON §8) may need explicit width/height.

### 2.3 Webhook shape
Pass `webhook_url` on create; BFL POSTs the result (same `{id,status,result.sample}` body) when ready — no
polling needed. **[VERIFY]** signature-verification mechanism (`webhook_secret` header/HMAC) in current docs
before trusting payloads. If webhooks unused, the polling path is unchanged.

### 2.4 License (BFL direct)
Outputs under BFL's **commercial ("Professional") license → permissive commercial use**; separate
open-weights (fine-tune/LoRA rights) and synthetic-data licenses exist. **[VERIFY]** current commercial terms +
whether the Brutal tenant needs the paid commercial tier vs the API's default output rights.

---

## 3. FLUX (and everything else) via Fal

**Client env has `FAL_KEY` (CANON §10). Role: multi-model aggregator + fallback, single billing.**

- **Queue base URL:** `https://queue.fal.run/{model_id}` (also sync `https://fal.run/{model_id}`).
- **Auth header:** `Authorization: Key ${FAL_KEY}`.
- **Async queue pattern (uniform across all fal models):**
  1. `POST https://queue.fal.run/{model_id}` → `{ request_id, status:"IN_QUEUE", status_url, response_url }`
  2. `GET  https://queue.fal.run/{model_id}/requests/{request_id}/status` → `IN_QUEUE|IN_PROGRESS|COMPLETED`
  3. `GET  https://queue.fal.run/{model_id}/requests/{request_id}` → final `{ images:[{url,width,height}], … }`
  - **Webhook:** append `?fal_webhook=https://app…/api/webhooks/fal` to the POST; fal POSTs the result. **[VERIFY]**
  - Queue wait time is **free**; billed only for inference work.

```bash
# SUBMIT (any fal model)
curl -X POST "https://queue.fal.run/fal-ai/flux-2-pro/edit?fal_webhook=https://app…/webhooks/fal" \
  -H "Authorization: Key ${FAL_KEY}" -H "Content-Type: application/json" \
  -d '{ "prompt":"…", "image_size":"square_hd", "seed":123 }'
# → { "request_id":"…", "status_url":"…", "response_url":"…" }
```

### 3.1 FLUX / key model IDs on fal (verified live)

| Model | fal `model_id` | Price **[VERIFY]** |
|---|---|---|
| FLUX.2 pro (edit) | `fal-ai/flux-2-pro/edit`, `.../outpaint` | MP-metered (mirrors BFL) |
| FLUX.2 (base edit) | `fal-ai/flux-2/edit`, `fal-ai/flux-2-max/edit`, `fal-ai/flux-2-flex/edit` | tiered |
| FLUX.2 klein | `fal-ai/flux-2/klein/9b/edit`, `.../4b/edit` | cheap |
| FLUX.1 Kontext | `fal-ai/flux-pro/kontext`, `fal-ai/flux-pro/kontext/max`, `fal-ai/flux-kontext/dev`, `fal-ai/flux-kontext-lora` | ~$0.04 / $0.08 |
| FLUX Tools | `fal-ai/flux-pro/v1/erase`, `fal-ai/flux-pro/v1/vto` (try-on) | varies |
| Seedream v4 / v4.5 | `fal-ai/bytedance/seedream/v4/text-to-image`, `.../v4.5/text-to-image`, `.../v4/edit`, `.../v4.5/edit` | **$0.04**/img |
| Recraft V3 | `fal-ai/recraft/v3/text-to-image` | raster **$0.04** / vector **$0.08** |
| Luma Photon / Flash | `fal-ai/luma-photon`, `fal-ai/luma-photon/flash` | **$0.015** / **$0.002** |
| Reve | `fal-ai/…reve…` (Reve Image 1.0/2.0) | from **$0.04** on fal |
| Bria RMBG 2.0 (bg-remove) | `fal-ai/bria/background/remove` | **$0.018**/img |
| Bria Expand (outpaint) | `fal-ai/bria/…/expand` | **$0.023** |

### 3.2 BFL-DIRECT vs FAL — recommendation

| Axis | BFL direct | Fal |
|---|---|---|
| **Cost (FLUX)** | ✅ Lowest (first-party, MP-metered) | Small aggregator margin |
| **Latency** | ✅ Fewest hops | +1 hop; free queue wait |
| **Model breadth** | FLUX-only (all FLUX variants + Tools) | ✅ FLUX **+** Seedream, Ideogram, Recraft, Luma, Reve, Bria utils under one key |
| **Reliability / failover** | Global routing + regional (EU/US) | ✅ Managed queue; single provider to monitor |
| **Webhooks** | ✅ First-party `webhook_url` | ✅ `?fal_webhook=` query param |
| **Billing** | Separate BFL account | ✅ One invoice for many models |
| **GDPR (DE tenant)** | ✅ `api.eu.bfl.ai` explicit | **[VERIFY]** data residency |

> **DECISION (conforms to CANON §4 "Router picks per job"):** register **both** `bfl` and `fal` drivers behind
> `ImageProvider`. **Route FLUX jobs to `bfl` primary, `fal` fallback**; route **non-FLUX models via `fal`**
> (avoids N vendor integrations). This matches the CANON `ProviderBus.image(job)` policy-table pattern.

---

## 4. In-image TEXT specialists (rare path)

> Only used when text must be *part of the rendered texture/scene* (e.g. a signpost, a stylized poster
> baked into a photo). Default remains: **composite text as a Polotno vector layer** (CANON §2).

### 4.1 Ideogram 3.0 — best in-image text legibility
- **Base URL:** `https://api.ideogram.ai/v1` · **Auth:** `Api-Key: ${IDEOGRAM_API_KEY}` (CANON env)
- **Generate:** `POST /v1/ideogram-v3/generate` (JSON, or multipart when sending char-reference files).
  Also: edit, inpaint, **reframe** (aspect re-layout), replace-background, layerized-text workflows.
- **Key fields:** `prompt` (req), `rendering_speed` (`TURBO|DEFAULT|QUALITY`), `style_type` (`AUTO|…`),
  `aspect_ratio`, `character_reference_images`. **Response:** `{ "data":[{ "url":"https://…" }] }`.
- **Pricing:** Turbo **$0.03** / Default **$0.06** / Quality **$0.09** per image. Char-reference:
  $0.10/$0.15/$0.20. Transparent+upscale (3.0 Default): $0.07 (1×) / $0.19 (2×) / $0.23 (4×).
```http
POST /v1/ideogram-v3/generate HTTP/1.1
Host: api.ideogram.ai
Api-Key: <IDEOGRAM_API_KEY>
Content-Type: application/json

{ "prompt":"…", "rendering_speed":"TURBO", "style_type":"AUTO", "aspect_ratio":"1x1" }
```

### 4.2 Recraft V3 — design/brand styles, **true SVG vector**, text
- **Direct API** (`RECRAFT_API_KEY`, CANON env) or via fal `fal-ai/recraft/v3/text-to-image`.
- **Unique value:** first API to emit **fully editable SVG vector** (structured layers, clean geometry) —
  ideal for logo-adjacent marks, icons, brand shapes that then drop into the Polotno tree. Also brand style
  controls + `colors[]` (RGB) to lock palette to the seed Brand Kit (gold `#cba65e` / lime `#b6e64a`).
- **Pricing:** V3 raster **$0.04** / **vector $0.08** per image (Recraft 20B cheaper: $0.022 / $0.044).
- **fal fields:** `prompt`, `image_size` (`square_hd`|custom w/h), `style`
  (`realistic_image | digital_illustration | vector_illustration` + substyles), `colors[]`, `style_id`.
  **[VERIFY]** fal endpoint returns webp raster; **true SVG output requires Recraft's own vector
  endpoint/param** (not the fal `text-to-image` slug). Use Recraft **direct** when SVG is required.

**Client already uses Ideogram + Recraft** (CANON §2). Keep both, but subordinate to the composited-text rule.

---

## 5. Instruct-edit & subject-consistency (brand-consistent edit)

| Model | ID | Price **[VERIFY]** | Why |
|---|---|---|---|
| **Gemini 3 Pro Image ("Nano Banana Pro")** | `gemini-3-pro-image-preview` | 1K/2K ≈ **$0.134**, 4K ≈ **$0.24** (Batch: $0.067 / $0.12) | ✅ Best instruct-edit + **up to 14 reference images** for composition/character consistency; Search-grounding. **Client already uses nano-banana.** |
| **Gemini 3.1 Flash Image** | `gemini-3.1-flash-image` | 0.5K $0.045 · 1K **$0.067** · 2K $0.101 · 4K $0.15 | ✅ Workhorse edit; cheaper. |
| Gemini 3.1 Flash **Lite** | `gemini-3.1-flash-lite-image` | 1K only, cheapest | Fast draft edits. |
| Gemini 2.5 Flash Image | `gemini-2.5-flash-image` | ~$0.039/img (1290 tok) | Legacy "Nano Banana". |
| **FLUX.1 Kontext [pro/max]** | BFL `flux-kontext-pro` / `-max` | $0.04 / $0.08 | ✅ BFL-native instruct-edit; stays in FLUX ecosystem. |

- **Gemini endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/interactions` (new
  Interactions API) **[VERIFY]** — legacy path was `…/v1beta/models/{model}:generateContent`. **Auth:**
  `x-goog-api-key: ${GEMINI_API_KEY}` (CANON env). Capabilities: add/remove/modify elements while preserving
  style; multi-image composition; character consistency across iterations.
- **Free tier** (2.5 Flash Image): ~500 req/day, ~10 rpm, 1024². Do **not** rely on free tier for production.

> **DECISION:** For "change only X / keep brand identical" (the ArtDirector/EditorAgent edit path,
> CANON §7): **Gemini 3 Pro Image** primary (subject consistency, 14 refs), **FLUX.1 Kontext** secondary
> (in-ecosystem, cheaper, deterministic seed).

---

## 6. Other frontier text-to-image (scene/hero alternatives)

| Model | Access / ID | Price **[VERIFY]** | Use for |
|---|---|---|---|
| **ByteDance Seedream 4.5** | fal `fal-ai/bytedance/seedream/v4.5/text-to-image` (+ `/edit`); BytePlus **ModelArk** direct | **$0.04**/img (fal); ModelArk tiered (e.g. 400 img/$6.99) | High-res (up to 4K, 960²–4096²), strong text, unified gen+edit. Good hero alt when FLUX look is tired. `SEEDREAM_API_KEY` (CANON). |
| **OpenAI GPT Image 1.5 / 2 / Mini** | `POST /v1/images/generations` & `/v1/images/edits`; `Authorization: Bearer ${OPENAI_API_KEY}` | Mini **$0.005–$0.052**; full ≈ $0.02/$0.07/$0.19 (low/med/high) | Strong instruction-follow + native edit + decent text. **Do NOT use `gpt-image-1`** (deprecating 2026-10-23). |
| **Luma Photon / Photon Flash** | fal `fal-ai/luma-photon` / `…/flash`; Luma direct | **$0.015** / **$0.002** | ✅ **Cheapest fast draft** for the ad board / ideation thumbnails. |
| **Reve (Image 1.0/2.0)** | Reve API console; fal | from **$0.04** (fal); ~$0.0067/img on Reve credits | Layout-first, 4K; niche alt. Lowest priority. |

---

## 7. LinkedIn-spec fit notes (CANON §8)

- **Ratios needed:** 1:1 (1200×1200 default), 1.91:1 (1200×627), 4:5 (960×1200), + video 16:9/9:16.
  Prefer generating **at or above** target then **smart re-layout / reframe** (Ideogram reframe, FLUX
  expand/outpaint, Bria Expand) rather than naive crop (CANON §8 mandate). Respect feed-crop / "see more"
  safe-zones — these live in the compositor, not the image model.
- **Text is composited**, so image models never need to spell the headline. This removes Ideogram/Recraft
  from the *critical* path and makes **FLUX.2 legibility-of-text a non-requirement** — pick image models on
  **scene quality, brand look, edit fidelity, cost, latency**, not on text rendering.
- Store `seed` + full params in `Variant` lineage (CANON §5) so any board tile is reproducible.

---

## 8. Utility APIs (background removal / upscale / outpaint / relight)

| Task | Recommended | Endpoint / ID | Price **[VERIFY]** | License |
|---|---|---|---|---|
| **Background removal** | **Bria RMBG 2.0** | fal `fal-ai/bria/background/remove`; Bria API; Replicate `bria/remove-background` | **$0.018**/gen (fal) | ✅ **Trained on licensed data, commercial-safe / indemnified** (needs commercial agreement w/ Bria for prod). Best for a brand tool. |
| Background removal (cheap) | Clipdrop Remove BG | Clipdrop API | 1 credit/img (≤4K) | Check ToS for commercial. |
| **Outpaint / expand (ratio adapt)** | **Bria Expand** or **FLUX Tools expand** | fal `fal-ai/bria/…/expand`; BFL `flux-pro-1.0-expand` **[VERIFY slug]** | Bria **$0.023** | Bria commercial-safe; FLUX under BFL commercial license. |
| **Inpaint / eraser (object removal)** | FLUX Fill/Eraser; Bria | BFL `flux-pro-1.0-fill`; fal `fal-ai/flux-pro/v1/erase` | varies | BFL commercial. |
| **Relight** | Bria `/relight`; Clipdrop Relight | Bria API `/relight`; Clipdrop (2 credits) | — | Bria commercial-safe. |
| **Upscale** | Bria 2×/4×; Recraft; Ideogram upscale; FLUX ultra | Bria API; `fal-ai/recraft/upscale` **[VERIFY]**; Ideogram | — | Bria commercial-safe. |

> **Recommendation:** standardize utilities on **Bria** (one vendor, explicit commercial licensing +
> indemnification — matters for the paying DE law-firm / PE tenant), with **FLUX Tools** used when the asset
> is already in the BFL pipeline. Avoid Clipdrop for anything where commercial-use terms are ambiguous.
> **[VERIFY]** Bria commercial agreement requirement + per-call pricing at contract time.

---

## 9. Routing policy table (job → ranked providers) — CANON `ProviderBus.image(job)`

| Job (ArtDirector / router `job`) | 1st | 2nd | 3rd | Rationale |
|---|---|---|---|---|
| **Hero imagery** (single-image ad scene) | **BFL FLUX.2 [pro]** (`bfl`) | FLUX.2 [max] for finals | Seedream 4.5 (`fal`) | Client incumbent; best cost+webhook+quality; Seedream for look variety. |
| **Brand-consistent edit** ("change only X, keep identical") | **Gemini 3 Pro Image** (nano-banana) | **FLUX.1 Kontext [pro/max]** (`bfl`) | Gemini 3.1 Flash Image | 14-ref subject consistency; Kontext in-ecosystem + deterministic seed. |
| **Product-in-scene** (place real product/logo asset into generated scene) | **Gemini 3 Pro Image** (multi-ref compose) | Seedream 4.5 edit (`fal`) | FLUX.1 Kontext | Multi-image composition + consistency; then re-light via Bria. |
| **In-image text** (RARE — texture/scene text only) | **Ideogram 3.0** | **Recraft V3** (+ SVG) | GPT Image 1.5 | Text is normally a Polotno layer; use these only for baked-in scene text. |
| **Fast / cheap draft** (board thumbnails, ideation) | **Luma Photon Flash** ($0.002) | **FLUX.2 [klein]** | GPT Image 1 Mini ($0.005) | Cost-first; upgrade the chosen tile to [pro] on approval. |
| **Carousel slide backgrounds** (continuity across slides) | **BFL FLUX.2 [pro]** w/ fixed seed + Kontext for slide-to-slide continuity | Gemini 3 Pro Image (ref chain) | Seedream 4.5 | Seed + Kontext edit chain keeps look continuous (CANON `CarouselArchitect`). |
| **Background removal / cutout** | **Bria RMBG 2.0** (`fal`) | Clipdrop | — | Commercial-safe. |
| **Aspect re-layout / outpaint** | **Bria Expand** / Ideogram reframe | FLUX Tools expand | — | Smart re-layout, not crop (CANON §8). |
| **Relight / upscale** | **Bria** relight/upscale | FLUX ultra upscale | Clipdrop relight | Commercial-safe utilities. |

**Already-in-use by client (keep as defaults):** ✅ BFL/FLUX (primary imagery) · ✅ Ideogram (text) ·
✅ Recraft (text/brand/SVG) · ✅ nano-banana / Gemini image (edit). New/upgraded: Seedream **4.5**, Luma Photon
(draft), Bria (utilities), GPT Image **1.5/Mini** (not `gpt-image-1`).

---

## 10. `ImageProvider` mapping (how this lands in code — CANON §6)

- Drivers to implement behind `interface ImageProvider`: **`bfl`** (FLUX.2/1.1/Kontext/Tools),
  **`fal`** (aggregator: Seedream, Recraft, Luma, Reve, Bria utils, + FLUX fallback), **`ideogram`**,
  **`recraft`** (direct, for SVG), **`gemini`** (`generate` + `edit` — nano-banana), **`openai`**
  (`generate` + `edit`).
- `GenSpec.model` carries the concrete slug (e.g. `"flux-2-pro-preview"`, `"gemini-3-pro-image"`,
  `"fal-ai/bytedance/seedream/v4.5/text-to-image"`). `GenResult.costUsd` is the **resolved** per-image cost
  (MP-metered models: compute from width×height). `edit?()` maps to Gemini/Kontext/GPT-Image edits;
  `upscale?()` maps to Bria/FLUX-ultra.
- **Cache key** (CANON §4): `(provider, model, version, prompt, seed, params)` — all deterministic on the
  above; store BFL/fal `request_id` + signed-URL→R2 re-host in `Asset`/`Render`.
- **Router** reads the §9 table; **manual override always available** (CANON §4).

---

## 11. Consolidated "VERIFY before coding" checklist

1. **BFL FLUX.2 endpoint slugs** — `*-preview` vs stable `flux-2-pro`; confirm at `docs.bfl.ai` / `api.bfl.ai/openapi.json`.
2. **BFL `aspect_ratio` enum vs width/height** for the three LinkedIn ratios (1:1, 1.91:1, 4:5).
3. **BFL webhook signature** (`webhook_secret` / HMAC header) before trusting webhook payloads.
4. **BFL MP-metered exact per-image cost** at LinkedIn resolutions (use official calculator).
5. **BFL commercial license tier** the tenant needs for output rights (+ EU host `api.eu.bfl.ai` for GDPR).
6. **fal `?fal_webhook=` + status/result URL patterns** and per-model prices (live model pages).
7. **Gemini endpoint**: new `…/v1beta/interactions` vs legacy `:generateContent`; confirm `gemini-3-pro-image(-preview)` GA status + price/token math.
8. **OpenAI**: use GPT Image **1.5 / 2 / Mini**; `gpt-image-1` **deprecates 2026-10-23** — don't hardcode.
9. **Seedream 4.5** as default (vs 4.0); fal vs BytePlus ModelArk endpoint + price.
10. **Recraft true-SVG** requires Recraft **direct** vector endpoint (fal `text-to-image` returns raster).
11. **Ideogram** JSON vs multipart form-data (multipart only when sending reference files).
12. **Bria commercial agreement** requirement + pricing (commercial-safe indemnification is the reason to prefer it).
13. **Rate limits**: BFL 24 concurrent (Kontext-max 6); fal prepaid credits — set per-brief/per-workspace caps (CANON §4).

---

## Sources
- BFL API docs / pricing / integration: https://docs.bfl.ml/ · https://docs.bfl.ai/flux_2/flux2_overview · https://docs.bfl.ml/quick_start/generating_images.md · https://docs.bfl.ml/quick_start/pricing.md · https://docs.bfl.ml/api_integration/integration_guidelines · https://bfl.ai/pricing · https://bfl.ai/blog/flux-2 · https://help.bfl.ai/articles/9364115800-flux-models-overview
- Fal: https://fal.ai/flux · https://fal.ai/docs/model-apis/pricing · https://fal.ai/pricing · https://fal.ai/docs/model-apis/queue
- Ideogram: https://developer.ideogram.ai/ideogram-api/api-overview · https://ideogram.ai/features/api-pricing · https://docs.ideogram.ai/plans-and-pricing/ideogram-api
- Recraft: https://www.recraft.ai/api · https://www.recraft.ai/docs/api-reference/pricing · https://fal.ai/models/fal-ai/recraft/v3/text-to-image
- Gemini image (nano-banana): https://ai.google.dev/gemini-api/docs/image-generation · https://ai.google.dev/gemini-api/docs/pricing · https://developers.googleblog.com/en/introducing-gemini-2-5-flash-image/
- OpenAI GPT Image: https://developers.openai.com/api/docs/pricing · https://openai.com/index/image-generation-api/
- Seedream (ByteDance): https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image · https://docs.byteplus.com/en/docs/ModelArk/1824718 · https://seed.bytedance.com/en/seedream4_5
- Luma Photon: https://fal.ai/models/fal-ai/luma-photon · https://docs.lumalabs.ai/changelog/luma-photon-photon-flash-api
- Reve: https://api.reve.com/console/pricing · https://lumenfall.ai/models/reve-ai/reve
- Bria: https://bria.ai/ai-image-editing · https://docs.bria.ai/products-overview · https://fal.ai/models/fal-ai/bria/background/remove
- Clipdrop: https://clipdrop.co/pricing
