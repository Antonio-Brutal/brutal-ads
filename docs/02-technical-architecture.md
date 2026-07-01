# 02 — TECHNICAL ARCHITECTURE (monorepo, component map, lifecycles, ProviderBus, orchestration, render, queues, deploy)

> ⚠️ **CROSS-REFERENCE NOTE — read first (authoritative, per CANON §12 L1).** Some inline `docs/NN` / `doc NN` pointers in this file predate the frozen document map and may cite the wrong number. **Resolve every cross-reference by ROLE using this map, not by the integer written inline:** `01` product · `02` architecture · `03` data-model (all DDL/zod/schemas) · `04` providers · `05` agent-studio · `06` editor + `packages/render` + export · `07` creative-playbook · `08` engagement · `09` brand-kit · `10` build-plan · `11` env · `12` security/ops · `13` acceptance · `14` appendix. There is **no localization doc** (localization lives in `05` LocalizationAgent + `09` brand-kit `localization` + `07`) and **no "exporter" doc** (export lives in `06`). Source paths are `apps/web/src/**` (the pre-freeze `lib/`-rooted layout is retired — all app source lives under `src/`). Where anything here disagrees with CANON §12, **the ledger wins.**

> **Read `handoff/CANON.md` first.** This document is the **single source of truth for how Brutal Ads
> is wired together as software**: the pnpm monorepo (`apps/web`, `services/engine`, `packages/shared`,
> `packages/render`, `supabase/`) per CANON §4/§11; the runtime component map; the **request and job
> lifecycles** (sync vs async generation); the **`ProviderBus` + router**; the **agent orchestration runtime**;
> the **render/export paths** (Polotno headless + Remotion video + PDF); **caching**; the **job queue**
> (Supabase Queues/pgmq default, Inngest adapter, pg-boss reserved); and the **deployment topology** (Vercel +
> Supabase + Modal/Replicate + Supabase/R2). It reconciles with R7's blank-slate design and reinforces it.
>
> **This doc owns the *wiring*.** It deliberately does **not** re-specify things owned by sibling docs, and
> instead **references them by number** so the factory never gets two conflicting definitions:
> - **Postgres DDL, RLS, layer-tree/Slide/video-composition JSON schemas, zod mirrors** → `docs/03` (data model).
> - **`EditorAdapter` ↔ Polotno projection, `LayerPatch` mechanics, smart re-layout, the `packages/render`
>   internal signatures behind the single `renderDocument(spec)` facade (L5), Remotion composition internals**
>   → `docs/06` (editor & compositor).
> - **Per-agent prompts/IO contracts, the Creative Studio agent roster detail** → the agents doc (`docs/05`).
> - **Per-provider endpoint/auth/request skeletons, routing-policy tables** → the providers doc (`docs/04`) and
>   research **R1** (image), **R2** (video/audio), **R4** (engagement).
> - **Engagement engine internals (saliency/heuristic/TRIBE isolation)** → the engagement doc (`docs/08`) + R4.
> - **Env var catalogue** → the environment/config doc (`docs/11`) + CANON §10.
>
>   `⚑ ASSUMPTION (doc-numbering)` — sibling doc numbers above (04 providers, 05 agents, 08 engagement, 11
>   env) follow CANON §3's `docs/NN-*.md` scheme and the already-authored `01/03/06`. If the factory's final
>   numbering differs, treat the **role name** ("the agents doc", "the providers doc") as canonical, not the
>   integer. No behavior depends on the number.
>
> **Canonical names used verbatim** (CANON §5–§10): entities `Workspace … Layer` + supporting; layer types
> `image | text | logo | shape | cta | frame | legal | group | smart`; `AdDocument.type ∈ single_image |
> carousel | video`; contracts `Modality`, `GenSpec`, `GenResult`, `ImageProvider`, `VideoProvider`,
> `AudioProvider`, `LlmProvider`, `EngagementPredictor`, `ProviderBus`, `EngagementScores`; agents
> `Strategist`, `Copywriter`, `ArtDirector`, `CarouselArchitect`, `CompositorPlanner`, `BrandGuardian`,
> `Critic`, `EngagementAnalyst`, `EditorAgent`, `LocalizationAgent` (+ R7 `IntakeAgent`, R7 ⚑R-A1); env vars
> from CANON §10. **Do not rename any of these.**
>
> **Divergences from CANON are never silent** — they appear only as clearly-labelled `⚑ RECOMMENDATION`
> notes (most inherited from R7/R1/R2/R4 and re-stated here so this doc stands alone). **Every external API /
> drift-prone fact carries a `VERIFY current docs before coding` flag.**

---

## 0. TL;DR (read this first)

1. **Two runtimes, four packages, one database.** `apps/web` (Next.js 15, TS) is the product + the **agent
   orchestrator** + all provider drivers. `services/engine` (Python 3.11 + FastAPI) is the **engagement engine
   only** (saliency/heuristics; TRIBE R&D behind flags). `packages/shared` holds the object model + zod +
   provider contracts. `packages/render` holds the headless render (`polotno-node` static/PDF) + the
   Remotion video project. Supabase (Postgres + RLS + Auth + Storage + **pgmq** queue) is the spine.
2. **Nothing that touches an external generator is synchronous.** Every image/video/audio/engagement call is an
   async **`GenerationJob`** enqueued on **Supabase Queues (pgmq)** and drained by a **Vercel Cron → worker
   route** loop. The UI subscribes to progress over **Supabase Realtime**. The only synchronous LLM calls are
   the cheap, fast agents (text-only, seconds).
3. **The agent loop lives in `apps/web` and emits typed artifacts, never free text.** `IntakeAgent → Strategist
   → {Copywriter ∥ ArtDirector (→CarouselArchitect)} → CompositorPlanner → BrandGuardian(HARD GATE) → render →
   {Critic ∥ EngagementAnalyst} → bounded auto-iterate (≤2) → THE BOARD → human`. Every step is an `AgentRun`
   with tokens/latency/`cost_usd`.
4. **`ProviderBus` is a policy-routed façade** (`image/video/audio/predictor`). The agent loop never names a
   provider; it asks the bus for a driver by **job kind**, and the bus applies a **ranked policy table** with
   **manual override + automatic fallback**, **caches by `(provider, model, version, prompt, seed, params)`**,
   and **meters cost pre-flight** against per-brief/per-workspace caps.
5. **Render is headless and shared editor↔export** (`polotno-node`), Remotion for video. Export derives 1:1 /
   1.91:1 / 4:5 from **one base** via smart re-layout (`docs/06`), never naive crop.
6. **Deploy = Vercel (web + cron + workers) + Supabase (DB/Auth/Storage/Queue) + Modal/Replicate (engine GPU) +
   Supabase Storage / R2 (assets).** One long-running render surface (Node container) is required for
   `polotno-node` + Remotion local render (Vercel functions are too short/memory-bound for headless Chromium) —
   see §9.3.

---

## 1. Monorepo layout (CANON §4/§11 — exact tree)

pnpm workspace. **Turborepo** for task orchestration/caching (`⚑ R-ARCH1` below — additive, matches CANON §4's
"pnpm monorepo" without contradicting it).

```
brutal-ads/
├─ apps/
│  └─ web/                         # Next.js 15 App Router + TS + Tailwind v4 + shadcn/ui
│     ├─ src/                      # ALL app source under src/ (L2: apps/web/src/**)
│     │  ├─ app/                   # routes: UI (RSC/Client) + route handlers (API) + server actions
│     │  │  ├─ (marketing)/        # public
│     │  │  ├─ (app)/              # authed product (board, editor, campaigns) — RLS via user JWT
│     │  │  └─ api/                # route handlers (see §4.6 endpoint table)
│     │  │     ├─ briefs/…         # create brief → kick off pipeline
│     │  │     ├─ jobs/            # enqueue + status (sync façade over pgmq)
│     │  │     ├─ workers/         # cron-driven queue drainers (dispatch + poll) — §5
│     │  │     ├─ webhooks/{bfl,fal,kling,elevenlabs}/  # provider async callbacks — §4.4
│     │  │     ├─ agents/…         # orchestrator entrypoints (server-only)
│     │  │     ├─ editor/patch/…   # apply LayerPatch (EditorAgent + direct manip) — see docs/06
│     │  │     └─ render/…         # trigger render/export → packages/render surface
│     │  ├─ server/                # server-only runtime (L2)
│     │  │  ├─ studio/             # agent studio/orchestrator (§6): runner, registry, gates, iterate loop
│     │  │  │  └─ agents/          #   the Creative Studio agents (.../studio/agents/)
│     │  │  ├─ providers/          # ProviderBus + drivers (§3): bfl, fal, ideogram, recraft, gemini,
│     │  │  │                      #   openai, kling, elevenlabs, engine-predictor
│     │  │  ├─ queue/              # JobQueue interface + pgmq adapter (+ inngest adapter stub) — §5
│     │  │  ├─ cache/              # gen-cache (key + lookup + R2/Storage re-host) — §7
│     │  │  ├─ supabase/           # server + browser clients (anon vs service-role) — §8
│     │  │  └─ cost/               # spend meter + caps (per-brief/per-workspace) — §6.5
│     │  ├─ editor/                # editor UI (L2: apps/web/src/editor/)
│     │  └─ components/            # UI (board, editor shell, progress, cost meter)
│     └─ package.json
├─ services/
│  └─ engine/                      # Python 3.11 + FastAPI — ENGAGEMENT ONLY (docs/08 + R4)
│     ├─ app/                      # FastAPI app: /score, /score/grid, /score/video, /healthz
│     ├─ saliency/                 # TranSalNet (MIT) + grid/clutter/CTA heuristics (commercial path)
│     ├─ research/                 # OPTIONAL extra `.[research]`: TRIBE v2 — flag-gated, never in prod img
│     ├─ calibration/              # per-tenant band calibrator (isotonic/logistic) — R4 §7
│     ├─ pyproject.toml            # extras: [research] pulls TRIBE/V-JEPA2; prod build omits it
│     └─ Dockerfile                # Modal/Replicate GPU image (no [research] extra by default)
├─ packages/
│  ├─ shared/                      # TS types + zod — OBJECT MODEL, layer tree, provider contracts (docs/03)
│  │  └─ src/{entities,layer-tree,provider,engagement,enums,index}.ts
│  └─ render/                      # headless render (docs/06 owns internals)
│     ├─ src/static/               # polotno-node: tree→store JSON→PNG/JPG/PDF (PDF = document/carousel ads; L3)
│     ├─ src/video/                # Remotion project: compositions + renderMedia / Lambda
│     └─ src/index.ts              # renderDocument(spec) — single public facade (L5); dispatches internally
├─ supabase/
│  ├─ migrations/                  # DDL + RLS + pgmq/pg_cron (docs/03 owns SQL)
│  ├─ seed.sql                     # Brutal seed BrandKit v1 (docs/03 §7.2)
│  └─ config.toml
├─ turbo.json                      # ⚑ R-ARCH1 pipeline (build/lint/test/typecheck)
├─ pnpm-workspace.yaml
├─ .env.example                    # CANON §10 (docs/11 owns the catalogue)
└─ README.md
```

