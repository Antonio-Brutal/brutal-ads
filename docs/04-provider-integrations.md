# 04 — Provider Integrations

> **Read `CANON.md` first.** This document implements **CANON §6** (provider contracts),
> and conforms to CANON §4 (locked stack), §5 (object model — `Asset`, `Render`, `GenerationJob`,
> `Variant` lineage), and §10 (env var names). All interface names, env var names, and object-model
> names here are **canonical** — never rename them.
>
> **Grounding research:** `research/R1-image-models.md` (image landscape + routing), `research/R2-video-audio.md`
> (video/audio/assembly), `research/R7-blank-slate-arch.md` (`ProviderBus`, caching, cost caps, moderation).
>
> **⚠️ EVERY external API in this document carries a `VERIFY current docs before coding` note.** These APIs
> drifted materially between the CANON snapshot and mid-2026 research (see R1 §1, R2 §8). **Model slugs,
> endpoint paths, pricing, and field names in this doc are the best-verified values as of July 2026 — treat
> them as defaults to confirm, not as immutable constants.** Store the *resolved* model slug and cost in
> `Variant` lineage and `GenResult`, never hardcode a price in business logic.
>
> **Scope of this document:** the concrete `ImageProvider` / `VideoProvider` / `AudioProvider` drivers, the
> `ProviderBus` router policy tables, cost accounting, error/moderation handling, caching, and the
> `GenerationJob` lifecycle. The **agent loop** that *calls* the bus is in `docs/06`; the **object model / DB
> schema** (`Asset`, `Render`, `GenerationJob`, `Variant`) is in `docs/03`; **engagement prediction**
> (`EngagementPredictor`) is in `docs/08`. This doc references those but does not redefine them.

---

## 0. TL;DR — what to build

Implement, behind the CANON §6 interfaces, these drivers and register them by `id` in a driver registry:

| Modality | Driver `id` | Wraps | Env credential | Primary role |
|---|---|---|---|---|
| image | `bfl` | Black Forest Labs direct API (FLUX.2 / FLUX.1 Kontext / FLUX Tools) | `BFL_API_KEY` | **Primary** hero/background + carousel continuity + FLUX edit |
| image | `fal` | fal.run queue gateway (Seedream, Recraft, Luma, Reve, Bria utils, FLUX fallback) | `FAL_KEY` | **Aggregator / fallback fabric** + non-FLUX models + utilities |
| image | `gemini` | Google Gemini image ("Nano Banana Pro") | `GEMINI_API_KEY` | **Primary** brand-consistent edit + multi-ref compose |
| image | `ideogram` | Ideogram 3.0 direct | `IDEOGRAM_API_KEY` | Fallback-only: rare in-pixel text (see ⚑ below) |
| image | `recraft` | Recraft V3 direct | `RECRAFT_API_KEY` | Fallback-only + **true SVG vector** assets |
| image | `openai` | OpenAI GPT Image (1.5 / 2 / Mini) | `OPENAI_API_KEY` | Diversity / A-B variety fallback |
| image | `seedream` | Seedream 4.5 — **sourced via `fal`** (⚑ R-PROV2) | `SEEDREAM_API_KEY` | Cost-optimized 4K / look variety |
| video | `kling` | Kling official Kuaishou platform (JWT HS256) | `KLING_ACCESS_KEY` + `KLING_SECRET_KEY` | **Primary** video (i2v default, Omni for faces) |
| video | `seedance` | Seedance 2.0 — via `fal` | `FAL_KEY` | Fallback / cheap b-roll |
| video | `veo` | Google Veo 3.1 | `GEMINI_API_KEY` | Only when real in-frame audio/dialogue required |
| video | `runway` | Runway Gen-4 Turbo / Aleph 2.0 | `RUNWAY_API_KEY` (⚑ new — see §7.4) | Premium motion fallback |
| audio | `elevenlabs` | ElevenLabs TTS + SFX + Music | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_*` | **Primary** VO / SFX / music bed |

> **⚑ R-PROV1 (RECOMMENDATION, from R1 §9 / R7 §5.3):** `ideogram` and `recraft` are **fallback-only for image
> *generation*.** Their superpower is in-pixel text, which the layer-tree architecture (CANON §2) deliberately
> avoids — routing to them reintroduces baked text (the exact prior pain). Keep both wired (CANON §4 lists them),
> but they must almost never win the router for a normal ad. `recraft` stays first-class **only** for genuine
> **vector** assets (icons/brand marks that drop into the Polotno tree).

> **⚑ R-AVATAR1 (RECOMMENDATION, from R2 §3/§7):** Talking-head / UGC avatar (HeyGen, Creatify, Arcads) is a
> distinct job type not enumerated in CANON §6. Add a thin **`AvatarProvider`** shape (or a `VideoProvider`
> with `params.kind:'avatar'`). It is a strong LinkedIn B2B format worth first-classing. **Post-MVP fast-follow**
> — see §7.5. Do NOT block the P9 video milestone on it.

**Golden rule (CANON §2, all imagery jobs):** the image/video model **generates imagery only** — never legible
text. Headlines, CTAs, logos, legal, prices, slide copy are **composited layers** (Polotno for static/carousel,
Remotion React layers for video). Every generation prompt is imagery-only; text never enters `GenSpec.prompt`.

---

## 1. Canonical contracts (CANON §6 — verbatim, do not diverge)

These live in `packages/shared/src/providers.ts` as TypeScript types + matching zod schemas. Reproduced from
CANON §6 for the builder; **the CANON text is authoritative** if anything below differs.

```ts
// packages/shared/src/providers.ts
export type Modality = 'image' | 'video' | 'audio';

export type Aspect = '1:1' | '1.91:1' | '4:5' | '16:9' | '9:16';

export interface AssetRef {
  assetId: string;          // FK → Asset row (CANON §5)
  url: string;              // resolvable URL (Supabase/R2) or data URI for inline refs
  role?: 'style' | 'subject' | 'product' | 'logo' | 'start_frame' | 'end_frame' | 'character';
  mime?: string;
}

export interface GenSpec {
  prompt: string;                        // IMAGERY-ONLY (CANON §2)
  negativePrompt?: string;
  aspect: Aspect;
  seed?: number;                         // deterministic → stored in lineage
  refs?: AssetRef[];
  model?: string;                        // concrete provider slug (e.g. 'flux-2-pro')
  params?: Record<string, unknown>;      // provider-specific passthrough
}

export interface GenResult {
  assetId: string;    // Asset persisted to Supabase/R2 (NOT the provider's ephemeral URL)
  width: number;
  height: number;
  provider: string;   // driver id: 'bfl' | 'fal' | ...
  model: string;      // resolved model slug
  seed?: number;
  costUsd: number;    // RESOLVED per-generation cost (see §9)
  raw: unknown;       // full provider response for audit/debug (redacted of secrets)
}

// Edit / upscale specs (referenced by ImageProvider optional methods)
export interface EditSpec extends GenSpec {
  baseAsset: AssetRef;        // image to edit
  mask?: AssetRef;            // optional inpaint mask
  instruction?: string;       // natural-language edit instruction (instruct-edit models)
}
export interface UpscaleSpec { baseAsset: AssetRef; factor: 2 | 4; model?: string; }

export interface ImageProvider {
  id: string;
  generate(s: GenSpec): Promise<GenResult>;
  edit?(s: EditSpec): Promise<GenResult>;
  upscale?(s: UpscaleSpec): Promise<GenResult>;
}

export interface VideoGenSpec extends GenSpec {
  durationSec?: number;               // clip length; provider clamps to supported set
  startFrame?: AssetRef;              // i2v (Brutal default)
  endFrame?: AssetRef;               // optional tail frame
  cfgScale?: number;                 // prompt adherence 0..1 (Kling)
  cameraControl?: Record<string, unknown>;
}
export interface VideoProvider { id: string; generate(s: VideoGenSpec): Promise<GenResult>; }

export interface TtsSpec {
  text: string;                      // TTS-normalized (DE numbers pre-spelled — CANON §7, R2 §4.4)
  voiceId: string;                   // ELEVENLABS_VOICE_ID_* value
  model?: string;                    // 'eleven_multilingual_v2' default
  languageCode?: string;             // ISO-639-1, enforces language
  seed?: number;
  voiceSettings?: Record<string, unknown>;
  withTimestamps?: boolean;          // → word-level timing for burned-in captions
}
export interface AudioProvider {
  id: string;
  tts(s: TtsSpec): Promise<GenResult>;
  sfx?(s: { text: string; durationSec?: number }): Promise<GenResult>;
  music?(s: { prompt: string; durationSec?: number; plan?: unknown }): Promise<GenResult>;
}

