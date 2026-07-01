# 11 — ENV & KEYS

> **Read `CANON.md` first.** This document expands **CANON §10** (canonical env var names) and
> conforms to CANON §4 (locked stack), §5 (object model), §6 (provider contracts), and §9 (engagement stance).
> **Every env var name in CANON §10 is canonical — never rename it.** Where a service needs a key that CANON §10
> omits (Polotno license, Runway direct, Bria utilities, HeyGen avatar, Remotion license), it is added here and
> **clearly flagged `⚑ RECOMMENDATION`**; these do not contradict CANON, they fill gaps CANON's authors already
> anticipated (see R7 `⚑R-ENV1`, R2 `⚑R-AVATAR1`, doc 04 §7.4).
>
> **Grounding research:** `research/R1-image-models.md` (image providers + signup/pricing), `research/R2-video-audio.md`
> (Kling/ElevenLabs/Runway/HeyGen/Remotion), `research/R7-blank-slate-arch.md` (Supabase, queue, engine, Polotno,
> failure-mode table §7). Cross-checked against `docs/04-provider-integrations.md` (driver `id` ↔ credential map).
>
> **⚠️ EVERY external service below carries a `VERIFY current docs before coding` note.** Signup URLs, pricing
> tiers, free-tier limits, and header formats drift. **Prices here are best-verified as of July 2026 — treat them
> as budgeting guidance to confirm at signup, never as constants in code.** Store *resolved* `costUsd` in
> `GenResult` / `Variant` lineage (CANON §5), never a hardcoded price.

---

## 0. TL;DR — the three things the builder must know

1. **Canonical env var names are frozen (CANON §10).** Use them exactly. If code needs a var not in the master
   `.env.example` in §6 below, it is a bug — add it here with a flag, don't invent a name.
2. **Minimum keys to run the happy path** (static single-image ad, brief → board → edit → export) is a **short
   list** — see §5. Video, avatar, and engagement-R&D keys are **not** required to demo the core loop.
3. **Two secrets are server-only and must never reach the browser:** `SUPABASE_SERVICE_ROLE_KEY` and every
   provider key. Only `SUPABASE_URL` + `SUPABASE_ANON_KEY` (and public `NEXT_PUBLIC_*` mirrors) are client-safe.
   See §7 (secret hygiene) — this is an RLS-bypass / cost-blowout risk if violated.

---

## 1. What the client already has vs what is new

The client (Brutal AI, `antonio@brutal.ai`) ran a prior static-carousel + Kling-video pipeline. From CANON §2
and the transcripts, these credentials **already exist** and can be reused directly:

| Already held by client | Env var(s) | Evidence (CANON §2) |
|---|---|---|
| **BFL / FLUX** (primary imagery) | `BFL_API_KEY` | "FLUX (BFL)" primary imagery |
| **Fal** (aggregator) | `FAL_KEY` | Used across prior gen |
| **Ideogram** (in-image text) | `IDEOGRAM_API_KEY` | "Ideogram + Recraft" for baked text |
| **Recraft** (design/SVG text) | `RECRAFT_API_KEY` | "Ideogram + Recraft" |
| **Kling** (video, JWT API) | `KLING_ACCESS_KEY`, `KLING_SECRET_KEY` | "Kling … JWT-auth official API" |
| **ElevenLabs** (German VO) | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_*` | "ElevenLabs German VO" |
| **Gemini / nano-banana** (image) — *partial* | `GEMINI_API_KEY` | "some nano-banana/Gemini image" (usage seen, key status **VERIFY**) |

**New keys the builder / operator must obtain** (not evidenced as pre-existing, or newly required by this
architecture):

| New credential | Env var(s) | Why new |
|---|---|---|
| **Anthropic (Claude)** | `ANTHROPIC_API_KEY` | Whole Creative Studio (CANON §4) — the prior pipeline was hand-driven, not agentic. |
| **Ideogram / Recraft / Gemini** | (as above) | Held **partially** — treat `GEMINI_API_KEY` as **new/confirm**; Ideogram+Recraft held but re-scoped to fallback (⚑R-PROV1). |
| **OpenAI (GPT Image)** | `OPENAI_API_KEY` | New — diversity/A-B fallback (R1 §6). |
| **Seedream** | `SEEDREAM_API_KEY` | New — sourced **via Fal** (⚑R-PROV2); the var can point at Fal or BytePlus ModelArk. |
| **Supabase** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | New — this platform's DB/Auth/Storage/Queue (prior "Brutal Portal" was ad-hoc). |
| **Engine host** | `ENGINE_URL` (+ `ENGAGEMENT_BACKEND`, `RESEARCH_MODE`) | New — `services/engine` FastAPI engagement service. |
| **Polotno license** (⚑ R-ENV1) | `POLOTNO_API_KEY` | New — the editor + headless render SDK; CANON §10 omitted it. |
| **Runway** (⚑, optional) | `RUNWAY_API_KEY` | New — only if reaching Runway direct instead of via Fal (doc 04 §7.4). |
| **Bria** (⚑, optional) | `BRIA_API_KEY` | New — commercial-safe utilities (bg-remove/expand/relight); default is **via Fal** (no new key). |
| **HeyGen** (⚑, optional, post-MVP) | `HEYGEN_API_KEY` | New — talking-head avatar lane (R2 §3, ⚑R-AVATAR1). |
| **Remotion license** (⚑) | *(billing, not a runtime key)* | New — Company License for teams 4+ (R2 §5.3). Cost line item, not a secret. |

> **VERIFY at kickoff:** ask the operator which of BFL / Fal / Ideogram / Recraft / Kling / ElevenLabs / Gemini
> keys are live and which have spend caps, before assuming any are usable in CI.

---

## 2. Per-service reference (every service in CANON §10 + flagged additions)

Each row: **env var(s) · what it's for · where to get the key (signup URL) · pricing-tier notes · v1 required?**
The **driver `id`** column ties back to `docs/04` §0. `VERIFY` = re-check the signup/pricing page before coding.

### 2.1 LLM / agents

| Service | Env var | Driver `id` | What it's for | Where to get key (signup) | Pricing notes (VERIFY) | v1? |
|---|---|---|---|---|---|---|
| **Anthropic Claude** | `ANTHROPIC_API_KEY` | (LlmProvider) | **Every agent** in the Creative Studio (Strategist…LocalizationAgent, CANON §7); structured outputs via tool/JSON schema. | https://console.anthropic.com → *API Keys*. Add billing; set a monthly spend limit. | Pay-as-you-go per-token. Default **Sonnet 5** (~$3/$15 per M in/out; intro pricing window — VERIFY), escalate to **Opus 4.8**, **Haiku 4.5** for cheap tasks (⚑R-LLM1). Prompt caching (~90% off) + Batch API for fan-out. | **✅ REQUIRED** |

> `VERIFY`: current model ids (`claude-sonnet-5`, `claude-opus-4-8`, `claude-haiku-4-5`) and any intro-pricing
> expiry at https://platform.claude.com/docs/en/about-claude/models/overview. Do NOT hardcode a model id in
> business logic — keep it in config (R7 §7 model-drift resilience).

### 2.2 Image providers

| Service | Env var | Driver `id` | What it's for | Where to get key (signup) | Pricing notes (VERIFY) | v1? |
|---|---|---|---|---|---|---|
| **Black Forest Labs (FLUX)** | `BFL_API_KEY` | `bfl` | **Primary** hero/scene/product imagery, carousel continuity (fixed seed + Kontext), FLUX edit. | https://dashboard.bfl.ai (a.k.a. https://api.bfl.ai) → create key. For DE law-firm tenant use EU host `api.eu.bfl.ai` (GDPR). | Pay-as-you-go, MP-metered. FLUX.2 [pro] from **$0.03/MP**; [max] from **$0.07**; [klein] draft **~$0.015**; Kontext edit **$0.04–$0.08**. A 1200×1200 (1.44 MP) 1:1 costs slightly above floor. | **✅ REQUIRED** |
| **Fal** | `FAL_KEY` | `fal` (+ hosts `seedance`, `bria` default, Runway-via-fal) | Multi-model aggregator + FLUX fallback + non-FLUX models (Seedream, Recraft, Luma, Reve) + Bria utilities, single invoice. | https://fal.ai → *Dashboard → Keys*. Prepaid credits / billing. Header `Authorization: Key …`. | Prepaid credits; small aggregator margin. Seedream **$0.04/img**, Luma Photon Flash **$0.002**, Bria bg-remove **$0.018**. Free queue wait. | **✅ REQUIRED** (fallback fabric; also carries Seedream & default utilities) |
| **Google Gemini Image** ("Nano Banana Pro") | `GEMINI_API_KEY` | `gemini` (image) + `veo` (video) | **Primary brand-consistent edit** ("change only X, keep identical"), multi-ref compose (up to 14 refs); **also** used by the `veo` video driver. | https://aistudio.google.com/apikey (Google AI Studio). Enable billing for production. | 1K/2K image ≈ **$0.134**, 4K ≈ **$0.24** (Batch ~½). Flash Image cheaper (**~$0.067**/1K). Free tier exists — do NOT rely on it for prod. | **✅ REQUIRED** (edit path) |
| **Ideogram** | `IDEOGRAM_API_KEY` | `ideogram` | **Fallback-only** (⚑R-PROV1): rare in-pixel text baked into a scene/texture. Not on the normal path (text is a Polotno layer, CANON §2). | https://ideogram.ai → *API* / https://developer.ideogram.ai. Header `Api-Key: …`. | Turbo **$0.03** / Default **$0.06** / Quality **$0.09** per image. Char-ref higher. | **Optional** (rarely on path; client already holds) |
| **Recraft** | `RECRAFT_API_KEY` | `recraft` | **Fallback-only** for gen; **first-class only** for genuine **SVG vector** assets (icons/brand marks → Polotno tree). | https://www.recraft.ai/api → generate API key. | V3 raster **$0.04** / **vector $0.08** per image. | **Optional** (vector assets; client already holds) |
| **OpenAI GPT Image** | `OPENAI_API_KEY` | `openai` | Diversity / A-B variety fallback + native edit. Use **`gpt-image-1.5`** (ledger L4 canonical default; NOT `gpt-image-2`) / Mini. | https://platform.openai.com → *API keys*. Header `Authorization: Bearer …`. | Mini **$0.005–0.052**; full ≈ $0.02/$0.07/$0.19 (low/med/high). **Do NOT hardcode `gpt-image-1`** (deprecates 2026-10-23). | **Optional** (fallback) |
| **ByteDance Seedream** | `SEEDREAM_API_KEY` | `seedream` (via `fal`) | Cost-optimized 4K imagery / look variety when the FLUX look is tired. **Sourced via Fal** by default (⚑R-PROV2) — the var is source-agnostic (Fal key or BytePlus ModelArk key). | Via Fal: reuse `FAL_KEY` (no separate signup). Direct: https://console.byteplus.com (ModelArk). | Seedream 4.5 **$0.04/img** on Fal; ModelArk tiered (e.g. 400 img/$6.99). | **Optional** (variety; default reached through Fal) |
| **Polotno** ⚑R-ENV1 | `POLOTNO_API_KEY` | (editor + `packages/render`) | **Editor SDK license** (layered canvas) + **`polotno-node` headless render** (store JSON → PNG/JPG/PDF/SVG; ledger L3 — PPTX is NOT a native `polotno-node` output, out of scope for v1, document/carousel ads ship as PDF; if ever needed it is a separate post-render step, flagged VERIFY). Runtime blocker if unlicensed (watermark/limits). | https://polotno.com/cabinet (sign in → license key) · pricing https://polotno.com/sdk/pricing. | Commercial license ~**$899/mo** (VERIFY tier). No per-render fee. | **✅ REQUIRED** (editor + render core; ⚑ fills CANON §10 omission) |
| **Bria** ⚑ (optional) | `BRIA_API_KEY` | `bria` (default via `fal`) | Commercial-safe, indemnified **utilities**: background removal, expand/outpaint, relight, upscale. Preferred for the paying DE/PE tenant. | Default: **via Fal** (`FAL_KEY`, no new key). Direct/commercial agreement: https://bria.ai / https://docs.bria.ai. | bg-remove **$0.018**, expand **$0.023** (Fal). Direct needs a commercial agreement (VERIFY). | **Optional** (utilities work via Fal without this key) |

> `VERIFY`: BFL FLUX.2 endpoint slugs (`*-preview` vs stable), Gemini image surface (`interactions.create` vs
> `generateContent`) + GA slug `gemini-3-pro-image`, Recraft true-SVG requires the **direct** vector endpoint
> (Fal `text-to-image` returns raster). See R1 §11 checklist.

### 2.3 Video providers

| Service | Env var(s) | Driver `id` | What it's for | Where to get key (signup) | Pricing notes (VERIFY) | v1? |
|---|---|---|---|---|---|---|
| **Kling** (official Kuaishou) | `KLING_ACCESS_KEY`, `KLING_SECRET_KEY` | `kling` | **Primary video** — i2v default (animate the composited still), Omni for face consistency. **JWT HS256** minted per request from these two keys. | https://klingai.com → developer / open-platform console → *Access Key + Secret Key*. Host `api.klingai.com` (VERIFY vs region host). | Prepaid API packages. ~**$0.07–0.17/s** (v2.5-turbo) up to ~**$0.39/s** (v3 Omni w/ voice). **Failed tasks are free.** | **Optional for v1** (video is a first-class **fast-follow**, CANON §0; client already holds) |
| **Google Veo 3.1** | `GEMINI_API_KEY` (shared) | `veo` | Only when **real in-frame audio/dialogue** is required (sound-on cut). Reuses the Gemini key. | Same as Gemini (§2.2) — https://aistudio.google.com/apikey. | **$0.40/s** std, **$0.15/s** fast. 8 s cap. | **Optional** (no new key) |
| **Seedance 2.0** | `FAL_KEY` (shared) | `seedance` | Cheap b-roll / fallback video. Reached **via Fal**. | Same as Fal (§2.2). | 10 s fast ≈ $2.42 / std ≈ $3.03 (VERIFY). | **Optional** (no new key) |
| **Runway** ⚑ (optional) | `RUNWAY_API_KEY` | `runway` | Premium-motion video fallback (Gen-4 Turbo / Aleph 2.0). **Default: route via Fal** (no new key); add this key only for a direct Runway contract. | https://dev.runwayml.com → *API keys*. Header `Authorization: Bearer …` + `X-Runway-Version` (VERIFY). | Gen-4 Turbo **$0.05/s** ($0.01/credit). | **Optional** (prefer via Fal) |
| **HeyGen** ⚑ (optional, post-MVP) | `HEYGEN_API_KEY` | `avatar`/`AvatarProvider` (⚑R-AVATAR1) | Talking-head / UGC "founder" ad (LinkedIn B2B format). Pair with our ElevenLabs VO for on-brand voice. | https://app.heygen.com → *Settings → API*. Header `X-Api-Key: …`. | v3 wallet **~$0.05/s** (≈ $1–3/min). | **Optional** (post-MVP fast-follow; do NOT block P9 on it) |

> `VERIFY`: Kling host + `model_name` slugs + JWT claims (`iss/exp/nbf`, HS256); Veo `veo-3.1-*` slugs
> (`veo-3.0-*` sunset 2026-06-30); Runway Gen-4 Aleph sunset 2026-07-30 → Aleph 2.0; HeyGen v2 vs v3 wallet
> (v1/v2 operational until 2026-10-31). See R2 §8.

### 2.4 Audio provider

| Service | Env var(s) | Driver `id` | What it's for | Where to get key (signup) | Pricing notes (VERIFY) | v1? |
|---|---|---|---|---|---|---|
| **ElevenLabs** | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_*` | `elevenlabs` | VO (DE+EN, `eleven_multilingual_v2`), SFX, music bed. Header `xi-api-key: …`. Voice IDs pinned per language/persona. | https://elevenlabs.io → *Profile → API Keys*. Copy voice IDs from *Voices* (or the Voice Library). | Tiered subscriptions (Creator/Pro/Scale) metered by characters; Music API has separate commercial-license terms (VERIFY for paid ads). | **Optional for v1** (video/audio path; client already holds) |