**Package dependency direction (must be acyclic):**

```
packages/shared  ◄────────── apps/web
        ▲                      │   │
        │                      │   └── packages/render  ──► packages/shared
        └── packages/render    │
                               └──(HTTP over ENGINE_URL)──► services/engine
services/engine  ── owns its OWN Python types; mirrors packages/shared shapes by contract, NOT by import
```

- `packages/shared` depends on **nothing internal** (only `zod`). Everything else imports it.
- `packages/render` imports `packages/shared` (for `LayerTree`/`VideoComposition` types); **`apps/web` never
  imports Polotno/Remotion directly** — it calls `packages/render` via the render surface (§9.3).
- `services/engine` is **not** in the JS graph. It shares shapes by **contract** (the `EngagementScores` JSON
  is defined in `docs/03`/CANON §6; Python re-declares it). Communication is HTTP over `ENGINE_URL`.

> `⚑ R-ARCH1 (RECOMMENDATION)` — Use **Turborepo** on top of the mandated pnpm workspace for task graph +
> remote build cache. Additive; CANON §4 says "pnpm monorepo" and does not forbid a task runner. Rationale:
> `packages/shared` type changes must rebuild `apps/web` + `packages/render` deterministically; Turbo makes CI
> fast and the dependency graph explicit. If the factory prefers `pnpm -r` scripts only, that also satisfies
> CANON — Turbo is a convenience, not a requirement.

> `⚑ R-ARCH2 (RECOMMENDATION)` — Keep **all provider drivers and the whole agent loop in `apps/web`** (Node
> server runtime), **not** in `services/engine`. CANON §4 assigns "agent orchestration" to `apps/web` and
> scopes `services/engine` to "engagement testing". This doc enforces that split hard: `services/engine` has
> **zero** knowledge of Anthropic/BFL/Kling/etc. — it only scores. This keeps the Python surface tiny, GPU-only,
> and independently deployable/scalable.

---

## 2. Runtime component map

```
                                        ┌─────────────────────────────────────────────────────────┐
                                        │                     BROWSER (client)                      │
                                        │  Next.js RSC/Client · Board · Polotno canvas (EditorAdapter)│
                                        │  Supabase Realtime sub ◄── job/variant progress            │
                                        └───────▲───────────────────────────────┬────────────────────┘
                                                │ (RLS: anon key + user JWT)     │ server actions / fetch
                                                │                                ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    apps/web  (Vercel — Node runtime)                                     │
│                                                                                                          │
│  ┌────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐  ┌───────────────┐  │
│  │ Route handlers │   │  AGENT ORCHESTRATOR (§6)    │   │  PROVIDER BUS + ROUTER (§3)│  │ COST METER   │  │
│  │  /api/* (§4.6) │──►│ runner · registry · gates · │──►│ image/video/audio/predictor│  │ caps (§6.5)  │  │
│  │ server actions │   │ bounded auto-iterate (≤2)   │   │ policy table · fallback ·  │  └───────────────┘  │
│  └───────┬────────┘   │ AgentRun logging · tokens   │   │ CACHE (§7)                 │                     │
│          │            └──────────┬──────────────────┘   └─────┬───────────────┬──────┘                     │
│          │  enqueue/status              │  LlmProvider (Anthropic)   │ GenerationJob │                     │
│          ▼                              ▼                            ▼               ▼                     │
│  ┌────────────────┐          ┌─────────────────┐       ┌────────────────────┐  ┌──────────────────────┐   │
│  │ JobQueue (§5)  │          │  Anthropic API  │       │ Image/Video/Audio  │  │ WORKERS (cron-driven)│   │
│  │ pgmq adapter   │          │ Sonnet5/Opus4.8 │       │ providers (R1/R2)  │  │ /api/workers/* (§5)  │   │
│  └───────┬────────┘          └─────────────────┘       └─────────┬──────────┘  └──────────┬───────────┘   │
│          │ send/read/archive                                     │ create→poll/webhook    │ drain queue   │
└──────────┼───────────────────────────────────────────────────────┼────────────────────────┼──────────────┘
           │                                                        │                        │
           ▼                                                        ▼                        ▼
┌─────────────────────────────┐        ┌──────────────────────────────┐     ┌────────────────────────────────┐
│   SUPABASE (managed)         │        │  EXTERNAL GEN APIs           │     │  RENDER SURFACE (§9.3)          │
│  Postgres + RLS (docs/03)    │        │  BFL/FLUX · fal · Gemini ·   │     │  Node container (Fly/Railway/   │
│  Auth (auth.users)           │        │  Ideogram · Recraft · OpenAI │     │  Modal/Vercel-fluid)            │
│  Storage (assets/renders)    │        │  Kling · ElevenLabs          │     │  packages/render:               │
│  pgmq (Queues) + pg_cron     │        │  (async: create→poll/webhook)│     │  polotno-node (headless Chrome) │
│  Realtime (progress)         │        └──────────────────────────────┘     │  Remotion renderMedia / Lambda  │
└──────────────┬──────────────┘                                             └────────────────┬───────────────┘
               │  ENGINE_URL (HTTP)                                                            │ writes Render
               ▼                                                                              ▼  → Storage/R2
┌───────────────────────────────────────────────┐                            ┌────────────────────────────────┐
│  services/engine  (Modal/Replicate — GPU)      │                            │  ASSET STORE                   │
│  FastAPI /score · /score/grid · /score/video   │                            │  Supabase Storage (default) /  │
│  saliency (TranSalNet MIT) + heuristics        │                            │  Cloudflare R2 (⚑ scale option)│
│  research/ TRIBE (flag-gated, NOT in prod img)  │                            └────────────────────────────────┘
└───────────────────────────────────────────────┘
```

**Trust boundaries (enforced, not advisory):**

| Boundary | Who may cross | Enforcement |
|---|---|---|
| **Client ↔ DB** | Browser uses **anon key + user JWT**; **RLS enforced** | `docs/03` §10 RLS; never ship `SUPABASE_SERVICE_ROLE_KEY` to client |
| **Server ↔ DB (privileged)** | Only workers/webhooks/orchestrator (server-only) use **service-role key** | Service-role key in server env only; `apps/web/src/server/supabase/server.ts` |
| **web ↔ engine** | `apps/web` → `services/engine` over `ENGINE_URL`; **never** the reverse | Engine is stateless scorer; no DB creds; signed request (§8.3) |
| **prod ↔ TRIBE** | TRIBE reachable **only** when `RESEARCH_MODE=true` **and** `ENGAGEMENT_BACKEND=tribe_research` | Prod engine image built **without** `.[research]` extra → import impossible (R4 §6) |
| **agent ↔ provider** | Agents call providers **only** via `ProviderBus` | Lint rule / code review: no direct provider SDK import outside `apps/web/src/server/providers` |

---

## 3. `ProviderBus` + router (CANON §6)

### 3.1 Canonical contracts (verbatim from CANON §6 — the bus implements these)