export interface ProviderBus {
  image(job: JobDescriptor): ImageProvider;
  video(job: JobDescriptor): VideoProvider;
  audio(job: JobDescriptor): AudioProvider;
  predictor(job: JobDescriptor): EngagementPredictor;  // → docs/08
}
```

`JobDescriptor` (the routing key — Brutal-specific, additive to CANON, used only by the bus):

```ts
export interface JobDescriptor {
  modality: Modality;
  kind: ImageJobKind | VideoJobKind | AudioJobKind;   // §5 policy tables
  aspect: Aspect;
  workspaceId: string;
  briefId?: string;
  overrideDriverId?: string;   // manual override ALWAYS wins (CANON §4)
  overrideModel?: string;      // pin a specific model slug
  budgetRemainingUsd?: number; // from cost cap check (§9) — bus may down-tier
}
```

> **Assumption (flagged):** `EditSpec`, `UpscaleSpec`, `VideoGenSpec`, `TtsSpec`, `JobDescriptor`, `ImageJobKind`,
> `VideoJobKind`, `AudioJobKind` are **not spelled out in CANON §6** (which gives only the top-level interface
> signatures). They are defined here as the concrete shapes the CANON-named optional methods (`edit?`,
> `upscale?`, `tts`, etc.) consume. Their field names are a build decision; if `docs/03` (object model) or
> `docs/06` (agents) specifies different field names, **those docs win** for the shared package. Cross-doc note
> repeated in the closing section.

---

## 2. Shared driver plumbing (build once, reuse for every provider)

Every driver is thin; the shared machinery does the heavy lifting. Build these in
`apps/web/src/server/providers/_shared/` (Next.js server-only) — **never import into client bundles** (they
hold service credentials).

### 2.1 The async job lifecycle (CANON §4 — "generation is async")

All generation providers here are **create → poll (or webhook) → download → persist**. Never block a request
thread on a multi-minute poll. The canonical flow:

```
enqueue GenerationJob (status=queued)                          ← docs/03 job queue (pgmq default; Inngest adapter)
  → worker picks up → ProviderBus.<modality>(job) → driver
  → driver.create()      → { providerTaskId, pollUrl | webhook }   status=running
  → poll OR webhook       → provider signed URL (SHORT TTL — download NOW)
  → persistAsset(url)     → Supabase Storage / R2 → Asset row      (CANON §5)
  → computeCost()         → GenResult.costUsd                       (§9)
  → cache.put(key, Asset) → status=succeeded ; emit progress event  (UI subscribes)
```

> **⚠️ Provider result URLs are ephemeral.** BFL signed URLs live **~10 min** (R1 §2); Kling/fal/Veo URLs also
> expire. **Download and re-host to Supabase/R2 immediately** inside the driver; store the R2/Supabase URL in
> `Asset`, never the provider URL. This is non-negotiable (CANON §4 "assets" + R1 §2).

### 2.2 `httpJson` — one HTTP helper with retry/backoff

```ts
// _shared/http.ts
export interface HttpOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;          // default 60_000
  retries?: number;            // default 4, exponential backoff on 429/5xx
  idempotencyKey?: string;     // where the provider supports it
}

export async function httpJson<T>(url: string, opts: HttpOpts = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, timeoutMs = 60_000, retries = 4 } = opts;
  let attempt = 0;
  // exponential backoff: 0.5s, 1s, 2s, 4s (+ full jitter); honor Retry-After header
  while (true) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method, signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
      });
      clearTimeout(t);
      if (res.status === 429 || res.status >= 500) {
        if (attempt++ >= retries) throw await ProviderError.fromResponse(res);
        const ra = Number(res.headers.get('retry-after'));
        await sleep(Number.isFinite(ra) ? ra * 1000 : backoff(attempt));
        continue;
      }
      if (!res.ok) throw await ProviderError.fromResponse(res);   // 4xx → classify (§3)
      return (await res.json()) as T;
    } catch (e) {
      clearTimeout(t);
      if (e instanceof ProviderError) throw e;                   // do not retry classified 4xx
      if (attempt++ >= retries) throw ProviderError.network(e);   // network/timeout
      await sleep(backoff(attempt));
    }
  }
}
```

### 2.3 `pollUntil` — generic task poller

```ts
// _shared/poll.ts  — used by BFL, fal, Kling, Veo, Runway (all task-based)
export async function pollUntil<T>(
  fetchStatus: () => Promise<{ done: boolean; failed: boolean; value?: T; reason?: string }>,
  opts: { intervalMs?: number; maxMs?: number } = {},
): Promise<T> {
  const intervalMs = opts.intervalMs ?? 4000;     // 3–5s typical (R1/R2)
  const maxMs = opts.maxMs ?? 8 * 60_000;         // 8 min hard cap; video may need more
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const s = await fetchStatus();
    if (s.failed) throw ProviderError.providerFailed(s.reason ?? 'task failed');
    if (s.done && s.value !== undefined) return s.value;
    await sleep(intervalMs);
  }
  throw ProviderError.timeout(`poll exceeded ${maxMs}ms`);
}
```

> **Prefer webhooks over polling in production.** BFL (`webhook_url`), fal (`?fal_webhook=`), Kling
> (`callback_url`), Veo (long-running op) all support async callbacks. In the pgmq/Edge-Function model
> (R7 §6), the Edge Function enqueues + the webhook handler resolves the job; poll only as fallback. Route:
> `apps/web/src/app/api/webhooks/{bfl,fal,kling}/route.ts`. **⚠️ VERIFY** each provider's webhook signature
> mechanism before trusting payloads (§3.4).

### 2.4 `persistAsset` — download + re-host + Asset row

```ts
// _shared/persist.ts
export async function persistAsset(input: {
  providerUrl?: string;          // ephemeral signed URL
  bytes?: Uint8Array;            // OR raw bytes (audio, base64-decoded images)
  mime: string;
  workspaceId: string;
  provider: string; model: string; seed?: number;
  raw: unknown;
}): Promise<{ assetId: string; url: string; width: number; height: number }> {
  // 1. fetch bytes (if providerUrl) — with retry, since URLs die fast
  // 2. probe dimensions (image: sharp/ffprobe; video: ffprobe) → width/height/duration
  // 3. upload to Supabase Storage bucket `assets/{workspaceId}/{uuid}.{ext}` (RLS by workspace_id)
  // 4. insert Asset row (CANON §5) with provider/model/seed/mime/bytes/checksum + redacted raw
  // 5. return { assetId, url (public/signed), width, height }
}
```

> **Storage decision (CANON §4 "Supabase/R2"):** default to **Supabase Storage** (RLS-native, same stack).
> Use **R2** for high-volume/large video where egress cost matters. Keep a `StorageAdapter` so it is swappable.
> Bucket paths are **always** namespaced by `workspace_id` for multi-tenant isolation (RLS).

### 2.5 The cache (CANON §4 — the anti-re-roll lever)

```ts
// _shared/cache.ts  — cache lives INSIDE the bus (R7 §1.2)
export function cacheKey(provider: string, model: string, version: string,
                         prompt: string, seed: number | undefined, params: unknown): string {
  // stable SHA-256 over canonicalized inputs. Text is NEVER in the prompt (CANON §2),
  // so prompts are stable across copy edits → identical requests are FREE.
  return sha256(canonicalJson({ provider, model, version, prompt, seed: seed ?? null, params }));
}
```

- Store `cache_key → asset_id` in a `generation_cache` table (or `GenerationJob` lookup by key).
- **On cache hit: `costUsd = 0`**, `raw.cached = true`, return the existing `Asset`. No provider call.
- `version` = the resolved provider model *version* string (from lineage), so a model upgrade busts the cache.

### 2.6 Cost accounting hooks (§9 details the tables)

Every driver returns `GenResult.costUsd` = the **resolved** cost of *this* call (0 on cache hit). The worker
writes it to `GenerationJob.cost_usd` and increments per-brief / per-workspace spend counters **before**
marking success. The orchestrator refuses to start a job that would breach a hard cap (CANON §4) — see §9.3.

---

## 3. Error, moderation & failure taxonomy (shared, all providers)

CANON §4: *"content-moderation surface on gen failures."* R7 §4: *"never a raw model failure in the UI; every
provider call has a fallback chain; on exhaustion the UI explains, not swallows."* This section defines the
single error model every driver maps into.

### 3.1 `ProviderError` classes

```ts
// _shared/errors.ts
export type ProviderErrorCode =
  | 'auth'             // 401/403 bad or missing key → NOT retryable, alert ops
  | 'rate_limit'      // 429 → retry w/ backoff, then fallback driver
  | 'quota'           // out of credits/balance → fallback + alert (no retry)
  | 'moderation'      // content blocked by provider safety → surface reason, do NOT retry same prompt
  | 'invalid_request' // 400 bad params → bug; do NOT retry, log for dev
  | 'provider_failed' // task returned failed/error status
  | 'timeout'         // poll/HTTP timeout → retry then fallback
  | 'network'         // fetch/DNS/connection → retry then fallback
  | 'unknown';

