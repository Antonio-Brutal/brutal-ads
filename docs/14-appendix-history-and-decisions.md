# 14 — APPENDIX: History, Model/API Landscape, ADRs & Open Questions

> **Read `CANON.md` first.** This appendix is subordinate to CANON. Every object-model name,
> provider interface (`ImageProvider`/`VideoProvider`/`AudioProvider`/`LlmProvider`/`EngagementPredictor`/
> `ProviderBus`), agent name, env var, repo path, and LinkedIn spec used here is **canonical** (CANON §4–§10).
> Where research suggests a change, it is written as a clearly-labelled **⚑ RECOMMENDATION** and never silently
> diverges. Every external API carries a **`VERIFY current docs before coding`** note (APIs drift fast). Every
> assumption is flagged **⚑ ASSUMPTION**.
>
> **Audience:** an autonomous AI build factory with **zero outside context**. This is doc **14 of ~15** — the
> reference appendix. It exists so the factory understands *why* the locked decisions are locked (so it does
> not "helpfully" undo them), has a single consolidated **model/API landscape** to price and route against,
> and knows the **open questions** that require a human answer before or during the build.
>
> **This doc decides nothing new.** It records history, distils the landscape research (R1/R2/R4/R7), and
> restates the canonical decisions as **ADRs (Architecture Decision Records)** with context + consequences so
> the factory can reason about them. Where a concrete mechanism is needed, the authoritative doc is named:
> providers → **doc 04**, data model → **doc 03**, agents → **doc 05**, editor/compositor → **doc 06**,
> LinkedIn playbook → **doc 07**, engagement → **doc 08**, env/keys → **doc 11**.
>
> **Grounding research:** `research/R1-image-models.md`, `research/R2-video-audio.md`,
> `research/R4-engagement-testing.md`, `research/R7-blank-slate-arch.md`. The landscape tables (§2) distil
> R1/R2/R4/R7; the now-present `research/R3-linkedin-playbook.md`, `research/R5-competitive.md`, and
> `research/R6-editor-compositor.md` ground the sibling docs this appendix defers to (`docs/07`, `docs/01`,
> `docs/06`) — see §5 (ledger L11). All prices/endpoints are
> **best-verified mid-2026 (June–July 2026)** — treat as budgeting guidance, never as constants in code.
> Store the **resolved** `costUsd` in `GenResult`/`Variant` lineage (CANON §5), never a hardcoded price.

---

## 0. TL;DR (read this first)

1. **What was tried before → the load-bearing lesson.** The client shipped LinkedIn carousels as
   **baked-text PNGs** (FLUX/Ideogram/Recraft) and a Kling→ElevenLabs→Remotion video pipeline, all specified
   in a single `claude-code-brief.md`. Baking text into pixels caused an endless **prompt-and-re-roll**
   death-spiral (illegible / off-brand / uneditable). **The fix, now canonical (CANON §2): AI generates
   imagery only; every legible/on-brand element is a composited, editable vector/text layer on a JSON layer
   tree.** This single decision dissolves both "hard to prompt" and "hard to edit." **Do not undo it.**
2. **The landscape (§2).** Consolidated comparison tables for **image** (R1), **video/audio** (R2), and
   **engagement** (R4) providers, with prices + licenses + the canonical routing recommendation. These are the
   same tables docs 04/08/11 route against — reproduced here as the one-stop reference.
3. **The decisions (§3).** Seven **ADRs** restate CANON's locked choices as decision / context / consequences:
   **ADR-001 composite-don't-bake**, **ADR-002 Polotno editor**, **ADR-003 Supabase+Vercel**, **ADR-004 provider
   bus**, **ADR-005 TRIBE isolation**, **ADR-006 Anthropic Claude for the studio**, **ADR-007 async job queue**.
4. **Open questions (§4).** The decisions that need a **human** (Antonio) — licensing spend (Polotno, Remotion,
   Bria, engagement vendors), legal sign-off (TRIBE calibration, generated-music commercial rights), LinkedIn
   API access, and a handful of routing/budget calls the factory cannot make alone.

---

## 1. What was tried before (and why it hurt) — the history that produced the decisions

> Source: CANON §2 + transcript-observed prior work. This section is **narrative + lessons**, so the factory
> understands the *reason* each locked decision exists and does not regress to a prior, painful approach.

### 1.1 Timeline of prior attempts

| # | Attempt | What it was | Stack used | Outcome / pain |
|---|---|---|---|---|
| A | **Carousel ads** | 13 angles × 3 slides each, narrative **hook → reframe → close**, generated as **baked-text PNGs**, hosted as a static swipeable HTML site on Vercel | **FLUX (BFL)** + **Ideogram** + **Recraft** for imagery *and* in-image text | **The core failure.** Every slide art-directed through a text-to-image prompt; **headline/subhead/CTA/legal baked into pixels** → illegible, off-brand, un-editable → endless **prompt-and-re-roll**. Changing one word = regenerate the whole slide. |
| B | **Video ads** | Documentary-register LinkedIn video, muted-first, burned-in DE subtitles | **Kling** (`kling-v3` / `kling-3.0-omni`, JWT-auth official API) → **ElevenLabs** German VO → **Remotion** assembly → MP4 | Worked as a one-off, but was a **single hand-written script** (`claude-code-brief.md`), not a repeatable product. No layer tree, no editability, no reuse across briefs. |
| C | **"ScrollStopper"** | An earlier **turborepo** platform attempt (SOW / architecture / build-plan docs) | turborepo monorepo | A prior platform iteration; superseded. Brutal Ads is the clean re-architecture. **⚑ ASSUMPTION:** no ScrollStopper code is reused; the factory builds the CANON repo tree from scratch. |
| D | **Hosting / portal** | Static swipeable sites + a **Supabase/Vercel "Brutal Portal"** | Supabase + Vercel | Confirmed the **Supabase + Vercel** stack works for this client → now canonical (CANON §4; ADR-003). |
| E | **The brief format** | The `claude-code-brief.md` style — exact output specs, repo structure, `.env` blocks, per-asset prompt + negative-prompt templates, timeline tables, "verify this API" steps, and fallbacks ("expect to regenerate hands 2–3×") | Markdown handoff to Claude Code | **This format proved the delivery mechanism.** It is why the entire handoff package (this doc included) is written in the same voice and structure (CANON §3). |

**Model usage observed in transcripts (prior work):** heavy **BFL/FLUX** (primary imagery), **Ideogram** +
**Recraft** (in-image text), **Kling** (video), **ElevenLabs** (VO), some **nano-banana/Gemini image**;
minimal Seedream/Seedance. This is why those providers are the seed integrations (CANON §4; doc 04) — the
client already has keys and operational familiarity.

### 1.2 The lessons (each maps to a locked decision)

