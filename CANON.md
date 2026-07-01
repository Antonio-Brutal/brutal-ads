# CANON — Brutal Ads: canonical context, locked decisions & shared interfaces

> Every author/critic agent MUST read this file first and conform to it exactly. It is the single
> source of truth for names, interfaces, stack, and decisions so that ~15 independently-authored
> documents stay internally consistent and a one-shot AI build factory can execute them without
> contradiction. If research suggests a change, note it as a flagged recommendation — do NOT silently
> diverge from these names/shapes.

## 0. What we are building
**Brutal Ads** — a platform that turns a one-line brief into high-converting **LinkedIn ads**
(static single-image + multi-slide carousel/document ads first; **video** as a first-class fast-follow),
each one **easy to generate and easy to edit**. Multi-tenant, but **Brutal AI is the first/seed tenant.**

The north star: *type a brief → get a board of on-brand, testable LinkedIn ads → tweak any element by
drag or by chat → predict engagement → export to exact LinkedIn spec.* No prompt-engineering, no re-rolling.

## 1. Who this is for / the client
- **Brutal AI** (brutal.ai) — AI product; verticals so far: **legal AI for German-speaking law firms** and a **private-equity** angle. Founder/operator: Antonio (antonio@brutal.ai).
- Voice/register: **sober, editorial, documentary — NOT hype AI**. Muted-first (burned-in subtitles carry the story), sound-on optional. **Bilingual: German + English** (localization is first-class).
- Seed brand: dark palette, **Playfair Display** (display) + **Inter** (body); accents gold `#cba65e` + lime `#b6e64a` (PE set) / acid-lime for the app chrome. Treat these as the seed Brand Kit, not hardcoded product logic.

## 2. What was tried before (and why it hurt) — do not repeat
- **Carousels:** 13 angles × 3 slides (**hook → reframe → close**) generated as **baked-text PNGs** via **FLUX (BFL) + Ideogram + Recraft**, hosted as a static swipeable HTML site on Vercel. Pain: every slide art-directed through a text-to-image prompt; **text baked into pixels** → illegible/off-brand/uneditable → endless prompt-and-re-roll.
- **Video:** **Kling** (`kling-v3` / `kling-v3-omni`, JWT-auth official API) → **ElevenLabs** German VO → **Remotion** assembly → MP4, all specified in a single `claude-code-brief.md`.
- **Hosting/portal:** static sites + a Supabase/Vercel "Brutal Portal".
- **Prior platform attempt:** "ScrollStopper" turborepo (SOW/architecture/build-plan docs).
- Heavy model usage observed in transcripts: **BFL/FLUX** (primary imagery), **Ideogram** + **Recraft** (in-image text), **Kling** (video), **ElevenLabs** (VO), some **nano-banana/Gemini image**; minimal Seedream/Seedance.

**The core lesson → THE load-bearing decision:** *AI generates imagery only; every element that must be
legible or on-brand (headline, subhead, logo, CTA, legal, price, slide copy) is a **composited, editable
vector/text layer** on a JSON layer tree.* This single decision dissolves both "hard to prompt" and
"hard to edit." It applies to single-image AND carousel slides.

## 3. The handoff format we must match (the factory's diet)
The deliverable is a **paste-into-Claude-Code build package**: a top `README.md`, a
`BUILD.md` (the actual instruction the factory executes), and `docs/NN-*.md`.
Match the proven `claude-code-brief.md` style already used by this client:
exact output specs, explicit repo structure, `.env` blocks, npm/pnpm scripts, **"verify this API before
coding" steps**, per-asset prompt + negative-prompt templates, timeline/spec tables, and fallbacks
("expect to regenerate hands 2–3×"). Be **10× more thorough** than a normal spec: assume the builder has
zero outside context and must succeed in as few shots as possible.