export class ProviderError extends Error {
  constructor(
    public code: ProviderErrorCode,
    message: string,
    public opts: { retryable: boolean; provider?: string; httpStatus?: number;
                   providerCode?: string; raw?: unknown } = { retryable: false },
  ) { super(message); }
  static async fromResponse(res: Response): Promise<ProviderError> { /* map status+body → code */ }
  static network(e: unknown) { return new ProviderError('network', String(e), { retryable: true }); }
  static timeout(m: string) { return new ProviderError('timeout', m, { retryable: true }); }
  static providerFailed(m: string) { return new ProviderError('provider_failed', m, { retryable: false }); }
}
```

### 3.2 Router behavior per code (the fallback chain — R7 §4)

| Code | Retry same driver? | Fall back to next ranked driver? | Surface to user | Ops alert |
|---|---|---|---|---|
| `auth` | ❌ | ❌ (all our-key errors) | "Service misconfigured" (generic) | ✅ **page** |
| `rate_limit` | ✅ (backoff) | ✅ after retries exhausted | silent (retried) | warn if sustained |
| `quota` | ❌ | ✅ | silent (fell back) | ✅ (top up) |
| `moderation` | ❌ | ⚠️ **only if a different model may pass**; else surface | ✅ **explain** (see §3.3) | log |
| `invalid_request` | ❌ | ❌ | "Something went wrong" | ✅ (dev bug) |
| `provider_failed` | 1× | ✅ | silent (fell back) | warn |
| `timeout` / `network` | ✅ | ✅ | silent (retried/fell back) | warn if sustained |
| all exhausted | — | — | ✅ **explain** + offer manual retry | ✅ |

> **Moderation nuance:** a `moderation` block usually reflects the *prompt/refs*, not the provider — so blindly
> falling back to another model often re-blocks. Policy: on `moderation`, **do not silently re-roll the same
> prompt**; surface the provider's reason to the `EngagementAnalyst`/UI and let the human or an agent revise
> (CANON §4 moderation surface). Exception: if the block is model-idiosyncratic (e.g. one model over-blocks a
> benign business scene), the router MAY try the next driver once, tagged `moderation_fallback`.

### 3.3 Moderation surface (CANON §4)

Every gen failure with `code='moderation'` records a `ModerationEvent` (on `GenerationJob`, or a dedicated
table — see `docs/03`):

```jsonc
{
  "jobId": "…", "variantId": "…",
  "provider": "bfl", "model": "flux-2-pro",
  "reason": "safety_tolerance exceeded",   // provider-reported, normalized
  "providerCode": "content_moderated",     // raw code
  "promptRedacted": "editorial documentary photo, …",  // imagery-only prompt (no PII)
  "action": "surfaced_to_user",            // surfaced_to_user | moderation_fallback | auto_revise
  "createdAt": "…"
}
```

The UI shows: *"This image was blocked by the generator's safety filter (reason: …). Try adjusting the visual
description."* — never a raw stack trace, never a silent empty tile (R7 §4 "empty board" anti-pattern).

### 3.4 Per-provider moderation signals (⚠️ VERIFY each)

| Provider | Moderation control / signal | Notes |
|---|---|---|
| BFL | `safety_tolerance` (0=strict … 6=permissive) on create; blocked → status/result flags content moderated | ⚠️ VERIFY current tolerance scale + moderated-status shape at docs.bfl.ai |
| fal | model-dependent; some return `nsfw`/`content_policy` in result; HTTP 422/400 on policy | ⚠️ VERIFY per model page |
| Gemini image | `promptFeedback.blockReason` / `finishReason: SAFETY`; safety settings configurable | ⚠️ VERIFY block-reason fields on the image endpoint |
| OpenAI GPT Image | `moderation` param (`low`/`auto`); 400 with `error.code` on policy | ⚠️ VERIFY moderation param + error codes |
| Ideogram | policy rejection in response / 4xx | ⚠️ VERIFY |
| Kling | task `failed` with `task_status_msg` (risk/blocked); **failed tasks don't consume credits** | ⚠️ VERIFY msg codes |
| Veo | `raiMediaFilteredCount` / RAI filter reasons; `personGeneration` region rules | ⚠️ VERIFY RAI fields + region policy |
| ElevenLabs | mostly length/format 4xx; little content moderation on TTS | — |

---

## 4. IMAGE PROVIDERS

> Common to all image drivers: they satisfy `ImageProvider` (§1). `generate()` is required; `edit()` /
> `upscale()` where the provider supports it. All return a `GenResult` whose `assetId` points at a **re-hosted**
> Asset (§2.4), whose `costUsd` is **resolved** (§9), and whose `raw` is the redacted provider response.
> LinkedIn ratios come from CANON §8; prefer generating **at or above** target then smart re-layout, not crop
> (R1 §7).

### 4.1 `bfl` — Black Forest Labs direct (FLUX.2 / Kontext / Tools) — **PRIMARY**

> **⚠️ VERIFY current docs before coding:** `docs.bfl.ai` (FLUX.2 overview) + `api.bfl.ai/openapi.json`.
> Confirm: (1) endpoint slug `*-preview` vs stable `flux-2-pro`; (2) `aspect_ratio` enum vs `width`/`height`
> for the three LinkedIn ratios; (3) webhook signature mechanism; (4) MP-metered exact per-image cost; (5)
> commercial license tier + EU host for GDPR. (R1 §2, §11.)

**Base URL:** `https://api.bfl.ai` (global routing + auto-failover). Regional: `https://api.eu.bfl.ai`
(**use for the DE law-firm tenant — GDPR**), `https://api.us.bfl.ai`. **Auth header:** `x-key: ${BFL_API_KEY}`
— **not** `Authorization: Bearer`. **Concurrency:** ~24 active tasks; `flux-kontext-max` = 6. Backoff on 429.

**Model slugs & pricing (⚠️ VERIFY — MP-metered pricing means a 1200×1200 (1.44 MP) costs above the floor):**

| Purpose | Slug (`POST /v1/{slug}`) | Price (indicative) | Notes |
|---|---|---|---|
| **Hero / background (default)** | `flux-2-pro` (or `flux-2-pro-preview`) | from **$0.03/MP** | MP-metered; ref-image input ~$0.015/MP |
| Finals (highest fidelity) | `flux-2-max` / `flux-2-max-preview` | from **$0.07** first MP (+$0.03/MP) | reserve for approved finals |
| Tunable | `flux-2-flex` / `-preview` | from **$0.05** | steps/guidance control |
| Cheap draft | `flux-2-klein-9b-preview` / `-4b-preview` | from **$0.015 / $0.014** | board thumbnails |
| Legacy fallback | `flux-1-1-pro` / `flux-1-1-pro-ultra` | **$0.04 / $0.06** (fixed credits) | stable, cheap |
| **Instruct-edit** | `flux-kontext-pro` / `flux-kontext-max` | **$0.04 / $0.08** | `edit()` path; deterministic seed |
| Inpaint/outpaint | `flux-pro-1.0-fill` / `flux-pro-1.0-expand` (⚠️ VERIFY slugs) | varies | `upscale?()`/expand utilities |

**Create → poll skeleton:**

```bash
# CREATE
curl -X POST 'https://api.bfl.ai/v1/flux-2-pro' \
  -H 'accept: application/json' -H "x-key: ${BFL_API_KEY}" -H 'Content-Type: application/json' \
  -d '{ "prompt":"editorial documentary photo, muted dark palette, imagery only",
        "aspect_ratio":"1:1", "width":1440, "height":1440,   // ⚠️ VERIFY enum vs px
        "seed":12345, "output_format":"png", "safety_tolerance":2,
        "webhook_url":"https://app…/api/webhooks/bfl", "webhook_secret":"…" }'
# → { "id":"…", "polling_url":"https://api.bfl.ai/v1/get_result?id=…" }

# POLL
curl -X GET "${polling_url}" -H "x-key: ${BFL_API_KEY}"
# → { "id":"…","status":"Ready","result":{ "sample":"https://signed-url… (≈10 min TTL)" } }
```

`status` ∈ `Pending | Ready | Error | ...` (⚠️ VERIFY enum). On `Ready`, **download `result.sample` immediately**
(§2.4). LinkedIn `1.91:1` / `4:5` likely need explicit `width`/`height` (⚠️ VERIFY aspect enum).

**Driver skeleton:**

```ts
// providers/image/bfl.ts
export function makeBflDriver(env: Env): ImageProvider {
  const base = env.BFL_REGION === 'eu' ? 'https://api.eu.bfl.ai' : 'https://api.bfl.ai';
  const headers = { 'x-key': env.BFL_API_KEY };

  async function run(slug: string, body: Record<string, unknown>, seed?: number): Promise<GenResult> {
    const create = await httpJson<{ id: string; polling_url: string }>(
      `${base}/v1/${slug}`, { method: 'POST', headers, body });
    const result = await pollUntil<{ sample: string }>(async () => {
      const r = await httpJson<{ status: string; result?: { sample: string } }>(
        create.polling_url, { headers });
      if (r.status === 'Error') return { done: false, failed: true, reason: 'bfl error' };
      // ⚠️ VERIFY 'Content Moderated'/'Request Moderated' status strings → throw moderation
      return { done: r.status === 'Ready', failed: false, value: r.result };
    });
    const asset = await persistAsset({ providerUrl: result.sample, mime: 'image/png',
      workspaceId: body._workspaceId as string, provider: 'bfl', model: slug, seed, raw: result });
    return { assetId: asset.assetId, width: asset.width, height: asset.height,
      provider: 'bfl', model: slug, seed, costUsd: costBfl(slug, asset.width, asset.height), raw: result };
  }

  return {
    id: 'bfl',
    generate: (s) => run(s.model ?? 'flux-2-pro', toBflBody(s), s.seed),
    edit:     (s) => run(s.model ?? 'flux-kontext-pro', toBflEditBody(s), s.seed),   // Kontext instruct-edit
    upscale:  (s) => run('flux-1-1-pro-ultra', toBflUpscaleBody(s)),                 // ⚠️ VERIFY upscale path
  };
}
```