```ts
// packages/shared/src/provider.ts — DO NOT rename (CANON §6). docs/03 §12.4 owns the zod mirror.
type Modality = 'image' | 'video' | 'audio';

interface GenSpec {
  prompt: string; negativePrompt?: string;
  aspect: '1:1'|'1.91:1'|'4:5'|'16:9'|'9:16';
  seed?: number; refs?: AssetRef[]; model?: string; params?: Record<string, unknown>;
}
interface GenResult {
  assetId: string; width: number; height: number;
  provider: string; model: string; seed?: number; costUsd: number; raw: unknown;
}
interface ImageProvider { id: string; generate(s: GenSpec): Promise<GenResult>;
  edit?(s: EditSpec): Promise<GenResult>; upscale?(s: UpscaleSpec): Promise<GenResult>; }
interface VideoProvider { id: string; generate(s: VideoGenSpec): Promise<GenResult>; }
interface AudioProvider { id: string; tts(s: TtsSpec): Promise<GenResult>; }
interface LlmProvider { complete(...): Promise<string>; structured<T>(schema, ...): Promise<T>; }
interface EngagementPredictor { id: string; score(input: RenderRef|VideoRef|GridRef): Promise<EngagementScores>; }

interface ProviderBus {
  image(job): ImageProvider; video(job): VideoProvider; audio(job): AudioProvider;
  predictor(job): EngagementPredictor;
}
```

> `⚑ ASSUMPTION` — `AssetRef`, `EditSpec`, `UpscaleSpec`, `VideoGenSpec`, `TtsSpec`, `RenderRef`, `VideoRef`,
> `GridRef` are named-but-not-fully-shaped in CANON §6. **Their concrete shapes are defined in `docs/03`
> (types + zod).** This doc uses them as opaque handles. R2 §1.3/§4 informs `VideoGenSpec`/`TtsSpec` fields.

### 3.2 The router — what `image(job)`/`video(job)`/etc. actually do

The bus is a thin selector; the intelligence is a **policy table** keyed by **job kind** (not by model). This
doc defines the **runtime mechanics**; the **ranked provider lists** are owned by the providers doc (`docs/04`)
and R1 §9 (image), R2 §7 (video/audio), R4 §8 (engagement). The bus MUST read those lists from config, never
hardcode.

```ts
// apps/web/src/server/providers/bus.ts — mechanics only; lists come from policy config (R1/R2/R4).
export type JobKind =
  // image (R1 §9)
  | 'hero_imagery' | 'brand_consistent_edit' | 'product_in_scene' | 'in_image_text'
  | 'fast_draft' | 'carousel_slide_bg' | 'bg_remove' | 'aspect_relayout' | 'relight_upscale' | 'vector_asset'
  // video (R2 §7)
  | 'broll_t2v' | 'animate_still_i2v' | 'face_consistency' | 'dialogue_soundon'
  | 'premium_motion' | 'cheap_volume' | 'avatar_ugc'
  // audio (R2 §7)
  | 'voiceover' | 'sfx' | 'music'
  // engagement (R4 §8)
  | 'score_single' | 'score_carousel' | 'score_grid' | 'score_video' | 'score_landing';

interface PolicyEntry { jobKind: JobKind; modality: Modality|'predictor'; ranked: string[]; } // driver ids

class Router {
  constructor(private policy: PolicyEntry[], private registry: Map<string, Driver>) {}

  // Returns the FIRST registered+healthy driver for the job, honoring manual override.
  select(modality: Modality|'predictor', job: { kind: JobKind; overrideDriverId?: string }): Driver {
    if (job.overrideDriverId) return this.mustGet(job.overrideDriverId);        // CANON §6: override always wins
    const entry = this.policy.find(p => p.jobKind === job.kind && p.modality === modality);
    if (!entry) throw new ProviderError('no_policy', job.kind);
    for (const id of entry.ranked) {
      const d = this.registry.get(id);
      if (d && this.isHealthy(id)) return d;   // fallback walks the ranked list top→down
    }
    throw new ProviderError('all_drivers_unavailable', job.kind);
  }
}
```

**Fallback is two-layered:**
1. **Selection-time fallback** — `select()` skips drivers that are unregistered (missing env key) or
   circuit-broken (recent failures), returning the next in rank.
2. **Execution-time fallback** — the **worker** (§5) that runs a `GenerationJob` catches a hard failure from
   driver *k* and re-selects from rank *k+1* (excluding the failed id), up to `maxFallbacks` (default 2). Each
   attempt is logged; the final failure surfaces a graceful UI state (never a raw stack — CANON §4).

### 3.3 Driver registry (which drivers exist)

Registered at boot from present env vars (CANON §10). A driver whose key is absent is simply not registered
(and thus skipped by the router). Endpoint/auth/request skeletons for each live in the providers doc + R1/R2.

| Modality | Driver `id` | Backing (R1/R2) | Env (CANON §10) | Role |
|---|---|---|---|---|
| image | `bfl` | FLUX.2 [pro] direct (create→poll/webhook) | `BFL_API_KEY` | **Primary** photoreal/background |
| image | `fal` | fal gateway: Seedream, Recraft, Luma, Bria utils, FLUX fallback | `FAL_KEY` | Aggregator/fallback + Seedream |
| image | `gemini` | Gemini 3 Pro Image ("Nano Banana Pro") generate/edit | `GEMINI_API_KEY` | Reference-consistent + edit-in-place |
| image | `seedream` | Seedream 4.5 (via fal or direct) | `SEEDREAM_API_KEY` | Cost-optimized 4K (R7 ⚑R-PROV2: source via fal) |
| image | `ideogram` | Ideogram 3.0 | `IDEOGRAM_API_KEY` | **Fallback only** in-pixel text (R7 ⚑R-PROV1) |
| image | `recraft` | Recraft V3 (raster + **vector/SVG**) | `RECRAFT_API_KEY` | **Fallback / vector-asset** niche |
| image | `openai` | gpt-image-1.5 (NOT gpt-image-1) | `OPENAI_API_KEY` | Diversity fallback |
| video | `kling` | Kling v3 / v2.5-turbo (JWT HS256, task-based) | `KLING_ACCESS_KEY`,`KLING_SECRET_KEY` | **Primary video** |
| video | `fal` | Veo / Seedance / Runway / Luma via fal | `FAL_KEY` | Video fallbacks |
| video | `heygen` | HeyGen avatar (R2 §3) | `HEYGEN_API_KEY` (⚑ see below) | **`avatar_ugc`** lane (R2 ⚑) |
| audio | `elevenlabs` | ElevenLabs v3 / multilingual_v2 (TTS/SFX/music) | `ELEVENLABS_API_KEY`,`ELEVENLABS_VOICE_ID_*` | **Primary TTS/VO** |
| predictor | `saliency.transalnet` | engine: TranSalNet MIT (default) | `ENGINE_URL`,`ENGAGEMENT_BACKEND=saliency` | **Default** engagement |
| predictor | `saliency.expoze`/`.neurons`/`.dragonfly` | engine → paid vendor API | `ENGINE_URL` + vendor keys | Paid upgrade (R4 §3) |
| predictor | `heuristic.grid` / `video.heuristic` | engine: own heuristics | `ENGINE_URL` | Grid ranking / video first-3s |
| predictor | `research.tribe` | engine `research/` TRIBE v2 | `ENGAGEMENT_BACKEND=tribe_research`+`RESEARCH_MODE=true` | **R&D only, never tenant-facing** (R4 §6) |

> `⚑ R-ENV2 (RECOMMENDATION)` — R2 §3 adds an **`avatar_ugc`** lane (HeyGen). It needs a key not in CANON §10.
> Add **`HEYGEN_API_KEY`** to the env catalogue (`docs/11`) as an **optional** driver (avatar is a fast-follow;
> absence just leaves the lane unrouted). Also add **`POLOTNO_API_KEY`** (R7 ⚑R-ENV1 — Polotno is a paid SDK)
> and the engagement-vendor keys (`EXPOZE_*`, `NEURONS_API_KEY`, `DRAGONFLY_*`) as optional. None rename a
> canonical var; all are additive and gate their driver's registration. **VERIFY exact vendor var names in
> `docs/11` before coding.**

### 3.4 Sync vs async at the bus boundary

- **`LlmProvider.complete/structured`** (Anthropic) is **synchronous** from the orchestrator's view (seconds;
  awaited inline). Long fan-outs (e.g. 6-variant copy) MAY use Anthropic **Batch API** (50% cheaper) but that
  is an optimization inside the driver, not a queue concern.
- **`ImageProvider`/`VideoProvider`/`AudioProvider`/`EngagementPredictor`** are **always async** at the
  orchestration level: the orchestrator does **not** await them inline. It creates a **`GenerationJob`** row +
  enqueues a pgmq message; a **worker** runs the driver's create→poll/webhook cycle (§4/§5). The driver
  methods themselves are `async`, but a single driver call can take 30s–4min (Kling), so it is never on a
  request path.

---

## 4. Request & job lifecycles

Three lifecycle classes: **(A) synchronous request** (UI ↔ DB, agent text calls, apply-a-patch), **(B)
asynchronous generation job** (any external generator), **(C) the full brief→board pipeline** (orchestrates
many of A and B). Sequence diagrams are in text.

### 4.1 (A) Synchronous request lifecycle

Used for: reads (board, editor state), cheap agent text steps run inline (e.g. `EditorAgent` NL→`LayerPatch`),
applying a `LayerPatch`, triggering a re-render of already-generated layers. **No external generator.**