| # | Lesson learned the hard way | Canonical decision it produced | ADR |
|---|---|---|---|
| L1 | **Baking text into pixels is the root cause of the re-roll spiral.** Text-in-prompt is illegible, off-brand, un-localizable, and forces full regeneration for a one-word change. | **AI generates imagery only; every legible/on-brand element is a composited editable vector/text layer on a JSON layer tree.** (CANON §2) | **ADR-001** |
| L2 | A one-off script (`claude-code-brief.md`) is not a product; the same creative must be **re-editable, re-sizable, re-localizable, and forkable** without regeneration. | Canonical artifact = the **`AdDocument`/layer tree (JSON)**, not a pixel buffer. Editing = `LayerPatch` diff, never a re-roll. (CANON §2, §5) | **ADR-001**, ADR-002 |
| L3 | In-image text specialists (Ideogram/Recraft) solved the *wrong* problem beautifully — legible baked text — which the layer-tree makes **moot**. | Keep Ideogram/Recraft **wired but fallback-only** for image *gen* (rare "scene-texture text" only); Recraft retained for genuine **vector** assets. (R1 §4, R7 ⚑R-PROV1) | ADR-004 |
| L4 | Every provider drifts monthly in price/quality/availability; hardcoding one is a maintenance trap. | **All providers behind interfaces; a policy-routed `ProviderBus` with override + fallback.** (CANON §4, §6) | **ADR-004** |
| L5 | "On-brand" as a vibe is un-gate-able; a Variant made today must be reproducible next quarter. | **Versioned, immutable `BrandKit`;** `brand_kit_version` pinned in every Variant's lineage; **BrandGuardian** hard gate. (CANON §5, §7) | ADR-001, ADR-006 |
| L6 | Generation is slow (30 s–4 min); synchronous waits are a broken UX. | **Async `GenerationJob` queue** with progress the UI subscribes to; cache by `(provider,model,version,prompt,seed,params)`. (CANON §4) | **ADR-007** |
| L7 | The obvious engagement reference (TRIBE v2 / ViralAnalyser) is **non-commercial** and legally radioactive. | **Commercially-clean saliency/heuristic predictor on the production path; TRIBE quarantined behind `RESEARCH_MODE`.** (CANON §9) | **ADR-005** |

> **⚑ RECOMMENDATION (do-not-repeat guardrail).** The build factory MUST NOT, as a "simplification,"
> route a normal ad's headline/CTA/legal through an image model (Ideogram/Recraft/Seedream in-pixel text).
> That is *exactly* attempt A. Text is a Polotno layer (doc 06). A CI/lint check that forbids copy strings in
> `GenSpec.prompt` for non-`scene_texture` jobs is a cheap way to make the re-roll spiral structurally
> impossible to reintroduce (see doc 05 CompositorPlanner contract).

---

## 2. Model / API landscape (distilled from R1 / R2 / R4) — prices + licenses + recommendation

> **These are the canonical routing tables** the `ProviderBus` reads (CANON §6). Doc 04 is authoritative for
> the driver code; doc 08 for engagement; doc 11 for keys/pricing at signup. Reproduced here as the single
> consolidated landscape reference. **Every row: `VERIFY current docs before coding`** — the AI-media API
> surface re-prices monthly and renames models often. Concrete `model` slugs live in `GenSpec.model` and
> `Variant` lineage (CANON §5), **never hardcoded** in product logic.

### 2.1 Model-family status vs the CANON snapshot (flag these to the factory)

CANON §4 was written against an earlier snapshot. Verified current (mid-2026) state — **none of these change
the CANON object model, provider contracts, agent names, or env-var names; only the concrete `model` /
`model_version` strings** passed inside `GenSpec.model` and stored in lineage:

| CANON snapshot said | Current reality (mid-2026, VERIFY) | Action for the factory |
|---|---|---|
| FLUX `flux-pro-1.1` / `1.1-ultra` ("FLUX.2 if available") | **FLUX.2 family shipped & default:** `[pro]`, `[max]`, `[flex]`, `[klein]` (4B/9B). FLUX1.1 legacy still available. | Default **FLUX.2 [pro]**; FLUX1.1 = cheap legacy fallback. Endpoints may be under `*-preview` slugs. |
| FLUX.1 Kontext for instruct-edit | Still current: **Kontext [pro]/[max]** on BFL; FLUX.2 also does multi-ref edit. | Keep Kontext as the BFL edit path. |
| "nano-banana / Gemini image" | **Gemini 2.5 Flash Image = original "Nano Banana" (legacy).** Current: **Gemini 3 Pro Image = "Nano Banana Pro"** (`gemini-3-pro-image`, GA; preview shut down 2026-06-25) + **Gemini 3.1 Flash Image**. | Default **`gemini-3-pro-image`** (quality) / **`gemini-3.1-flash-image`** (workhorse). |
| OpenAI **gpt-image-1** | **gpt-image-1 deprecating 2026-10-23.** Current family: **`gpt-image-1.5`** (ledger L4 canonical default), plus a higher-fidelity tier and **Mini**. | Default **`gpt-image-1.5`** (ledger L4 — NOT `gpt-image-2`); **do NOT hardcode `gpt-image-1`.** Env `OPENAI_API_KEY` unchanged. |
| ByteDance **Seedream 4.0** | **Seedream 4.5** shipped (same fal price, faster, better text). | Default **v4.5**; env `SEEDREAM_API_KEY` unchanged. |
| Kling `kling-v3` / `-omni` | **`kling-v2-5-turbo`** is the cost/quality sweet spot; **`kling-3.0-omni`** ("O3", launched 2026-02-05, single canonical spelling — never `kling-v3-omni`) is the face-consistency answer (multi-image "elements" + voice binding). | Default **`kling-v2-5-turbo`** (t2v + i2v); escalate to **`kling-3.0-omni`** for recurring persona / sound-on (ledger L4). Env keys unchanged. |
| Veo 3.0 | **Veo 3.0 ALREADY retired as of build date → `veo-3.1-*`** (audio-native). | Use **`veo-3.1-*`** only when in-frame dialogue/SFX must be real; never attempt `veo-3.0-*` (ledger L4). |
| Runway Gen-4 Aleph | **Gen-4 Aleph sunset 2026-07-30 → Aleph 2.0.** | Use current Gen-4 Turbo / Aleph 2.0 slugs. |

---

### 2.2 IMAGE providers (distilled from R1) — price + license + role

**Auth / async pattern per provider** (VERIFY each; details in doc 04):