**License (⚠️ VERIFY):** BFL "Professional"/commercial output license → permissive commercial use. Confirm the
Brutal tenant's required tier + that EU host meets GDPR for the DE tenant (R1 §2.4).

### 4.2 `fal` — fal.run queue gateway (aggregator + fallback) — **AGGREGATOR**

> **⚠️ VERIFY current docs before coding:** `fal.ai/docs/model-apis/queue` + each model's page. Confirm the
> `?fal_webhook=` param, status/result URL patterns, and per-model prices. (R1 §3, §11.)

**Queue base:** `https://queue.fal.run/{model_id}` (sync alt: `https://fal.run/{model_id}`).
**Auth header:** `Authorization: Key ${FAL_KEY}`. **Uniform async pattern (all fal models):**

```
1. POST https://queue.fal.run/{model_id}            → { request_id, status:"IN_QUEUE", status_url, response_url }
2. GET  {status_url}                                → IN_QUEUE | IN_PROGRESS | COMPLETED
3. GET  {response_url}                               → { images:[{url,width,height}], … }
   webhook: append ?fal_webhook=https://app…/api/webhooks/fal to the POST  (⚠️ VERIFY)
   queue wait is FREE; billed only for inference work
```

**Model IDs handled by this driver (⚠️ VERIFY slugs + prices per live model page):**

| Purpose | `model_id` | Price (indicative) |
|---|---|---|
| Seedream 4.5 t2v/edit (routed here for `seedream`) | `fal-ai/bytedance/seedream/v4.5/text-to-image`, `.../v4.5/edit` | **$0.04**/img |
| Recraft V3 raster (fallback) | `fal-ai/recraft/v3/text-to-image` | raster **$0.04** (SVG → §4.5 direct) |
| Luma Photon / Flash (cheap draft) | `fal-ai/luma-photon`, `fal-ai/luma-photon/flash` | **$0.015 / $0.002** |
| Reve | `fal-ai/…reve…` | from **$0.04** |
| FLUX fallback (BFL down) | `fal-ai/flux-2-pro/edit`, `fal-ai/flux-pro/kontext`, `.../kontext/max` | mirrors BFL ~$0.04/$0.08 |
| **Utilities:** bg-remove | `fal-ai/bria/background/remove` | **$0.018** |
| Utilities: expand/outpaint | `fal-ai/bria/…/expand` | **$0.023** |
| Utilities: erase | `fal-ai/flux-pro/v1/erase` | varies |

**Driver skeleton (single generic path handles every fal model):**

```ts
// providers/image/fal.ts
export function makeFalDriver(env: Env): ImageProvider {
  const headers = { 'Authorization': `Key ${env.FAL_KEY}` };

  async function submit(modelId: string, input: Record<string, unknown>,
                        workspaceId: string, seed?: number): Promise<GenResult> {
    const q = await httpJson<{ request_id: string; status_url: string; response_url: string }>(
      `https://queue.fal.run/${modelId}`, { method: 'POST', headers, body: input });
    const out = await pollUntil<{ images: { url: string; width: number; height: number }[] }>(async () => {
      const s = await httpJson<{ status: string }>(q.status_url, { headers });
      if (s.status === 'COMPLETED')
        return { done: true, failed: false, value: await httpJson(q.response_url, { headers }) };
      // ⚠️ VERIFY fal failure/nsfw status → throw moderation/provider_failed
      return { done: false, failed: false };
    });
    const img = out.images[0];
    const asset = await persistAsset({ providerUrl: img.url, mime: 'image/webp',
      workspaceId, provider: 'fal', model: modelId, seed, raw: out });
    return { assetId: asset.assetId, width: img.width, height: img.height,
      provider: 'fal', model: modelId, seed, costUsd: costFal(modelId), raw: out };
  }

  return {
    id: 'fal',
    generate: (s) => submit(s.model!, toFalInput(s), wsOf(s), s.seed),      // s.model = full fal_id
    edit:     (s) => submit(editModelId(s), toFalEditInput(s), wsOf(s), s.seed),
    upscale:  (s) => submit('fal-ai/bria/…/expand', toFalUpscaleInput(s), wsOf(s)),  // ⚠️ VERIFY upscale id
  };
}
```

> **`seedream` driver = a thin alias over `fal`** (⚑ R-PROV2, R1 §10). It holds `SEEDREAM_API_KEY` as the
> *credential name* but sources Seedream through the fal gateway by default (one queue/webhook pattern). If a
> direct **BytePlus ModelArk** contract is cheaper at volume, swap the driver internals; keep `id:'seedream'`
> and the env var name (CANON §10). ModelArk base + auth: ⚠️ VERIFY at `docs.byteplus.com`.

### 4.3 `gemini` — Google Gemini image ("Nano Banana Pro") — **PRIMARY edit / compose**

> **⚠️ VERIFY current docs before coding:** `ai.google.dev/gemini-api/docs/image-generation`. Confirm: (1)
> endpoint — new `…/v1beta/interactions` vs legacy `…/v1beta/models/{model}:generateContent`; (2) GA slug
> (`gemini-3-pro-image` — **preview `-preview` slugs shut down 2026-06-25**, R7 §5.4); (3) `imageConfig`
> aspect/size keys; (4) price/token math. (R1 §5, §11.)

**Base URL:** `https://generativelanguage.googleapis.com`. **Auth header:** `x-goog-api-key: ${GEMINI_API_KEY}`
(⚠️ VERIFY vs `?key=`). **Capability:** best instruct-edit + **up to 14 reference images** for character/subject
consistency and multi-image composition. **Also used for Veo** (§7.3) under the same key.

| Model slug | 1K/2K price | Use |
|---|---|---|
| `gemini-3-pro-image` (Nano Banana Pro) | 1K/2K ≈ **$0.134**, 4K ≈ **$0.24** (Batch ½) | quality edit / 14-ref compose |
| `gemini-3.1-flash-image` | 1K ≈ **$0.067** | workhorse edit (cheaper) |
| `gemini-3.1-flash-lite-image` | cheapest | fast draft edits |

**Request skeleton (legacy `generateContent` form — ⚠️ VERIFY vs `interactions`):**

```http
POST /v1beta/models/gemini-3-pro-image:generateContent
Host: generativelanguage.googleapis.com
x-goog-api-key: ${GEMINI_API_KEY}
Content-Type: application/json

{ "contents":[{"parts":[
    {"text":"imagery only: place the product on a muted desk, editorial lighting"},
    {"inline_data":{"mime_type":"image/png","data":"<base64 ref>"}}   // up to 14 refs
  ]}],
  "generationConfig":{ "imageConfig":{ "aspectRatio":"1:1", "imageSize":"2K" } } }   // ⚠️ VERIFY keys
```

Response returns image bytes inline (base64) in `candidates[].content.parts[].inline_data.data` (⚠️ VERIFY) →
decode → `persistAsset({ bytes })`. Check `promptFeedback.blockReason` / `finishReason:SAFETY` → `moderation`.

**Driver:** `generate()` = text-only parts; `edit()` = base image + instruction + refs. Do **not** rely on the
free tier for production (R1 §5).

### 4.4 `ideogram` — Ideogram 3.0 (fallback-only, rare in-pixel text)

> **⚠️ VERIFY current docs before coding:** `developer.ideogram.ai`. Confirm JSON vs multipart form-data
> (multipart only when sending reference files). (R1 §4.1, §11.) **⚑ R-PROV1: fallback-only.**

**Base URL:** `https://api.ideogram.ai/v1`. **Auth header:** `Api-Key: ${IDEOGRAM_API_KEY}`.
**Generate:** `POST /v1/ideogram-v3/generate`.

```http
POST /v1/ideogram-v3/generate
Host: api.ideogram.ai
Api-Key: ${IDEOGRAM_API_KEY}
Content-Type: application/json

{ "prompt":"…", "rendering_speed":"TURBO", "style_type":"AUTO", "aspect_ratio":"1x1" }
// → { "data":[{ "url":"https://…" }] }
```