> **Voice-ID convention (CANON §10 `ELEVENLABS_VOICE_ID_*`):** define one var per language/persona, e.g.
> `ELEVENLABS_VOICE_ID_DE` (German narrator), `ELEVENLABS_VOICE_ID_EN` (English narrator). The
> `LocalizationAgent` selects by locale; add more suffixes (`_DE_FEMALE`, `_EN_MALE`) as personas grow.
> **DE caveat (R2 §4.4):** pre-spell numbers/dates/symbols in German before TTS ("zwölfhundert") — this is a
> `LocalizationAgent` responsibility, not an env concern, but is why voice IDs are per-language.

### 2.5 Data / Auth / Storage / Queue / Engine (infrastructure)

| Service | Env var(s) | What it's for | Where to get it | Pricing notes (VERIFY) | v1? |
|---|---|---|---|---|---|
| **Supabase** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Postgres + **RLS** + Auth + Storage + **Queue (pgmq)** (⚑R-INFRA1). Multi-tenant via `workspace_id` from day 1. | https://supabase.com → new project → *Project Settings → API* (URL + anon + service_role keys). | Free tier for dev; **Pro ~$25/mo** for prod (VERIFY). | **✅ REQUIRED** |
| **Engine host** | `ENGINE_URL` | Base URL of the `services/engine` FastAPI engagement service (`apps/web` calls it). | Deploy `services/engine` (Modal/Replicate/host) → its public URL. Local dev: `http://localhost:8000`. | GPU-optional; pay per host (Modal/Replicate metered). Commercial saliency path needs no GPU; TRIBE R&D does. | **✅ REQUIRED** (even if only the commercial saliency path is live) |
| **Engagement backend switch** | `ENGAGEMENT_BACKEND` (`saliency` \| `tribe_research`) | Selects the `EngagementPredictor` backend. **`saliency` = commercial default; `tribe_research` = flag-gated R&D, NEVER on the commercial path** (CANON §9). | Config value, not a secret. Default `saliency`. | — | **✅ REQUIRED** (set to `saliency`) |
| **Research-mode gate** | `RESEARCH_MODE` (`true`\|`false`) | Second gate: `tribe_research` only runs when **both** `ENGAGEMENT_BACKEND=tribe_research` **and** `RESEARCH_MODE=true`. Keeps the CC-BY-NC TRIBE license off the commercial build (CANON §9, R7 §7). | Config value, not a secret. Default `false`. | — | **✅ REQUIRED** (set to `false` in prod) |
| **App base URL** | `APP_BASE_URL` | Absolute base for webhooks/callbacks (BFL/Fal/Kling), share links, OAuth redirects. Validate at boot. | Your deployment URL. Local: `http://localhost:3000`. Prod: your Vercel domain. | — | **✅ REQUIRED** |
| **Job queue adapter** (optional) | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` (CANON's `INNGEST_*`) | Optional Inngest adapter for the async job queue. **Default = Supabase Queues (pgmq)** (⚑R-INFRA1) — Inngest reserved, not required. | https://app.inngest.com → *Manage → Keys* (only if using Inngest). | Free tier; usage-based (VERIFY). | **Optional** (pgmq is the default; leave blank to use Supabase Queues) |

> **CANON §10 lists `INNGEST_*` as a group.** The concrete names above (`INNGEST_EVENT_KEY`,
> `INNGEST_SIGNING_KEY`) are the standard Inngest pair. `VERIFY` current Inngest key names at signup — treat the
> `INNGEST_*` prefix as canonical and the exact suffixes as VERIFY. Because pgmq is the default queue
> (⚑R-INFRA1), **the happy path needs none of these** (see §5).

### 2.6 Non-key commitments (budget line items, not runtime secrets)

| Commitment | Why | Where | Note |
|---|---|---|---|
| **Remotion Company License** ⚑ | Required for companies of **4+ people** (or funded past threshold). Video render (P9) is a commercial multi-tenant use. | https://remotion.pro | **Budget line item, not an env var.** VERIFY current thresholds/pricing before shipping video. |
| **Bria commercial agreement** ⚑ | Indemnified, commercial-safe utilities for the paying tenant. Only needed if using Bria **direct** (Fal-sourced Bria works without it for MVP). | https://bria.ai | VERIFY at contract time. |
| **Modal / Replicate** (engine GPU) | Only if the engine's GPU path (TRIBE R&D or heavy saliency) is enabled. `ENGINE_URL` points at wherever it's hosted. | https://modal.com / https://replicate.com | Metered GPU; the commercial saliency path can run CPU-only. |
| **Vercel** (web hosting) | Hosts `apps/web`. No app-level secret beyond the env vars in §6 (set in the Vercel dashboard). | https://vercel.com | Free/Pro tiers. |

---

## 3. Required vs optional matrix (at a glance)

| Env var | Category | v1 status | Reachable-without? (fallback) |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | LLM | **REQUIRED** | No — no agents without it |
| `BFL_API_KEY` | Image | **REQUIRED** | Degraded — Fal FLUX fallback exists but this is the primary |
| `FAL_KEY` | Image/video aggregator | **REQUIRED** | No — fallback fabric + Seedream + default utilities |
| `GEMINI_API_KEY` | Image edit (+ Veo) | **REQUIRED** | Degraded — FLUX Kontext covers edit as fallback |
| `POLOTNO_API_KEY` ⚑ | Editor + render | **REQUIRED** | No — editor/headless render is the product core |
| `SUPABASE_URL` | Infra | **REQUIRED** | No |
| `SUPABASE_ANON_KEY` | Infra (client-safe) | **REQUIRED** | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Infra (server-only) | **REQUIRED** | No |
| `ENGINE_URL` | Engine | **REQUIRED** | No — engagement calls target it |
| `ENGAGEMENT_BACKEND` | Engine flag | **REQUIRED** (`saliency`) | No (has a default) |
| `RESEARCH_MODE` | Engine flag | **REQUIRED** (`false`) | No (has a default) |
| `ENGINE_SHARED_SECRET` (ledger L8) | Engine auth | **REQUIRED** | No — authenticates `apps/web` ↔ `services/engine` |
| `WEBHOOK_SIGNING_SECRET` (ledger L8) | Webhooks | **REQUIRED** | No — verifies inbound provider webhook signatures |
| `RENDER_URL` (ledger L8) | Render | Optional | Yes — only when `packages/render` runs as a separate container |
| `APP_BASE_URL` | App | **REQUIRED** | No |
| `IDEOGRAM_API_KEY` | Image (fallback) | Optional | Yes — rarely on path |
| `RECRAFT_API_KEY` | Image (vector) | Optional | Yes — only for SVG assets |
| `OPENAI_API_KEY` | Image (fallback) | Optional | Yes — diversity fallback |
| `SEEDREAM_API_KEY` | Image (variety) | Optional | Yes — default via `FAL_KEY` |
| `KLING_ACCESS_KEY` / `KLING_SECRET_KEY` | Video | Optional (fast-follow) | N/A — video not in happy path |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID_*` | Audio | Optional (fast-follow) | N/A — video not in happy path |
| `RUNWAY_API_KEY` ⚑ | Video (premium) | Optional | Yes — default via `FAL_KEY` |
| `BRIA_API_KEY` ⚑ | Utilities | Optional | Yes — default via `FAL_KEY` |
| `HEYGEN_API_KEY` ⚑ | Avatar (post-MVP) | Optional | N/A — post-MVP |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Queue (adapter) | Optional | Yes — pgmq is default |