```
Browser ──(server action / fetch, RLS: anon+JWT)──► apps/web route handler
   route handler:
     1. authz: Supabase client with user JWT → RLS scopes to workspace_id
     2. (optional) LlmProvider.structured(...)  // e.g. EditorAgent → LayerPatch (seconds)
     3. mutate DB (variant.layer_tree ← apply(patch))   // docs/06 owns apply()
     4. return updated entity  (or 202 if it kicks a render — becomes a type-B job)
Browser ◄── 200 + updated entity  (optimistic UI reconciles)
```

- Budget: **< 3 s p95**. If a step would exceed that (any external generator), it MUST become a type-B job.
- **`EditorAgent` chat-to-edit** is sync *only* for the text→patch reasoning; if the patch requires
  **regenerating an image layer**, that regeneration is a type-B `GenerationJob` (a copy/color edit is not).

### 4.2 (B) Asynchronous generation job lifecycle — the core state machine

Every external generator call is a `GenerationJob` (DDL in `docs/03` §5). **Canonical `job_status` enum
(frozen superset, CANON §12 L3 — `docs/03` owns the DDL+zod; everything imports it):**
`('queued','dispatched','running','succeeded','failed','dead','cancelled','cached')`
(spelling: **`cancelled`**, two l's; the cache path terminal state **`cached`** is included).

```
queued → dispatched → running → succeeded
                   ↘ running → failed → (retry|fallback) → dispatched   (≤ maxAttempts)
                                       ↘ dead            (attempts exhausted → graceful UI)
   (cache hit, pre-enqueue) → cached   (§7 — identical spec resolved from cache, $0, no external call)
   (any) → cancelled   (cost cap breach pre-flight, or user cancel)
```

| Status | Meaning | Set by |
|---|---|---|
| `queued` | Row created, pgmq message sent, cost pre-checked | orchestrator / route handler |
| `dispatched` | Worker read the message, called provider `create`, stored provider `task_id` | dispatch worker (§5) |
| `running` | Provider accepted; awaiting poll/webhook | dispatch worker / provider ack |
| `succeeded` | Result asset persisted to Storage/R2, `Render`/`Asset` row written, cache filled | poll worker / webhook |
| `failed` | One attempt failed (timeout, provider error, moderation refusal) | worker |
| `dead` | `attempts ≥ maxAttempts` and no fallback left → surface graceful error + content-mod note | worker |
| `cached` | Identical spec resolved from the gen-cache pre-enqueue (§7) — `$0`, no external call, `Asset` ref written | orchestrator / route handler |
| `cancelled` | Pre-flight cost cap breach, or user/orchestrator cancel | cost meter / user |

**Sequence — async generation (poll variant, the default):**

```
Orchestrator (or route handler)
  │ 1. cost meter pre-check (per-brief + per-workspace caps, §6.5)   ── breach → job.cancelled
  │ 2. cache lookup: key=(provider,model,version,prompt,seed,params) (§7)
  │       hit → write Asset ref, return "succeeded" instantly (no external call, $0)
  │ 3. miss → INSERT generation_job(status=queued, spec=GenSpec)
  │ 4. pgmq.send('gen_jobs', { jobId })
  ▼
Browser subscribes: Supabase Realtime on generation_job WHERE id=jobId (or variant)
  ⋮ (returns 202 { jobId } immediately — UI shows skeleton + live progress)

── later, Vercel Cron (~every 10s) → /api/workers/gen-dispatch ──────────────────────────
Dispatch worker (service-role):
  5. pgmq.read('gen_jobs', vt=60s) → { jobId, msgId }
  6. driver = ProviderBus.<modality>({ kind, overrideDriverId })   // §3.2
  7. res = driver.create(spec)   // BFL POST /v1/flux-2-pro → {id, polling_url}; Kling POST image2video → task_id
  8. UPDATE job SET status='running', provider_task_id=res.id, poll_url=res.polling_url
  9. pgmq.archive(msgId)  (dispatch done); ENQUEUE poll message → 'gen_polls' with next_poll_at

── Vercel Cron (~every 10s) → /api/workers/gen-poll ────────────────────────────────────
Poll worker (service-role):
 10. pgmq.read('gen_polls') → { jobId }
 11. driver.poll(provider_task_id)  // BFL GET get_result?id=; Kling GET .../{task_id}
 12. switch status:
        Ready/succeed → download signed URL IMMEDIATELY (BFL ~10min TTL, Kling expiring) →
                        persist to Storage/R2 → INSERT Asset+Render → fill cache →
                        UPDATE job status='succeeded' → Realtime notifies UI
        still running → re-enqueue poll with backoff (3→5→8s), respect provider rate caps
        failed        → attempt++; if attempts<max AND fallback exists → re-dispatch next driver
                        else status='dead' → content-mod surface (CANON §4)
```

**Sequence — async generation (webhook variant, preferred where supported):** identical through step 9, but
instead of enqueuing a poll, the driver passes `webhook_url = ${APP_BASE_URL}/api/webhooks/{provider}` and the
provider POSTs the result. See §4.4.

**Why poll is the baseline, webhook the optimization:** webhooks require a stable public `APP_BASE_URL` and
per-provider signature verification (BFL `webhook_secret`, fal `?fal_webhook=`, Kling `callback_url`). Polling
works everywhere including local dev. Implement **both**; default to webhook when `APP_BASE_URL` is a real
https origin and the provider signature is verified, else poll. `VERIFY current docs before coding` — each
provider's webhook signature scheme (R1 §2.3, R2 §1.3).

### 4.3 (C) Full pipeline lifecycle (brief → board)

The orchestrator (§6) runs the agent loop; wherever it needs imagery/video/audio/score it spawns type-B jobs
and **awaits their `succeeded` Realtime/row transition** (via a `waitForJobs` helper that subscribes or polls
the DB) before proceeding to the compositor/scorer. See §6.2 for the full agent sequence. Latency budget: the
brief→board first paint is **skeleton-immediate**; variants stream in as their image jobs complete
(typically 20–90 s each depending on provider).

### 4.4 Provider webhook endpoints (async callbacks)

| Endpoint (`apps/web/src/app/api/webhooks/…`) | Provider | Verify | Body → action |
|---|---|---|---|
| `POST /api/webhooks/bfl` | BFL/FLUX | `webhook_secret` HMAC (R1 §2.3, VERIFY) | `{id,status:"Ready",result.sample}` → download→persist→succeed |
| `POST /api/webhooks/fal` | fal | `?fal_webhook=` payload + signature (VERIFY) | `{request_id, images:[…]}` → persist→succeed |
| `POST /api/webhooks/kling` | Kling | `callback_url` + JWT/signature (VERIFY) | `{task_id, task_status:"succeed", task_result.videos}` → persist→succeed |
| `POST /api/webhooks/elevenlabs` | ElevenLabs | (usually sync binary; webhook optional) | rarely used — TTS is short; may be inline in worker |

All webhook handlers: **idempotent** (dedupe on `provider_task_id`; a late webhook after a poll already
succeeded is a no-op), **signature-verified before trust**, and they **re-host the asset immediately** (signed
URLs expire — R1 §2, R2 §1.4). `VERIFY current docs before coding` for each signature mechanism.

### 4.5 Idempotency, retries, timeouts (cross-cutting)

| Concern | Rule |
|---|---|
| **Idempotency key** | `GenerationJob.id` is the idempotency key end-to-end; providers keyed on `provider_task_id`; cache key dedupes identical specs pre-enqueue (§7). |
| **Visibility timeout** | pgmq `vt` per read (dispatch 60s, poll 30s). If a worker dies mid-op, the message reappears after `vt` and is safely retried (idempotent). |
| **Max attempts** | `maxAttempts=3` per driver; `maxFallbacks=2` across drivers. Exhaustion → `dead` + graceful UI. |
| **Poll cap** | Cap poll attempts (e.g. 60 polls × 5s = 5 min) then `dead` with "generation timed out" (CANON §4 surface). |
| **Backoff** | Exponential on 429/5xx (respect BFL 24-concurrent / Kontext-max-6, fal queue — R1 §2). |
| **Failed-task cost** | Kling: **failed tasks are free** (R2 §1.4) — safe to retry. BFL/fal: a failed poll still may bill; prefer webhook + cap. |
| **Cancel** | Cost-cap breach or user cancel → `cancelled`; if provider task already dispatched, best-effort provider cancel + stop polling. |

### 4.6 Canonical HTTP endpoints (route handlers)

Exact paths the factory implements in `apps/web/src/app/api`. All authed routes use the **user JWT + RLS**; worker
and webhook routes use the **service-role key** and are protected by a shared secret / cron signature.

| Method | Path | Auth | Purpose | Returns |
|---|---|---|---|---|
| `POST` | `/api/briefs` | user JWT | Create `Brief`, kick off pipeline (§6) | `201 {briefId, adDocumentId}` |
| `GET` | `/api/briefs/:id` | user JWT | Brief + variants (board data) | `200 {brief, variants[]}` |
| `POST` | `/api/ad-documents/:id/variants/generate` | user JWT | (Re)generate variants for a doc | `202 {jobIds[]}` |
| `POST` | `/api/jobs` | user JWT | Enqueue a single `GenerationJob` (façade) | `202 {jobId}` |
| `GET` | `/api/jobs/:id` | user JWT | Job status (fallback to Realtime) | `200 {status, progress, result?}` |
| `POST` | `/api/editor/patch` | user JWT | Apply `LayerPatch` (direct or `EditorAgent`) | `200 {variant}` or `202 {jobId}` if regen |
| `POST` | `/api/render` | user JWT | Trigger render/export (static/pdf/video) | `202 {renderId}` |
| `GET` | `/api/render/:id` | user JWT | Render status + signed download URL | `200 {status, url?}` |
| `POST` | `/api/score` | user JWT | Request engagement score for a variant | `202 {jobId}` |
| `POST` | `/api/agents/run` | user JWT | (Internal/admin) run a named agent step | `200 {agentRunId, output}` |
| `POST` | `/api/workers/gen-dispatch` | cron secret | Drain `gen_jobs` (dispatch) — §5 | `200 {processed}` |
| `POST` | `/api/workers/gen-poll` | cron secret | Drain `gen_polls` (poll) — §5 | `200 {processed}` |
| `POST` | `/api/workers/render` | cron secret | Drain render queue (if async render) | `200 {processed}` |
| `POST` | `/api/webhooks/{bfl,fal,kling,elevenlabs}` | provider signature | Async gen callbacks — §4.4 | `200` |

---

## 5. Queues (Supabase Queues / pgmq default; Inngest adapter; pg-boss reserved)

CANON §4: "a job queue (Inngest **or** Supabase queue/`pg-boss`)". R7 ⚑R-INFRA1 recommends **pgmq as default,
Inngest as an adapter**. This doc adopts that and defines the abstraction so the choice is swappable.

### 5.1 `JobQueue` interface (the seam)

```ts
// apps/web/src/server/queue/index.ts — the ONLY queue API the rest of the app uses.
export interface JobQueue {
  send(queue: QueueName, payload: unknown, opts?: { delaySec?: number }): Promise<string>; // msgId
  read(queue: QueueName, opts?: { vtSec?: number; qty?: number }): Promise<QueueMsg[]>;
  archive(queue: QueueName, msgId: string): Promise<void>;   // success → remove
  deleteMsg(queue: QueueName, msgId: string): Promise<void>; // dead-letter path
}
export type QueueName = 'gen_jobs' | 'gen_polls' | 'renders' | 'scores';
export interface QueueMsg { msgId: string; readCt: number; enqueuedAt: string; payload: unknown; }
```

### 5.2 Default adapter — Supabase Queues (pgmq)

- **Backing:** `pgmq` extension in the same Postgres (`docs/03` §0.2 creates it). Queues:
  `gen_jobs`, `gen_polls`, `renders`, `scores`.
- **Enqueue:** `select pgmq.send('gen_jobs', $1::jsonb)` (or `send_batch`); `delaySec` → `pgmq.send(..., delay)`.
- **Dispatch loop:** **Vercel Cron** hits `/api/workers/gen-dispatch` (and `-poll`, `-render`) on a short
  schedule; the handler calls `pgmq.read('gen_jobs', vt, qty)`, processes, `pgmq.archive` on success. Long gen
  work is **at the provider** (we only create/poll), so each worker tick is short — fits serverless limits.
- **Guaranteed delivery / at-least-once:** pgmq gives at-least-once with a visibility window; our workers are
  **idempotent** (§4.5) so at-least-once is safe. `readCt` drives dead-lettering (`readCt > N` → `deleteMsg` +
  mark job `dead`).
- **Cron cadence (`⚑ ASSUMPTION`):** Vercel Cron minimum granularity is ~1/min on some plans; for sub-minute
  draining use a **self-re-arming worker** (worker processes a batch, and if the queue is non-empty, enqueues a
  short `delaySec` "kick" message or returns quickly for the next cron tick). `VERIFY current docs before
  coding`: Vercel Cron minimum interval on the target plan; pgmq visibility-window semantics; Supabase Edge
  Function timeout if you instead drive the loop from an Edge Function (R7 §6 notes ~150s).

> `⚑ R-QUEUE1 (RECOMMENDATION)` — Drive the queue drain from **Vercel Cron → Node route handlers in `apps/web`**
> (not Supabase Edge Functions), because the drivers, ProviderBus, and cost meter already live in `apps/web`
> and share types with `packages/shared`. This avoids duplicating provider logic in Deno/Edge. Supabase's own
> "Edge Function + pg_cron" pattern (R7 §6) remains a valid alternative if you want the queue drain fully inside
> Supabase; keep the `JobQueue` interface either way.

### 5.3 Alternative adapters (swappable behind `JobQueue`)

| Adapter | When | Env | Notes |
|---|---|---|---|
| **pgmq** (default) | MLP; zero new infra; RLS-native | `SUPABASE_*` | R7 ⚑R-INFRA1 |
| **Inngest** | If you need step-functions, fan-out, durable long workflows, richer observability | `INNGEST_*` (CANON §10, reserved) | Wrap Inngest events/steps behind `send/read`; Inngest replaces the cron-drain with its own execution |
| **pg-boss** | If you want a Node-native pg queue with built-in retry/cron and are not on Supabase Queues | `DATABASE_URL` | CANON lists it as an option; reserved fallback |

The rest of the app **never imports** a queue SDK directly — only `JobQueue`. Switching adapters is a config +
one-file change.

---

## 6. Agent orchestration runtime (CANON §7)

The orchestrator lives in `apps/web/src/server/studio`. It runs the **Creative Studio** agents as a **bounded,
observable pipeline** that emits **typed artifacts** (zod-validated), with two gates (`BrandGuardian` hard
gate; human-approve before ship) and **bounded auto-iterate (≤2)**. Per-agent prompts and IO schemas are owned
by the agents doc (`docs/05`); this doc owns the **runtime** (runner, registry, gating, iteration, cost,
logging).

### 6.1 Runtime primitives

```ts
// apps/web/src/server/studio/agents/runtime.ts
interface AgentContext {
  workspaceId: string; briefId: string; adDocumentId: string;
  brandKitVersion: string;                     // pinned for the whole run (CANON §5 lineage)
  llm: LlmProvider;                            // Anthropic; model tier chosen per agent (⚑R-LLM1)
  bus: ProviderBus;                            // gen + predictor access
  queue: JobQueue; cost: CostMeter;            // async jobs + spend caps
  log: (run: Partial<AgentRun>) => Promise<void>; // AgentRun logging (tokens/latency/cost_usd)
  waitForJobs: (jobIds: string[]) => Promise<GenResult[]>; // subscribe/poll until succeeded
}
interface Agent<In, Out> {
  name: AgentName;                              // CANON §7 exact names + IntakeAgent
  model: ClaudeTier;                            // 'sonnet-5' | 'opus-4-8' | 'haiku-4-5' (⚑R-LLM1)
  outSchema: ZodType<Out>;                      // structured output — NEVER free text
  run(input: In, ctx: AgentContext): Promise<Out>;
}
type AgentName =
  'IntakeAgent'|'Strategist'|'Copywriter'|'ArtDirector'|'CarouselArchitect'|
  'CompositorPlanner'|'BrandGuardian'|'Critic'|'EngagementAnalyst'|'EditorAgent'|'LocalizationAgent';
```

**Every `run()`** wraps the LLM call in an `AgentRun` record: `{agent_name, model, input_hash, output,
tokens_in, tokens_out, latency_ms, cost_usd, status}` (DDL in `docs/03`). Structured output is obtained via
Anthropic **tool/JSON schema** (`llm.structured(outSchema, …)`); a schema-invalid output triggers **one**
repair re-ask, then fails the step.

> `⚑ R-LLM1 (RECOMMENDATION, from R7)` — **Model tiering.** Default **Claude Sonnet 5** (`claude-sonnet-5`) for
> `IntakeAgent`, `Strategist`, `Copywriter`, `CompositorPlanner`, `EditorAgent`, `LocalizationAgent`. Escalate
> to **Opus 4.8** (`claude-opus-4-8`) for `ArtDirector`, `Critic`, hard `BrandGuardian` calls, and **any
> auto-iterate round-2**. Use **Haiku 4.5** (`claude-haiku-4-5`) for cheap classification / smart-layer binding
> / cache-key normalization. Model ids live in **config, never hardcoded**. `VERIFY current docs before coding`:
> model ids + Sonnet 5 intro pricing window (ends 2026-08-31) at `platform.claude.com/docs/en/about-claude/models/overview`.

> `⚑ R-A1 (RECOMMENDATION, from R7)` — Add **`IntakeAgent`** before `Strategist`: normalizes the one-line brief
> (+ optional URL/attachments) into a `Brief` object, asks **≤1–2 clarifying questions only if a required field
> is missing**, else proceeds on `BrandKit`/brief defaults. Additive; renames nothing.

### 6.2 The pipeline runner (sequence)

```
runPipeline(brief, ctx):
  ── STAGE 1: normalize ──────────────────────────────────────────────────────────────────
  intake  = IntakeAgent.run(brief)               // ≤1–2 Qs only if required (R7 ⚑R-A1)
  strategy= Strategist.run(intake)               // {audience, angle, JTBD, proof}

  ── STAGE 2: parallel copy ∥ art (text NEVER enters an image prompt — the anti-re-roll invariant) ──
  [copy, concept] = await Promise.all([
     Copywriter.run(strategy),                    // {hooks, headlines, CTAs} — specificity>cleverness
     ArtDirector.run(strategy),                   // {visualConcept, MODEL CHOICE, IMAGERY-ONLY prompt+neg}
  ])
  if adDocument.type == 'carousel':
     slides = CarouselArchitect.run(strategy, copy, concept)  // hook→reframe→close, continuity across slides

  ── STAGE 3: generate imagery (ASYNC, cached) ───────────────────────────────────────────
  jobs = for each variant/slide:
           bus.image({ kind: concept.jobKind }).…  →  enqueue GenerationJob (§4.2)
  images = await ctx.waitForJobs(jobs)             // streams as each succeeds

  ── STAGE 4: compose → GATE ─────────────────────────────────────────────────────────────
  tree = CompositorPlanner.run(concept, copy, images)   // → LAYER TREE (docs/03 schema)
  guard = BrandGuardian.run(tree, brandKit)             // HARD GATE (palette/voice/banned/disclaimer/locale)
  if !guard.pass:
     if round < 2: feed guard.reasons → back to Copywriter/ArtDirector/CompositorPlanner; round++; goto STAGE 2/4
     else: mark variant blocked_by_brand (never reaches board)

  ── STAGE 5: render → score (ASYNC render + engagement) ──────────────────────────────────
  render = packages/render.renderDocument({ tree, kind:'static' })  // L5: single facade; via render surface (§9.3) → Render row
  [critique, scores] = await Promise.all([
     Critic.run(render, playbook),                 // LinkedIn playbook + anti-patterns
     EngagementAnalyst.run( bus.predictor({kind:'score_single'}).score(renderRef) ), // bands+confidence
  ])

  ── STAGE 6: bounded auto-iterate (≤2) ──────────────────────────────────────────────────
  if weak(critique, scores) and round < 2:
     round++; feed structured critique → author agents; goto STAGE 2 (targeted, not full re-roll)

  ── STAGE 7: rank → BOARD ───────────────────────────────────────────────────────────────
  emit ranked Variants to THE BOARD  →  HUMAN in control (pick/compare/tweak/approve)
```

**Invariants the runner enforces (not the prompts):**
- **Imagery ∥ copy are separate branches** meeting only at `CompositorPlanner` — text never enters an image
  prompt (structural anti-re-roll).
- **Auto-iterate is bounded to ≤2 rounds total**, enforced in the runner loop counter — not trusted to a prompt.
- **Round-2 uses the escalation tier** (Opus 4.8, ⚑R-LLM1).
- **BrandGuardian is a hard gate**: a failing variant cannot reach the board.
- **Human-approve gate**: no export/ship without explicit human approval (CANON §7). Agents rank; they never
  choose or ship.

### 6.3 Concurrency & orchestration substrate

- The pipeline is **plain async TS** in `apps/web` (a server action / route handler that `await`s stages and
  `waitForJobs` for async gen). It is **not** itself a durable workflow engine — durability comes from the
  **`GenerationJob` rows + pgmq** (a crashed request can resume because job state is in Postgres, and the board
  reads variant/job state from the DB, not from in-memory pipeline state).
- **Fan-out** (N variants) = N independent `GenerationJob`s; the runner tracks them by id and the board streams
  each variant as its job succeeds. A partial failure (variant 3's image `dead`) shows a graceful per-variant
  error, never blocking the others.

> `⚑ R-ORCH1 (RECOMMENDATION)` — For the **MLP**, run the pipeline as an async server action driven by the same
> pgmq/`GenerationJob` durability described above (no extra engine). If/when pipelines need **guaranteed
> resumability across cold starts, step-level retries, or long human-in-the-loop pauses**, promote the runner
> onto the **Inngest adapter** (already the queue's alternate, §5.3): each STAGE becomes an Inngest step. This
> is a drop-in because stages already communicate through DB rows, not memory. CANON §4 permits Inngest; this
> keeps it optional. No canonical name changes.

### 6.4 Anthropic (LLM) integration — the `LlmProvider` driver

- **Auth:** `x-api-key: $ANTHROPIC_API_KEY` (Messages API) or Agent SDK. Structured outputs via tool/JSON
  schema; 1M context; prompt caching (90% off cached prefix); Batch API (50% off) for non-interactive fan-out.
- **`complete()`** → text; **`structured<T>(schema, …)`** → validated `T` (the default for every agent).
- `VERIFY current docs before coding`: model ids + intro-pricing window; tool/structured-output schema format;
  Batch API request shape (R7 §5.4).

### 6.5 Cost metering & caps (CANON §4/§10)

```ts
// apps/web/src/server/cost/meter.ts — enforced PRE-FLIGHT (refuse before spending).
interface CostMeter {
  estimate(op: 'llm'|'image'|'video'|'audio'|'score', spec: unknown): Promise<number>; // usd
  check(scope: { workspaceId: string; briefId?: string }, addUsd: number): Promise<CapDecision>;
  record(scope, actualUsd: number, ref: { agentRunId?: string; jobId?: string }): Promise<void>;
}
type CapDecision = { allowed: boolean; remainingBriefUsd: number; remainingWorkspaceUsd: number; reason?: string };
```

- **Pre-flight:** before enqueuing any `GenerationJob` or running an escalation-tier agent, `check()` the
  estimated cost against **per-brief** and **per-workspace** `cost_usd` caps. Breach → job `cancelled` (or agent
  step refused) with remaining-budget shown in UI (R7 §4).
- **Post-flight:** `record()` the **actual** `cost_usd` from `GenResult.costUsd` / `AgentRun` tokens. Caching
  (§7) records `$0` for cache hits.
- Caps + spend are surfaced live in the UI; **bounded auto-iterate (≤2)** and caching are themselves cost caps.

---

## 7. Caching (CANON §4)

**Cache key (verbatim, CANON §4):** `(provider, model, version, prompt, seed, params)`. Because **text is never
in an image prompt** (the imagery-only rule), prompts are **stable across copy edits** — a headline change does
**not** invalidate the image cache. This makes the re-roll spiral structurally impossible to reintroduce.

```ts
// apps/web/src/server/cache/gen-cache.ts
function genCacheKey(g: GenSpec & { provider: string; model: string; version: string }): string {
  const norm = { provider: g.provider, model: g.model, version: g.version,
                 prompt: g.prompt.trim(), negativePrompt: g.negativePrompt ?? null,
                 seed: g.seed ?? null, aspect: g.aspect,
                 params: canonicalize(g.params ?? {}), refs: (g.refs ?? []).map(r => r.hash) };
  return sha256(stableStringify(norm));            // deterministic; order-independent params
}
```

| Aspect | Decision |
|---|---|
| **Location** | Cache lives **inside the bus/worker path**; lookup happens **before** enqueue (§4.2 step 2) → a hit costs $0 and returns instantly. |
| **Store** | Key → `Asset`/`Render` row + object in **Supabase Storage / R2**. A `gen_cache` table (or index on `generation_job(cache_key)`) maps key → assetId. (`docs/03` owns the exact table.) |
| **Scope** | Cache is **workspace-scoped** (a key includes nothing tenant-specific except refs, but assets are stored per-workspace bucket path for RLS/deletion). `⚑ ASSUMPTION`: cross-workspace cache sharing is **off** by default for tenant isolation; a global cache for identical public prompts is a later optimization. |
| **Invalidation** | Keys are content-addressed → **immutable**; "invalidation" = a new key (different model/version/seed/params). Model-version bumps naturally miss and regenerate. |
| **Refs** | Reference images (`refs`) are hashed by content (`AssetRef.hash`) so the key is stable across re-uploads of the same file. |
| **Signed-URL re-host** | Provider signed URLs expire (BFL ~10min, Kling/vendor heatmaps ~5min) → workers **download immediately** into Storage/R2 and cache the **re-hosted** URL, never the provider URL (R1 §2, R2 §1.4, R4 §5.3). |
| **Engagement cache** | Scores cached by `(saliency_source, model_version, render_hash)` (R4 §8). |

**Prompt caching (Anthropic)** is a separate, complementary lever: cache the long system/brand-context prefix
across agent calls (90% off cached tokens). Distinct from the gen-cache above.

---

## 8. Data, auth, storage integration (CANON §4)

Full DDL/RLS/seed is in `docs/03`. This section is the **wiring contract** only.

### 8.1 Two Supabase clients (never conflate)

| Client | Key | Used by | RLS |
|---|---|---|---|
| **Browser / user-scoped** | `SUPABASE_ANON_KEY` + user JWT | `apps/web` UI, most route handlers | **Enforced** — scopes to `workspace_id` |
| **Server / privileged** | `SUPABASE_SERVICE_ROLE_KEY` | workers, webhooks, orchestrator (server-only) | **Bypasses** RLS — **never** shipped to client |

`apps/web/src/server/supabase/{browser,server}.ts` expose exactly these two; a lint rule forbids importing the server
client into client components. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` per CANON §10.

### 8.2 Storage layout

```
supabase-storage (or R2) buckets:
  assets/     {workspaceId}/{assetId}.{ext}     # generated imagery, refs, VO tracks (re-hosted, never provider URLs)
  renders/    {workspaceId}/{renderId}.{ext}    # PNG/JPG/PDF/MP4 exports (render_kind: png|jpg|pdf|svg + MP4 video)
  heatmaps/   {workspaceId}/{variantId}.png     # engagement attentionMap (re-hosted from vendor)
```

Paths are **workspace-prefixed** so Storage RLS + tenant deletion are trivial. `⚑ R-STORAGE1 (RECOMMENDATION)`
— default to **Supabase Storage**; offer **Cloudflare R2** as a scale/egress-cost option behind the same
`AssetStore` interface (CANON §4 lists "Supabase/R2"). Keep a thin `AssetStore` seam so the choice is config.

### 8.3 web ↔ engine contract

- `apps/web` calls `services/engine` over **`ENGINE_URL`** (HTTP/JSON). Engine is **stateless** — it receives a
  render reference (a Storage/R2 URL or bytes) + the **layer bboxes** (CTA/headline/logo positions from the
  layer tree — the killer feature vs pixel-only vendors, R4 §5.3) and returns `EngagementScores`.
- Requests are **signed** (shared secret / short-lived token in an `Authorization` header) so only `apps/web`
  can call the engine. `⚑ ASSUMPTION`: engine has **no DB creds** and never writes Postgres; `apps/web`
  persists the returned scores into `variant.engagement` (CANON §5).
- `ENGAGEMENT_BACKEND` (`saliency|tribe_research`) + `RESEARCH_MODE` select the engine mode; **prod builds ship
  the engine image WITHOUT the `.[research]` extra** so TRIBE cannot be imported (R4 §6, CANON §9).

---

## 9. Render & export paths (CANON §4; internals in `docs/06`)

`packages/render` is the **only** place headless Chromium (Polotno) and Remotion run. `apps/web` triggers
renders via the **render surface** (§9.3) and never imports Polotno/Remotion. Export derives all ratios from
**one base** via smart re-layout (`docs/06`), never naive crop (CANON §8).

**Public facade (frozen, CANON §12 L5):** `packages/render` exposes exactly one public entry —
**`renderDocument(spec): Promise<RenderResult>`** — which dispatches internally to `renderStatic`, `renderPdf`,
`renderVideoLocal`, and `encodeImageUnder5MB` (`docs/06` owns those internal signatures). The orchestrator and
route handlers call **`renderDocument(...)`** only — never an internal renderer directly.

### 9.1 Static / carousel (Polotno headless)

```
LayerTree (canonical, docs/03)
      │  EditorAdapter projection (docs/06 §3)
      ▼
Polotno store JSON  ──(polotno-node, headless Chromium)──►  { PNG | JPG (≤5MB) }   # single_image
                                                     └────►  PDF                    # carousel/document ad (the ONLY native document output — L3)
```

- **Document/carousel ads ship as PDF only (CANON §12 L3).** A **PowerPoint (`.pptx`) export is NOT a native
  `polotno-node` output** and is **out of scope for v1**. If ever needed it is a **separate post-render step**
  (flagged `VERIFY`), never a native render path — do not reintroduce it as a fact.
- **Editor↔export parity:** the editor canvas and the headless exporter render from the **same store JSON**
  (one store, two renderers, one truth — `docs/06` §7). A CI parity test blocks divergence.
- **Multi-ratio:** `smartRelayout(tree, ratio)` (with per-layer `renderHints`, R7 ⚑R-LT1) produces 1:1
  (1200×1200), 1.91:1 (1200×627), 4:5 (960×1200) from one base, respecting safe zones / "see more" fold
  (CANON §8, `docs/06` §5).
- **Size gate:** every export runs a `probeFileSize()`; JPG/PNG re-encode to hit **≤5 MB** (`docs/06` §8.5).

### 9.2 Video (Remotion)

```
video_composition (canonical, docs/03 §9 / CANON §5)
      │  Remotion inputProps (docs/06 §10.1)
      ▼
Remotion composition  ──(renderMedia local | renderMediaOnLambda scale)──►  MP4 (h264, ≤200 MB)
   layers: <OffthreadVideo> Kling clips + <Audio> ElevenLabs VO/bed/SFX
           + burned-in captions (muted-first) + brand cards/CTA/logo/legal (vector layers — NOT baked)
```

- **Muted-first, burned-in subtitles** carry the story; first-3-seconds stopping power (CANON §8, R2 §5).
- **Captions timing** from ElevenLabs `with-timestamps` → `@remotion/captions` `createTikTokStyleCaptions`
  (R2 §5.1) — no Whisper needed on the happy path.
- **≤200 MB gate:** tune `crf`/preset; `probeFileSize()` re-encodes if over (R2 §5.3, `docs/06` §10.4).
- **Local vs Lambda:** local `renderMedia` on the render surface (§9.3) for MLP; `renderMediaOnLambda` for
  parallel/scale (R2 §5.2). `⚑ LICENSE`: **Remotion Company License** required (4+ employees) — budget it
  (R2 §5.3, R7 §6). `VERIFY current docs before coding`.

### 9.3 The render surface (deployment of `packages/render`)

**Problem:** `polotno-node` (headless Chromium) and Remotion local render need **long execution + memory**,
which Vercel serverless functions do not reliably provide.

> `⚑ R-RENDER1 (RECOMMENDATION)` — Deploy `packages/render` as a **long-running Node service/container** (Fly.io
> / Railway / a Modal Node function / Vercel fluid-compute container) that `apps/web` invokes over HTTP (an
> internal `RENDER_URL`), OR run static export inside a Vercel function only if the target plan supports
> headless Chromium within limits — **VERIFY**. Video render (Remotion) is best on **Remotion Lambda** or a
> dedicated render container. Model it as an **async render job** (queue `renders`, §5) with the same
> create→succeed lifecycle (§4.2): request → `202 {renderId}` → worker renders → writes `renders/…` → Realtime
> notifies UI. `⚑ ASSUMPTION`: introduces an internal `RENDER_URL` (add to `docs/11` as optional; if the
> factory renders inside a Vercel container, `RENDER_URL` = self). This does not rename any canonical var and
> keeps `packages/render` per CANON §4.

---

## 10. Deployment topology (CANON §4)

```
                         ┌───────────────────────────── Vercel ─────────────────────────────┐
  users ── https ───────►│  apps/web  (Next.js 15, Node runtime)                             │
                         │   · UI (RSC/Client) + route handlers + server actions              │
                         │   · AGENT ORCHESTRATOR + ProviderBus + drivers + cost meter        │
                         │   · Vercel Cron ──► /api/workers/{gen-dispatch,gen-poll,render}     │
                         └───┬───────────────┬───────────────────────────┬───────────────────┘
                             │ RLS anon+JWT  │ service-role (server-only)  │ HTTP
                             ▼               ▼                             ▼
              ┌──────────────────────────────┐   ┌──────────────────────────────────────────┐
              │        SUPABASE (managed)     │   │   RENDER SURFACE (⚑R-RENDER1)             │
              │  Postgres + RLS (docs/03)     │   │   Node container: polotno-node + Remotion │
              │  Auth · Storage · Realtime    │   │   (Fly/Railway/Modal-node) OR Remotion    │
              │  pgmq (Queues) + pg_cron      │   │   Lambda for video                        │
              └───────────────┬───────────────┘   └───────────────────────┬──────────────────┘
                              │ ENGINE_URL (HTTP)                          │ writes renders/…
                              ▼                                            ▼
              ┌──────────────────────────────────────┐        ┌──────────────────────────────┐
              │  services/engine (Modal / Replicate)  │        │  ASSET STORE                 │
              │  FastAPI + GPU: saliency (TranSalNet)  │        │  Supabase Storage / R2       │
              │  research/ TRIBE — flag-gated, absent  │        └──────────────────────────────┘
              │  from prod image (no .[research])       │
              └──────────────────────────────────────┘

  EXTERNAL APIs (called from apps/web drivers, async): BFL/FLUX · fal · Gemini · Ideogram ·
     Recraft · OpenAI · Kling (JWT) · ElevenLabs      (create→poll/webhook; results re-hosted to Storage/R2)
```

| Layer | Platform | Scales on | Notes |
|---|---|---|---|
| Web + orchestrator + drivers + workers | **Vercel** (Node runtime) | requests; cron for workers | CANON §4. Keep drivers/agents here (⚑R-ARCH2). |
| DB + Auth + Storage + Queue + Realtime | **Supabase** | managed | pgmq default queue (⚑R-INFRA1); RLS from day 1. |
| Engagement engine (GPU) | **Modal / Replicate** | score volume; GPU | Stateless; `ENGINE_URL`; prod image omits TRIBE. |
| Static/PDF render | **Render surface** (container) | render volume | ⚑R-RENDER1; long-running Node + headless Chromium. |
| Video render | **Remotion Lambda** / render container | render volume | Company License required (R2 §5.3). |
| Assets | **Supabase Storage / R2** | storage/egress | Re-hosted signed URLs; workspace-prefixed paths. |

**Environments:** `local` (poll-only, engine optional, TRIBE never), `preview` (per-PR, `APP_BASE_URL` = Vercel
preview URL → webhooks work), `prod`. `APP_BASE_URL` must be a real https origin per env for webhooks/callbacks
(CANON §10). A **startup check** validates pinned model ids (Anthropic Models API + BFL/Gemini reachability) and
fails fast if a pinned model was retired (R7 §7 model-drift resilience).

---

## 11. Cross-cutting: observability, failure modes, security (CANON §4/§9)

| Concern | Mechanism |
|---|---|
| **Observability** | Every agent call → `AgentRun` (tokens/latency/`cost_usd`/model/status). Every gen → `GenerationJob` (provider/model/seed/cost/status/attempts). Every score → `variant.engagement` + cache row. `AuditLog` for privileged actions (CANON §5). |
| **No raw failure to user** | Every external call is a `GenerationJob` with a fallback chain (§3.2) + graceful UI state + **content-moderation surface** on refusal (CANON §4). |
| **Cost safety** | Pre-flight caps (§6.5); bounded auto-iterate (≤2); caching (§7). Orchestrator refuses jobs that would breach caps. |
| **License containment (highest severity)** | **CI gate** ensures TRIBE (CC-BY-NC) is unreachable when the commercial flag is set: prod engine image built **without** `.[research]`; router **hard-errors** if a tenant-facing job resolves to `research.tribe`; `research.tribe` is **not registered** unless `RESEARCH_MODE=true` (R4 §6, CANON §9). |
| **Model-drift resilience** | Model ids in **config**, never hardcoded; startup reachability check; version bump → cache miss → clean regenerate. |
| **Tenant isolation** | RLS from day 1 (`docs/03` §10); service-role key server-only; storage paths workspace-prefixed; cache workspace-scoped; cross-tenant read test in CI. |
| **Idempotency** | Job id + `provider_task_id` dedupe; webhook + poll converge idempotently (§4.5). |

---

## 12. How this maps to the R7 build order (P0–P10) — architecture readiness per phase

| Phase (R7 §3) | Architecture pieces this doc requires in place |
|---|---|
| **P0 Skeleton** | Monorepo (§1), `packages/shared` contracts, Supabase + RLS + pgmq/pg_cron (§5/§8), `.env.example`, seed. |
| **P1 Render spine** | `packages/render` static path + **render surface** (§9.1/§9.3); editor↔export parity harness. |
| **P2 One image provider + bus** | `ProviderBus` mechanics (§3) + **one** driver (`bfl`), `GenerationJob` async lifecycle (§4.2), pgmq workers (§5), cache (§7), cost meter (§6.5). |
| **P3 Agent loop (static)** | Orchestration runtime (§6) `IntakeAgent…BrandGuardian`, `AgentRun` logging, model tiering (⚑R-LLM1). |
| **P4 Board + editor** | `/api/editor/patch` sync lifecycle (§4.1), `EditorAgent`→`LayerPatch` (docs/06), Realtime progress. |
| **P5 Export to spec** | Multi-ratio export + size gates (§9.1). |
| **P6 Critic + Engagement** | `services/engine` deploy (§10), `predictor` drivers (§3.3), web↔engine contract (§8.3). |
| **P7 Carousel** | `CarouselArchitect` stage (§6.2), PDF document export (§9.1), per-slide scoring. |
| **P8 Localization** | `LocalizationAgent` stage; smart-layer/locale binding (docs/03/06). |
| **P9 Video** | `kling`/`elevenlabs` drivers (§3.3), Remotion video path + render surface / Lambda (§9.2). |
| **P10 Results + calibration** | `Result` ingest → per-tenant band calibrator in `services/engine` (R4 §7); scheduled via pg_cron. |

---

## 13. Consolidated "VERIFY current docs before coding" (architecture-specific)

1. **Vercel Cron minimum interval** on the target plan + whether Node route handlers can drain pgmq within
   function limits (else use the render/worker container or Supabase Edge Function pattern). [R7 §6]
2. **pgmq** `send/read/archive` signatures, visibility-window semantics, `read_ct` for dead-lettering;
   `pg_cron` scheduling. `https://supabase.com/docs/guides/queues`
3. **Supabase Realtime** subscription limits for streaming per-variant/job progress at scale.
4. **Anthropic** model ids (`claude-sonnet-5`/`opus-4-8`/`haiku-4-5`), structured-output/tool schema format,
   Batch API + prompt-caching request shapes, intro-pricing window (ends 2026-08-31). [R7 §5.4]
5. **BFL / fal / Kling webhook signature** schemes before trusting any webhook payload (§4.4). [R1 §2.3, R2 §1.3]
6. **Provider signed-URL TTLs** (BFL ~10min, Kling/vendor heatmaps ~5min) → re-host immediately. [R1/R2/R4]
7. **polotno-node** headless-render fidelity for Playfair Display + Inter; whether it runs inside a Vercel
   function or needs the render container. (Document/carousel ads ship as **PDF** — PowerPoint export is out of scope, L3.) [R7 §6, docs/06]
8. **Remotion Company License** requirement + Lambda region/memory/IAM setup. [R2 §5.3, R7 §6]
9. **Modal/Replicate GPU tier** adequacy for TranSalNet (and TRIBE R&D) — benchmark before committing. [R4 §9]
10. **web↔engine auth** (signed request scheme) + engine statelessness (no DB creds). [§8.3]
11. **Env additions** — `HEYGEN_API_KEY`, `POLOTNO_API_KEY`, engagement-vendor keys, `RENDER_URL` — confirm
    exact names in `docs/11` (⚑R-ENV2/⚑R-RENDER1). None rename a canonical var.

---

## 14. Consolidated recommendations (all additive / flagged — nothing silently diverges from CANON)

| # | Recommendation | Impact | Conflicts with CANON? |
|---|---|---|---|
| ⚑R-ARCH1 | Turborepo on top of the mandated pnpm workspace | Deterministic builds + cache | No — additive to "pnpm monorepo" |
| ⚑R-ARCH2 | All drivers + agent loop in `apps/web`; `services/engine` = engagement only | Clean split; tiny GPU surface | No — matches CANON §4 scoping |
| ⚑R-LLM1 | Sonnet 5 default / Opus 4.8 escalation / Haiku 4.5 cheap (from R7) | ~40% LLM cost cut | No — satisfies "latest models" + adds lever |
| ⚑R-A1 | Add `IntakeAgent` before `Strategist` (from R7) | Near-zero-friction intake | No — additive agent |
| ⚑R-INFRA1 | Default queue = Supabase Queues (pgmq); Inngest = adapter (from R7) | Zero new infra for MLP | No — CANON offers "Inngest OR Supabase queue" |
| ⚑R-QUEUE1 | Drain pgmq via Vercel Cron → Node route handlers (drivers live in `apps/web`) | No duplicated provider logic | No — implementation detail under CANON §4 |
| ⚑R-ORCH1 | MLP pipeline = async server action on pgmq durability; promote to Inngest steps only if needed | Simplicity now, resumability later | No — Inngest is permitted |
| ⚑R-RENDER1 | Deploy `packages/render` as a long-running render surface (container) + Remotion Lambda for video | Headless Chromium/Remotion need long+memory | No — realizes CANON §4 render pkg |
| ⚑R-STORAGE1 | Supabase Storage default; R2 behind an `AssetStore` seam | Egress-cost option | No — CANON lists "Supabase/R2" |
| ⚑R-ENV2 | Add optional `HEYGEN_API_KEY`, `POLOTNO_API_KEY`, engagement-vendor keys, `RENDER_URL` | Unblocks avatar/editor/scoring/render | Minor — fills §10 omissions (from R7 ⚑R-ENV1) |

---

## 15. Cross-document assumptions made here (flag to sibling docs)

1. **Doc numbering** for agents (`04`), providers (`05`), engagement (`08`), env (`11`) is assumed from CANON §3
   + existing `01/03/06`; **role names are canonical, integers are not** (see header ⚑ASSUMPTION).
2. **`GenerationJob` status enum** (`queued|dispatched|running|succeeded|failed|dead|cancelled|cached`, §4.2) and
   **queue names** (`gen_jobs|gen_polls|renders|scores`, §5) are defined here as the wiring; **`docs/03` owns
   the actual DDL** — if `docs/03` names them differently, `docs/03` wins and this doc should be reconciled to it.
3. **`RENDER_URL`** (internal render surface, §9.3) and **`HEYGEN_API_KEY`/`POLOTNO_API_KEY`/vendor keys** (§3.3)
   are additive env vars to be catalogued in `docs/11`; all optional; none rename CANON §10 vars.
4. **Opaque contract shapes** (`AssetRef`/`EditSpec`/`UpscaleSpec`/`VideoGenSpec`/`TtsSpec`/`RenderRef`/
   `VideoRef`/`GridRef`) are **defined in `docs/03`**; this doc treats them as handles.
5. **`apply(LayerPatch)`, Polotno projection, `smartRelayout`, and the `packages/render` internal signatures
   (`renderStatic`, `renderPdf`, `renderVideoLocal`, `encodeImageUnder5MB` behind the single `renderDocument(spec)`
   facade — L5)** are **owned by `docs/06`**; this doc references them and must not be read as re-defining them.
6. **Per-agent prompts/IO schemas** and **per-provider endpoint/auth skeletons + ranked policy lists** are
   **owned by the agents doc / providers doc + R1/R2/R4**; this doc owns only the runtime + router mechanics.