Pricing: Turbo **$0.03** / Default **$0.06** / Quality **$0.09**; char-reference $0.10–$0.20. Also has
edit/inpaint/**reframe** (aspect re-layout — useful for smart re-layout, R1 §7). `generate()` only in MVP.

### 4.5 `recraft` — Recraft V3 direct (fallback + **true SVG vector**)

> **⚠️ VERIFY current docs before coding:** `recraft.ai/docs`. **True SVG requires Recraft's own vector
> endpoint/param** — the fal `text-to-image` slug returns raster (R1 §4.2, §11). Use this **direct** driver when
> SVG is required. **⚑ R-PROV1: fallback-only for raster; first-class only for vector.**

**Base URL:** `https://external.api.recraft.ai/v1` (⚠️ VERIFY). **Auth header:** `Authorization: Bearer
${RECRAFT_API_KEY}`. **Generate:** `POST /v1/images/generations` with `style`
(`realistic_image | digital_illustration | vector_illustration`), `substyle`, `colors[]` (RGB — lock to Brand
Kit gold `#cba65e` / lime `#b6e64a`), `model:"recraftv3"`. Vector output ⇒ SVG asset drops into the Polotno
tree as a `logo`/`shape` layer. Pricing: raster **$0.04** / **vector $0.08**.

### 4.6 `openai` — OpenAI GPT Image (diversity fallback)

> **⚠️ VERIFY current docs before coding:** `developers.openai.com/api/docs`. **Use GPT Image 1.5 / 2 / Mini —
> do NOT hardcode `gpt-image-1` (deprecating 2026-10-23).** Keep env var `OPENAI_API_KEY` (R1 §1, §6, §11.)

**Base URL:** `https://api.openai.com/v1`. **Auth header:** `Authorization: Bearer ${OPENAI_API_KEY}`.
**Generate:** `POST /v1/images/generations`; **edit:** `POST /v1/images/edits` (multipart w/ image + mask).

```http
POST /v1/images/generations
Authorization: Bearer ${OPENAI_API_KEY}
Content-Type: application/json

{ "model":"gpt-image-1.5", "prompt":"imagery only …", "size":"1024x1024",
  "quality":"high", "moderation":"auto", "n":1 }        // ⚠️ VERIFY model slug + params
// → { "data":[{ "b64_json":"…" }] }  → decode → persistAsset({ bytes })
```

Pricing: Mini **$0.005–$0.052**; full ≈ $0.02/$0.07/$0.19 (low/med/high). Returns base64 by default.

### 4.7 Utilities (bg-remove / expand / relight / upscale) — routed through `fal` → Bria

Per R1 §8: standardize utilities on **Bria** (commercial-safe, indemnified — matters for the paying DE/PE
tenant), accessed via `fal`; use **FLUX Tools** when the asset is already in the BFL pipeline. These map to
`edit()`/`upscale()` on the respective drivers. **⚠️ VERIFY** Bria commercial-agreement requirement + pricing
at contract time (R1 §8).

| Task | Route | Model id / slug | Price |
|---|---|---|---|
| Background removal | `fal` | `fal-ai/bria/background/remove` | $0.018 |
| Expand / outpaint (ratio adapt) | `fal` / `bfl` | `fal-ai/bria/…/expand` / `flux-pro-1.0-expand` | $0.023 / varies |
| Inpaint / erase | `bfl` / `fal` | `flux-pro-1.0-fill` / `fal-ai/flux-pro/v1/erase` | varies |
| Relight | `fal` | Bria `/relight` | — |
| Upscale 2×/4× | `fal` / `bfl` | Bria upscale / `flux-1-1-pro-ultra` | — |

---

## 5. ROUTER — `ProviderBus` policy tables (the heart of routing)

The bus reads a **ranked policy table** (`job.kind → [driverId, modelSlug][]`) and applies the fallback chain
top-to-bottom (§3.2). **Manual override always wins** (CANON §4): if `job.overrideDriverId` is set, use it; if
`job.overrideModel` is set, pin that slug. This is the concrete realization of `ProviderBus.image/video/audio`.

### 5.1 Job kinds (the routing keys)

```ts
export type ImageJobKind =
  | 'hero'                 // single-image ad scene / background
  | 'brand_edit'          // "change only X, keep brand identical"
  | 'product_in_scene'    // place real product/logo asset into a generated scene
  | 'in_pixel_text'       // RARE — text baked into scene texture (⚑ avoid; layer-tree default)
  | 'draft'               // board thumbnails / ideation (cost-first)
  | 'carousel_slide'      // slide background with cross-slide continuity
  | 'bg_remove' | 'expand' | 'relight' | 'upscale';   // utilities

export type VideoJobKind =
  | 'broll_t2v' | 'animate_still_i2v' | 'face_consistency'
  | 'dialogue_soundon' | 'premium_motion' | 'cheap_volume' | 'avatar_ugc';

export type AudioJobKind = 'voiceover' | 'sfx' | 'music';
```

### 5.2 IMAGE policy table (from R1 §9 + R7 §5.3)

| `job.kind` | Rank 1 (driver · model) | Rank 2 | Rank 3 | Rationale |
|---|---|---|---|---|
| `hero` | `bfl` · `flux-2-pro` | `bfl` · `flux-2-max` (finals) | `fal` · seedream v4.5 | Incumbent; best cost+webhook+quality; Seedream = look variety |
| `brand_edit` | `gemini` · `gemini-3-pro-image` | `bfl` · `flux-kontext-pro`/`-max` | `gemini` · `gemini-3.1-flash-image` | 14-ref consistency; Kontext in-ecosystem + deterministic seed |
| `product_in_scene` | `gemini` · `gemini-3-pro-image` | `fal` · seedream v4.5 edit | `bfl` · `flux-kontext-pro` | Multi-image compose + consistency; relight via Bria after |
| `in_pixel_text` (RARE) | `ideogram` · `ideogram-v3` | `recraft` · `recraftv3` | `openai` · `gpt-image-1.5` | Only for baked scene text; normally a Polotno layer |
| `draft` | `fal` · `luma-photon/flash` ($0.002) | `bfl` · `flux-2-klein-9b` | `openai` · GPT Image Mini | Cost-first; upgrade chosen tile to `flux-2-pro` on approval |
| `carousel_slide` | `bfl` · `flux-2-pro` (**fixed seed** + Kontext edit chain) | `gemini` · `gemini-3-pro-image` (ref chain) | `fal` · seedream v4.5 | Seed + Kontext chain keeps look continuous (`CarouselArchitect`) |
| `bg_remove` | `fal` · `bria/background/remove` | — | — | Commercial-safe |
| `expand` | `fal` · `bria/…/expand` | `bfl` · `flux-pro-1.0-expand` | — | Smart re-layout, not crop (CANON §8) |
| `relight` | `fal` · Bria `/relight` | — | — | Commercial-safe |
| `upscale` | `fal` · Bria upscale | `bfl` · `flux-1-1-pro-ultra` | — | Commercial-safe |

### 5.3 VIDEO policy table (from R2 §0, §7)

| `job.kind` | Rank 1 | Rank 2 | Rank 3 | Rationale |
|---|---|---|---|---|
| `animate_still_i2v` (**Brutal default**) | `kling` · `kling-v2-5-turbo` (i2v, pro) | `seedance` · `seedance-2.0` i2v | `runway` · `gen4-turbo` | Animates the *composited* still; brand text stays layers |
| `broll_t2v` | `kling` · `kling-v2-5-turbo` | `seedance` · `seedance-2.0` | `veo` · `veo-3.1-fast` | Cheap, strong motion, muted anyway |
| `face_consistency` | `kling` · `kling-3.0-omni` (elements + voice bind) | `veo` · `veo-3.1` (reference imgs) | — | Omni = 2026 face-drift answer |
| `dialogue_soundon` | `veo` · `veo-3.1` (audio-native) | `kling` · `kling-3.0-omni` | — | Only when shipping a sound-on variant |
| `premium_motion` | `runway` · `gen4-turbo` | `luma` · `ray2` (via `fal`) | `kling` · `kling-v2-6-pro` | Clean realistic motion, precise camera |
| `cheap_volume` | `seedance` · `seedance-2.0` | `hailuo` (MiniMax via `fal`) | `luma` · `ray2-flash` | Most output per $ |
| `avatar_ugc` | `heygen` (⚑ `AvatarProvider`) | `creatify` | `arcads` | Talking-head UGC; post-MVP (§7.5) |

### 5.4 AUDIO policy table (from R2 §7) — all ElevenLabs

```ts
const AUDIO_POLICY = {
  voiceover: ['elevenlabs:eleven_multilingual_v2', 'elevenlabs:eleven_v3'],
  sfx:       ['elevenlabs:sound-generation'],
  music:     ['elevenlabs:music-compose'],
} as const;
```

### 5.5 The bus implementation skeleton

```ts
// providers/bus.ts
const IMAGE_POLICY: Record<ImageJobKind, Array<{ driver: string; model: string }>> = { /* §5.2 */ };
const VIDEO_POLICY: Record<VideoJobKind, Array<{ driver: string; model: string }>> = { /* §5.3 */ };