---

## 4. `.env` files by workspace (monorepo layout)

The CANON repo tree has one root `.env.example`. In practice three consumers read env (all names identical to
CANON §10 — same var, different runtime):

| File | Consumer | Reads |
|---|---|---|
| `/.env` (root, from `.env.example`) | `apps/web` (Next.js), scripts, `packages/render` | All app + provider + Supabase + engine vars |
| `/services/engine/.env` | Python FastAPI engine | `ENGAGEMENT_BACKEND`, `RESEARCH_MODE`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (for asset reads), optionally model/HF creds if TRIBE R&D enabled |
| Vercel / host dashboard | Production `apps/web` | Same as root, set as encrypted env in the platform (never committed) |

**Next.js note:** only vars prefixed `NEXT_PUBLIC_` are exposed to the browser. Client-safe Supabase values are
mirrored as `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. **Never** create a
`NEXT_PUBLIC_*` mirror of any provider key or the service-role key (see §7).

---

## 5. Minimum keys to run the happy path

**Happy path = the core loop CANON's north star describes for a _static single-image ad_:** type a brief →
agents produce a board of on-brand variants → edit an element (drag or chat) → predict engagement (commercial
saliency band) → export to LinkedIn spec. **No video, no avatar, no TRIBE R&D.**

**Minimum viable `.env` (9 secrets + 4 config values):**

```bash
# --- LLM (all agents) ---
ANTHROPIC_API_KEY=sk-ant-...