| Provider (driver `id`) | Env var | Base URL | Auth header | Async pattern |
|---|---|---|---|---|
| **BFL** (FLUX.2/1.1/Kontext/Tools) | `BFL_API_KEY` | `https://api.bfl.ai` (EU: `api.eu.bfl.ai` — prefer for DE/GDPR tenant) | `x-key: <key>` (⚠ **not** `Bearer`) | create → poll `polling_url` (or webhook) → `result.sample` signed URL **~10 min TTL** (re-host immediately) |
| **fal** (aggregator: Seedream, Recraft, Luma, Reve, Bria utils, FLUX fallback) | `FAL_KEY` | `https://queue.fal.run/{model_id}` | `Authorization: Key <key>` | POST → `status_url` → result; webhook via `?fal_webhook=`; queue wait **free** |
| **ideogram** (in-image text, rare) | `IDEOGRAM_API_KEY` | `https://api.ideogram.ai/v1` | `Api-Key: <key>` | `POST /v1/ideogram-v3/generate` → `{data:[{url}]}` |
| **recraft** (vector / SVG, direct) | `RECRAFT_API_KEY` | Recraft API (or via fal) | API key | direct vector endpoint required for **true SVG** (fal returns raster) |
| **gemini** (nano-banana edit) | `GEMINI_API_KEY` | `generativelanguage.googleapis.com/v1beta` | `x-goog-api-key: <key>` | `:generateContent` (VERIFY new `interactions` surface) |
| **openai** (gpt-image) | `OPENAI_API_KEY` | `api.openai.com/v1` | `Authorization: Bearer <key>` | `/v1/images/generations` & `/v1/images/edits` |

**Pricing + license + role** (all prices per-image unless noted; **VERIFY before coding** — MP-metered models
must compute `costUsd` from `width×height`):

| Model (slug) | Access | ~Price (mid-2026) | License / commercial | Role in Brutal |
|---|---|---|---|---|
| **FLUX.2 [pro]** (`flux-2-pro`) | BFL direct | **from $0.03/MP** (1200×1200 ≈ 1.44 MP → slightly above floor) | BFL "Professional" commercial license (VERIFY tier for output rights) | **Primary hero/scene/background** |
| FLUX.2 [max] (`flux-2-max`) | BFL | from **$0.07** first MP (+$0.03/MP) | BFL commercial | Highest-fidelity finals |
| FLUX.2 [flex] (`flux-2-flex`) | BFL | from **$0.05** | BFL commercial | Tunable steps/guidance |
| FLUX.2 [klein] 9B/4B | BFL | **$0.015 / $0.014** | BFL commercial | **Cheap draft** tier |
| FLUX1.1 [pro] / Ultra | BFL | **$0.04 / $0.06** | BFL commercial | Legacy fallback |
| **FLUX.1 Kontext [pro]/[max]** | BFL `flux-kontext-pro` / `-max` | **$0.04 / $0.08** | BFL commercial | **BFL-native instruct-edit** (2nd for brand-consistent edit) |
| **Gemini 3 Pro Image** ("Nano Banana Pro", `gemini-3-pro-image`) | Google | 1K/2K ≈ **$0.134**, 4K ≈ **$0.24** (Batch $0.067/$0.12) | Google API terms (commercial via paid API) | **Primary brand-consistent edit / subject consistency** (up to 14 refs) |
| Gemini 3.1 Flash Image (`gemini-3.1-flash-image`) | Google | 1K **$0.067**, 2K $0.101, 4K $0.15 | Google API terms | Workhorse cheaper edit |
| **Seedream 4.5** (`fal-ai/bytedance/seedream/v4.5/text-to-image`) | fal / BytePlus ModelArk | **$0.04** (fal) | ByteDance/fal terms (VERIFY) | Hero **look-variety** alt; cost-optimized 4K |
| **Ideogram 3.0** | Ideogram direct | Turbo **$0.03** / Default $0.06 / Quality $0.09 | Ideogram commercial | **Fallback-only** in-image text (rare) |
| **Recraft V3** | Recraft / fal | raster **$0.04** / **vector $0.08** | Recraft commercial | **Vector/SVG** niche + text fallback |
| **GPT Image 1.5** (`gpt-image-1.5`) / Mini | OpenAI | Mini **$0.005**–$0.052; full ≈ $0.02/$0.07/$0.19 | OpenAI commercial | **Diversity / in-pixel-text rare-path fallback** (ledger L4 canonical `gpt-image-1.5`; ⚠ NOT `gpt-image-2`, and not `gpt-image-1`) |
| **Luma Photon / Flash** | fal / Luma | **$0.015 / $0.002** | Luma commercial | **Cheapest fast draft** (board thumbnails) |
| Reve (Image 1.0/2.0) | Reve / fal | from **$0.04** | Reve commercial | Niche layout-first alt (lowest priority) |

**Image utility APIs** (background removal / outpaint / relight / upscale — R1 §8):

| Task | Recommended | Endpoint / ID | ~Price | License |
|---|---|---|---|---|
| Background removal | **Bria RMBG 2.0** | `fal-ai/bria/background/remove` | **$0.018** | ✅ **Licensed-data, commercial-safe, indemnified** (needs Bria commercial agreement for prod) |
| Outpaint / expand (ratio adapt) | **Bria Expand** / FLUX Tools expand | `fal-ai/bria/…/expand`; BFL `flux-pro-1.0-expand` | Bria **$0.023** | Bria commercial-safe; FLUX BFL commercial |
| Inpaint / eraser | FLUX Fill/Eraser; Bria | BFL `flux-pro-1.0-fill`; `fal-ai/flux-pro/v1/erase` | varies | BFL commercial |
| Relight / upscale | **Bria** relight/upscale; FLUX ultra | Bria API; FLUX | — | Bria commercial-safe |

> **RECOMMENDATION (image):** **Primary hero → FLUX.2 [pro] via BFL direct** (client incumbent, lowest cost,
> first-party webhooks, EU host for GDPR). **fal = multi-model aggregator + fallback** (Seedream, Recraft, Luma,
> Reve, Bria) under one key. **Brand-consistent edit → Gemini 3 Pro Image first, FLUX.1 Kontext second.**
> **Cheap draft → Luma Photon Flash ($0.002).** **Utilities → Bria** (commercial indemnity matters for the
> paying DE law-firm / PE tenant). **Ideogram/Recraft → fallback-only** (layer-tree makes in-pixel text moot;
> keep Recraft for vector). Full ranked policy table: R1 §9 / doc 04.

---

### 2.3 VIDEO + AUDIO providers (distilled from R2) — price + license + role

**Video** — all reached via the canonical `VideoProvider` create→poll→download pattern (VERIFY each; doc 04):