export function makeProviderBus(registry: Registry, cache: Cache): ProviderBus {
  function pickImage(job: JobDescriptor): ImageProvider {
    if (job.overrideDriverId) return registry.image(job.overrideDriverId);      // manual override wins
    const ranked = IMAGE_POLICY[job.kind as ImageJobKind];
    // Return a WRAPPER ImageProvider that: (1) checks cache; (2) tries ranked[0], on
    // ProviderError falls through per §3.2 to ranked[1], ranked[2]; (3) on exhaustion throws
    // 'all_failed' surfaced to UI; (4) records cost + writes cache on success.
    return makeFallbackImageProvider(ranked, registry, cache, job);
  }
  return {
    image: pickImage,
    video: (job) => makeFallbackVideoProvider(VIDEO_POLICY[job.kind as VideoJobKind], registry, job),
    audio: (job) => registry.audio('elevenlabs'),
    predictor: (job) => registry.predictor(job),   // → docs/08
  };
}
```

> **Down-tiering under budget pressure (⚑):** if `job.budgetRemainingUsd` is low (§9.3), the bus MAY swap a
> `hero`→`flux-2-pro` for a `draft`→`flux-2-klein` tier and flag it. Never silently exceed a hard cap; the
> orchestrator refuses the job first.

---

## 6. AUDIO PROVIDER — `elevenlabs`

> **⚠️ VERIFY current docs before coding:** `elevenlabs.io/docs`. Confirm: (1) `eleven_multilingual_v2` still
> default + `eleven_v3` slug; (2) `with-timestamps` endpoint shape; (3) **DE number pre-spelling is
> mandatory**; (4) Music API **commercial-license** terms for paid ads. (R2 §4, §8.)

**Base URL:** `https://api.elevenlabs.io`. **Auth header:** `xi-api-key: ${ELEVENLABS_API_KEY}`.
**Voices:** `ELEVENLABS_VOICE_ID_*` per language/persona (CANON §10).

### 6.1 TTS — Create Speech

```http
POST /v1/text-to-speech/{voice_id}?output_format=mp3_44100_128
Host: api.elevenlabs.io
xi-api-key: ${ELEVENLABS_API_KEY}
Content-Type: application/json

{ "text":"Zwölfhundert Kanzleien vertrauen …",   // DE: numbers PRE-SPELLED (§6.3)
  "model_id":"eleven_multilingual_v2",
  "language_code":"de",
  "voice_settings":{ "stability":0.5,"similarity_boost":0.75,"style":0.0,
                     "use_speaker_boost":true,"speed":1.0 },
  "seed":12345,                                   // deterministic VO
  "previous_text":"…","next_text":"…",            // cross-chunk prosody continuity
  "apply_text_normalization":"auto" }
// → 200 audio/mpeg (binary) → persistAsset({ bytes }) → Remotion <Audio>
```

Variants: `POST /v1/text-to-speech/{voice_id}/stream` (streaming);
`POST /v1/text-to-speech/{voice_id}/with-timestamps` → **character/word timestamps** → build `Caption[]` for
burned-in captions **without Whisper** (R2 §5). **⚠️ 3k-char/request limit** — chunk long VO and stitch via
`previous_text`/`next_text`.

**Model IDs:** `eleven_multilingual_v2` (**default**, sober DE+EN VO); `eleven_v3` (most expressive — punchier
sound-on cuts); `eleven_turbo_v2_5` / `eleven_flash_v2_5` (low-latency drafts).

### 6.2 SFX & Music (same key)

- **SFX:** `POST /v1/sound-generation` — `{ "text":"muted keyboard click, subtle whoosh","duration_seconds":2.0 }`.
- **Music:** `POST /v1/music/compose` (+ `/compose-detailed`, `/create-composition-plan`). Low sober bed;
  muted-first (bed only matters on the sound-on variant). **⚠️ VERIFY commercial-license terms for paid ads.**

### 6.3 ⚠️ CRITICAL — German number/symbol pre-spelling (CANON §7 `LocalizationAgent`)

ElevenLabs mispronounces German numbers/dates/currency/acronyms. **The `LocalizationAgent` MUST emit
TTS-normalized strings** (numbers → German words, `%` → "Prozent", `€1.200` → "eintausendzweihundert Euro")
for the **VO track**, while the **on-screen caption/text layer keeps the numeral** for legibility. Optionally
set `apply_text_normalization:"on"`, but **do NOT rely on it for DE — pre-spell** (R2 §4.4). This is the
canonical dual-string contract: `{ voStr (spelled), captionStr (numeral) }` per line.

### 6.4 Driver skeleton

```ts
// providers/audio/elevenlabs.ts
export function makeElevenLabsDriver(env: Env): AudioProvider {
  const headers = { 'xi-api-key': env.ELEVENLABS_API_KEY };
  async function tts(s: TtsSpec): Promise<GenResult> {
    const path = s.withTimestamps ? `/with-timestamps` : ``;
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${s.voiceId}${path}?output_format=mp3_44100_128`,
      { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: s.text, model_id: s.model ?? 'eleven_multilingual_v2',
          language_code: s.languageCode, seed: s.seed, voice_settings: s.voiceSettings }) });
    if (!res.ok) throw await ProviderError.fromResponse(res);
    const bytes = new Uint8Array(await res.arrayBuffer());   // (with-timestamps returns JSON w/ base64 audio)
    const asset = await persistAsset({ bytes, mime: 'audio/mpeg', workspaceId: wsOf(s),
      provider: 'elevenlabs', model: s.model ?? 'eleven_multilingual_v2', seed: s.seed, raw: {} });
    return { assetId: asset.assetId, width: 0, height: 0, provider: 'elevenlabs',
      model: s.model ?? 'eleven_multilingual_v2', seed: s.seed, costUsd: costEleven(s.text), raw: {} };
  }
  return { id: 'elevenlabs', tts, sfx: /* /v1/sound-generation */, music: /* /v1/music/compose */ };
}
```

---

## 7. VIDEO PROVIDERS

> All video drivers satisfy `VideoProvider` (§1). **Brutal default = i2v on the composited still** (imagery
> only; brand text stays Remotion layers, never baked). Assembly (Remotion) is `packages/render` — spec'd in
> `docs/05`/`docs/07`, not here; this doc stops at "clip persisted to Asset." Muted-first ⇒ we usually discard
> model-native audio (R2 §0).

### 7.1 `kling` — Kling official Kuaishou platform (JWT HS256) — **PRIMARY**

> **⚠️ VERIFY current docs before coding:** Kling Open Platform (`kling.ai/document-api`). Confirm: (1) host —
> `api.klingai.com` vs a region host (e.g. `api-singapore.klingai.com`) vs the client's existing key target;
> (2) exact `model_name` slugs (v2.5-turbo / v2.6 / v3 / 3.0-omni); (3) whether i2v takes `aspect_ratio` or
> inherits from the image; (4) Omni "elements" — separate endpoint or params; (5) per-second pricing. **⚠️ Two
> different "Kling APIs" exist** — the official Kuaishou platform (JWT) is canonical; third-party proxies
> (`klingapi.com`, PiAPI, fal, Replicate) use `Bearer <api_key>` and are fallback lanes only. (R2 §1, §8.)

**Auth — JWT HS256** signed with the **secret key**, placed in `Authorization: Bearer <token>`:

```python
# reference (services/engine or driver util)
import time, jwt  # PyJWT
def encode_kling_jwt(ak: str, sk: str) -> str:
    return jwt.encode(
        {"iss": ak, "exp": int(time.time()) + 1800, "nbf": int(time.time()) - 5},
        sk, algorithm="HS256", headers={"typ": "JWT"})
```

TS (driver): `jwt.sign({iss:ak, exp, nbf}, sk, {algorithm:'HS256', header:{typ:'JWT'}})` (`jsonwebtoken`).
Regenerate per request or cache < 30 min. `ak = KLING_ACCESS_KEY`, `sk = KLING_SECRET_KEY`.

**Endpoints (official):**

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/videos/text2video` | text → video |
| POST | `/v1/videos/image2video` | **image → video (Brutal default)** |
| GET  | `/v1/videos/image2video/{task_id}` | poll (text2video symmetric) |
| POST | `/v1/videos/video-extend` | extend a clip |
| POST | `/v1/videos/lip-sync` | lip-sync existing clip |

**image2video request (verified field set):**

```jsonc
{ "model_name":"kling-v2-5-turbo",   // ⚠️ VERIFY slug per version
  "image":"https://…",               // URL or base64 — REQUIRED (the composited still)
  "image_tail":"https://…",          // optional end frame
  "prompt":"…", "negative_prompt":"…",
  "cfg_scale":0.5,                    // 0–1 prompt adherence
  "mode":"pro",                       // "std" | "pro"
  "duration":"5",                     // "5" | "10" seconds
  "aspect_ratio":"1:1",              // ⚠️ VERIFY passed vs inherited on v2.5+
  "callback_url":"https://app…/api/webhooks/kling" }
```

**Create → poll response shapes:**

```jsonc
// create → { "code":0,"message":"SUCCEED","data":{ "task_id":"xxx","task_status":"submitted" } }
// poll   → { "data":{ "task_status":"succeed",
//              "task_result":{ "videos":[{ "id":"…","url":"https://…","duration":"5" }] } } }
// task_status ∈ submitted | processing | succeed | failed
```

Download `url` immediately (expires → §2.4). Poll every 3–5s; 5s clip ≈ 1–4 min. **Failed API tasks do NOT
consume credits** (good for retry loops).

**Model versions:** `kling-v2-5-turbo` (**default** t2v+i2v); `kling-v2-6` (better motion, optional audio);
`kling-3.0-omni` (multi-image **elements** for consistent faces + **voice binding**; native audio;
3–15s) — the `face_consistency` / `dialogue_soundon` lane. Legacy: `kling-v1-6` / `kling-v2-1`.