# --- Image generation (hero + edit) ---
BFL_API_KEY=...                 # primary imagery
FAL_KEY=...                     # fallback fabric + utilities (Bria via fal, Seedream via fal)
GEMINI_API_KEY=...              # brand-consistent edit (Nano Banana Pro)

# --- Editor + headless render ---
POLOTNO_API_KEY=...             # ⚑ required license (editor + polotno-node render)

# --- Data / Auth / Storage / Queue (Supabase; pgmq queue = no Inngest needed) ---
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# --- Engagement engine (commercial saliency only) ---
ENGINE_URL=http://localhost:8000
ENGAGEMENT_BACKEND=saliency     # commercial default
RESEARCH_MODE=false             # TRIBE R&D OFF
ENGINE_SHARED_SECRET=...        # REQUIRED — shared secret for apps/web ↔ services/engine auth (ledger L8)

# --- Webhooks (provider callbacks: BFL/Fal/Kling) ---
WEBHOOK_SIGNING_SECRET=...      # REQUIRED — verify inbound provider webhook signatures (ledger L8)

# --- App ---
APP_BASE_URL=http://localhost:3000
```

**Explicitly NOT needed for the happy path:** `KLING_*`, `ELEVENLABS_*`, `RUNWAY_API_KEY`, `HEYGEN_API_KEY`
(video/avatar); `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY`, `OPENAI_API_KEY`, `SEEDREAM_API_KEY` (image fallbacks —
the router falls back within BFL/Fal/Gemini); `INNGEST_*` (pgmq is default); `BRIA_API_KEY` (utilities via Fal).

> **Assumption flagged:** the engagement step in the happy path uses the **commercial saliency path** only, so
> no `facebook/tribev2` / HF token is needed. If the operator wants a live TRIBE demo, add `RESEARCH_MODE=true`
> **and** `ENGAGEMENT_BACKEND=tribe_research` **in a non-commercial build only** (CANON §9) — see doc 08.

---

## 6. Complete `.env.example` (canonical — copy verbatim into repo root)

```bash
# ============================================================================
# Brutal Ads — .env.example   (CANON §10 canonical env var names — DO NOT RENAME)
# ----------------------------------------------------------------------------
# Copy to `.env`, fill in secrets. NEVER commit `.env`. NEVER expose provider
# keys or SUPABASE_SERVICE_ROLE_KEY to the browser (no NEXT_PUBLIC_ mirror).
# Prices/slugs drift — VERIFY each service's docs before coding (see docs/11).
# REQUIRED = happy path needs it. OPTIONAL = feature-gated / has a fallback.
# ============================================================================