| Model (family) | Access / env | i2v | Native audio | ~Price | License / notes | Role |
|---|---|---|---|---|---|---|
| **Kling v2.5-turbo** (`kling-v2-5-turbo`) | Official JWT API (`KLING_ACCESS_KEY`+`KLING_SECRET_KEY`), base `https://api.klingai.com` | ✅ | no | ~$0.07–0.17/s | Kling commercial API terms; **failed tasks don't consume credits** | **Primary / everyday default** (t2v + i2v; we mute it) |
| **Kling 3.0 Omni** (`kling-3.0-omni`, "O3" — never `kling-v3-omni`) | Official + fal `fal-ai/kling-video/v3/…` | ✅ (elements) | ✅ | ~$0.17–0.39/s | Kling commercial | **Escalation:** face consistency across shots; voice binding |
| **ByteDance Seedance 2.0** | fal `bytedance/seedance-2.0`, Replicate | ✅ | ✅ | 10 s fast ≈ $2.42 / std ≈ $3.03 | ByteDance/fal terms | Cheap b-roll **fast lane** |
| **Google Veo 3.1** (`veo-3.1-*`) | Gemini API + fal/Replicate (Veo 3.0 **already retired** as of build date — never attempt `veo-3.0-*`) | ✅ (+ up to 3 ref imgs) | ✅ **best-in-class** | **$0.40/s** std, **$0.15/s** fast | Google terms; `personGeneration` region rules (VERIFY) | **Fallback**, only for real in-frame dialogue/SFX (sound-on cut) |
| **Runway Gen-4 / Turbo** (Aleph → **Aleph 2.0**; Gen-4 Aleph sunset **2026-07-30**) | Runway API ($0.01/credit) | ✅ | limited | Gen-4 Turbo **5 cr/s = $0.05/s** | Runway commercial | Premium i2v fallback |
| **Luma Ray2 / Flash** | Luma API + fal/Replicate | ✅ | no | Ray2 1080p·5 s ≈ $0.95; Flash ≈ $0.60 | Luma commercial | Cinematic premium fallback |
| **MiniMax / Hailuo** | fal/Replicate + MiniMax API | ✅ | limited | ~$0.07/s | provider terms | Cheapest volume b-roll |
| Pika | Pika API + fal | ✅ | limited | ~$0.12–0.40/clip | provider terms | Stylized FX (weak for sober register) |