**Pricing (⚠️ VERIFY at kling.ai/dev/pricing — moves often):** Kling 3.0 ≈ $0.084/s (std) → $0.168/s (pro w/
video input); 2.6 Pro i2v ≈ $0.07/s (no audio) / $0.14/s (audio). A 5s pro clip ≈ $0.35–$1.10.

**Driver skeleton:**

```ts
// providers/video/kling.ts
export function makeKlingDriver(env: Env): VideoProvider {
  const host = env.KLING_HOST ?? 'https://api.klingai.com';   // ⚠️ VERIFY host
  function auth() { return { 'Authorization': `Bearer ${signKlingJwt(env.KLING_ACCESS_KEY, env.KLING_SECRET_KEY)}` }; }
  async function generate(s: VideoGenSpec): Promise<GenResult> {
    const isI2v = !!s.startFrame;
    const path = isI2v ? 'image2video' : 'text2video';
    const create = await httpJson<{ data: { task_id: string } }>(
      `${host}/v1/videos/${path}`, { method: 'POST', headers: auth(), body: toKlingBody(s) });
    const id = create.data.task_id;
    const video = await pollUntil<{ url: string; duration: string }>(async () => {
      const r = await httpJson<{ data: { task_status: string;
        task_result?: { videos: { url: string; duration: string }[] } } }>(
        `${host}/v1/videos/${path}/${id}`, { headers: auth() });
      if (r.data.task_status === 'failed') return { done:false, failed:true, reason:'kling failed' };
      return { done: r.data.task_status === 'succeed', failed:false, value: r.data.task_result?.videos[0] };
    }, { maxMs: 12*60_000 });
    const asset = await persistAsset({ providerUrl: video.url, mime:'video/mp4', workspaceId: wsOf(s),
      provider:'kling', model: s.model ?? 'kling-v2-5-turbo', seed:s.seed, raw: video });
    return { assetId: asset.assetId, width: asset.width, height: asset.height, provider:'kling',
      model: s.model ?? 'kling-v2-5-turbo', seed:s.seed,
      costUsd: costKling(s.model, s.durationSec ?? 5, s.params), raw: video };
  }
  return { id: 'kling', generate };
}
```

### 7.2 `seedance` — ByteDance Seedance 2.0 (via `fal`) — fallback / cheap b-roll

> **⚠️ VERIFY current docs before coding:** fal model page for `bytedance/seedance-2.0`. Confirm slug +
> per-second/per-token price. (R2 §2, §8.) **2.0 is current; 1.0 Pro is legacy.**

Reached through the **fal queue pattern** (§4.2) — same create→poll→persist. fal ids:
`fal-ai/bytedance/seedance/v2.0/…` (t2v + i2v). i2v supports native audio (2.0) — usually discarded (muted-first).
Indicative: 1.0 Pro 1080p·5s ≈ $0.62; 2.0 10s fast ≈ $2.42 / std ≈ $3.03. Driver = thin adapter over the fal
video queue.

### 7.3 `veo` — Google Veo 3.1 — only when real in-frame audio required

> **⚠️ VERIFY current docs before coding:** `ai.google.dev/gemini-api/docs/veo`. **`veo-3.0-*` sunset
> 2026-06-30** → use `veo-3.1-generate-preview` / `-fast-` / `-lite-` via `:predictLongRunning`. Confirm 8s
> cap, resolutions (720p/1080p/4k), `personGeneration` **region rules**, per-second price. (R2 §2, §8.)

**Base URL:** `https://generativelanguage.googleapis.com`. **Auth:** `x-goog-api-key: ${GEMINI_API_KEY}` (same
key as `gemini` image). **Long-running op:** `POST …/models/veo-3.1-generate-preview:predictLongRunning` →
returns an operation name → poll the operation until done → video URI. Veo is **audio-native** (best in-class) —
the **only** model to reach for when in-frame dialogue/SFX must be real (R2 §2). Supports image + up to 3
reference images. Pricing: **$0.40/s** (std), **$0.15/s** (fast). 8s cap.

### 7.4 `runway` — Runway Gen-4 Turbo / Aleph 2.0 — premium motion fallback

> **⚠️ VERIFY current docs before coding:** `docs.dev.runwayml.com`. **Gen-4 Aleph sunsets 2026-07-30 →
> Aleph 2.0.** Confirm Gen-4 Turbo credit rate ($0.01/credit; Gen-4 Turbo 5 cr/s = **$0.05/s**). (R2 §2, §8.)

**Base URL:** `https://api.dev.runwayml.com` (⚠️ VERIFY). **Auth header:** `Authorization: Bearer
${RUNWAY_API_KEY}` + `X-Runway-Version: <date>` header (⚠️ VERIFY). Task-based create→poll. Clean realistic
motion, precise camera; good premium i2v fallback.

> **⚑ RECOMMENDATION (env var not in CANON §10):** Runway needs a credential. CANON §10 does **not** list a
> Runway key. **Add `RUNWAY_API_KEY`** to `.env.example` / `docs/11`. Alternatively, reach Runway **via `fal`**
> (uses `FAL_KEY`, zero new env var) — R2 lists Runway as a fal/Replicate fallback lane. **Default: route
> Runway through `fal`** to avoid a new credential; add `RUNWAY_API_KEY` only if a direct Runway contract is
> needed. Flagged so `docs/11` (env) and `docs/03` stay consistent.

### 7.5 `AvatarProvider` — HeyGen / Creatify / Arcads (⚑ post-MVP fast-follow)

> **⚠️ VERIFY current docs before coding:** `docs.heygen.com`. **v1/v2 operational until 2026-10-31**; new **v3**
> wallet API is USD-prepaid. Confirm `/v2/video/generate` field names (renamed for v3) + polling response.
> (R2 §3, §8.)

**⚑ R-AVATAR1:** distinct modality not in CANON §6. Shape it as a thin `AvatarProvider` (or `VideoProvider`
with `params.kind:'avatar'`). **Do NOT block P9 video on it.**

**HeyGen v2 skeleton:** `POST https://api.heygen.com/v2/video/generate` (header `X-Api-Key`) → `{data:{video_id}}`
→ poll `GET /v1/video_status.get?video_id=…`. For DE, use `voice.type:"audio"` with an **ElevenLabs-generated
German track** (`audio_url`) instead of HeyGen TTS to keep voice on-brand. Pricing ≈ $0.05/s ($1–$3/min).

---

## 8. LLM PROVIDER — `LlmProvider` (Anthropic) — pointer

The agent loop's `LlmProvider` (CANON §6: `complete()` / `structured<T>()`) is **fully specified in `docs/06`
(agents)**, not here. This doc lists it for completeness of the CANON §6 contract set. Key facts (from R7
§5.3 `⚑ R-LLM1`, ⚠️ VERIFY model ids + intro-pricing window at `platform.claude.com`):

| Model | API id | In/Out $/MTok | Use |
|---|---|---|---|
| Claude Sonnet 5 | `claude-sonnet-5` | $3 / $15 (intro $2/$10 to 2026-08-31) | **Default** agents |
| Claude Opus 4.8 | `claude-opus-4-8` | $5 / $25 | Escalation (ArtDirector, Critic, hard BrandGuardian, iterate round 2) |
| Claude Haiku 4.5 | `claude-haiku-4-5` | $1 / $5 | Cheap classification / smart-layer binding |

**Env:** `ANTHROPIC_API_KEY`. Structured outputs via tool/JSON schema. Prompt caching (90% off) + Batch API
(50% off) for non-interactive fan-out (e.g. 6-variant copy). Do **not** hardcode `claude-opus-4-8` everywhere.

---

## 9. COST ACCOUNTING (CANON §4 — "logged with cost_usd; hard caps")

Every `GenerationJob` and `AgentRun` logs `cost_usd`. `GenResult.costUsd` is the **resolved** per-call cost.
Cost tables are **data, not code** — store in a `provider_pricing` table keyed by `(provider, model, version)`
so a price change is a row edit, not a deploy. **⚠️ VERIFY every number below against live pricing pages before
coding — pricing is the most drift-prone field in this doc.**

### 9.1 Cost formulas by billing model

| Billing model | Providers | Formula |
|---|---|---|
| **MP-metered** | BFL FLUX.2 | `costUsd = firstMpPrice + max(0, mp - 1) * perMpPrice`, `mp = ceil(w*h / 1e6)` |
| **Fixed per-image** | BFL FLUX.1 (credits), fal per-model, Ideogram, Recraft, Gemini image, OpenAI, Seedream | `costUsd = table[model]` (Gemini/OpenAI: by resolution tier) |
| **Per-second (video)** | Kling, Veo, Runway, Seedance, HeyGen | `costUsd = perSecond[model, mode] * durationSec` (Runway: `credits/s * 0.01`) |
| **Per-char (audio)** | ElevenLabs | `costUsd = ceil(chars / 1000) * per1kChars[model]` (multilingual_v2 ≈ $0.10/1k) |
| **Cache hit** | any | `costUsd = 0` |