# ─── LLM / AGENTS (CANON §4) ────────────────────────────────────────────────
ANTHROPIC_API_KEY=                 # REQUIRED. Whole Creative Studio. console.anthropic.com

# ─── IMAGE PROVIDERS (CANON §6, docs/04) ────────────────────────────────────
BFL_API_KEY=                       # REQUIRED. Primary imagery (FLUX). dashboard.bfl.ai
BFL_REGION=                        # OPTIONAL. "eu" → api.eu.bfl.ai (GDPR / DE tenant); else global
FAL_KEY=                           # REQUIRED. Aggregator+fallback+Seedream+Bria utils. fal.ai
GEMINI_API_KEY=                    # REQUIRED. Nano Banana Pro edit + Veo video. aistudio.google.com/apikey
IDEOGRAM_API_KEY=                  # OPTIONAL. Fallback-only in-pixel text (⚑R-PROV1). ideogram.ai
RECRAFT_API_KEY=                   # OPTIONAL. Vector/SVG assets + fallback. recraft.ai/api
OPENAI_API_KEY=                    # OPTIONAL. GPT Image (gpt-image-1.5, ledger L4)/Mini diversity fallback. platform.openai.com
SEEDREAM_API_KEY=                  # OPTIONAL. Seedream 4.5 — sourced via FAL by default (⚑R-PROV2)