## 4. LOCKED technical decisions (all docs conform)
- **Repo shape:** pnpm monorepo.
  - `apps/web` — **Next.js 15 (App Router) + TypeScript + Tailwind v4 + shadcn/ui**. UI, server actions, route handlers, agent orchestration.
  - `services/engine` — **Python 3.11 + FastAPI** — engagement testing (saliency + grid ranking + landing attention; TRIBE v2 R&D behind a flag). GPU-optional (Modal/Replicate).
  - `packages/shared` — shared TS types (the object model, layer tree, provider contracts), zod schemas.
  - `packages/render` — headless render (Polotno store JSON → PNG/JPG; PDF/PPTX for document ads) + Remotion project for video.
- **Data/Auth/Storage:** **Supabase** (Postgres + Row-Level Security + Auth + Storage). Multi-tenant via `workspace_id` + RLS from day one.
- **Editor:** **Polotno SDK** for the layered static/carousel canvas (wrapped behind an `EditorAdapter` so it's swappable); **Remotion** for video documents. Chat-to-edit emits typed **LayerPatch** diffs, never full re-rolls.
- **LLM / agents:** **Anthropic Claude** (server-side, Agent SDK or Messages API) for the whole Creative Studio. Latest models; structured outputs via tool/JSON schema.
- **Providers behind interfaces** (see §6). Image: BFL, Fal, Ideogram, Recraft, Google (nano-banana/Gemini image), OpenAI gpt-image, ByteDance Seedream. Video: Kling (primary), Seedance, Veo, Runway. Audio: ElevenLabs. Router picks per job; manual override always available.
- **Jobs:** generation is async — a job queue (Inngest **or** Supabase queue/`pg-boss`) with progress the UI subscribes to. Cache by `(provider, model, version, prompt, seed, params)`.
- **Hosting:** Vercel (web) + Supabase (data) + Modal/Replicate (engine GPU) + Supabase/R2 (assets).
- **Observability & cost:** every agent call and generation job is logged with tokens/latency/`cost_usd`; hard per-brief and per-workspace spend caps; content-moderation surface on gen failures.

## 5. Canonical object model (exact names — all docs use these)
`Workspace` → `BrandKit` (versioned) → `Campaign` → `Brief` → `AdDocument` → `Variant` → (`Slide` for carousel) → `Layer`.
Supporting: `Asset`, `Render`, `Experiment`, `ExperimentArm`, `Result`, `AgentRun`, `GenerationJob`, `AuditLog`, `WorkspaceMember`.
- `AdDocument.type` ∈ `single_image | carousel | video`.
- `AdDocument`/`Variant` carry a **layer tree** (JSON). Carousel = ordered `Slide[]`, each slide has its own layer tree. Video = a Remotion composition spec + layer/subtitle/audio tracks.
- **Layer types:** `image | text | logo | shape | cta | frame | legal | group | smart`. (`smart` = data-bound, e.g. `{{customer_count}}+ firms`.)
- **Lineage on every Variant:** `brief_id, brand_kit_version, provider, model, model_version, seed, prompt, negative_prompt, parent_variant_id, created_by (human|agent), engagement{}`.

## 6. Canonical provider contracts (TypeScript — all docs use these signatures)
```ts
type Modality = 'image' | 'video' | 'audio';
interface GenSpec { prompt: string; negativePrompt?: string; aspect: '1:1'|'1.91:1'|'4:5'|'16:9'|'9:16';
  seed?: number; refs?: AssetRef[]; model?: string; params?: Record<string, unknown>; }
interface GenResult { assetId: string; width: number; height: number; provider: string; model: string;
  seed?: number; costUsd: number; raw: unknown; }

interface ImageProvider { id: string; generate(s: GenSpec): Promise<GenResult>;
  edit?(s: EditSpec): Promise<GenResult>; upscale?(s: UpscaleSpec): Promise<GenResult>; }
interface VideoProvider { id: string; generate(s: VideoGenSpec): Promise<GenResult>; }
interface AudioProvider { id: string; tts(s: TtsSpec): Promise<GenResult>; }
interface LlmProvider { complete(...): Promise<string>; structured<T>(schema, ...): Promise<T>; }
interface EngagementPredictor { id: string; score(input: RenderRef | VideoRef | GridRef): Promise<EngagementScores>; }

// Router picks a driver per job from a policy table (job → ranked providers), with override + fallback.
interface ProviderBus { image(job): ImageProvider; video(job): VideoProvider; audio(job): AudioProvider;
  predictor(job): EngagementPredictor; }
```
`EngagementScores`: `{ attentionMap?, focalClarity, valuePropAttention, ctaAttention, clutter,
stoppingPower, firstThreeSeconds?, predictedCtrBand?{low,high,confidence}, perSlide?: [...], raw }`.

## 7. Canonical Creative Studio agents (exact names)
`Strategist` (brief→strategy), `Copywriter` (hooks/headlines/CTAs; specificity>cleverness),
`ArtDirector` (visual concept + model choice + imagery-only prompt), `CarouselArchitect`
(multi-slide narrative: hook→reframe→close, continuity across slides), `CompositorPlanner`
(concept→layer tree), `BrandGuardian` (hard gate: palette/voice/banned terms/disclaimer/localization),
`Critic` (scores vs the LinkedIn playbook + anti-patterns), `EngagementAnalyst` (calls EngagementPredictor,
interprets, recommends), `EditorAgent` (NL → typed LayerPatch), `LocalizationAgent` (DE⇄EN transcreation,
not literal translation; TTS-safe number spelling e.g. "zwölfhundert"). All observable via `AgentRun`,
cost-bounded, human-approve gate before anything ships. Bounded auto-iterate (≤2 rounds) on weak variants.

## 8. Canonical LinkedIn format specs (2026 — agents/exporter enforce)
- **Single image:** ratios 1:1 (1200×1200, default — best mobile feed), 1.91:1 (1200×627), 4:5 (960×1200, mobile-only). JPG/PNG/GIF ≤5 MB. Headline ≤70 chars; intro text ~150 visible before "see more" (600 max).
- **Carousel / document ads:** multi-page (up to ~10–12 slides); square 1080×1080 recommended; delivered as a PDF document ad; per-slide hook→reframe→close narrative.
- **Video:** 1:1 or 4:5 or 16:9; ≤200 MB (client's proven paid limit); design **muted-first** with burned-in subtitles; first 3 seconds carry stopping power.
Docs must treat these as canonical and have the platform derive all ratios from one base via smart re-layout (not naive cropping), respecting safe-zones (feed crop, profile overlap, "see more" fold).

## 9. Engagement testing — canonical stance (see docs/08)
Reference implementation = **`amirmushichge/tribeV2_ViralAnalyser`** ("TRIBE Review MVP"): local FastAPI app
doing (a) video **brain-response curves** + weak-moment detection, (b) **static image-grid salience ranking**
(4–12 options; contrast/color/position/focus), (c) landing-page **attention heatmaps**. It uses Meta **TRIBE v2**
(HF `facebook/tribev2`) + Whisper + optional Ollama. **License: CC-BY-NC-4.0 (non-commercial) — inherited from TRIBE.**
→ **Decision:** wrap engagement behind `EngagementPredictor`. Ship a **commercially-clean static path**
(own/licensed saliency + the grid-salience heuristics, which are commercially usable) for production; keep
**TRIBE v2 as a flag-gated R&D backend** in `services/engine` (never on the commercial path). Always report
scores as **bands + confidence**, calibrated against the tenant's **real LinkedIn results** over time.

## 10. Canonical env var names (docs/11 expands; keep identical everywhere)
`ANTHROPIC_API_KEY`, `BFL_API_KEY`, `FAL_KEY`, `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY`, `GEMINI_API_KEY`,
`OPENAI_API_KEY`, `SEEDREAM_API_KEY` (via Fal/BytePlus), `KLING_ACCESS_KEY`, `KLING_SECRET_KEY`,
`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_*`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`ENGINE_URL`, `ENGAGEMENT_BACKEND` (`saliency|tribe_research`), `RESEARCH_MODE`, `INNGEST_*`, `APP_BASE_URL`.

## 11. Tone & quality bar for the docs themselves
Write as the world's best software engineer + world's best LinkedIn performance marketer, for an autonomous
builder. Be exhaustive, concrete, and unambiguous. Prefer tables, schemas, exact endpoints, and code
skeletons over prose. Every external API: give endpoint + auth + a request/response skeleton **and** a
"VERIFY current docs before coding" note (APIs drift). Flag every assumption. No marketing fluff.
```
Target repo tree the factory will create (canonical):
brutal-ads/
  apps/web/                 # Next.js 15 platform
  services/engine/          # FastAPI engagement engine
  packages/shared/          # types + zod schemas (object model, provider contracts)
  packages/render/          # headless render + Remotion video project
  supabase/                 # migrations, RLS policies, seed (Brutal brand kit)
  .env.example
  README.md
```

---

## 12. RECONCILIATION LEDGER (v0.2 — authoritative; overrides any doc that disagrees)
After the first authoring pass, an adversarial review found packaging/wiring conflicts. These are the
**locked resolutions**. Every doc and the master build prompt MUST conform. Where a doc currently says
otherwise, the doc is wrong and must be corrected to match this ledger.

**L1 — Canonical document map (frozen; fix every `docs/NN` / `doc NN` cross-ref to this):**
`01` product-spec · `02` technical-architecture · `03` data-model · `04` provider-integrations ·
`05` agent-studio · `06` editor-and-compositor · `07` creative-playbook-linkedin · `08` engagement-testing ·
`09` brand-kit · `10` build-plan · `11` env-and-keys · `12` security-cost-ops · `13` acceptance-tests · `14` appendix.
There is **no standalone localization doc**. Localization is owned by **`docs/05` `LocalizationAgent`** + the
`docs/09` BrandKit `localization` block + `docs/07` §localization rules. Any reference to "09 localization"
or "07-exporter" is a bug → repoint (exporter mechanics live in `docs/06`).

**L2 — Canonical source paths (frozen; use `apps/web/src/**`, never `apps/web/lib/**`):**
- Providers/bus → `apps/web/src/server/providers/`
- Agent studio/orchestrator → `apps/web/src/server/studio/` (agents under `.../studio/agents/`)
- Route handlers → `apps/web/src/app/api/`
- Editor UI → `apps/web/src/editor/`
- Shared types/zod → `packages/shared/src/`
- Render facade → `packages/render/src/`

**L3 — Enum reconciliations (define once in `docs/03` DDL+zod; everything imports these):**
- `job_status` = `('queued','dispatched','running','succeeded','failed','dead','cancelled','cached')` (spelling: **`cancelled`**, two l's). Doc 02's worker states `dispatched`/`dead` are included; the cache path `cached` is included.
- `agent_run_status` includes **`budget_exceeded`** (NOT `capped`). The agent runner in `docs/05` emits `budget_exceeded`.
- `render_kind` = `('png','jpg','pdf','svg')`. **PPTX is NOT a native `polotno-node` output** and is out of scope for v1 — LinkedIn document/carousel ads ship as **PDF**. Remove PPTX-as-fact claims (docs 02/03/11); if ever needed it is a separate post-render step, flagged VERIFY.

**L4 — Model slugs (canonical defaults; still VERIFY at build, but these supersede §5/earlier text):**
- Image: `flux-2-pro` (hyphen, never `flux.2-pro`); brand-consistent edit `gemini-3-pro-image` (nano-banana); in-pixel-text rare path `gpt-image-1.5` (NOT `gpt-image-2`); design/vector `recraft-v3`; `ideogram-3.0`; `seedream-4` via Fal.
- Video: **default `kling-v2-5-turbo`**; escalate to **`kling-3.0-omni`** (single canonical spelling — never `kling-v3-omni`) for face-consistency / sound-on dialogue. Fallbacks start at **`veo-3.1-*`** (`veo-3.0-*` is ALREADY retired as of the build date — never attempt it) and Seedance/Runway per policy. Build-plan sample calls must use `kling-v2-5-turbo` as the everyday default.
- CANON §5's earlier `kling-v3`/`kling-v3-omni` are superseded by this ledger; do not "helpfully" revert.

**L5 — `packages/render` public facade (frozen): `renderDocument(spec): Promise<RenderResult>`** is the single public entry (dispatches to internal `renderStatic`, `renderPdf`, `renderVideoLocal`, `encodeImageUnder5MB`). The orchestrator calls `renderDocument(...)` (not `renderTree`/`renderStatic` directly). `docs/06` owns the exact internal signatures; `docs/02`/`05` must match.

**L6 — `LayerPatch` (frozen; defined once in `packages/shared` via `docs/03` §12.2):** one schema = doc 06's richer op union `{ setText | resize | rotate | reorderZ | setFont | setFill | addLayer | removeLayer | replaceAsset | setBinding | setSlideOrder | setVisible }` **wrapped in** doc 03's envelope `{ id, variantId, slideId?, origin, createdBy, note?, ops: LayerPatchOp[] }`. `LayerPatchSet` is an alias for a `LayerPatch[]`. `applyLayerPatch` in `packages/shared` implements exactly this union.

**L7 — `BrandKitData` (frozen; one shape):** `docs/09`'s superset (adds `iconography`, `messaging.approvedClaims`, `proofPoints` (with per-locale `spoken`), `requiredDisclaimers`, `disclosures.aiContent`, governance metadata) is **back-ported into `docs/03` §7.1 + the zod in §12** in the same build. `BrandGuardian` and the zod validate the identical shape.

**L8 — Env additions (add to §10 above AND to `docs/11` §6 `.env.example` + §3 matrix):**
`ENGINE_SHARED_SECRET` (required — web↔engine auth), `WEBHOOK_SIGNING_SECRET` (required — provider webhook verification), `RENDER_URL` (optional — only when render runs as a separate container). Add `workspace.spend_cap_usd_per_brief` as a real **column** in `docs/03` (so AT-8 can assert it in SQL), not just workspace-config JSON.

**L9 — Licensing gate (consolidate into `docs/12` §11 as one table):** before commercial launch, hard sign-offs on: TRIBE v2 (CC-BY-NC-4.0 — stays R&D-only, double-flag-gated; **the shipped v1 saliency + calibrator MUST use only TranSalNet (MIT) + real `Result` rows, ZERO TRIBE input**; any TRIBE-informed coefficient is a hard-blocked, legal-review-gated post-v1 item), ElevenLabs Music commercial terms, Bria commercial/indemnity, Remotion Company License (4+ seats), BFL commercial output-license tier + EU host for GDPR. The grid-salience **weights must be re-derived by the calibration loop**, never shipped as the reference repo's literal constants (clean-room).

**L10 — Quality upgrades (fold in):**
- **Layout diversity:** add a 4th variant-matrix axis — named layout archetypes (`full-bleed-hero-lower-third`, `split-panel`, `editorial-kicker-top`, `quote-card`) chosen by `CompositorPlanner`; add a `Critic` anti-pattern `layout_homogeneity` (flag a board where ≥3 variants share an archetype). Wire `brandKit.imagery.style.avoid` tokens into the negative prompt automatically.
- **AI-content disclosure:** `BrandKit.disclosures.aiContent` + a `BrandGuardian` rule (warn by default; error when the tenant vertical requires it) — relevant for EU legal/PE.
- **Advanced brief:** an optional collapsed panel (angle lock, proof-point pick, variant count, matrix-axis emphasis) that pre-fills `NormalizedBrief` — zero friction for the founder, real control for the marketer.
- **Carousel continuity:** editing a continuity layer **defaults to propagate across slides** with a "this slide only" opt-out; deck-level pre-flight warns on divergence.
- `acid-lime chrome #c9ff2e` is a **placeholder, not gate-load-bearing** — brand-gate tests must not hard-assert this exact hex.

**L11 — R3/R5/R6 research:** being regenerated. Once present, docs must **cite them and delete any "reconcile when R3 lands / VERIFY against R3" hedge** (an instruction a one-shot builder can never complete). Doc 07's benchmark numbers are directional — label them "directional, calibrate against the tenant's real Results," not "unsourced placeholder pending R3."

**L12 — VERIFY discipline for autonomous builds:** every "VERIFY current docs" item MUST also state the exact default to code against and be marked "code this default now; only adjust if the live call errors (4xx)." VERIFY is never a stop condition for the factory — the master build prompt states this explicitly.