**Talking-head / UGC avatar** (LinkedIn "founder" ad — a distinct modality not in CANON's contract set):

| Tool | API / auth | Flow | ~Cost | Role |
|---|---|---|---|---|
| **HeyGen** ⭐ | `X-Api-Key`; v2 `POST /v2/video/generate` → poll `GET /v1/video_status.get` (v3 wallet API is USD-prepaid; v1/v2 operational until **2026-10-31**) | avatar / `talking_photo` + text/voice/audio | v3 wallet **$0.05/s**, ≈ $1–3/min | **Primary avatar.** Pair with **our** ElevenLabs DE VO via `voice.type:"audio"` |
| Creatify / Arcads | REST API | ad-native UGC actors | subscription + API | UGC-ad style |
| Synthesia | API | corporate avatars, 140+ langs | enterprise seat + API | Polished corporate/explainer |

> **⚑ RECOMMENDATION (R2 ⚑R-AVATAR1, referenced by doc 11):** talking-head UGC is a distinct job type not
> enumerated in CANON's contracts. Wrap HeyGen behind a thin **`AvatarProvider`** shape **or** a `VideoProvider`
> with `params.kind:'avatar'`, and add an **`avatar_ugc`** lane to the `ProviderBus.video` policy. Additive —
> does not rename or contradict any CANON contract. See doc 04.

**Audio (CANON-locked: ElevenLabs)** — env `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_*`; auth `xi-api-key`:

| `model_id` / endpoint | Use | ~Price | License note |
|---|---|---|---|
| **`eleven_multilingual_v2`** (`POST /v1/text-to-speech/{voice_id}`) | **Default VO** (sober DE+EN); deterministic `seed`; `with-timestamps` → word-level caption timing | ~$0.10 / 1k chars | ElevenLabs commercial |
| `eleven_v3` | Most expressive; audio-tag control (punchier sound-on cuts) | ~$0.10 / 1k chars | ElevenLabs commercial |
| `eleven_turbo_v2_5` / `eleven_flash_v2_5` | Low-latency/cheap drafts | ~$0.05 / 1k chars | ElevenLabs commercial |
| SFX: `POST /v1/sound-generation` | transition stingers | — | VERIFY commercial terms |
| Music: `POST /v1/music/compose` | low sober bed (sound-on variant only) | — | ⚠ **VERIFY commercial-music license for paid ads** (open question §4) |

> **⚠ CRITICAL DE caveat (R2 §4.4):** ElevenLabs mispronounces **numbers/dates/currency/acronyms** in German.
> The **`LocalizationAgent`** (CANON §7) MUST emit **TTS-normalized** VO strings (numbers → German words,
> "%" → "Prozent", "€1.200" → "eintausendzweihundert Euro", e.g. "zwölfhundert") while the **on-screen caption
> layer keeps the numeral** for legibility. Do **not** rely on `apply_text_normalization` for DE — pre-spell.

**Assembly / render (CANON-locked: Remotion, `packages/render`):** `<OffthreadVideo>` clips + `<Audio>` VO/bed
+ **burned-in captions** (`@remotion/captions` → `createTikTokStyleCaptions`, fed by ElevenLabs word timestamps)
+ brand/CTA/logo/legal as React/HTML layers (the layer-tree rule applied to video). Render local
(`renderMedia`) or Lambda (`renderMediaOnLambda`) → h264 MP4, tune `crf` to hit **≤200 MB** (client's proven
paid limit). **⚠ License: Remotion Company License required for 4+ people / funded teams — budget it** (§4 open
question). Render cost itself is tiny (~$0.017/min local-source).

> **RECOMMENDATION (video/audio):** *`kling-v2-5-turbo` is the default engine (t2v + i2v), escalating to
> `kling-3.0-omni` for faces; `veo-3.1-*` only
> when real in-frame audio is required; HeyGen for talking-head UGC; ElevenLabs for all audio; Remotion
> assembles + renders; muted-first means model-native audio is almost always discarded — VO + burned-in
> captions carry the story.* Full policy: R2 §7 / doc 04.

---

### 2.4 ENGAGEMENT providers (distilled from R4) — license verdict is the headline

**The load-bearing legal fact (CANON §9, R4 §0/§2.1):** **Meta `facebook/tribev2` is CC-BY-NC-4.0
(non-commercial)** and the reference repo **`amirmushichge/tribeV2_ViralAnalyser` is all-rights-reserved,
non-commercial evaluation code.** NC **taints derived outputs** — heatmaps/curves produced by TRIBE cannot be
sold or shown to paying customers. **TRIBE must never sit on a revenue path.** It is a flag-gated R&D backend
only (ADR-005).

**Open saliency models — commercial verdict:**

| Model | Predicts | Code license | Commercial verdict | Role |
|---|---|---|---|---|
| **TranSalNet** (`LJOVO/TranSalNet`) | image saliency (transformer/CNN) | **MIT ✅** (SALICON annotations CC-BY-4.0; VERIFY torchvision backbone + Flickr/COCO source-image ToU) | ✅ **USABLE** | **Default self-hosted saliency backend** in `services/engine` |
| DeepGaze IIE/III/MSDB | SOTA saliency + scanpath | **no SPDX license** (NC lineage) | ❌ **EXCLUDE** | R&D only |
| UMSI (predimportance) | visual importance (posters/ads/UI) | BSD-3 modified — **"non-commercial research only"** (Adobe licenses commercial) | ❌ **NON-COMMERCIAL** | R&D only |
| **Meta TRIBE v2** | fMRI brain response | **CC-BY-NC-4.0** | ❌ **NON-COMMERCIAL** | **Quarantined R&D only** (ADR-005) |

**Commercial attention/saliency vendors (paid, commercially licensed via API terms):**

| Vendor (driver `id`) | Modality | Auth / base | ~Price (mid-2026) | Best for |
|---|---|---|---|---|
| **Expoze.io** (`saliency.expoze`) | image, video | **JWT** `POST /auth/token`; base `https://api.expoze.app` | Core **€24.99/mo** (50 img) → Pro **€449.99/mo** (1k img + 11 min video); custom API price | **Cheapest clean per-request API**; per-AOI `score` |
| **Neurons "Predict"** (`saliency.neurons`) | image, **video** | `X-API-Key`; base `https://api.neuronsinc.com` | Standard **€15,000/yr / 5 seats** (incl. API) | **Richest metric set** + video (premium tier) |
| **Dragonfly AI** (`saliency.dragonfly`) | image, video | enterprise | undisclosed / enterprise | Portfolio-scale creative testing/benchmarking |
| Attention Insight | image (+video) | API key | Solo $23/mo, Team $479/mo | Cheap heatmaps, thinner metrics |
| 3M™ VAS | image | per-seat license | $550–600/user/yr | Seat-licensed (poor fit for automation) |
| Realeyes | **video** (webcam panels) | enterprise | managed studies $5K–50K each | Human-panel; **not embeddable per-request** |

**Our own commercially-clean code (no license risk):**

| Driver `id` | What it does | Source |
|---|---|---|
| `heuristic.grid` | grid-salience ranking (4–12 options): contrast / color / center-bias / focus / clutter → ranked cells + reason string | **Reimplement** the R4 §1.2 math (weights: attention ~70%, contrast+color ~22%, center 8%, edge-clutter penalty). **Do NOT copy the unlicensed repo.** |
| `video.heuristic` | first-3-seconds: first-frame saliency + motion/cut density + subtitle-legibility | our code + saliency map |

> **RECOMMENDATION (engagement):** **Production default = `saliency.transalnet` (MIT, self-hosted) +
> `heuristic.grid` / `video.heuristic` (our code).** **Paid upgrades: Expoze.io** (cheap clean API) → **Neurons**
> (video/premium). **TRIBE v2 = R&D only**, behind **`ENGAGEMENT_BACKEND=tribe_research` AND `RESEARCH_MODE=true`
> (both required)**, physically isolated (`services/engine/research/tribe/`, optional `.[research]` dep group),
> never returned to a tenant. Killer feature vs pixel-only vendors: **we have exact layer bboxes** (`cta`,
> headline, logo) so `ctaAttention` / `valuePropAttention` are measured on the *known* layer, not guessed.
> **Always report bands + confidence**, calibrated against the tenant's real LinkedIn `Result`s. Full design:
> doc 08 / R4 §5–§8.

---

## 3. Architecture Decision Records (ADRs)

> Format: **Decision / Context / Consequences (good, bad, mitigations)**. These **restate CANON's locked
> decisions** so the factory understands them; they do not introduce new decisions. Status = **ACCEPTED
> (locked in CANON)** unless noted. If the factory believes an ADR should change, it must raise a
> **⚑ RECOMMENDATION**, never silently diverge (CANON preamble).

### ADR-001 — Composite, don't bake: AI generates imagery only; text is an editable layer
- **Status:** ACCEPTED (CANON §2 — *the* load-bearing decision). Supersedes prior attempt A (§1.1).
- **Decision:** AI models generate **imagery only** (backgrounds / scenes / subjects / product-in-scene). Every
  element that must be legible or on-brand — headline, subhead, logo, CTA, legal, price, slide copy — is a
  **composited, editable vector/text `Layer`** on a JSON **layer tree** (CANON §5 layer types:
  `image|text|logo|shape|cta|frame|legal|group|smart`). Applies to single-image **and** carousel slides **and**
  video (React/HTML layers in Remotion).
- **Context:** Prior carousels baked text into pixels via text-to-image prompts → illegible, off-brand,
  un-editable, un-localizable → endless prompt-and-re-roll (lesson L1). The canonical artifact is the
  **composition (JSON)**, not a pixel buffer, so editing is a `LayerPatch` diff, localization is a text-layer
  swap, re-sizing is a re-layout of the same tree, and A/B variants are cheap forks.
- **Consequences — good:** editing is instant and free of image credits; on-brand is deterministic and
  BrandGuardian-gate-able; localization (DE⇄EN) is a text swap; multi-ratio (1:1/1.91:1/4:5) derives from one
  base; the re-roll spiral is structurally impossible.
- **Consequences — bad / mitigations:** requires a robust compositor + editor (mitigation: **Polotno**, ADR-002)
  and a canonical layer-tree type that is a *superset* Polotno JSON derives from (mitigation: `EditorAdapter`
  boundary, doc 06); in-pixel-text specialists become near-moot (mitigation: keep Ideogram/Recraft
  **fallback-only** for rare scene-texture text, R7 ⚑R-PROV1). **Guardrail:** forbid copy strings in
  `GenSpec.prompt` for non-scene-texture jobs (§1.2 recommendation).
- **Authoritative docs:** 03 (data model / layer tree), 06 (editor/compositor), 05 (CompositorPlanner agent).

### ADR-002 — Polotno SDK as the layered editor (behind `EditorAdapter`)
- **Status:** ACCEPTED (CANON §4).
- **Decision:** Use the **Polotno SDK** for the layered static/carousel canvas, **wrapped behind an
  `EditorAdapter`** so it is swappable. **Remotion** for video documents. Chat-to-edit emits typed
  **`LayerPatch`** diffs, never full re-rolls. Headless render via **`polotno-node`** (store JSON → PNG/JPG/PDF)
  in `packages/render`.
- **Context:** ADR-001 needs a production-grade layered canvas with drag-edit, text layers, fonts, and headless
  render. Building one from scratch is a project unto itself; Polotno provides it and self-hosts rendering
  (`polotno-node`, no per-render fee, data stays on our infra).
- **Consequences — good:** fast path to a lovable editor; headless render matches the on-canvas render;
  swappable via the adapter if licensing/quality changes.
- **Consequences — bad / mitigations:** **Polotno is a paid commercial SDK** (~**$899/mo** self-serve — budget
  it, §4 open question, R7 ⚑R-ENV1 → add `POLOTNO_API_KEY` to doc 11 env block); Polotno JSON does not natively
  model `smart`/`legal`/localization semantics (mitigation: canonical tree in `packages/shared` is the superset;
  adapt at the `EditorAdapter` boundary — doc 06). **VERIFY** `polotno-node` render fidelity for Playfair
  Display + Inter before committing.
- **Authoritative docs:** 06 (editor/compositor), 11 (Polotno license key).

### ADR-003 — Supabase (Postgres + RLS + Auth + Storage) + Vercel hosting
- **Status:** ACCEPTED (CANON §4; validated by prior attempt D, §1.1).
- **Decision:** **Supabase** for Postgres + **Row-Level Security** + Auth + Storage; **multi-tenant via
  `workspace_id` + RLS from day one.** Hosting: **Vercel** (web) + Supabase (data) + **Modal/Replicate** (engine
  GPU) + **Supabase/R2** (assets). `apps/web` = Next.js 15.
- **Context:** The client already ran a "Brutal Portal" on Supabase/Vercel (attempt D) — proven stack, low
  operational surface, RLS-native multi-tenancy, and Storage + a Postgres-native queue (ADR-007) in one place.
  Getting multi-tenancy wrong later is a rewrite, so RLS ships in P0.
- **Consequences — good:** single stack for DB/Auth/Storage/queue; RLS enforces tenant isolation mechanically;
  Vercel is the natural Next.js host; familiar to the client.
- **Consequences — bad / mitigations:** **RLS misconfig = cross-tenant data leak** (mitigation: RLS policies +
  cross-tenant denial tests from P0; `SUPABASE_SERVICE_ROLE_KEY` **server-only**, never shipped to client);
  GPU engine lives off-Supabase (Modal/Replicate) — an extra surface (mitigation: `ENGINE_URL` boundary, doc 08).
- **Authoritative docs:** 03 (schema/RLS), 11 (Supabase keys).

### ADR-004 — Providers behind interfaces; a policy-routed `ProviderBus` with override + fallback
- **Status:** ACCEPTED (CANON §4, §6).
- **Decision:** Every external generator is a driver behind a canonical interface (`ImageProvider`,
  `VideoProvider`, `AudioProvider`, `LlmProvider`, `EngagementPredictor`). A **`ProviderBus`** selects a driver
  per job from a **policy table (job → ranked providers)** with **manual override always available** and
  **automatic fallback**. Cache by `(provider, model, version, prompt, seed, params)`. The agent loop **never
  names a provider.**
- **Context:** ~10 image + ~7 video + 1 audio + several engagement backends, all drifting monthly in
  price/quality/availability (lesson L4). Hardcoding one is a maintenance trap; the router makes providers
  swappable, cached, cost-metered, and fallback-safe.
- **Consequences — good:** provider-agnostic agent loop; cheap swaps as models drift; caching kills duplicate
  spend (and, because text is never in the prompt, prompts are stable across copy edits — the anti-re-roll
  invariant); fallback chains mean no raw provider failure reaches the user.
- **Consequences — bad / mitigations:** the policy table is a living config that must track model renames/sunsets
  (mitigation: model ids in config, never hardcoded; startup reachability check; the §2.1 status table); more
  driver code up front (mitigation: fal as an aggregator collapses N integrations into one queue/webhook pattern).
- **Authoritative docs:** 04 (drivers + routing policy), 03 (`GenSpec`/`GenResult`/lineage), 05 (agents call the bus).

### ADR-005 — TRIBE v2 isolation: commercially-clean predictor on the revenue path
- **Status:** ACCEPTED (CANON §9). **Highest-severity failure mode is legal, not technical.**
- **Decision:** Wrap engagement behind `EngagementPredictor`. **Production/revenue path = a commercially-clean
  static predictor** (TranSalNet MIT saliency + our grid/clutter/CTA heuristics). **TRIBE v2** (`facebook/tribev2`,
  CC-BY-NC-4.0) and the ViralAnalyser reference repo (all-rights-reserved, NC) are a **flag-gated R&D backend**,
  gated by **`ENGAGEMENT_BACKEND=tribe_research` AND `RESEARCH_MODE=true` (both required)**, physically isolated
  in `services/engine/research/tribe/` with an optional `.[research]` dependency group, **never returned to a
  tenant**, never called from `apps/web`. Report all scores as **bands + confidence**, calibrated over time.
- **Context:** The obvious reference implementation is legally radioactive (lesson L7): NC forbids commercial use
  and **taints derived outputs** (heatmaps/curves). A paid SaaS scoring ads is squarely commercial → using
  TRIBE (weights or outputs) on the product path is a license breach.
- **Consequences — good:** the shipping predictor is 100% ownable/licensable; the layer-tree gives exact bboxes
  (a real advantage over pixel-only vendors); TRIBE can still inform **offline** weight-calibration research
  under the flags; bands+confidence keep us legally hedged and honest.
- **Consequences — bad / mitigations:** two engagement code paths to maintain (mitigation: one interface, driver
  table); risk of TRIBE leaking onto a paid path (mitigations: two required flags, physical package isolation,
  router hard-errors on TRIBE for billable jobs, `LICENSE_GUARD` stamps `commercial_use=false`, **CI gate**
  forbids TRIBE reachability on the commercial build). **⚑ RECOMMENDATION / open question §4:** legal sign-off
  before **any** TRIBE-derived signal informs a shipped coefficient.
- **Authoritative docs:** 08 (engagement engine + isolation), 11 (`ENGAGEMENT_BACKEND`, `RESEARCH_MODE`).

### ADR-006 — Anthropic Claude for the whole Creative Studio (server-side, structured outputs)
- **Status:** ACCEPTED (CANON §4, §7).
- **Decision:** **Anthropic Claude** (server-side, Agent SDK or Messages API) powers every studio agent
  (`Strategist`, `Copywriter`, `ArtDirector`, `CarouselArchitect`, `CompositorPlanner`, `BrandGuardian`,
  `Critic`, `EngagementAnalyst`, `EditorAgent`, `LocalizationAgent`). **Structured outputs via tool/JSON schema**
  (validated by zod in `packages/shared`); every agent returns typed JSON, never free text. All calls observable
  via `AgentRun`, cost-bounded, with a **human-approve gate before anything ships** and **bounded auto-iterate
  (≤2 rounds)**.
- **Context:** The value is a pipeline of specialists emitting typed artifacts the next stage relies on, with a
  hard Brand gate and a human gate. Free-text hand-offs are the enemy; structured outputs make the pipeline
  deterministic and auditable.
- **Consequences — good:** deterministic, auditable, cost-metered pipeline; provider-agnostic media via ADR-004;
  human stays in control (agents rank, never ship).
- **Consequences — bad / mitigations:** LLM cost can balloon if every agent uses the top model (mitigation →
  **⚑ RECOMMENDATION R7 ⚑R-LLM1:** default **Claude Sonnet 5** (`claude-sonnet-5`, intro $2/$10 through
  2026-08-31), **escalate to Opus 4.8** (`claude-opus-4-8`) only for ArtDirector/Critic/hard-BrandGuardian/
  round-2 iterate, **Haiku 4.5** for cheap classification — ~40% LLM-cost cut, satisfies CANON's "latest models"
  while adding a lever; do **not** hardcode `claude-opus-4-8` everywhere. **VERIFY** model ids + intro window
  before coding). **⚑ RECOMMENDATION R7 ⚑R-A1:** add an **`IntakeAgent`** (brief normalizer, ≤1–2 clarifying Qs)
  before Strategist — additive, no rename.
- **Authoritative docs:** 05 (agent studio), 11 (`ANTHROPIC_API_KEY`).

### ADR-007 — Async job queue for all generation (cache-keyed, progress-subscribed)
- **Status:** ACCEPTED (CANON §4). Queue backend has a flagged default (below).
- **Decision:** All generation is **async** — a **`GenerationJob`** on a queue with progress the UI subscribes
  to. Cache by `(provider, model, version, prompt, seed, params)`. Every `AgentRun` and `GenerationJob` logs
  tokens/latency/`cost_usd`; **hard per-brief and per-workspace spend caps**; content-moderation surface on gen
  failures.
- **Context:** Generation is slow (30 s–4 min per media job); synchronous waits are a broken UX (lesson L6).
  CANON §4 permits **"Inngest OR Supabase queue / `pg-boss`."**
- **Consequences — good:** responsive UI (live progress, never a 30 s spinner); caching kills duplicate spend;
  pre-flight cost caps prevent surprise bills; every job is observable and cost-attributed.
- **Consequences — bad / mitigations:** queue choice is an infra decision (mitigation → **⚑ RECOMMENDATION R7
  ⚑R-INFRA1:** default to **Supabase Queues (pgmq)** — Postgres-native, RLS-native, runs inside the
  already-mandated Supabase stack (ADR-003), zero new infra; keep a thin `JobQueue` interface so **Inngest is a
  drop-in adapter** (`INNGEST_*` env vars reserved) for fan-out/step-function ergonomics later. **VERIFY** pgmq
  visibility-window semantics + Edge Function timeout adequacy for the dispatch/poll step — long-running gen work
  lives at the provider and is polled, so the Edge Function only enqueues/polls, which fits).
- **Authoritative docs:** 04 (job flow), 03 (`GenerationJob`/`AgentRun`/`AuditLog`), 11 (`INNGEST_*`, caps).

---

## 4. Open questions for the human (Antonio)

> These require a **human decision** the build factory cannot make. Grouped by type. Each has a **default the
> factory will assume** if no answer arrives, so the build is never blocked — but these should be reviewed.
> **⚑ ASSUMPTION** marks a default the factory proceeds on absent an answer.

### 4.1 Licensing spend (must be purchased/confirmed before or during build)

| # | Question | Why it matters | Factory default (⚑ ASSUMPTION) |
|---|---|---|---|
| Q1 | **Polotno commercial license** (~$899/mo self-serve) — purchase? | Editor + `polotno-node` render (ADR-002); unlicensed = watermark/limits. Add `POLOTNO_API_KEY` to env (doc 11, R7 ⚑R-ENV1). | Proceed assuming purchased; wire `POLOTNO_API_KEY`; **VERIFY** render fidelity for Playfair/Inter. |
| Q2 | **Remotion Company License** (4+ people / funded → required; Creators ~$25/dev/mo min $100/mo, or Automators $0.01/render min $100/mo) — purchase + which plan? | Legal requirement for the commercial video path (ADR-002 / R2 §5.3). | Budget it; prefer render-based (Automators) if video volume is spiky. Video is P9 (fast-follow), so not a P0 blocker. |
| Q3 | **Bria commercial agreement** for utilities (bg-remove/expand/relight/upscale) — sign? | Commercial-safe **indemnification** is the reason to prefer Bria over Clipdrop for the paying DE law-firm / PE tenant (R1 §8). | Route utilities to Bria; **VERIFY** agreement requirement + per-call price at contract time. |
| Q4 | **Engagement vendor tier** — start on self-hosted TranSalNet only, or also buy **Expoze.io** (€25→€450/mo) / **Neurons** (€15k/yr) upgrade? | Production default is clean self-hosted; paid vendors are quality/video upgrades (ADR-005 / R4 §3). | Ship TranSalNet + our heuristics; leave Expoze/Neurons as opt-in paid upgrades, off by default. |
| Q5 | **BFL commercial license tier** the tenant needs for output rights, + EU host `api.eu.bfl.ai` for GDPR (DE law-firm data). | Determines legal use of FLUX outputs in paid ads + GDPR posture (R1 §2.4). | Use EU host for the DE tenant; **VERIFY** whether the default API output rights suffice or a paid commercial tier is required. |

#### 4.1.1 Consolidated licensing gate (ledger L9 — one table; authoritative home is `docs/12` §11)

> Ledger **L9** requires one consolidated **hard sign-off gate** before commercial launch. The authoritative,
> single-source table lives in **`docs/12` §11**; it is reproduced here as the appendix's one-stop reference so
> the factory understands *why* each gate exists (do not treat this copy as authoritative — `docs/12` §11 wins).
> Every row is a **hard sign-off**: launch is blocked until cleared.

| Gate | License / constraint | Ships in v1? | Hard rule (blocks commercial launch until cleared) |
|---|---|---|---|
| **TRIBE v2** (`facebook/tribev2` + ViralAnalyser repo) | **CC-BY-NC-4.0** (non-commercial; NC taints derived outputs) | ❌ R&D-only, **double-flag-gated** (`ENGAGEMENT_BACKEND=tribe_research` **AND** `RESEARCH_MODE=true`) | The shipped v1 saliency + calibrator MUST use only **TranSalNet (MIT)** + real `Result` rows, **ZERO TRIBE input**. Any TRIBE-informed coefficient is a **hard-blocked, legal-review-gated post-v1 item** (ADR-005; §4.2 Q6). |
| **Grid-salience weights** | reference-repo constants are unlicensed | ✅ clean-room reimplementation only | Weights **must be re-derived by the calibration loop**, never shipped as the reference repo's literal constants (clean-room; §2.4 `heuristic.grid`). |
| **ElevenLabs Music** (`/v1/music/compose`) | commercial-music rights for paid ads unconfirmed | ❌ off until confirmed | Confirm ElevenLabs Music **commercial terms** before any generated bed ships in a paid ad (§4.2 Q7). Muted-first ships without it. |
| **Bria** (bg-remove/expand/relight/upscale) | commercial-safe + **indemnity** requires an agreement | ✅ (utilities path) | Sign the **Bria commercial/indemnity** agreement before routing paying-tenant utilities through Bria (§4.1 Q3). |
| **Remotion Company License** | required for 4+ seats / funded teams | ✅ (video is P9 fast-follow) | Purchase the **Remotion Company License** (Creators or Automators plan) before the commercial video path ships (§4.1 Q2). |
| **BFL commercial output-license tier** | FLUX output rights + EU host for GDPR | ✅ (primary image path) | Confirm the **BFL commercial output-license tier** and use the **EU host** (`api.eu.bfl.ai`) for the DE/GDPR tenant (§4.1 Q5). |

### 4.2 Legal sign-off

| # | Question | Why it matters |
|---|---|---|
| Q6 | **Legal sign-off before ANY TRIBE-derived signal informs a shipped coefficient** (even offline-calibration). | TRIBE is CC-BY-NC; NC may taint even indirectly-derived coefficients (ADR-005 / R4 §2.1, §6). Safest posture: shipped calibration coefficients are **defensibly derived from real LinkedIn `Result`s + a clean saliency model**, not TRIBE curves. **⚑ ASSUMPTION:** until sign-off, TRIBE informs **nothing** that ships. |
| Q7 | **Commercial license for ElevenLabs-generated music** in paid LinkedIn ads. | The sound-on variant may use a generated music bed (`/v1/music/compose`); paid-ad commercial rights must be confirmed (R2 §4.3). **⚑ ASSUMPTION:** muted-first ships without generated music until confirmed. |
| Q8 | **SALICON source-image ToU** if we ever fine-tune a saliency model on it. | SALICON *annotations* are CC-BY-4.0 (commercial OK) but source images are Flickr/COCO ToU (R4 §4). **⚑ ASSUMPTION:** ship TranSalNet as-is (MIT) without a custom fine-tune; revisit only if we retrain. |

### 4.3 LinkedIn API & results ingestion

| # | Question | Why it matters | Factory default (⚑ ASSUMPTION) |
|---|---|---|---|
| Q9 | **LinkedIn Marketing API access** for the calibration loop — do we have (or will we apply for) programmatic access to pull real ad `Result`s (impressions/clicks/CTR)? | The engagement predictor is only *truth-calibrated* against the tenant's real LinkedIn results (ADR-005 / R4 §7). Without API access, results are **manual paste**. | Support **manual `Result` paste** in P10; treat LinkedIn API ingestion as an enhancement pending access. |
| Q10 | **Publishing to LinkedIn** — human-only, or eventual API auto-publish? | CANON keeps export a human action; spend must never be automated (R7 §4). | **Human-only export/publish.** Never automate spend. Only *results ingest* may be automated later. |
| Q11 | **Confirm LinkedIn 2026 format specs** (ratios/limits in CANON §8) against LinkedIn's current ad-spec page before hardcoding exporter constraints. | Specs drift (≤5 MB image / ≤200 MB video / char limits). CANON §8 is the intended source of truth, but re-confirm at ship time. | Hardcode CANON §8 values; add a `VERIFY` gate in the exporter (doc 07). |

### 4.4 Routing / budget calls

| # | Question | Why it matters | Factory default (⚑ ASSUMPTION) |
|---|---|---|---|
| Q12 | **Per-brief and per-workspace `cost_usd` caps** — what dollar values? | Hard caps prevent surprise bills (ADR-007 / CANON §4). The factory needs numbers. | **⚑ ASSUMPTION:** default per-brief cap **$5**, per-workspace monthly cap **$200**, both configurable in workspace settings. Confirm/adjust. |
| Q13 | **Default LLM tier** — accept R7 ⚑R-LLM1 (Sonnet 5 default, Opus 4.8 escalation, Haiku 4.5 cheap)? | ~40% LLM-cost lever vs "Opus everywhere" (ADR-006). | **⚑ ASSUMPTION:** adopt the tiering. **VERIFY** model ids + Sonnet 5 intro-pricing window (ends 2026-08-31). |
| Q14 | **Default queue backend** — accept R7 ⚑R-INFRA1 (Supabase Queues/pgmq default, Inngest adapter)? | Zero new infra for the MLP vs a second SaaS (ADR-007). | **⚑ ASSUMPTION:** default pgmq; keep Inngest adapter behind `INNGEST_*`. |
| Q15 | **Seedream source** — via `FAL_KEY` (fal gateway) or a direct BytePlus contract? | Fewer integrations vs possibly-cheaper direct at volume (R1 ⚑R-PROV2). `SEEDREAM_API_KEY` stays source-agnostic. | **⚑ ASSUMPTION:** source via fal; keep `SEEDREAM_API_KEY` name; switch to direct BytePlus only if cheaper at volume. |
| Q16 | **First-tenant scope** — confirm Brutal AI is the only seed tenant for v1, with the seed BrandKit (dark palette, Playfair+Inter, gold `#cba65e` / lime `#b6e64a`), DE+EN, verticals legal-AI-for-DE-law-firms + PE. | Drives seed data + BrandGuardian rules (CANON §1). | **⚑ ASSUMPTION:** yes — Brutal AI seed tenant only for v1; seed the Brutal BrandKit v1 (doc 03). |

---

## 5. Cross-doc consistency notes (for the factory)

- **Canonical names used verbatim** (CANON §5–§10): object model `Workspace → BrandKit → Campaign → Brief →
  AdDocument → Variant → Slide → Layer` (+ `Asset`, `Render`, `Experiment`, `ExperimentArm`, `Result`,
  `AgentRun`, `GenerationJob`, `AuditLog`, `WorkspaceMember`); interfaces `ImageProvider` / `VideoProvider` /
  `AudioProvider` / `LlmProvider` / `EngagementPredictor` / `ProviderBus`; `GenSpec` / `GenResult` /
  `EngagementScores`; agents `Strategist` / `Copywriter` / `ArtDirector` / `CarouselArchitect` /
  `CompositorPlanner` / `BrandGuardian` / `Critic` / `EngagementAnalyst` / `EditorAgent` / `LocalizationAgent`;
  env vars per CANON §10 (`ANTHROPIC_API_KEY`, `BFL_API_KEY`, `FAL_KEY`, `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY`,
  `GEMINI_API_KEY`, `OPENAI_API_KEY`, `SEEDREAM_API_KEY`, `KLING_ACCESS_KEY`, `KLING_SECRET_KEY`,
  `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_*`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `ENGINE_URL`, `ENGAGEMENT_BACKEND`, `RESEARCH_MODE`, `INNGEST_*`, `APP_BASE_URL`).
- **All ⚑ RECOMMENDATIONs in this doc are additive and flagged** — they never rename or contradict a CANON name.
  They originate in the research files (R1 ⚑R-PROV1/⚑R-PROV2; R2 ⚑R-AVATAR1; R4 TRIBE-isolation; R7
  ⚑R-A1/⚑R-LT1/⚑R-LLM1/⚑R-INFRA1/⚑R-ENV1) and are also carried by docs 04/05/08/11.
- **Every external API in §2 carries a `VERIFY current docs before coding` obligation.** The consolidated verify
  checklists live in R1 §11, R2 §8, R4 §9, R7 §9 — the factory must run them before coding each driver.
- **Full research set present (ledger L11):** `research/R3-linkedin-playbook.md` (LinkedIn playbook),
  `research/R5-competitive.md` (competitive), and `research/R6-editor-compositor.md` (editor/compositor) are now
  present in `research/` alongside R1/R2/R4/R7. Their content is consumed by the sibling docs
  (**R3** → `docs/07` creative playbook; **R5** → competitive positioning across `docs/01`/`docs/07`; **R6** →
  `docs/06` editor/compositor). Any doc-07 benchmark numbers are **directional — calibrate against the tenant's
  real `Result`s**, not "unsourced placeholder pending R3." No "reconcile when R3 lands / VERIFY against R3"
  hedge remains in this package.

---

*End of doc 14 — Appendix. This document records history and restates locked decisions; it introduces no new
canonical decision. Any change must be raised as a **⚑ RECOMMENDATION**, per CANON.*