# ─── EDITOR + RENDER (⚑R-ENV1 — fills CANON §10 omission) ────────────────────
POLOTNO_API_KEY=                   # REQUIRED. Editor SDK + polotno-node render license. polotno.com/cabinet

# ─── VIDEO PROVIDERS (CANON §6 — fast-follow, not happy path) ────────────────
KLING_ACCESS_KEY=                  # OPTIONAL(v1). Kling video, JWT part 1. klingai.com dev console
KLING_SECRET_KEY=                  # OPTIONAL(v1). Kling video, JWT part 2 (sign token; server-only)
KLING_HOST=                        # OPTIONAL. Override host (default https://api.klingai.com) — VERIFY
RUNWAY_API_KEY=                    # OPTIONAL ⚑. Runway direct; default route via FAL. dev.runwayml.com
HEYGEN_API_KEY=                    # OPTIONAL ⚑ (post-MVP). Talking-head avatar. app.heygen.com
# (Veo 3.1 reuses GEMINI_API_KEY; Seedance reuses FAL_KEY — no separate vars.)

# ─── AUDIO PROVIDER (CANON §6 — fast-follow) ────────────────────────────────
ELEVENLABS_API_KEY=                # OPTIONAL(v1). VO/SFX/music. elevenlabs.io API keys
ELEVENLABS_VOICE_ID_DE=            # OPTIONAL(v1). German narrator voice id
ELEVENLABS_VOICE_ID_EN=            # OPTIONAL(v1). English narrator voice id
# Add more personas as needed, e.g. ELEVENLABS_VOICE_ID_DE_FEMALE=

# ─── UTILITIES (⚑ — default via FAL, key only if going direct) ──────────────
BRIA_API_KEY=                      # OPTIONAL ⚑. Bria direct (bg-remove/expand/relight). bria.ai

# ─── DATA / AUTH / STORAGE / QUEUE — SUPABASE (CANON §4) ─────────────────────
SUPABASE_URL=                      # REQUIRED. Project Settings → API
SUPABASE_ANON_KEY=                 # REQUIRED. Client-safe anon key
SUPABASE_SERVICE_ROLE_KEY=         # REQUIRED. SERVER-ONLY — bypasses RLS. NEVER ship to client
NEXT_PUBLIC_SUPABASE_URL=          # REQUIRED. = SUPABASE_URL (browser-exposed mirror)
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # REQUIRED. = SUPABASE_ANON_KEY (browser-exposed mirror)

# ─── ENGAGEMENT ENGINE (services/engine — CANON §9) ─────────────────────────
ENGINE_URL=http://localhost:8000   # REQUIRED. FastAPI engine base URL
ENGAGEMENT_BACKEND=saliency        # REQUIRED. "saliency" (commercial) | "tribe_research" (R&D only)
RESEARCH_MODE=false                # REQUIRED. TRIBE (CC-BY-NC) gate — MUST be false on commercial build
ENGINE_SHARED_SECRET=              # REQUIRED (ledger L8). Shared secret authenticating apps/web ↔ services/engine
RENDER_URL=                        # OPTIONAL (ledger L8). Only if packages/render runs as a separate container

# ─── WEBHOOKS (provider async callbacks: BFL / Fal / Kling) ─────────────────
WEBHOOK_SIGNING_SECRET=            # REQUIRED (ledger L8). Verify signatures on inbound provider webhooks

# ─── JOB QUEUE (⚑R-INFRA1 — pgmq default; Inngest optional adapter) ─────────
INNGEST_EVENT_KEY=                 # OPTIONAL. Only if using Inngest instead of Supabase Queues (pgmq)
INNGEST_SIGNING_KEY=               # OPTIONAL. Inngest webhook signing key — VERIFY exact name