### 9.2 Indicative price seed rows (⚠️ VERIFY — seed the `provider_pricing` table)

```jsonc
[
  { "provider":"bfl","model":"flux-2-pro","unit":"mp","firstMp":0.03,"perMp":0.03 },
  { "provider":"bfl","model":"flux-2-max","unit":"mp","firstMp":0.07,"perMp":0.03 },
  { "provider":"bfl","model":"flux-2-klein-9b","unit":"image","price":0.015 },
  { "provider":"bfl","model":"flux-kontext-pro","unit":"image","price":0.04 },
  { "provider":"bfl","model":"flux-kontext-max","unit":"image","price":0.08 },
  { "provider":"fal","model":"fal-ai/bytedance/seedream/v4.5/text-to-image","unit":"image","price":0.04 },
  { "provider":"fal","model":"fal-ai/luma-photon/flash","unit":"image","price":0.002 },
  { "provider":"fal","model":"fal-ai/bria/background/remove","unit":"image","price":0.018 },
  { "provider":"gemini","model":"gemini-3-pro-image","unit":"tier","tiers":{"1K":0.134,"2K":0.134,"4K":0.24} },
  { "provider":"gemini","model":"gemini-3.1-flash-image","unit":"tier","tiers":{"1K":0.067,"2K":0.101,"4K":0.15} },
  { "provider":"ideogram","model":"ideogram-v3","unit":"tier","tiers":{"TURBO":0.03,"DEFAULT":0.06,"QUALITY":0.09} },
  { "provider":"recraft","model":"recraftv3","unit":"tier","tiers":{"raster":0.04,"vector":0.08} },
  { "provider":"openai","model":"gpt-image-1.5","unit":"tier","tiers":{"low":0.02,"med":0.07,"high":0.19} },
  { "provider":"kling","model":"kling-v2-5-turbo","unit":"second","perSecond":{"std":0.084,"pro":0.14} },
  { "provider":"kling","model":"kling-3.0-omni","unit":"second","perSecond":{"std":0.168,"pro":0.392} },
  { "provider":"veo","model":"veo-3.1-generate-preview","unit":"second","perSecond":{"std":0.40,"fast":0.15} },
  { "provider":"runway","model":"gen4-turbo","unit":"second","perSecond":{"default":0.05} },
  { "provider":"seedance","model":"seedance-2.0","unit":"second","perSecond":{"fast":0.24,"std":0.30} },
  { "provider":"elevenlabs","model":"eleven_multilingual_v2","unit":"char","per1k":0.10 },
  { "provider":"heygen","model":"avatar-iv","unit":"second","perSecond":{"default":0.05} }
]
```

### 9.3 Spend caps (CANON §4 — "hard per-brief and per-workspace spend caps")

```ts
// _shared/cost.ts
async function assertBudget(job: GenerationJob, estimatedUsd: number): Promise<void> {
  const brief = await spend.forBrief(job.briefId);       // running total
  const ws    = await spend.forWorkspace(job.workspaceId);
  if (brief.usd + estimatedUsd > caps.perBriefUsd)      throw new BudgetError('brief cap', brief, estimatedUsd);
  if (ws.usd    + estimatedUsd > caps.perWorkspaceUsd)  throw new BudgetError('workspace cap', ws, estimatedUsd);
}
```

- **Estimate before enqueue** (image: from model+resolution; video: `perSecond*duration`); **the orchestrator
  refuses to start a job that would breach a hard cap** and shows the projected cost (R7 §4).
- **Record actual after success** (`GenResult.costUsd`) and increment counters *before* marking `succeeded`.
- **Bounded auto-iterate (≤2 rounds)** and **caching** are themselves cost caps (R7 §4). Edits are `LayerPatch`
  diffs → re-render only affected layers → **copy tweaks cost zero image credits** (CANON §2 load-bearing).
- Caps default per-workspace/per-brief in config; `docs/11` (env) surfaces the values.

---

## 10. Repo layout for this doc's code

```
apps/web/src/server/providers/
  _shared/   http.ts  poll.ts  persist.ts  cache.ts  errors.ts  cost.ts  storage.ts
  registry.ts               # id → driver instance map
  bus.ts                    # ProviderBus + policy tables (§5) + fallback wrapper
  image/     bfl.ts  fal.ts  gemini.ts  ideogram.ts  recraft.ts  openai.ts  seedream.ts
  video/     kling.ts  seedance.ts  veo.ts  runway.ts
  audio/     elevenlabs.ts
  avatar/    heygen.ts       # ⚑ post-MVP (§7.5)
  llm/       anthropic.ts    # ← primarily specified in docs/06
apps/web/src/app/api/webhooks/  bfl/route.ts  fal/route.ts  kling/route.ts
packages/shared/src/providers.ts   # CANON §6 interfaces + zod schemas (§1)
```

- **Server-only:** every file under `providers/` imports service credentials → never bundled to the client.
  Enforce with a server-only guard (`import 'server-only'`).
- **Registry** wires each `id` to its driver, injected with `Env`. The **bus** is the only thing the agent loop
  and job worker touch — they never name a provider (R7 §1.2).

---

## 11. Consolidated "VERIFY before coding" checklist

**Do these first — APIs drifted materially between the CANON snapshot and this research (R1 §11, R2 §8, R7 §5.4).**

**Image**
1. **BFL** — FLUX.2 slug (`*-preview` vs stable `flux-2-pro`); `aspect_ratio` enum vs `width`/`height` for 1:1 / 1.91:1 / 4:5; webhook signature (`webhook_secret`/HMAC); MP-metered per-image cost at LinkedIn resolutions; commercial license tier + EU host (`api.eu.bfl.ai`) for the DE tenant.
2. **fal** — `?fal_webhook=` + status/result URL patterns; per-model prices on live model pages; nsfw/policy status fields.
3. **Gemini image** — `…/v1beta/interactions` vs legacy `:generateContent`; GA slug `gemini-3-pro-image` (preview slugs shut down 2026-06-25); `imageConfig` aspect/size keys; price/token math; block-reason fields.
4. **OpenAI** — use GPT Image **1.5 / 2 / Mini**; **`gpt-image-1` deprecates 2026-10-23** — don't hardcode; `moderation` param + error codes; base64 default.
5. **Seedream** — 4.5 default (vs 4.0); source via **fal** (⚑ R-PROV2) or BytePlus ModelArk (base/auth if direct).
6. **Recraft** — **true SVG requires the direct vector endpoint/param** (fal `text-to-image` = raster); confirm base URL + `colors[]` shape.
7. **Ideogram** — JSON vs multipart (multipart only w/ reference files).
8. **Bria utilities** — commercial agreement requirement + per-call pricing (the reason to prefer it — indemnified).

**Video / Audio**
9. **Kling** — host (`api.klingai.com` vs region vs the client's key target); `model_name` slugs (v2.5-turbo / v2.6 / v3 / 3.0-omni); i2v `aspect_ratio` passed vs inherited; Omni "elements" endpoint-vs-params; per-second pricing; JWT `exp` window.
10. **Veo** — `veo-3.0-*` sunset 2026-06-30 → `veo-3.1-*` via `:predictLongRunning`; 8s cap, resolutions, `personGeneration` region rules, per-second price.
11. **Runway** — Gen-4 Aleph sunset 2026-07-30 → Aleph 2.0; Gen-4 Turbo credit rate ($0.01/credit); **⚑ new `RUNWAY_API_KEY` or route via fal** (env decision — align `docs/11`).
12. **Seedance** — 2.0 current (1.0 Pro legacy); fal slug + per-second/token price.
13. **HeyGen** (⚑ post-MVP) — v1/v2 until 2026-10-31 vs v3 wallet API; `/v2/video/generate` field names + polling.
14. **ElevenLabs** — `eleven_multilingual_v2` still default + `eleven_v3` slug; `with-timestamps` shape; **DE number pre-spelling mandatory**; 3k-char/request limit; Music API commercial license for paid ads.

**Cross-cutting**
15. **Rate limits** — BFL 24 concurrent (Kontext-max 6); fal prepaid credits; set per-brief/per-workspace caps (§9.3).
16. **Ephemeral URLs** — BFL ~10 min; Kling/fal/Veo expire — **download + re-host to Supabase/R2 immediately** (§2.4).
17. **Anthropic** — model ids + intro-pricing window (`platform.claude.com`) — see `docs/06`.

---

## Sources

Inherited verbatim from research (re-verify all before coding):
- **Image:** `research/R1-image-models.md` §§0–11 (BFL, fal, Ideogram, Recraft, Gemini, OpenAI, Seedream, Bria) + its Sources list.
- **Video/Audio:** `research/R2-video-audio.md` §§0–8 (Kling, Seedance, Veo, Runway, HeyGen, ElevenLabs, Remotion) + its Sources list.
- **Architecture/routing/cost/moderation:** `research/R7-blank-slate-arch.md` §§1.2, 4, 5 (`ProviderBus`, caching key, cost caps, fallback chain, provider landscape).
- **Canonical contracts / env vars / object model:** `CANON.md` §§4, 5, 6, 10.