# ─── APP ────────────────────────────────────────────────────────────────────
APP_BASE_URL=http://localhost:3000 # REQUIRED. Webhooks/callbacks/share links; validate at boot
```

> **`.gitignore` must contain** `.env`, `.env.local`, `.env*.local`, `services/engine/.env`. Only
> `.env.example` (this file, with empty values) is committed.

---

## 7. Secret hygiene & failure modes (do not skip)

1. **Server-only, never `NEXT_PUBLIC_`:** `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS → cross-tenant leak) and
   **every provider key** (BFL/Fal/Gemini/OpenAI/Kling/ElevenLabs/etc.). A leaked provider key = direct cost
   blowout; a leaked service-role key = total data breach. Provider calls happen **only** in server actions /
   route handlers / the engine — never in client components.
2. **`KLING_SECRET_KEY` signs JWTs** — treat like a private signing secret; mint short-lived tokens
   (`exp` +30 min) server-side per request (R2 §1.1). Never send the secret key itself in any request.
3. **Cost caps are pre-flight (CANON §4, R7 §7):** the orchestrator refuses jobs that would breach per-brief /
   per-workspace `cost_usd` caps. Env keys enable spend; the caps live in DB config, not env — but every key
   here can burn money, so set provider-side spend limits at signup too.
4. **License containment is a CI gate (CANON §9):** a build-time check must make TRIBE (CC-BY-NC) code paths
   unreachable when the commercial flag is set. `RESEARCH_MODE=false` + `ENGAGEMENT_BACKEND=saliency` is the
   runtime half; the CI check is the belt-and-suspenders half. This is the **highest-severity** failure mode
   (legal, not technical).
5. **Boot-time validation:** validate presence of all REQUIRED vars at process start (zod schema in
   `packages/shared`), and validate `APP_BASE_URL` is an absolute URL. Fail fast with a clear message naming the
   missing var. Also hit Anthropic Models API + BFL/Gemini reachability on boot to catch retired model ids
   (R7 §7 model-drift resilience).
6. **Model ids are config, not env, not hardcode:** concrete slugs (`flux-2-pro`, `gemini-3-pro-image`,
   `kling-v2-5-turbo`, `eleven_multilingual_v2`, `claude-sonnet-5`) live in a config table so they can be
   rotated when providers deprecate them (R1 §1, R2 §8, R7 §7).

---

## 8. Consolidated "VERIFY before coding" checklist (env/keys specific)

1. **Which client keys are live** — confirm BFL, Fal, Ideogram, Recraft, Kling, ElevenLabs, Gemini with the
   operator; confirm each has a spend cap set provider-side.
2. **Anthropic** — current model ids + intro-pricing window (Sonnet 5 intro may expire) — platform.claude.com.
3. **BFL** — key header is `x-key` (not Bearer); EU host `api.eu.bfl.ai` for the DE tenant (`BFL_REGION=eu`).
4. **Gemini** — `x-goog-api-key` header; same key powers both `gemini` image and `veo` video drivers.
5. **Polotno** — license activation flow + current price tier ($899/mo?) at polotno.com/sdk/pricing (⚑R-ENV1).
6. **Kling** — `KLING_ACCESS_KEY`/`KLING_SECRET_KEY` → JWT HS256; confirm host (`api.klingai.com` vs region).
7. **ElevenLabs** — `xi-api-key` header; capture voice IDs per language; Music API commercial license for ads.
8. **Supabase** — three keys from Project Settings → API; service-role is server-only; pgmq for queue.
9. **Inngest** — exact key names (`INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`) — only if not using pgmq.
10. **Runway / Bria / HeyGen** — confirm whether reaching direct (own key) or via Fal (reuse `FAL_KEY`); default
    is via Fal for Runway/Bria, direct for HeyGen.
11. **Remotion Company License** — required for 4+ people; budget line item, not a runtime key (R2 §5.3).
12. **Seedream** — `SEEDREAM_API_KEY` points at Fal by default (⚑R-PROV2); the var is source-agnostic.

---

## Sources
- CANON §10 (canonical env var names) — `CANON.md`.
- R1 (image models: signup URLs, pricing, headers) — `research/R1-image-models.md` §2–§10, §11.
- R2 (Kling JWT, ElevenLabs, Veo, Runway, HeyGen, Remotion license) — `research/R2-video-audio.md` §1, §3–§5, §8.
- R7 (Supabase, pgmq vs Inngest, engine flags, Polotno ⚑R-ENV1, failure-mode table §7) — `research/R7-blank-slate-arch.md` §7, §8.
- doc 04 (driver `id` ↔ credential map, Runway-via-fal, Bria) — `docs/04-provider-integrations.md` §0, §7.
- doc 06 (`POLOTNO_API_KEY` license activation) — `docs/06-editor-and-compositor.md` A3, §2.
