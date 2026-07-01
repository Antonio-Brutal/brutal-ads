# Brutal Ads — FULL SPEC (single-file concatenation)

> Convenience concatenation of BUILD.md (master prompt), CANON.md (incl. §12 reconciliation ledger),
> and docs/01–14 — for tools/humans that want one file. The individual files in this repo remain the
> authoritative build inputs. Where anything disagrees, CANON §12 (the ledger) wins.



<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: BUILD.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

# 00 — MASTER BUILD PROMPT · Brutal Ads

> **You are inside the `brutal-ads` GitHub repo.** A starter scaffold already exists — build INTO it, do not
> recreate the tree. Present already: root monorepo config (pnpm/turbo/tsconfig/.env.example), `packages/shared`
> (the canonical types + zod: enums, layer tree, **the single `LayerPatch`**, provider contracts, brand kit),
> `packages/render` (the `renderDocument` facade), `apps/web` (Next.js 15 skeleton), `services/engine` (FastAPI
> engagement skeleton with the TRIBE double-gate), `supabase/` (skeleton), and a **working `prototype/`** (UX
> reference). `CANON.md` and `docs/01–14` are at the repo ROOT (not `_build/`). No infrastructure is wired: no
> keys, no Supabase/Vercel/Modal accounts, no deploys — provision those as you build. Follow `docs/10` phase
> gates; pass `docs/13`. Where docs disagree, **CANON §12 (the ledger) wins.**

**Paste this whole file into your Claude Code build factory. It is the instruction you execute. Everything
else in this package is reference that this file points you to. Build the entire platform from it.**

You are a fleet of senior engineers building **Brutal Ads** — a multi-tenant platform that turns a one-line
brief into high-converting **LinkedIn ads** (static single-image + multi-slide carousel/document ads first;
**video** as a first-class fast-follow), each one **easy to generate and easy to edit**. First tenant: **Brutal AI**.

---

## 0. Prime directive & the five non-negotiables
1. **Composite, don't bake.** The image models generate **imagery only**. Every element that must be legible
   or on-brand — headline, subhead, logo, CTA, legal, price, every carousel-slide word — is an **editable
   vector/text layer** on a JSON layer tree. This applies to single-image AND every carousel slide. It is the
   reason this product exists (the client's old approach baked text into pixels → endless re-rolls). The
   acceptance tests OCR the AI background and assert **zero** headline/CTA glyphs. Never violate this.
2. **The CANON is law.** Read `CANON.md` first and obey it — the object model, provider interfaces,
   agent names, env vars, repo shape, and especially **§12 the RECONCILIATION LEDGER (L1–L12)** which resolves
   every known conflict. Where a `docs/NN` file disagrees with the ledger, **the ledger wins**.
3. **VERIFY ≠ stop.** Many external APIs are tagged "VERIFY current docs." For an autonomous build, **code the
   stated default now and only adjust if the live call returns a 4xx.** Never treat a VERIFY note as a blocker.
4. **Gate-driven build.** Follow the phase plan in `docs/10-build-plan.md`. Each phase ends with a checkable
   `pnpm gate:P<N>` command and expected output. **Stop at the first red gate**, fix, then continue.
5. **Nothing ships unscored / un-approved.** Every ad passes deterministic pre-flight (contrast/legibility/
   spec/safe-zones/brand) + an engagement score, and a human approve gate before export. Agents propose; the
   user disposes.

---

## 1. Read order (and the FROZEN document map — ledger L1)
Read in this order, then keep them open as reference:
1. `CANON.md` — context, locked decisions, interfaces, and the §12 ledger. **(law)**
2. `research/R1..R7-*.md` — grounding research (models/APIs/competitors/testing/playbook). Advisory.
3. The 14 spec docs, by their **canonical number → role** (never trust an in-doc cross-reference that
   contradicts this map):

| # | Doc | Authoritative for |
|---|-----|-------------------|
| 01 | product-spec | vision, personas, journeys, feature scope |
| 02 | technical-architecture | monorepo, lifecycles, ProviderBus, deploy |
| 03 | data-model | **Postgres DDL, RLS, all zod/JSON schemas, seed** (schema source of truth) |
| 04 | provider-integrations | image/video/audio driver APIs + router policy |
| 05 | agent-studio | the Creative Studio agents + orchestration |
| 06 | editor-and-compositor | Polotno editor, chat-edit, render facade, export |
| 07 | creative-playbook-linkedin | the LinkedIn rules the agents encode |
| 08 | engagement-testing | EngagementPredictor + engine service + TRIBE isolation |
| 09 | brand-kit | BrandKit shape + seed Brutal kit |
| 10 | build-plan | **the phase-by-phase build order + gates (your roadmap)** |
| 11 | env-and-keys | every key, where to get it, `.env.example` |
| 12 | security-cost-ops | RLS, spend caps, observability, licensing gates |
| 13 | acceptance-tests | **the 8 end-to-end tests your output MUST pass** |
| 14 | appendix | history, model-landscape tables, ADRs |

There is **no localization doc**; localization lives in `docs/05` (`LocalizationAgent`) + `docs/09` (`localization`
block) + `docs/07`. Exporter mechanics live in `docs/06`.

---

## 2. The repo you will create (ledger L2 — use `apps/web/src/**`, never `apps/web/lib/**`)
```
brutal-ads/
  apps/web/                     # Next.js 15 (App Router) + TS + Tailwind v4 + shadcn/ui
    src/app/                    # routes + route handlers (src/app/api/**)
    src/server/providers/       # ProviderBus + image/video/audio drivers
    src/server/studio/          # agent orchestrator + agents/**
    src/editor/                 # Polotno-based layered editor (EditorAdapter)
  services/engine/              # Python 3.11 + FastAPI — engagement engine (saliency + grid + landing)
  packages/shared/src/          # object-model types + zod schemas (single source, imported everywhere)
  packages/render/src/          # renderDocument() facade (static/pdf/video) + Remotion project
  supabase/                     # migrations, RLS policies, seed (Brutal brand kit)
  .env.example
  README.md
```
Canonical stack: **Supabase** (Postgres+RLS+Auth+Storage), **Anthropic Claude** (agents), image/video/audio
**providers behind a ProviderBus** (BFL/Fal/Ideogram/Recraft/Gemini/OpenAI/Seedream · Kling/Seedance/Veo/Runway ·
ElevenLabs), **Polotno** static/carousel editor, **Remotion** video, **Inngest or pg-boss** jobs, **Vercel** +
**Modal/Replicate** (engine GPU) hosting.

---

## 3. Build sequence (authoritative detail in `docs/10`; each ends at a green gate)
- **P0 — Scaffold:** monorepo, TS, lint, CI, `.env` validation (`docs/11`). Gate: app boots, env validates.
- **P1 — Data:** all migrations + RLS + zod (`docs/03`), seed the Brutal brand kit (`docs/09`). Gate: RLS isolation test.
- **P2 — ProviderBus:** the bus + router policy + the primary image driver (BFL `flux-2-pro`) with cache + cost. Gate: one image generated + costed.
- **P3 — Studio:** Strategist→Copywriter→ArtDirector→CompositorPlanner→BrandGuardian→Critic (`docs/05`, rules from `docs/07`). Gate: brief → concept JSON.
- **P4 — Compositor + export:** layer tree → `renderDocument()` → 1200×1200 JPG ≤5MB to LinkedIn spec, with lineage. Gate: **AT-1**.
- **P5 — Editor:** Polotno editor, drag + **chat-to-edit (typed `LayerPatch`, no re-roll)**, regenerate-single-layer, live pre-flight. Gate: **AT-3, AT-4**.
- **P6 — Board + matrix:** variant board, {hook×visual×format×**layout-archetype**} matrix, multi-format re-layout. Gate: board renders, layouts diverse.
- **P7 — Carousel/document ads:** `CarouselArchitect`, per-slide layer trees (hook→reframe→close), continuity default-propagate, **PDF** document-ad export. Gate: **AT-2**.
- **P8 — Engagement:** `services/engine` (saliency + grid ranking + landing), `EngagementPredictor`, scores as bands + per-slide. Gate: **AT-5**.
- **P9 — Video:** Kling (`kling-v2-5-turbo` default) + ElevenLabs VO + Remotion assembly, muted-first + burned-in subs, ≤200MB. Gate: 1 MP4 renders to spec.
- **P10 — Harden:** spend caps, observability, audit log, moderation surfacing, licensing gates (`docs/12`). Gate: **AT-8** + all invariants.

DE/EN localization (`LocalizationAgent`, transcreation-not-translation, TTS-safe number spelling) is wired
from P3 onward. Gate: **AT-6**.

---

## 4. Acceptance — your output MUST pass all of `docs/13` (AT-1…AT-8)
Briefly: (1) brief→on-brand 1200×1200 export ≤5MB with lineage & **no baked text (OCR-verified)**; (2) 3-slide
carousel hook→reframe→close → PDF document ad; (3) chat-edit applies a `LayerPatch`, **not** a re-roll (zero
image jobs); (4) pre-flight catches a low-contrast headline; (5) engagement returns a band + per-slide
breakdown; (6) DE localization transcreates (not literal); (7) provider fallback on primary-image error;
(8) spend cap blocks a runaway brief. Each has fixtures + measurable oracles in `docs/13`.

---

## 5. Keys to run (full catalogue + where-to-get in `docs/11`; minimum happy-path subset)
To reach P4 you need at minimum: `ANTHROPIC_API_KEY`, `BFL_API_KEY`, `SUPABASE_URL` + `SUPABASE_ANON_KEY` +
`SUPABASE_SERVICE_ROLE_KEY`, `POLOTNO_API_KEY`, and `ENGINE_SHARED_SECRET` + `WEBHOOK_SIGNING_SECRET`. Add
`FAL_KEY`, `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY`, `GEMINI_API_KEY`, `KLING_ACCESS_KEY`/`KLING_SECRET_KEY`,
`ELEVENLABS_API_KEY` as their phases arrive. Client already has BFL, Fal, Kling, ElevenLabs. Use the exact
`.env.example` in `docs/11 §6`.

---

## 6. UX reference — `/prototype`
The `prototype/` folder is a **working front-end** (Vite + React + Polotno) that already demonstrates the
target UX: brief → agent pipeline → variant board with live LinkedIn feed preview → Polotno editor with
chat-to-edit + pre-flight + safe-zones → real JPG export. Treat it as the **look-and-feel and interaction
spec** for `apps/web/src/editor` and the board. It is a demo (mock data) — reimplement its flows against the
real backend; do not ship its mocks.

---

## 7. Licensing (hard gates before commercial launch — `docs/12 §11`, ledger L9)
**TRIBE v2 is CC-BY-NC-4.0 (non-commercial).** It stays an R&D-only, double-flag-gated backend in
`services/engine` and **never** touches the commercial path. The shipped v1 saliency + calibrator use **only
TranSalNet (MIT) + real `Result` rows — zero TRIBE input.** Also gate: ElevenLabs Music terms, Bria, Remotion
Company License (4+ seats), BFL commercial tier + EU host (GDPR). Grid-salience weights must be re-derived by
the calibration loop, never copied as literal constants.

---

## 8. Definition of done
The platform runs; a user types a brief and gets a board of on-brand LinkedIn ads (single-image + carousel),
edits any element by drag or chat, sees engagement scores + pre-flight, and exports to exact LinkedIn spec
with full lineage — DE and EN — with spend caps, RLS multi-tenancy, and all of `docs/13` green. Video (P9)
renders a muted-first subtitled MP4. **Build it phase by phase; stop at the first red gate; the ledger is law.**


<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: CANON.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

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



<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: docs/01-product-spec.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

# 01 — Product Specification — Brutal Ads

> ⚠️ **CROSS-REFERENCE NOTE — read first (authoritative, per CANON §12 L1).** Some inline `docs/NN` / `doc NN` pointers in this file predate the frozen document map and may cite the wrong number. **Resolve every cross-reference by ROLE using this map, not by the integer written inline:** `01` product · `02` architecture · `03` data-model (all DDL/zod/schemas) · `04` providers · `05` agent-studio · `06` editor + `packages/render` + export · `07` creative-playbook · `08` engagement · `09` brand-kit · `10` build-plan · `11` env · `12` security/ops · `13` acceptance · `14` appendix. There is **no localization doc** (localization lives in `05` LocalizationAgent + `09` brand-kit `localization` + `07`) and **no "exporter" doc** (export lives in `06`). Source paths are `apps/web/src/**` (never `apps/web/lib/**`). Where anything here disagrees with CANON §12, **the ledger wins.**

> **Read `handoff/CANON.md` first.** This document is subordinate to CANON. Every object-model
> name, provider interface, agent name, env var, repo path, and LinkedIn spec used here is canonical
> (CANON §5–§10). Where research suggests a change, it is written as a clearly-labelled
> **⚑ RECOMMENDATION** and never silently diverges. Every external API carries a
> **`VERIFY current docs before coding`** note. Every assumption is flagged **⚑ ASSUMPTION**.
>
> **Audience:** an autonomous AI build factory with **zero outside context**. This is doc 01 of ~15.
> It defines *what* Brutal Ads is and *what "done" means*. Downstream docs (`02` technical-architecture,
> `03` data-model, `04` provider-integrations, `05` agent-studio, `06` editor-and-compositor,
> `07` creative-playbook-linkedin, `08` engagement-testing, `09` brand-kit, `10` build-plan, `11` env-and-keys,
> `12` security-cost-ops, `13` acceptance-tests, `14` appendix) define *how*. There is **no standalone
> localization doc** — localization lives in `05` `LocalizationAgent` + the `09` brand-kit `localization`
> block + `07`. When this doc says "see doc NN," resolve it by ROLE via the frozen map (CANON §12 L1) and
> that doc is authoritative for the mechanism.
>
> **Scope of this doc:** vision, principles, personas & JTBD, the three full user journeys (single-image,
> carousel/document, video), the feature list (v1 vs later, MoSCoW), non-goals, and the Definition of Done.

---

## 0. TL;DR (read this first)

**Brutal Ads turns a one-line brief into a board of on-brand, testable LinkedIn ads that are easy to
generate and easy to edit.** Static single-image + multi-slide carousel/document ads ship first; **video
is a first-class fast-follow** (CANON §0). Multi-tenant from day one; **Brutal AI is the seed tenant**
(CANON §1).

The product loop, verbatim from the north star (CANON §0):

> **type a brief → get a board of on-brand, testable LinkedIn ads → tweak any element by drag or by chat
> → predict engagement → export to exact LinkedIn spec.** No prompt-engineering, no re-rolling.

The one decision that makes this possible (CANON §2, the load-bearing decision):

> **AI generates imagery only. Every element that must be legible or on-brand — headline, subhead, logo,
> CTA, legal, price, slide copy — is a composited, editable vector/text layer on a JSON layer tree.**

Everything in this spec is a consequence of that decision.

---

## 1. Vision

### 1.1 The problem (grounded in what was tried before — CANON §2)

The client's prior workflow baked text **into pixels** via text-to-image models (FLUX/Ideogram/Recraft),
art-directing every slide through a prompt. Result: text came out illegible, off-brand, or uneditable, so
every fix meant re-prompting and re-rolling the whole image. Carousels (13 angles × 3 slides:
hook → reframe → close) and video (Kling → ElevenLabs → Remotion) were each specified once in a
single brief and were painful to iterate. **The pain was never "the AI can't make a picture." The pain was
"the text is trapped in the picture."** (CANON §2.)

### 1.2 The product

Brutal Ads is a **multi-tenant Creative Studio** where:

- A **brief** (one line, optionally a URL + reference assets) becomes a **board of 4–6 ranked Variants**.
- Imagery is generated by a **routed fleet of image/video/audio providers** (CANON §6) behind interfaces —
  the user never picks a model; a policy router does, with manual override always available.
- All legible content lives as **editable vector/text layers on a JSON layer tree** (CANON §2, §5).
- The user edits **two ways**: **drag** on a Polotno canvas, or **chat** ("make the headline shorter and
  gold") which the `EditorAgent` turns into a typed **`LayerPatch`** diff — never a full re-roll (CANON §5).
- Every Variant is **scored for predicted engagement** (bands + confidence) before it can ship (CANON §9).
- Nothing ships without a **human-approve gate** (CANON §7).
- Export produces **exact-LinkedIn-spec** assets: 1:1 / 1.91:1 / 4:5 static JPG/PNG, PDF document ads, and
  muted-first ≤200 MB MP4 video (CANON §8).

### 1.3 What "great" looks like (the felt experience — R7 §4)

- A founder types **one line** and, within a couple of minutes, sees **4–6 finished, on-brand ads** on a
  board, ranked by predicted stopping-power. No model picker, no prompt box, no re-rolls.
- A marketer moves the CTA by dragging it, or says "tighten the headline and use the gold accent," and the
  ad updates **without spending an image credit** — because the edit is a layer patch, not a regeneration.
- "Give me the 4:5" is **instant** and never crops the headline, because ratios are derived by **smart
  re-layout** from one base, not naive cropping (CANON §8).
- The German version of an ad is a **transcreation**, not a literal translation, and the voiceover pronounces
  "1.200" as **"zwölfhundert"** (CANON §7, R2 §4.4).

---

## 2. Principles (the five non-negotiables)

These five principles are the spine of the product. Every feature, agent, gate, and doc traces back to one
of them. They are the acceptance lens: a feature that violates a principle is a bug.

| # | Principle | Means | Enforced by | CANON |
|---|---|---|---|---|
| **P1** | **Composite, don't bake** | AI generates *imagery only*; headline / subhead / logo / CTA / legal / price / slide copy are **editable vector/text layers** on a JSON layer tree — never pixels. | Layer tree object model (`Layer` types); `ArtDirector` emits imagery-only prompts; `CompositorPlanner` builds the tree; render composites. Image-gen prompts are structurally forbidden from containing ad copy. | §2, §5 |
| **P2** | **Brief → board** | A one-line brief (not a form, not a prompt) yields a **board of 4–6 ranked Variants**. Friction ≈ zero; `IntakeAgent` asks **at most 1–2** clarifying questions and only when a *required* field is missing. | Agent pipeline `IntakeAgent→Strategist→…→CompositorPlanner`; sensible defaults (1:1, 4–6 variants, workspace locale). | §0, §7; R7 §1.3, §4 |
| **P3** | **Two ways to edit** | Every element is editable by **drag** (Polotno canvas) *and* by **chat** (NL → typed `LayerPatch` diff). Chat and drag produce the same patch type; edits **never re-roll**. | `EditorAdapter` (Polotno), `EditorAgent` (NL→`LayerPatch`); patch-only re-render of affected layers. | §5, §7 |
| **P4** | **On-brand by construction** | "On-brand" is a **versioned, immutable `BrandKit`** (palette, type, logos, voice, banned terms, disclaimers, localization rules) that every agent and render pins to. `BrandGuardian` is a **hard mechanical gate**, not a vibe. | Versioned `BrandKit` (`brand_kit_version` in every Variant lineage); `BrandGuardian` hard gate before the board. | §5, §7; R7 §1.5 |
| **P5** | **Nothing ships unscored** | Every Variant is scored for predicted engagement (`EngagementScores`) **as bands + confidence**, calibrated against the tenant's real LinkedIn `Result`s. Scores rank the board; humans still choose. | `EngagementAnalyst` → `EngagementPredictor`; commercially-clean saliency path; TRIBE quarantined. | §6, §9 |

> **⚑ ASSUMPTION (naming):** The prompt names the principles as *composite-don't-bake, brief→board,
> two-ways-to-edit, on-brand-by-construction, nothing-ships-unscored*. I have mapped these 1:1 to
> P1–P5 above and use these labels throughout. If a later doc references a principle by a different
> label, this table is the canonical mapping.

---

## 3. Personas & Jobs-To-Be-Done (JTBD)

> **⚑ ASSUMPTION (personas):** The research file **R3-linkedin-playbook** and **R5-competitive** referenced
> in the build instructions **do not exist on disk** at authoring time (only R1, R2, R4, R7 are present in
> `handoff/research/`). Personas, JTBD, and the MoSCoW v1/later split below are therefore synthesized
> from **CANON §0–§1** (who this is for, the north star, the seed tenant) and **R7 §3–§4** (the minimal
> lovable product build order and consumer-friendliness), which are on disk. Creative/LinkedIn claims are
> grounded in **CANON §8** (the canonical 2026 LinkedIn format specs) rather than R3. **VERIFY against
> R3/R5 if/when those files are produced**; if they contradict this section, R3/R5 + CANON win and this
> section should be revised. Nothing here contradicts CANON.

### 3.1 Persona A — Antonio, the founder/operator (seed user)

- **Who (CANON §1):** Founder/operator of Brutal AI (brutal.ai). Verticals: **legal AI for German-speaking
  law firms** and a **private-equity** angle. Bilingual DE/EN. Not a designer, not a prompt engineer. Values
  a **sober, editorial, documentary** register — **not hype AI**.
- **Context:** Needs a steady stream of LinkedIn ads across two verticals and two languages, on-brand, fast,
  without hiring a design shop or fighting a prompt box.
- **JTBD:**
  - *"When I have a new angle for the legal-AI product, help me turn it into a board of on-brand LinkedIn ads
     in minutes, so I can pick the strongest and ship it today — without prompt-engineering or re-rolling."*
  - *"When I ship, give me a German and an English version that both feel native, so I can run bilingual."*
  - *"When I look at the board, tell me which ad is most likely to stop the scroll, so I bet on the right one."*

### 3.2 Persona B — the performance marketer (primary tenant user)

- **Who:** A B2B growth/performance marketer running LinkedIn paid campaigns for a tenant workspace.
- **Context:** Lives in a board of variants, cares about CTR/stopping-power, iterates copy constantly,
  needs exact-spec exports, wants control (compare, tweak, override).
- **JTBD:**
  - *"When I have a batch of creative to test, generate many on-brand variants fast and rank them by
     predicted engagement, so I can build a test that isn't a coin flip."*
  - *"When a headline underperforms, let me rewrite it by dragging or by chat without regenerating the
     image, so iteration is instant and free."*
  - *"When I export, give me every LinkedIn ratio from one base with the headline never cropped, so I never
     hand-fix a crop again."*
  - *"When the defaults aren't enough, let me open an **advanced brief** and lock the angle, pick a proof
     point, set the variant count, and emphasize a matrix axis — without turning the one-line flow into a form."*

> **⚑ Advanced brief affordance (CANON §12 L10).** For this persona, the one-line brief input carries an
> **optional, collapsed "advanced brief" panel** (angle lock · proof-point pick · variant count ·
> matrix-axis emphasis) that pre-fills `NormalizedBrief` before `IntakeAgent`/`Strategist` run. It is
> **collapsed by default** — **zero friction for the founder** (Persona A never opens it), **real control
> for the marketer**. It adds no required fields and changes no gate; unopened, the journey in §4 is
> unchanged. (Panel mechanics: doc `06`; field schema: doc `03`.)

### 3.3 Persona C — the brand owner / operator (governance)

- **Who:** The person accountable for brand consistency and legal/compliance (may be the founder in a small
  tenant; a brand lead in a larger one).
- **Context:** Cares that nothing off-brand or non-compliant ships; owns the `BrandKit`; needs disclaimers
  enforced mechanically, not left to a person to remember.
- **JTBD:**
  - *"When anyone on my team generates an ad, guarantee it uses our palette, type, voice, and mandatory
     disclaimers, so an off-brand or non-compliant ad literally cannot reach the board."*
  - *"When we update the brand, version it, so I can always answer 'was this ad on brand v3 or v4?'"*

### 3.4 Persona D — the platform operator (Brutal AI, as the multi-tenant provider)

- **Who:** Whoever runs Brutal Ads as a platform across tenants (initially Brutal AI itself).
- **Context:** Cares about cost, isolation, observability, and not letting one tenant's spend or data touch
  another's.
- **JTBD:**
  - *"When any tenant generates, cap the spend per brief and per workspace, log every agent call and job with
     tokens/latency/cost, and isolate tenants by RLS, so the platform is safe and predictable to operate."*

### 3.5 JTBD → principle → feature traceability

| JTBD (abbrev.) | Principle | v1 feature that serves it |
|---|---|---|
| Brief → board of on-brand ads in minutes | P2, P4 | Brief intake + agent pipeline + board (F1–F4) |
| Instant, free copy iteration | P3 | Drag + chat editing, `LayerPatch` (F6) |
| Rank by predicted engagement | P5 | `EngagementPredictor` scoring, ranked board (F7) |
| Every ratio, headline never cropped | P1 | Smart re-layout exporter (F8) |
| Native DE/EN | P4 | `LocalizationAgent` transcreation (F9) |
| Off-brand ad can't ship | P4 | `BrandGuardian` hard gate + versioned `BrandKit` (F5) |
| Safe, cost-capped, isolated platform | — | Multi-tenant RLS, cost caps, observability (F10) |

---

## 4. User journeys

All three journeys run on the **same spine**: `Workspace → BrandKit → Campaign → Brief → AdDocument →
Variant → (Slide) → Layer` (CANON §5), the same agent pipeline (CANON §7), the same two-gate flow
(BrandGuardian hard gate → human-approve gate), and the same board surface. They differ only in
`AdDocument.type` (`single_image | carousel | video`, CANON §5) and the tail (compositor plan, render
target, exporter).

**Legend for the flow diagrams:** `▸` = user action; `⚙` = agent/system step; `⏳` = async
`GenerationJob` (progress streamed to the UI, CANON §4); `🚦` = a gate; `✅` = the ship point.

### 4.0 The shared pipeline (applies to all three journeys)

```
▸ User types a one-line brief (+ optional URL / reference assets), picks nothing else
  │
⚙ IntakeAgent  ── normalizes → Brief{audience, vertical, offer, proof, legal, language(s), constraints}
  │              (⚑R-A1 recommendation: asks ≤1–2 clarifying Qs ONLY if a required field is missing)
  │
⚙ Strategist   ── Brief → Strategy{audience, angle, JTBD, proof}
  │
  ├─⚙ Copywriter    → {hooks, headlines, CTAs}  (specificity > cleverness)
  │      (carousel only) ⚙ CarouselArchitect → per-slide hook→reframe→close narrative + continuity
  │
  └─⚙ ArtDirector   → {visual concept, MODEL CHOICE, IMAGERY-ONLY prompt + negPrompt}
         │
        ⏳ ProviderBus.image/video(job) → GenerationJob (async, cached by (provider,model,version,prompt,seed,params))
         │
⚙ CompositorPlanner  ── concept + copy + generated imagery → LAYER TREE (no text in pixels)
  │
🚦 BrandGuardian (HARD GATE)  ── palette / voice / banned terms / disclaimer / localization
  │    fail → loop back to author agent (≤2 rounds), then surface, never silently ship
  │ pass
  │
⚙ packages/render  ── layer tree → Polotno store JSON → PNG/JPG (or PDF, or Remotion MP4) → Render
  │
  ├─⚙ Critic            → scores vs LinkedIn playbook + anti-patterns
  └─⚙ EngagementAnalyst → EngagementPredictor.score(...) → EngagementScores (BANDS + confidence)
         │
      weak? ──yes──► bounded auto-iterate (≤2 rounds) → re-render → re-score
         │ no / done
         ▼
   ┌─────────────  THE BOARD  (4–6 ranked Variants)  ─────────────┐
   │  ▸ Human reviews, compares, picks, tweaks (drag OR chat)     │
   └───────────────────────┬─────────────────────────────────────┘
                           │  edits → EditorAgent → typed LayerPatch (NEVER a re-roll)
                           ▼
🚦 HUMAN-APPROVE GATE  ── nothing ships un-approved (CANON §7)
                           ▼
✅ EXPORT to exact LinkedIn spec  ── (per journey below)
                           ▼
   Ship to LinkedIn (manual; API ingest of Results later) → Result → CALIBRATION LOOP re-fits bands
```

Source: R7 §2 (data flow), CANON §5–§9. **Two gates, one loop-back; agents rank, humans choose; agents
never ship** (R7 §2, CANON §7).

---

### 4.1 Journey A — Single-image ad (`AdDocument.type = 'single_image'`)

This is the **primary v1 journey** and the shortest path to the north-star feeling (R7 §3, MLP = P0–P5).

| Step | Actor | What happens | Object touched | Notes / spec |
|---|---|---|---|---|
| A1 | User | Types a one-line brief in the "Describe your ad in one line" input; may attach a URL or reference assets. Picks nothing else. | `Brief` created | Empty state shows 2–3 ghost example briefs for the tenant vertical (R7 §4). |
| A2 | `IntakeAgent` | Normalizes to a structured `Brief`; asks ≤1–2 questions only if a required field is missing; else proceeds on `BrandKit`+brief defaults. | `Brief` | ⚑R-A1 (R7 §1.3). |
| A3 | `Strategist` | Produces `Strategy{audience, angle, JTBD, proof}`. | `AgentRun` | Structured JSON, zod-validated (doc 04). |
| A4 | `Copywriter` ‖ `ArtDirector` (parallel) | Copywriter → hooks/headlines/CTAs (specificity > cleverness). ArtDirector → visual concept + model choice + **imagery-only** prompt + negative prompt. | `AgentRun`(s) | **Copy and imagery are parallel branches that meet only at the compositor — text never enters an image prompt (P1).** |
| A5 | `ProviderBus.image` | Async `GenerationJob` per variant: default driver = **FLUX.2 [pro] via BFL** (R1 §0; R7 §5.3). Progress streamed to UI (skeleton cards, never a spinner). | `GenerationJob`, `Asset` | Cached by `(provider,model,version,prompt,seed,params)` (CANON §4). |
| A6 | `CompositorPlanner` | Turns concept + copy + generated background into a **layer tree**: `image`(bg) + `text`(headline/subhead) + `logo` + `cta` + `legal` + optional `smart`/`shape`/`frame`. | `AdDocument`, `Variant`, `Layer[]` | Layer types per CANON §5. Text is vector, always. |
| A7 | `BrandGuardian` 🚦 | Hard gate: palette/voice/banned-terms/disclaimer/localization. Fail → loop back (≤2), never ships. | gate | P4. Legal is a first-class `legal` layer, never optional free text. |
| A8 | `packages/render` | Layer tree → Polotno store JSON → PNG/JPG at **1:1 1200×1200** (default base). | `Render` | Default ratio per CANON §8. |
| A9 | `Critic` + `EngagementAnalyst` | Score vs LinkedIn playbook; `EngagementPredictor.score(RenderRef)` → `EngagementScores` (bands+confidence). Weak variants auto-iterate ≤2. | `EngagementScores` on `Variant.engagement{}` | `focalClarity`, `valuePropAttention`, `ctaAttention`, `clutter`, `stoppingPower`, `predictedCtrBand{low,high,confidence}` (CANON §6; R4 §5.3). |
| A10 | Board (user) | 4–6 ranked Variants appear. User compares, picks. | — | Agents rank; user chooses (R7 §4). |
| A11 | User (drag or chat) | Moves/retypes any layer by drag; or chats "make the headline shorter and gold." `EditorAgent` → typed `LayerPatch`; re-render only affected layers. **Zero image credits** for copy tweaks. | `LayerPatch`, new `Render` | P3. Never a re-roll (CANON §5). |
| A12 | Human-approve 🚦 | Nothing ships un-approved. | gate | CANON §7. |
| A13 | Exporter ✅ | **Smart re-layout** from the 1:1 base to **1:1 1200×1200**, **1.91:1 1200×627**, **4:5 960×1200** (mobile-only), respecting safe-zones (feed crop, profile overlap, "see more" fold). JPG/PNG ≤5 MB. | `Render`(s) | CANON §8. Headline never cropped — re-layout, not crop. |
| A14 | User | Ships to LinkedIn (manual v1). Later: paste/ingest `Result`s → calibration loop tightens bands. | `Result` | P10 (R7 §3). |

**Single-image spec (exporter/agents enforce — CANON §8):**

| Ratio | Pixels | Use | Constraints |
|---|---|---|---|
| **1:1** (default) | **1200×1200** | best mobile feed | JPG/PNG/GIF ≤5 MB |
| 1.91:1 | 1200×627 | desktop/landscape | " |
| 4:5 | 960×1200 | mobile-only | " |
| Copy | — | Headline **≤70 chars**; intro text **~150 visible before "see more"** (**600 max**) | Enforced by `Copywriter` + exporter |

---

### 4.2 Journey B — Carousel / document ad (`AdDocument.type = 'carousel'`)

Same spine; adds the **`CarouselArchitect`** and an ordered `Slide[]`, each slide carrying **its own layer
tree** (CANON §5). This is a **v1 feature** (R7 §3, P7) and directly addresses the client's prior pain
(13 angles × 3 slides of baked-text PNGs, CANON §2).

| Step | Actor | What happens | Object | Notes |
|---|---|---|---|---|
| B1–B3 | as A1–A3 | Brief → intake → strategy. User may specify slide count or accept default. | `Brief`, `Strategy` | Default slide count = **hook → reframe → close** minimum 3; up to ~10–12 (CANON §8). |
| B4 | `CarouselArchitect` | Designs the **multi-slide narrative**: `hook → reframe → close`, with **continuity across slides** (recurring motif, consistent brand, escalating argument). Emits an ordered slide plan. | slide plan | CANON §7. This is the anti-pattern fix: narrative is planned, not prompted per slide. |
| B5 | `Copywriter` | Per-slide copy (slide headline / body / CTA on the close slide). | `AgentRun` | Specificity > cleverness. |
| B6 | `ArtDirector` + `ProviderBus.image` | **Imagery-only** background per slide; continuity kept via consistent style/seed/refs (R1: brand-consistent instruct-edit lane for continuity). | `GenerationJob`(s), `Asset`(s) | Text still composited, never baked (P1). |
| B7 | `CompositorPlanner` | Builds **one layer tree per `Slide`**; `AdDocument` holds ordered `Slide[]`. | `AdDocument`, `Slide[]`, `Layer[]` | CANON §5. |
| B8 | `BrandGuardian` 🚦 | Hard gate across all slides. | gate | P4. |
| B9 | Render | Each slide → Polotno store JSON → PNG; document assembled. | `Render`(s) | Square **1080×1080 recommended** (CANON §8). |
| B10 | `Critic` + `EngagementAnalyst` | **Per-slide** scoring (`perSlide: [...]`) + narrative-continuity checks: **slide 1 must have the highest `stoppingPower`** (thumb-stopper); CTA slide must have high `ctaAttention`; flag any slide whose `stoppingPower` is a **dip** vs neighbors (trough detection — our own code, no TRIBE). | `EngagementScores.perSlide` | R4 §5.4. |
| B11 | Board (user) | Ranked carousel variants; user can preview the swipe, reorder slides, edit any slide's layers (drag/chat). | — | Slide reorder = a `LayerPatch`-class op at the document level. |
| B12 | Human-approve 🚦 → Export ✅ | Exports as a **PDF document ad** (multi-page). | `Render` (PDF) | CANON §8; `packages/render` PDF export (CANON §4). |

**Carousel/document spec (CANON §8):**

| Attribute | Value |
|---|---|
| Pages | multi-page, **up to ~10–12 slides** |
| Canvas | **square 1080×1080 recommended** |
| Delivery | **PDF document ad** |
| Narrative | per-slide **hook → reframe → close** (planned by `CarouselArchitect`) |
| Scoring | **per-slide** `stoppingPower`/`ctaAttention`; slide 1 highest stopping-power; dip detection |

---

### 4.3 Journey C — Video ad (`AdDocument.type = 'video'`)

**First-class fast-follow** (CANON §0; R7 §3 P9). Same brief-first spine; the tail is a
**generate-clips → VO → assemble → render → spec-check** pipeline (R2 §6). **Muted-first with burned-in
subtitles** is mandatory — LinkedIn autoplays muted, so the burned-in captions carry the story (CANON §8,
R2 §5). Video = a **Remotion composition spec + layer/subtitle/audio tracks** (CANON §5).

| Step | Actor | What happens | Object | Notes / spec |
|---|---|---|---|---|
| C1–C3 | as A1–A3 | Brief (type=video) → intake → strategy. | `Brief`, `Strategy` | User can request a sound-on variant (rare). |
| C4 | `Strategist`+`Copywriter`+`ArtDirector` | Storyboard: N shots; **first 3 seconds = stopping power** (CANON §8). | storyboard | First-3s is a hard design constraint, scored later. |
| C5 | `LocalizationAgent` | DE/EN script + **TTS-normalized VO strings** (numbers pre-spelled: "1.200" → "zwölfhundert", "%" → "Prozent") **+** on-screen caption strings (**numerals kept** for legibility). | script | **CRITICAL DE caveat** (R2 §4.4): ElevenLabs mispronounces DE numbers; pre-spell for VO, keep numerals on screen. |
| C6 | `ProviderBus.video` | Async clips. **Default = Kling i2v** on the **composited still** (imagery-only rule preserved: brand text stays as Remotion layers, not baked into the model). Face-recurring → **Kling 3.0 Omni** elements; sound-on dialogue → **Veo 3.1**; talking-head UGC → **HeyGen** (⚑ avatar lane). | `GenerationJob`(s), `Asset`(s) | Create→poll→download→persist to Supabase/R2 immediately (URLs expire) (R2 §1.4, §6). |
| C7 | `ProviderBus.audio` (ElevenLabs) | VO via `/v1/text-to-speech/{voice_id}` (`eleven_multilingual_v2`, deterministic `seed`, request **word-level timestamps**); optional low SFX + sober music bed. | `Asset`(s) | R2 §4. Muted-first → native model audio usually discarded. |
| C8 | Captions | ElevenLabs word-timestamps → `Caption[]` → `createTikTokStyleCaptions(...)` → **always-on, high-contrast, safe-zone-aware** caption layer, **burned into pixels**. | — | R2 §5.1. Muted-first mandate. |
| C9 | `CompositorPlanner` + Remotion | `<OffthreadVideo>` clips + `<Audio>` VO/bed/SFX + **brand cards / lower-thirds / CTA / logo / legal as React/HTML+CSS layers** (Brand Kit) + burned-in caption layer. Ratios 1:1 / 4:5 / 16:9 via smart re-layout. | `AdDocument`(video), `Layer`/subtitle/audio tracks, Remotion composition id | CANON §5; R2 §5.1. Text is a composited vector layer, never baked into the model (P1). |
| C10 | `BrandGuardian` 🚦 | Hard gate (palette/voice/disclaimer/localization). | gate | P4. |
| C11 | Render | `renderMedia` (local, default) or `renderMediaOnLambda` (scale) → MP4 (h264). Tune `crf`/preset to hit ≤200 MB. | `Render` (MP4) | R2 §5.2. |
| C12 | Exporter spec-check 🚦 | ✓ ratio ∈ {1:1, 4:5, 16:9} ✓ **file ≤200 MB** (client's proven paid limit; `probeFileSize()` gate, re-encode if over) ✓ burned-in subs legible in safe zones ✓ **plays muted** ✓ first-3s stopping power ✓ BrandGuardian pass. | gate | R2 §6, §8; CANON §8. |
| C13 | `EngagementAnalyst` | `EngagementPredictor.score(VideoRef)` → `firstThreeSeconds`, `stoppingPower`, `predictedCtrBand{...}` (bands+confidence; commercial saliency path, TRIBE flag-gated R&D only). | `EngagementScores` | CANON §6, §9; R4 §5.5. |
| C14 | Human-approve 🚦 → Ship ✅ | Nothing ships un-approved. Manual publish. | — | CANON §7. |

**Video spec (CANON §8; R2):**

| Attribute | Value |
|---|---|
| Ratios | **1:1 or 4:5 or 16:9** |
| File size | **≤200 MB** (client's proven paid limit) |
| Audio | **muted-first**; burned-in subtitles carry the story; sound-on optional |
| Opening | **first 3 seconds carry stopping power** |
| Default clip engine | **Kling i2v** on the composited still (R2 §0) |
| VO | **ElevenLabs `eleven_multilingual_v2`**, seed, word-timestamps → captions (R2 §4–§5) |
| Assembly | **Remotion** (`packages/render`), burned-in captions (R2 §5) |

> **VERIFY current docs before coding (video/audio APIs drift — R2 §8):** Kling host + model slugs
> (`api.klingai.com` vs region host vs proxy; JWT HS256 exp window); Kling 3.0 Omni "elements"
> endpoint/params; Veo 3.1 slugs (`veo-3.0-*` sunset **2026-06-30**); Runway Gen-4 Aleph sunset
> **2026-07-30**; HeyGen v2 operational until **2026-10-31** (or migrate to v3 wallet API); ElevenLabs
> `eleven_multilingual_v2` default + `with-timestamps` shape + **DE number pre-spelling mandatory** +
> Music API commercial license; Remotion **Company License** (4+ people / funded) + captions API +
> Lambda region/memory; the exact `crf`/preset that keeps clips ≤200 MB.

> **⚑ RECOMMENDATION (from R2 §3, §7):** add an **`avatar_ugc`** provider lane and a thin `AvatarProvider`
> shape (or `VideoProvider` with `params.kind:'avatar'`) for talking-head UGC (HeyGen / Creatify / Arcads).
> Talking-head is a distinct, high-trust B2B LinkedIn format not enumerated in CANON §6's contract set.
> This is additive; it does not rename or replace any canonical interface.

---

## 5. Feature list (v1 vs later) — MoSCoW

> **⚑ ASSUMPTION (MoSCoW source):** The prompt asks for the v1/later split "per R5." **R5-competitive does
> not exist on disk.** This MoSCoW is derived from the **R7 §3 build order** (P0–P10, which explicitly marks
> the "MLP LINE" after P5 and labels carousel/localization/video as fast-follows) and **CANON** (video = a
> *first-class fast-follow*, §0; single-image + carousel *first*, §0). If R5 later prescribes a different
> priority split, R5 + CANON win. **v1 = "must + should" ship for the first releasable product; "later" =
> could/won't-yet.** Phase tags (P0–P10) reference R7 §3.

### 5.1 v1 — MUST HAVE (the minimal lovable product, R7 §3 P0–P5, + carousel/scoring/localization)

| ID | Feature | Principle | Phase | Definition |
|---|---|---|---|---|
| **F0** | **Multi-tenant skeleton** — pnpm monorepo (CANON tree); `packages/shared` object model + zod; Supabase Postgres + **RLS + Auth + Storage**; `workspace_id` isolation **from day one**; seed Brutal `BrandKit` v1. | P4 (infra) | P0 | Types compile; a workspace + brand kit exist; **RLS blocks cross-tenant reads**. |
| **F1** | **Render spine** — `packages/render`: layer tree → Polotno store JSON → **pixel-correct** PNG/JPG headless (`polotno-node`), real fonts. | P1 | P1 | A hand-authored layer tree renders a pixel-correct 1200×1200 ad with Brand Kit fonts. |
| **F2** | **Image provider + `ProviderBus` + async jobs** — one driver (FLUX.2 [pro] via BFL) + **cache** + `GenerationJob` async + streamed progress. | P1 | P2 | Brief → generated *background* → composited under text layers → rendered ad. |
| **F3** | **Agent pipeline (static)** — `IntakeAgent → Strategist → Copywriter → ArtDirector → CompositorPlanner → BrandGuardian`; Claude (Agent SDK/Messages), structured outputs; `AgentRun` logging + cost caps. | P2, P4 | P3 | Type a brief → 3–6 on-brand static ads on a board. |
| **F4** | **The board** — 4–6 ranked Variants per workspace; compare, pick. | P2 | P4 | Board renders variants; user selects. |
| **F5** | **`BrandGuardian` hard gate + versioned `BrandKit`** — palette/voice/banned-terms/disclaimer/localization; `brand_kit_version` in lineage; `legal` first-class layer. | P4 | P0/P3 | An off-brand or non-compliant Variant cannot reach the board. |
| **F6** | **Two-ways-to-edit** — Polotno canvas behind `EditorAdapter` (drag); `EditorAgent` (NL → typed `LayerPatch`) (chat); patch-only re-render; human-approve gate. | P3 | P4 | Move/retype any layer by drag; "make the headline shorter and gold" by chat — **no re-roll, zero image credits for copy tweaks**. |
| **F7** | **Engagement scoring (clean path)** — `Critic` + `EngagementAnalyst` + `EngagementPredictor` (`ENGAGEMENT_BACKEND=saliency`) in `services/engine`; **bands + confidence**; ranks the board; TRIBE quarantined. | P5 | P6 | Board arrives ranked with focal-clarity / stopping-power bands. |
| **F8** | **Export to spec (smart re-layout)** — 1:1 / 1.91:1 / 4:5 via **renderHints + safe-zones** (not crop); JPG/PNG ≤5 MB; PDF for document ads. | P1 | P5/P7 | Download a spec-valid asset in all three static ratios from one base; headline never cropped. |
| **F9** | **Carousel / document ads** — `CarouselArchitect`; `Slide[]` per `AdDocument`; per-slide scoring; **PDF document-ad export** (hook→reframe→close). | P1/P2/P5 | P7 | Brief → multi-slide doc ad → PDF export; per-slide narrative + scoring. |
| **F10** | **Localization (DE⇄EN)** — `LocalizationAgent` (transcreation, not literal; TTS-safe number spelling); `smart` layers bound to locale; text-layer swap, not re-render. | P4 | P8 | One ad, two languages, on-brand, from the same tree. |
| **F11** | **Observability & cost governance** — every `AgentRun`/`GenerationJob` logs tokens/latency/`cost_usd`; **hard per-brief and per-workspace caps**; content-moderation surface on gen failures; `AuditLog`. | — | P0–P3 | Orchestrator refuses a job that breaches the cap; UI shows remaining budget; failures explained, not swallowed. |

### 5.2 v1 — SHOULD HAVE (ship early; degrade gracefully if cut)

| ID | Feature | Principle | Notes |
|---|---|---|---|
| **F12** | **Multi-provider image routing** — add Nano Banana Pro (instruct-edit/subject-consistency), Seedream, Ideogram/Recraft (fallback-only for text) behind `ProviderBus.image` policy + fallback. | P1 | R1 §0, §9; R7 §5.3. ⚑R-PROV1: demote Ideogram/Recraft to fallback-only for image *gen*. |
| **F13** | **Manual model override** — power-user escape hatch, hidden by default. | — | CANON §6. |
| **F14** | **Bounded auto-iterate (≤2 rounds)** on weak variants (Critic/EngagementAnalyst → author agents → re-score). | P5 | CANON §7; enforced in orchestrator, not prompt. |
| **F15** | **Experiments** — `Experiment` / `ExperimentArm` scaffolding to structure a test from board variants. | P5 | CANON §5. Full A/B analytics = later. |

### 5.3 LATER — COULD HAVE (fast-follows after the loop is loved)

| ID | Feature | Principle | Phase | Notes |
|---|---|---|---|---|
| **F16** | **Video ads** — `VideoProvider` (Kling primary) + ElevenLabs VO + Remotion assembly; muted-first + burned-in subs; first-3s scoring. | all | P9 | First-class fast-follow (CANON §0). Heaviest infra; after static loop is loved (R7 §3). |
| **F17** | **Talking-head / UGC avatar** (`avatar_ugc` lane, HeyGen). | P1 | P9 | ⚑ Recommendation lane (R2 §3, §7). |
| **F18** | **Results feedback + per-workspace calibration** — `Result` ingest (paste or LinkedIn API) → re-fit `EngagementPredictor` bands per workspace. | P5 | P10 | The compounding moat (R7 §3). |
| **F19** | **Paid saliency upgrades** — Expoze.io / Neurons / Dragonfly behind `EngagementPredictor` for tenants who want higher fidelity / real video attention curves. | P5 | post-P10 | R4 §3, §5.2. Commercially licensed; per-request. |
| **F20** | **Landing-page attention** module (structure/contrast/layout heuristic + saliency). | P5 | post-P10 | R4 §5.6. Off critical path. |
| **F21** | **PPTX document export** (in addition to PDF). | P1 | later | CANON §4 (post-v1 `pptxgenjs` step, not native — ledger L3). |
| **F22** | **LinkedIn publish via API** (auto-ingest of *results*, never auto-*spend*). | — | later | R7 §4: publishing/spend stays human-triggered. |

### 5.4 LATER — WON'T HAVE (yet) — explicit exclusions from the roadmap

| Feature | Why not (yet) |
|---|---|
| **TRIBE v2 on any commercial/tenant-facing path** | CC-BY-NC-4.0 (non-commercial); legally radioactive. **R&D only**, double-gated `ENGAGEMENT_BACKEND=tribe_research` **and** `RESEARCH_MODE=true`, physically isolated in `services/engine/research/tribe/`, never surfaced to a tenant (CANON §9; R4 §0, §6). |
| **Baked-in text (text-to-image ad copy)** | Violates P1, the load-bearing decision. Structurally forbidden (CANON §2). |
| **Autonomous shipping / autonomous spend** | Nothing ships without the human-approve gate; publishing and spend are human actions (CANON §7; R7 §4). |
| **Cross-tenant sharing / global template marketplace** | Out of v1 scope; multi-tenant isolation is a hard requirement, not a sharing surface (CANON §4). |
| **Non-LinkedIn ad channels** | v1 is LinkedIn-only; specs are LinkedIn-specific (CANON §8). |

---

## 6. Non-goals (what Brutal Ads deliberately is NOT)

1. **Not a prompt playground.** Users do not write prompts or pick models. The value is the pipeline of
   specialists + routed providers, not raw generation (P2; R7 §1.3). A visible "prompt box" is a
   product failure.
2. **Not a general design tool.** It composes **LinkedIn ads** to canonical specs (CANON §8). It is not a
   generic canvas, deck builder, or brand studio. (Polotno is the *editor engine*, not the product.)
3. **Not baked-text image generation.** Legible/on-brand elements are **always** editable vector layers,
   never pixels (P1, CANON §2). No feature may reintroduce baked text.
4. **Not an autonomous ad buyer.** Agents rank and recommend; **humans pick, approve, and ship.** No
   auto-spend, ever (CANON §7; R7 §4).
5. **Not a virality oracle.** Engagement scores are **directional bands with confidence**, calibrated over
   time — never sold as a guaranteed CTR (CANON §9; R4 §7).
6. **Not built on TRIBE for the commercial path.** TRIBE v2 is quarantined R&D; the shipping predictor is a
   commercially-clean saliency + heuristic path (CANON §9; R4 §0).
7. **Not multi-channel (yet).** LinkedIn only in v1 (CANON §8). Other channels are out of scope.
8. **Not single-tenant.** Multi-tenant with `workspace_id` + RLS **from day one** (CANON §4); Brutal AI is
   merely the seed tenant, and the seed Brand Kit is **data, not product logic** (CANON §1).

---

## 7. Definition of Done

"Done" is defined at three levels: **the MLP** (first releasable product), **each journey**, and
**per-principle acceptance**. A release is Done only when the checklists it claims are all green.

### 7.1 MLP Definition of Done (the first releasable product = R7 §3 P0–P5, hardened)

The MLP is Done when **all** of the following hold:

- [ ] **Multi-tenancy (F0):** A second workspace **cannot** read the first's `Brief`/`AdDocument`/`Variant`/
      `Asset`/`Result` — proven by an RLS test that fails closed.
- [ ] **Render fidelity (F1):** A hand-authored layer tree renders a **pixel-correct 1200×1200** ad with the
      Brand Kit's real fonts (Playfair Display + Inter) and colors (gold `#cba65e`, lime `#b6e64a`).
- [ ] **Brief → board (F2–F4, P2):** A one-line brief yields **4–6 on-brand static Variants** on a board,
      with imagery generated async and progress streamed (skeleton cards, no bare spinner).
- [ ] **Composite-not-bake (P1):** No image-generation prompt sent to any provider contains ad copy; every
      headline/subhead/CTA/logo/legal/price is a vector `Layer`. (Assert in code + a lint/test.)
- [ ] **On-brand gate (F5, P4):** A deliberately off-brand or missing-disclaimer Variant is **blocked by
      `BrandGuardian`** and never reaches the board; `brand_kit_version` is recorded in every Variant's
      lineage.
- [ ] **Two-ways-to-edit (F6, P3):** Any layer is movable/retype-able by **drag**; the same change is
      achievable by **chat** ("make the headline shorter and gold") producing a typed `LayerPatch`; a copy
      tweak spends **zero image credits** and does **not** re-roll the image.
- [ ] **Human-approve gate:** Nothing exports without an explicit human approval action (CANON §7).
- [ ] **Export to spec (F8):** From one base, the exporter produces spec-valid **1:1 1200×1200**,
      **1.91:1 1200×627**, **4:5 960×1200** JPG/PNG **≤5 MB**, via **smart re-layout** — the headline is
      **never cropped** in any ratio; safe-zones respected.
- [ ] **Cost & observability (F11):** Every `AgentRun` and `GenerationJob` logs tokens/latency/`cost_usd`;
      the orchestrator **refuses** a job that would breach the per-brief or per-workspace cap; the UI shows
      remaining budget; a refused/failed generation shows a graceful, explained message — **never a stack
      trace** (R7 §4).
- [ ] **Provider resilience:** Every provider call has a fallback chain; on exhaustion the UI shows
      "we couldn't generate imagery for variant N — retry / edit brief" (R7 §4).

### 7.2 Per-journey Definition of Done

**Single-image (A):** MLP DoD (7.1) holds end-to-end for `type=single_image`.

**Carousel (B, F9):** Done when a brief yields a multi-slide `AdDocument` with an ordered `Slide[]` (each a
layer tree), a **hook→reframe→close** narrative from `CarouselArchitect`, **per-slide** engagement scores
(`perSlide[]`) with **slide 1 highest `stoppingPower`** and CTA slide high `ctaAttention`, and a **PDF
document-ad** export at 1080×1080 recommended canvas (CANON §8; R4 §5.4).

**Video (C, F16):** Done when a brief yields a **muted-first MP4 with burned-in subtitles** in 1:1 / 4:5 /
16:9, **≤200 MB** (enforced by a `probeFileSize()` gate), assembled by Remotion from Kling i2v clips over a
composited still (brand text as Remotion vector layers, **not** baked into the model), with ElevenLabs
`eleven_multilingual_v2` VO whose **DE numbers are pre-spelled** ("zwölfhundert") while on-screen captions
keep numerals, and a **first-3-seconds stopping-power** score from `EngagementPredictor.score(VideoRef)`
(CANON §8; R2 §4.4, §5, §6, §8).

### 7.3 Per-principle acceptance (the lens for every PR)

| Principle | A change is acceptable only if… |
|---|---|
| **P1 Composite, don't bake** | …no legible/on-brand element is baked into pixels; it remains an editable `Layer`. |
| **P2 Brief → board** | …the user reaches a board of 4–6 variants from a one-line brief with ≤1–2 clarifying questions and **no** model/prompt choices required. |
| **P3 Two ways to edit** | …the edit is expressible by **both** drag and chat, produces a typed `LayerPatch`, and never triggers a full re-roll. |
| **P4 On-brand by construction** | …it pins to the versioned `BrandKit`, passes the `BrandGuardian` hard gate, and records `brand_kit_version` in lineage. |
| **P5 Nothing ships unscored** | …the Variant carries `EngagementScores` as **bands + confidence** before it can be exported; TRIBE never touches the commercial path. |

---

## 8. Canonical anchors used by this doc (quick index for downstream authors)

- **Object model (CANON §5):** `Workspace → BrandKit → Campaign → Brief → AdDocument → Variant → (Slide) →
  Layer`; supporting `Asset, Render, Experiment, ExperimentArm, Result, AgentRun, GenerationJob, AuditLog,
  WorkspaceMember`. `AdDocument.type ∈ single_image | carousel | video`. Layer types `image | text | logo |
  shape | cta | frame | legal | group | smart`. Lineage fields per §5. → **doc 03** is authoritative.
- **Provider contracts (CANON §6):** `GenSpec`, `GenResult`, `ImageProvider`, `VideoProvider`,
  `AudioProvider`, `LlmProvider`, `EngagementPredictor`, `ProviderBus`; `EngagementScores` shape. →
  **doc 05 / doc 08** authoritative.
- **Agents (CANON §7):** `Strategist, Copywriter, ArtDirector, CarouselArchitect, CompositorPlanner,
  BrandGuardian, Critic, EngagementAnalyst, EditorAgent, LocalizationAgent` (+ ⚑R-A1 `IntakeAgent`). →
  **doc 04** authoritative.
- **LinkedIn specs (CANON §8):** single-image ratios/limits, carousel PDF, video ≤200 MB muted-first. →
  **doc `07` creative-playbook-linkedin** authoritative (exporter mechanics live in **doc `06`**).
- **Engagement stance (CANON §9):** commercially-clean saliency path ships; TRIBE flag-gated R&D only;
  bands + confidence, calibrated. → **doc 08** authoritative.
- **Env vars (CANON §10):** unchanged; ⚑R-ENV1 (R7 §7) recommends adding a Polotno license key
  (`POLOTNO_API_KEY`) to the canonical env list and budgeting a Remotion Company License. → **doc 11**
  authoritative.

---

## 9. Consolidated assumptions (flagged, for the factory)

1. **⚑ ASSUMPTION — missing research files.** `R3-linkedin-playbook.md` and `R5-competitive.md` (cited by
   the build instructions for creative grounding and the MoSCoW split) **were not present** in
   `handoff/research/` at authoring time. All creative/LinkedIn claims here are grounded in
   **CANON §8**; personas, JTBD, and the v1/later split are grounded in **CANON §0–§1** and **R7 §3–§4**.
   If R3/R5 are later produced and conflict, **R3/R5 + CANON win** and §3 and §5 of this doc must be
   revised.
2. **⚑ ASSUMPTION — principle labels.** The five principle labels from the prompt are mapped 1:1 to P1–P5
   (§2 table). Downstream docs should reference principles by this mapping.
3. **⚑ ASSUMPTION — MoSCoW semantics.** "v1" = must + should (§5.1–§5.2); "later" = could/won't-yet
   (§5.3–§5.4), aligned to R7 §3's explicit "MLP LINE" after P5 and its fast-follow ordering. CANON's
   "video = first-class fast-follow" is honored (v1 pipeline is static + carousel; video is the top "later"
   item, F16, and is treated as first-class in the journeys, §4.3).
4. **⚑ ASSUMPTION — `IntakeAgent`.** This doc uses `IntakeAgent` (R7 ⚑R-A1) as the brief normalizer before
   `Strategist`. It is additive and renames nothing in CANON §7. If doc 04 declines to adopt it, the
   normalization work simply folds into `Strategist`'s intake step; the journeys in §4 remain valid.

Cross-document assumptions I am relying on (so other authors stay consistent): **(a)** doc 04 will implement
`IntakeAgent` per R7 ⚑R-A1; **(b)** doc 05 will add an `avatar_ugc` lane per R2 ⚑ recommendation; **(c)**
doc 11 will add `POLOTNO_API_KEY` to the env list per R7 ⚑R-ENV1 and budget a Remotion Company License.
None of these contradict CANON; each is a flagged, additive recommendation.


<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: docs/02-technical-architecture.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

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


<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: docs/03-data-model.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

# 03 — DATA MODEL (Postgres DDL, RLS, JSON schemas, zod)

> **Read `handoff/CANON.md` first.** This document is the **single source of truth for the
> Brutal Ads persistence layer**: the full Postgres/Supabase DDL for every canonical entity (CANON §5),
> Row-Level Security for multi-tenant isolation by `workspace_id`, the exact **LAYER TREE**, **Slide**, and
> **video composition** JSON schemas, the JSONB shapes for `brand_kit.data`, `layer_tree`, `engagement`, and
> the mirroring **zod** schemas that live in `packages/shared`. It also ships the **Brutal seed `BrandKit`**.
>
> **Canonical names used verbatim** (CANON §5–§10): `Workspace`, `WorkspaceMember`, `BrandKit`, `Campaign`,
> `Brief`, `AdDocument`, `Variant`, `Slide`, `Layer`, `Asset`, `Render`, `Experiment`, `ExperimentArm`,
> `Result`, `AgentRun`, `GenerationJob`, `AuditLog`; layer types `image | text | logo | shape | cta | frame |
> legal | group | smart`; `AdDocument.type ∈ single_image | carousel | video`; provider contracts
> `GenSpec`/`GenResult`/`EngagementScores`; env vars from CANON §10. **Do not rename any of these.**
>
> **Divergences from CANON are never silent** — they appear only as clearly-labelled `⚑ RECOMMENDATION`
> notes. **Every external API / drift-prone fact carries a `VERIFY current docs before coding` flag.**
>
> **Stack (CANON §4):** Supabase = Postgres 15+ + Row-Level Security + Auth (`auth.users`) + Storage.
> Multi-tenant via `workspace_id` + RLS **from day one**. Migrations + RLS + seed live in `supabase/`.

---

## 0. Conventions, extensions, and global rules

### 0.1 Global conventions (apply to every table)

| Rule | Decision |
|---|---|
| **Primary keys** | `id uuid primary key default gen_random_uuid()` on every table (via `pgcrypto`). |
| **Tenant column** | Every tenant-scoped table has `workspace_id uuid not null references workspace(id) on delete cascade`. RLS keys on it. |
| **Timestamps** | `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()` (trigger-maintained, §11). |
| **Soft delete** | `deleted_at timestamptz` on user-content tables (`campaign`, `brief`, `ad_document`, `variant`, `asset`, `experiment`). Nullable = live. RLS + app filters exclude non-null. Hard-cascade only on `workspace` delete. |
| **Actor columns** | `created_by uuid references auth.users(id)` where a human may act; agent-created rows set `created_by = null` **and** `created_by_kind = 'agent'` (see enum). |
| **Money** | `cost_usd numeric(12,6) not null default 0` — 6 dp = fractions of a cent for per-token/per-image costs. |
| **JSON** | Structured payloads are **`jsonb`** (indexable, validated by a `CHECK` + zod at the app boundary). Shapes are specified in §6–§9. |
| **Enums** | Postgres `enum` types for closed sets that rarely change; `text` + `CHECK` for sets expected to drift (model ids, provider ids). |
| **Naming** | Tables **singular snake_case** (`ad_document`). Columns snake_case. FKs `<referenced_table>_id`. |
| **No app writes bypass RLS** | `apps/web` uses the **anon key + user JWT** (RLS enforced). Only trusted server code (job workers, webhooks) uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) — **server-only, never shipped to the client**. |

> `⚑ R-DM1 (RECOMMENDATION)` — Add **`created_by_kind` `actor_kind` enum (`human | agent | system`)** to every
> table that can be authored by either a person or an agent. CANON §5 says lineage carries `created_by
> (human|agent)`; making it a first-class column (not only a lineage JSON field) lets RLS/audit/analytics
> distinguish agent writes cheaply. Additive; does not rename anything.

### 0.2 Required extensions (`supabase/migrations/0000_extensions.sql`)

```sql
create extension if not exists "pgcrypto";      -- gen_random_uuid(), digest()
create extension if not exists "uuid-ossp";     -- convenience (optional)
create extension if not exists "pg_trgm";       -- trigram search on names/prompts
create extension if not exists "btree_gin";     -- composite btree+gin indexes
-- Job queue (⚑ R-INFRA1, R7 §6): Supabase Queues is the default queue backend.
create extension if not exists "pgmq";          -- Supabase Queues (Postgres Message Queue)
create extension if not exists "pg_cron";       -- scheduled dispatch / recalibration jobs
-- VERIFY current docs before coding: pgmq + pg_cron are enabled via the Supabase dashboard
-- (Database → Extensions) or `create extension`; confirm availability on your plan and the exact
-- extension names at https://supabase.com/docs/guides/queues and .../database/extensions/pg_cron
```

### 0.3 Enum types (`supabase/migrations/0001_enums.sql`)

```sql
create type actor_kind        as enum ('human','agent','system');
create type member_role       as enum ('owner','admin','editor','viewer');
create type ad_document_type   as enum ('single_image','carousel','video');   -- CANON §5
create type ad_ratio          as enum ('1:1','1.91:1','4:5','16:9','9:16');   -- CANON §6 GenSpec.aspect
create type variant_status     as enum ('draft','generating','ready','failed','approved','archived');
create type generation_modality as enum ('image','video','audio');            -- CANON §6 Modality
create type job_status         as enum ('queued','dispatched','running','succeeded','failed','dead','cancelled','cached'); -- L3: frozen superset (docs/02 worker states dispatched/dead + cache path cached)
create type render_kind        as enum ('png','jpg','pdf','svg'); -- packages/render outputs (L3: PPTX out of scope for v1 — LinkedIn document/carousel ads ship as PDF)
create type render_status      as enum ('queued','running','succeeded','failed');
create type engagement_backend as enum ('saliency','tribe_research');         -- CANON §10 ENGAGEMENT_BACKEND
create type agent_name         as enum (                                       -- CANON §7 (+ ⚑R-A1 IntakeAgent)
  'IntakeAgent','Strategist','Copywriter','ArtDirector','CarouselArchitect',
  'CompositorPlanner','BrandGuardian','Critic','EngagementAnalyst','EditorAgent','LocalizationAgent'
);
create type agent_run_status   as enum ('running','succeeded','failed','refused','budget_exceeded');
create type experiment_status  as enum ('draft','running','paused','completed','archived');
create type locale_code        as enum ('de','en');                            -- CANON §1 bilingual; extend later
create type asset_kind         as enum ('generated_image','uploaded_image','logo','video_clip','audio_vo',
                                        'audio_sfx','audio_music','saliency_map','export','other');
```

> `⚑ R-DM2 (RECOMMENDATION)` — `agent_name` includes **`IntakeAgent`** (R7 §1.3 / ⚑R-A1: brief normalizer
> before `Strategist`). CANON §7's roster is the closed set; IntakeAgent is the only additive agent and is
> flagged in R7. If the factory rejects the addition, drop the enum value; nothing else depends on it.

---

## 1. Entity-relationship overview (canonical hierarchy, CANON §5)

```
auth.users ─┐
            │  (WorkspaceMember join)
            ▼
        workspace ──1:N── workspace_member ──N:1── auth.users
            │
            ├─1:N── brand_kit            (versioned; is_active flags the current version)
            ├─1:N── campaign
            │          └─1:N── brief
            │                    └─1:N── ad_document        (type: single_image|carousel|video)
            │                               └─1:N── variant  (lineage + engagement{}; layer_tree for single_image/video)
            │                                         ├─1:N── slide      (carousel only; ordered; own layer_tree)
            │                                         │          └─(layers live INSIDE layer_tree JSONB; see §6)
            │                                         ├─1:N── render     (png/jpg/pdf/svg per ratio)
            │                                         └─1:N── generation_job (image/video/audio gen for this variant)
            ├─1:N── asset                (Supabase Storage / R2 objects; refs used across variants)
            ├─1:N── experiment
            │          └─1:N── experiment_arm ──N:1── variant
            │                    └─1:N── result   (real LinkedIn CTR/impressions per arm over time)
            ├─1:N── agent_run            (every Claude agent call; observability, cost)
            ├─1:N── generation_job       (also FK'd to variant/asset)
            └─1:N── audit_log            (append-only; RLS read-scoped to workspace)
```

**Layers are NOT their own table.** Per CANON §5, `AdDocument`/`Variant` (and each `Slide`) **carry a layer
tree (JSON)**. The `Layer` object model is a **JSONB node** inside `variant.layer_tree` / `slide.layer_tree`
(§6). This is deliberate — the layer tree is the single serializable source of truth the editor derives from
and merges back into (R7 §1.1), and per-layer relational rows would fight the Polotno store round-trip.

> `⚑ R-DM3 (RECOMMENDATION)` — Keep `Layer` as JSONB, **not** a table. R7 §1.1 is explicit: the canonical
> artifact is the composition (JSON), not per-node rows. A relational `layer` table would (a) desync from the
> Polotno store, (b) make `LayerPatch` diffs a multi-row transaction instead of a JSON merge, (c) break the
> "edit is a JSON diff" invariant. If per-layer querying is ever needed, add a **generated** side-index
> (§6.6), never a source-of-truth table.

---

## 2. DDL — Tenancy & identity

`supabase/migrations/0002_tenancy.sql`

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- workspace  (the tenant boundary. Brutal AI is the seed tenant — CANON §0/§1)
-- ─────────────────────────────────────────────────────────────────────────────
create table workspace (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  default_locale locale_code not null default 'en',
  -- hard spend caps (CANON §4/§10): orchestrator refuses jobs that would breach these
  spend_cap_usd_monthly numeric(12,2) not null default 500.00,
  spend_used_usd_monthly numeric(12,2) not null default 0.00, -- rolled up by a monthly cron
  -- L8: per-brief hard cap as a REAL column (so AT-8 can assert it in SQL, not just workspace-config JSON).
  -- Orchestrator refuses any job whose brief-scoped spend would breach this (emits agent_run_status 'budget_exceeded').
  spend_cap_usd_per_brief numeric(12,2) not null default 25.00,
  settings      jsonb not null default '{}'::jsonb,           -- ui prefs, feature flags per tenant
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint workspace_settings_is_object check (jsonb_typeof(settings) = 'object')
);

-- ─────────────────────────────────────────────────────────────────────────────
-- workspace_member  (CANON §5 supporting entity — maps auth.users → workspace + role)
-- ─────────────────────────────────────────────────────────────────────────────
create table workspace_member (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          member_role not null default 'editor',
  invited_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index workspace_member_user_idx      on workspace_member (user_id);
create index workspace_member_workspace_idx on workspace_member (workspace_id);
```

**`workspace_member` is the RLS pivot.** Every policy answers "is `auth.uid()` a member of the row's
`workspace_id`?" via a `SECURITY DEFINER` helper (§10.1) that reads this table.

---

## 3. DDL — BrandKit (versioned) & Campaign/Brief

`supabase/migrations/0003_brand_campaign_brief.sql`

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- brand_kit  (VERSIONED — CANON §5. Every Variant pins brand_kit_version in lineage.)
--   One workspace has many versions; exactly one is_active per workspace.
-- ─────────────────────────────────────────────────────────────────────────────
create table brand_kit (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  version       integer not null,                 -- 1,2,3… monotonically per workspace
  name          text not null default 'Brand Kit',
  is_active     boolean not null default false,   -- exactly one true per workspace (see partial unique idx)
  data          jsonb not null,                   -- BrandKitData shape — §7
  created_by    uuid references auth.users(id),
  created_by_kind actor_kind not null default 'human',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, version),
  constraint brand_kit_data_is_object check (jsonb_typeof(data) = 'object')
);
-- exactly one active brand kit per workspace
create unique index brand_kit_one_active_per_ws
  on brand_kit (workspace_id) where (is_active is true);
create index brand_kit_ws_version_idx on brand_kit (workspace_id, version desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- campaign
-- ─────────────────────────────────────────────────────────────────────────────
create table campaign (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  name          text not null,
  objective     text,                             -- e.g. 'lead_gen','awareness' (free text; not enforced)
  status        text not null default 'active',   -- 'active'|'paused'|'archived' (soft set)
  created_by    uuid references auth.users(id),
  created_by_kind actor_kind not null default 'human',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index campaign_ws_idx on campaign (workspace_id) where deleted_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- brief  (the one-line brief, normalized by IntakeAgent — CANON §0, R7 ⚑R-A1)
-- ─────────────────────────────────────────────────────────────────────────────
create table brief (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  campaign_id   uuid not null references campaign(id) on delete cascade,
  raw_input     text not null,                    -- exactly what the user typed
  normalized    jsonb not null default '{}'::jsonb, -- BriefNormalized shape — §8.1 (IntakeAgent output)
  strategy      jsonb not null default '{}'::jsonb, -- Strategy shape — §8.2 (Strategist output)
  target_locale locale_code not null default 'en',
  target_type   ad_document_type not null default 'single_image',
  brand_kit_id  uuid references brand_kit(id),     -- pinned brand kit version for this brief
  created_by    uuid references auth.users(id),
  created_by_kind actor_kind not null default 'human',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint brief_normalized_is_object check (jsonb_typeof(normalized) = 'object'),
  constraint brief_strategy_is_object   check (jsonb_typeof(strategy)   = 'object')
);
create index brief_campaign_idx on brief (campaign_id) where deleted_at is null;
create index brief_ws_idx       on brief (workspace_id) where deleted_at is null;
```

---

## 4. DDL — AdDocument / Variant / Slide

`supabase/migrations/0004_ad_document_variant_slide.sql`

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ad_document  (CANON §5: type ∈ single_image|carousel|video)
--   single_image/video: layer tree lives on the winning Variant.
--   carousel: Variant → ordered Slide[], each Slide has its own layer tree.
-- ─────────────────────────────────────────────────────────────────────────────
create table ad_document (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  brief_id      uuid not null references brief(id) on delete cascade,
  type          ad_document_type not null,
  title         text not null default 'Untitled ad',
  base_ratio    ad_ratio not null default '1:1',  -- the base ratio; others derived by smart re-layout (CANON §8)
  created_by    uuid references auth.users(id),
  created_by_kind actor_kind not null default 'human',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index ad_document_brief_idx on ad_document (brief_id) where deleted_at is null;
create index ad_document_ws_idx    on ad_document (workspace_id) where deleted_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- variant  (the board card. Carries the LAYER TREE + full LINEAGE + engagement{})
--   CANON §5 lineage: brief_id, brand_kit_version, provider, model, model_version,
--   seed, prompt, negative_prompt, parent_variant_id, created_by(human|agent), engagement{}
-- ─────────────────────────────────────────────────────────────────────────────
create table variant (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspace(id) on delete cascade,
  ad_document_id    uuid not null references ad_document(id) on delete cascade,

  -- LAYER TREE (single_image/video). For carousel this is null and slides carry their own trees.
  layer_tree        jsonb,                         -- LayerTree shape — §6. Null iff ad_document.type='carousel'.

  -- VIDEO composition (video only) — §9. Null for single_image/carousel.
  video_composition jsonb,                         -- VideoComposition shape — §9

  status            variant_status not null default 'draft',
  locale            locale_code not null default 'en',
  ratio             ad_ratio not null default '1:1',

  -- ── LINEAGE (CANON §5 — verbatim field set) ────────────────────────────────
  brief_id          uuid not null references brief(id) on delete cascade,
  brand_kit_version integer not null,              -- pins the brand_kit.version used
  provider          text,                          -- e.g. 'bfl','gemini','kling' (ImageProvider.id/VideoProvider.id)
  model             text,                          -- e.g. 'flux-2-pro','gemini-3-pro-image','kling-v2-5-turbo'
  model_version     text,                          -- provider-reported version string
  seed              bigint,                        -- GenSpec.seed (nullable)
  prompt            text,                          -- IMAGERY-ONLY prompt (no legible text — CANON §2)
  negative_prompt   text,
  parent_variant_id uuid references variant(id) on delete set null, -- fork / auto-iterate / localization source
  created_by        uuid references auth.users(id),
  created_by_kind   actor_kind not null default 'agent',
  created_by_agent  agent_name,                    -- which agent authored it (null for human)

  -- ── ENGAGEMENT (denormalized latest scores for board ranking) ──────────────
  engagement        jsonb not null default '{}'::jsonb, -- EngagementScores shape — §8.3 (mirrors CANON §6)

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,

  -- integrity: carousel has no top-level layer_tree; single_image/video must have one
  constraint variant_tree_shape check (
    (layer_tree is null      and video_composition is null)      -- carousel (slides carry trees) OR unstarted
    or (layer_tree is not null and video_composition is null)    -- single_image
    or (layer_tree is not null and video_composition is not null)-- video (tree = poster/overlay tracks)
  ),
  constraint variant_layer_tree_is_object  check (layer_tree is null or jsonb_typeof(layer_tree) = 'object'),
  constraint variant_engagement_is_object  check (jsonb_typeof(engagement) = 'object'),
  constraint variant_video_comp_is_object  check (video_composition is null or jsonb_typeof(video_composition) = 'object')
);
create index variant_ad_document_idx on variant (ad_document_id) where deleted_at is null;
create index variant_ws_idx          on variant (workspace_id) where deleted_at is null;
create index variant_parent_idx      on variant (parent_variant_id);
create index variant_brief_idx       on variant (brief_id);
-- rank the board by predicted stopping power (JSONB path index)
create index variant_stopping_power_idx
  on variant (((engagement->'stoppingPower'->>'value')::numeric) desc);
-- lineage lookups ("all variants from FLUX.2 with seed X")
create index variant_lineage_idx     on variant (provider, model, seed);

-- ─────────────────────────────────────────────────────────────────────────────
-- slide  (CAROUSEL only — CANON §5. Ordered; each slide has its OWN layer tree.)
--   Narrative role hook→reframe→close (CANON §7 CarouselArchitect; R4 §5.4)
-- ─────────────────────────────────────────────────────────────────────────────
create table slide (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  variant_id    uuid not null references variant(id) on delete cascade,
  position      integer not null,                  -- 0-based order within the carousel
  role          text,                              -- 'hook'|'reframe'|'close'|'body' (narrative role)
  layer_tree    jsonb not null,                    -- LayerTree shape — §6 (per-slide)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (variant_id, position),
  constraint slide_layer_tree_is_object check (jsonb_typeof(layer_tree) = 'object')
);
create index slide_variant_idx on slide (variant_id, position);
```

---

## 5. DDL — Asset / Render / GenerationJob / AgentRun / Experiment / Result / AuditLog

`supabase/migrations/0005_assets_jobs_experiments.sql`

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- asset  (a stored binary in Supabase Storage / R2 — CANON §4/§5)
--   GenResult.assetId points here. Cache key lets the ProviderBus dedupe (CANON §4).
-- ─────────────────────────────────────────────────────────────────────────────
create table asset (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  kind          asset_kind not null,
  storage_bucket text not null default 'assets',   -- Supabase Storage bucket name
  storage_path  text not null,                      -- object key within the bucket
  mime_type     text not null,
  width         integer,                            -- images/video
  height        integer,
  duration_ms   integer,                            -- video/audio
  bytes         bigint,
  -- cache key (CANON §4): sha256 of (provider, model, version, prompt, seed, params)
  cache_key     text,
  provider      text,
  model         text,
  meta          jsonb not null default '{}'::jsonb, -- provider raw, exif, palette, saliency stats, etc.
  created_by    uuid references auth.users(id),
  created_by_kind actor_kind not null default 'agent',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint asset_meta_is_object check (jsonb_typeof(meta) = 'object')
);
create index asset_ws_idx        on asset (workspace_id) where deleted_at is null;
-- dedupe / cache hit lookups scoped to tenant
create unique index asset_cache_key_uniq on asset (workspace_id, cache_key) where cache_key is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- render  (a rendered output of a Variant at a ratio — packages/render — CANON §4)
-- ─────────────────────────────────────────────────────────────────────────────
create table render (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  variant_id    uuid not null references variant(id) on delete cascade,
  kind          render_kind not null,               -- png|jpg|pdf|svg (L3: no pptx; document/carousel ads ship as pdf)
  ratio         ad_ratio not null,
  status        render_status not null default 'queued',
  asset_id      uuid references asset(id),           -- the produced file (set on success)
  width         integer,
  height        integer,
  bytes         bigint,                              -- for the LinkedIn ≤5MB / ≤200MB spec gate (CANON §8)
  render_hash   text,                                -- hash of (layer_tree, ratio, brand_kit_version) for caching
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index render_variant_idx on render (variant_id);
create index render_ws_idx      on render (workspace_id);
create unique index render_dedupe on render (variant_id, kind, ratio, render_hash) where render_hash is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- generation_job  (async external generation — CANON §4. UI subscribes to progress.)
--   Backed by pgmq (⚑R-INFRA1). One row per provider call (image/video/audio).
-- ─────────────────────────────────────────────────────────────────────────────
create table generation_job (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  variant_id    uuid references variant(id) on delete cascade,     -- may be null for pre-variant gen
  brief_id      uuid references brief(id) on delete cascade,
  modality      generation_modality not null,        -- image|video|audio (CANON §6)
  job_kind      text not null,                        -- routing key: 'photoreal_bg','animate_still_i2v','voiceover',…
  status        job_status not null default 'queued',
  provider      text,                                 -- resolved ImageProvider/VideoProvider/AudioProvider .id
  model         text,
  model_version text,
  spec          jsonb not null,                       -- GenSpec / VideoGenSpec / TtsSpec — §8.4 (as sent)
  result        jsonb,                                -- GenResult — §8.5 (as returned)
  cache_key     text,                                 -- (provider,model,version,prompt,seed,params) sha256
  cache_hit     boolean not null default false,
  asset_id      uuid references asset(id),            -- produced asset (GenResult.assetId)
  progress      numeric(5,2) not null default 0,      -- 0–100 for the UI stream
  attempts      integer not null default 0,
  provider_task_id text,                              -- e.g. Kling task_id / BFL polling id
  cost_usd      numeric(12,6) not null default 0,     -- CANON §4 cost logging
  error         text,
  moderation    jsonb,                                -- content-moderation surface on failure (CANON §4)
  queued_at     timestamptz not null default now(),
  started_at    timestamptz,
  finished_at   timestamptz,
  constraint generation_job_spec_is_object check (jsonb_typeof(spec) = 'object')
);
create index generation_job_variant_idx on generation_job (variant_id);
create index generation_job_ws_status_idx on generation_job (workspace_id, status);
create unique index generation_job_cache_idx on generation_job (workspace_id, cache_key) where cache_key is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- agent_run  (every Claude agent call — CANON §7 observability + cost)
-- ─────────────────────────────────────────────────────────────────────────────
create table agent_run (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  brief_id      uuid references brief(id) on delete cascade,
  variant_id    uuid references variant(id) on delete cascade,
  agent         agent_name not null,                  -- CANON §7 roster (+ IntakeAgent)
  status        agent_run_status not null default 'running',
  model         text not null,                        -- 'claude-sonnet-5'|'claude-opus-4-8'|'claude-haiku-4-5' (R7 ⚑R-LLM1)
  input         jsonb not null default '{}'::jsonb,    -- prompt/context (redactable)
  output        jsonb,                                 -- structured artifact the agent emitted (zod-validated)
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  latency_ms    integer,
  cost_usd      numeric(12,6) not null default 0,      -- CANON §4
  iterate_round integer not null default 0,            -- bounded auto-iterate ≤2 (CANON §7)
  parent_run_id uuid references agent_run(id),         -- pipeline threading
  error         text,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz,
  constraint agent_run_input_is_object  check (jsonb_typeof(input)  = 'object'),
  constraint agent_run_output_is_object check (output is null or jsonb_typeof(output) = 'object')
);
create index agent_run_ws_idx     on agent_run (workspace_id, created_at desc);
create index agent_run_brief_idx  on agent_run (brief_id);
create index agent_run_variant_idx on agent_run (variant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- experiment / experiment_arm / result  (A/B testing + real LinkedIn results — CANON §5, R4 §7)
-- ─────────────────────────────────────────────────────────────────────────────
create table experiment (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  campaign_id   uuid references campaign(id) on delete cascade,
  name          text not null,
  hypothesis    text,
  status        experiment_status not null default 'draft',
  primary_metric text not null default 'ctr',         -- 'ctr'|'cpc'|'cvr'
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index experiment_ws_idx on experiment (workspace_id) where deleted_at is null;

create table experiment_arm (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  experiment_id uuid not null references experiment(id) on delete cascade,
  variant_id    uuid not null references variant(id) on delete cascade,
  label         text not null,                        -- 'A','B','control',…
  linkedin_creative_urn text,                         -- LinkedIn ad/creative id once shipped (external)
  created_at    timestamptz not null default now(),
  unique (experiment_id, variant_id)
);
create index experiment_arm_experiment_idx on experiment_arm (experiment_id);
create index experiment_arm_variant_idx     on experiment_arm (variant_id);

-- real LinkedIn results ingested over time (feeds the calibration loop — R4 §7)
create table result (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references workspace(id) on delete cascade,
  experiment_arm_id uuid not null references experiment_arm(id) on delete cascade,
  measured_at      timestamptz not null default now(), -- snapshot time (results accumulate)
  impressions      bigint not null default 0,
  clicks           bigint not null default 0,
  ctr              numeric(8,5),                        -- clicks/impressions (nullable until impressions>0)
  spend_usd        numeric(12,4),
  cpc_usd          numeric(12,4),
  conversions      bigint,
  cvr              numeric(8,5),
  source           text not null default 'manual',      -- 'manual'|'linkedin_api'
  raw              jsonb not null default '{}'::jsonb,   -- untouched payload from source
  created_at       timestamptz not null default now(),
  constraint result_raw_is_object check (jsonb_typeof(raw) = 'object')
);
create index result_arm_time_idx on result (experiment_arm_id, measured_at desc);
create index result_ws_idx        on result (workspace_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_log  (append-only — CANON §4/§5; license-guard stamps for TRIBE — R4 §6)
-- ─────────────────────────────────────────────────────────────────────────────
create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  actor_id      uuid references auth.users(id),         -- null for agent/system
  actor_kind    actor_kind not null default 'human',
  action        text not null,                          -- 'variant.approved','job.dispatched','tribe.research_run',…
  target_table  text,
  target_id     uuid,
  commercial_use boolean not null default true,         -- R4 §6: TRIBE artifacts stamped false
  cost_usd      numeric(12,6) not null default 0,
  detail        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  constraint audit_log_detail_is_object check (jsonb_typeof(detail) = 'object')
);
create index audit_log_ws_time_idx on audit_log (workspace_id, created_at desc);
create index audit_log_target_idx  on audit_log (target_table, target_id);
```

---

## 6. LAYER TREE JSON schema (the spine — CANON §2/§5)

The **layer tree** is the canonical, serializable composition. It is a **superset the Polotno store JSON can
be losslessly derived from and merged back into** (R7 §1.1) — it is **not** the Polotno JSON itself. Stored in
`variant.layer_tree` (single_image/video) and `slide.layer_tree` (carousel). Chat-to-edit emits typed
**`LayerPatch`** diffs against this tree (CANON §4; §6.5 here).

> `VERIFY current docs before coding` — the Polotno store JSON shape (page/element fields, `custom` passthrough)
> at **polotno.com/docs** before wiring the `EditorAdapter` (`packages/render` derives Polotno store JSON from
> this tree). Polotno is a **commercially-licensed SDK** — see `POLOTNO_API_KEY` (⚑R-ENV1, docs/11).

### 6.1 Top-level `LayerTree`

```jsonc
{
  "schemaVersion": 1,
  "ratio": "1:1",                      // ad_ratio — the base this tree is authored at
  "canvas": { "width": 1200, "height": 1200, "unit": "px", "background": "#0a0a0a" },
  "safeZones": {                       // CANON §8 — feed crop, profile overlap, "see more" fold
    "feedCrop":   { "top": 0, "right": 0, "bottom": 0, "left": 0 },
    "profileOverlap": { "top": 0.12, "left": 0.0 },   // fraction of canvas obscured by avatar overlay
    "seeMoreFold": 0.85                                // y-fraction below which text may be clipped
  },
  "layers": [ /* Layer[] — z-order = array order (0 = back) */ ]
}
```

### 6.2 Common `Layer` fields (every layer type has these)

```jsonc
{
  "id": "ly_headline",                 // stable id (LayerPatch targets this)
  "type": "text",                      // image|text|logo|shape|cta|frame|legal|group|smart (CANON §5)
  "name": "Headline",
  "x": 80, "y": 640, "width": 1040, "height": 300,   // px, top-left origin
  "rotation": 0,                       // degrees
  "opacity": 1.0,                      // 0–1
  "visible": true,
  "locked": false,
  "zLocked": false,                    // exclude from auto z-reorder
  "renderHints": {                     // ⚑R-LT1 (R7 §1.1): deterministic multi-ratio re-layout (CANON §8)
    "safeZone": true,                  // must stay inside safeZones
    "maxLines": 3,
    "autoFit": true,                   // shrink-to-fit within box
    "minFontPx": 28,
    "anchor": "bottom-left",           // reflow anchor when re-laying out to another ratio
    "pinTo": "canvas"                  // 'canvas'|'parentGroup' — what x/y is relative to on re-layout
  },
  "custom": {}                         // opaque passthrough round-tripped to Polotno `custom`
}
```

### 6.3 Per-type extensions (discriminated by `type`)

```jsonc
// type: "image"  — AI-generated or uploaded imagery (the ONLY pixels; CANON §2)
{ "type": "image", "assetId": "as_bg_01", "src": "storage://assets/…",
  "fit": "cover", "flipX": false, "flipY": false,
  "crop": { "x": 0, "y": 0, "width": 1, "height": 1 },   // 0–1 fractions
  "filters": { "brightness": 0, "contrast": 0, "grayscale": 0 } }

// type: "text"  — headline/subhead/body (editable vector text — the anti-baked-pixel win)
{ "type": "text", "text": "1.200 Kanzleien vertrauen Brutal",
  "fontFamily": "Playfair Display", "fontSize": 72, "fontWeight": 700,
  "fontStyle": "normal", "lineHeight": 1.05, "letterSpacing": 0,
  "align": "left", "verticalAlign": "top", "color": "#f5f5f0",
  "textTransform": "none", "backgroundColor": null,
  "stroke": null, "shadow": null }

// type: "logo"  — brand lockup pulled from BrandKit (never generated pixels)
{ "type": "logo", "assetId": "as_logo_wordmark", "lockup": "wordmark",  // 'wordmark'|'symbol'|'combined'
  "src": "storage://…", "tint": null }

// type: "shape"  — rects, lines, dividers, accents (vector)
{ "type": "shape", "shape": "rect",   // 'rect'|'ellipse'|'line'|'polygon'
  "fill": "#cba65e", "stroke": null, "strokeWidth": 0, "cornerRadius": 0,
  "points": null }                     // for polygon/line

// type: "cta"  — call-to-action button (composited; first-class for ctaAttention scoring — R4 §5.3)
{ "type": "cta", "text": "Demo buchen", "style": "solid", // 'solid'|'outline'|'ghost'
  "fill": "#b6e64a", "textColor": "#0a0a0a", "cornerRadius": 8,
  "paddingX": 28, "paddingY": 16, "fontFamily": "Inter", "fontSize": 32, "fontWeight": 600,
  "icon": null, "href": null }

// type: "frame"  — decorative border / device frame / mask container
{ "type": "frame", "frameStyle": "border", "fill": null,
  "stroke": "#cba65e", "strokeWidth": 4, "cornerRadius": 0, "clipsChildren": false }

// type: "legal"  — mandatory disclaimer/legal text (first-class; BrandGuardian enforces — R7 §4)
{ "type": "legal", "text": "Bezahlte Partnerschaft. …",
  "fontFamily": "Inter", "fontSize": 18, "color": "#9a9a92", "align": "left",
  "requiredBy": "brand_kit.disclaimers.legal_ai_de",  // provenance so BrandGuardian can verify presence
  "removable": false }

// type: "group"  — container; children reflow together
{ "type": "group", "children": [ /* Layer[] */ ], "clip": false }

// type: "smart"  — DATA-BOUND layer (CANON §5: e.g. "{{customer_count}}+ firms")
{ "type": "smart", "render": "text",  // 'text'|'image' — how the resolved binding renders
  "binding": "{{customer_count}}",     // token resolved from smartData / locale (§6.4)
  "template": "{{customer_count}}+ Kanzleien",
  "fallback": "führende Kanzleien",
  "ttsTemplate": "{{customer_count_spoken}}+ Kanzleien",  // TTS-safe form (R2 §4.4; e.g. "zwölfhundert")
  // resolved presentation reuses the text/image fields above once bound:
  "fontFamily": "Playfair Display", "fontSize": 64, "color": "#f5f5f0" }
```

### 6.4 `smartData` (binding source, attached at tree root when any `smart` layer exists)

```jsonc
"smartData": {
  "customer_count": { "value": 1200, "display": "1.200", "spoken": { "de": "zwölfhundert", "en": "twelve hundred" } },
  "vertical": { "value": "legal_ai_de", "display": { "de": "Legal AI", "en": "Legal AI" } }
}
```

### 6.5 `LayerPatch` (chat-to-edit diff — CANON §4/§7 EditorAgent; never a full re-roll)

**L6 (frozen — the ONE reconciled schema).** There is exactly one `LayerPatch`/`LayerPatchOp` shape across
the whole build: **doc 06's richer op union** (`setText | resize | rotate | reorderZ | setFont | setFill |
addLayer | removeLayer | replaceAsset | setBinding | setSlideOrder | setVisible`) **wrapped in doc 03's
envelope** (`{ id, variantId, slideId?, origin, createdBy, note?, ops: LayerPatchOp[] }`). `LayerPatchSet`
is an alias for `LayerPatch[]`. `applyLayerPatch` in `packages/shared` implements exactly this union. The
canonical zod (`LayerPatchOp`, `LayerPatch`, `LayerPatchSet`) lives in §12.2 and everything imports it.

```jsonc
// EditorAgent (NL → typed LayerPatch). Applied atomically; re-renders only affected layers.
{
  "id": "lp_01",                         // patch id (audit / undo)
  "variantId": "va_01",                  // target variant
  "slideId": "sl_02",                    // optional — set only when the patch targets a carousel slide's tree
  "origin": "chat",                      // 'chat'|'canvas'|'agent'|'system' — where the edit came from
  "createdBy": "human",                  // actor_kind (human|agent|system)
  "note": "user asked to shorten the headline and make it gold",   // audit / undo label
  "ops": [
    { "op": "setText",      "layerId": "ly_headline", "text": "Kürzere Headline" },
    { "op": "setFill",      "layerId": "ly_headline", "fill": "#cba65e" },
    { "op": "setFont",      "layerId": "ly_headline", "fontFamily": "Playfair Display", "fontSize": 64, "fontWeight": 700 },
    { "op": "resize",       "layerId": "ly_cta",      "x": 80, "y": 980, "width": 420, "height": 96 },
    { "op": "rotate",       "layerId": "ly_frame",    "rotation": 2 },
    { "op": "reorderZ",     "layerId": "ly_logo",     "toIndex": 5 },
    { "op": "addLayer",     "afterLayerId": "ly_bg",  "layer": { /* full Layer */ } },
    { "op": "removeLayer",  "layerId": "ly_shape_2" },
    { "op": "replaceAsset", "layerId": "ly_bg",       "assetId": "as_bg_02" },
    { "op": "setBinding",   "layerId": "ly_count",    "binding": "{{customer_count}}", "template": "{{customer_count}}+ Kanzleien" },
    { "op": "setSlideOrder","order": ["sl_00","sl_02","sl_01"] },   // carousel deck re-order
    { "op": "setVisible",   "layerId": "ly_legal",    "visible": true }
  ]
}
```

### 6.6 Optional generated side-index (query-only, never source of truth — ⚑R-DM3)

```sql
-- If per-layer querying is ever needed, expose layers as a read-only view over the JSONB.
-- Do NOT write here; the tree is authoritative.
create or replace view variant_layer_flat as
select v.id as variant_id, v.workspace_id,
       (l->>'id')   as layer_id,
       (l->>'type') as layer_type,
       (l->>'name') as layer_name
from variant v,
     lateral jsonb_array_elements(coalesce(v.layer_tree->'layers','[]'::jsonb)) as l
where v.layer_tree is not null;
```

---

## 7. `brand_kit.data` JSONB shape (`BrandKitData`) + Brutal seed row

Versioned, immutable per version (R7 §1.5). BrandGuardian gates mechanically against this (CANON §7).

### 7.1 `BrandKitData` shape

```jsonc
{
  "palette": {
    "background": "#0a0a0a",
    "surface": "#141414",
    "text": "#f5f5f0",
    "muted": "#9a9a92",
    "accents": { "gold": "#cba65e", "lime": "#b6e64a", "acidLime": "#c9ff2e" },  // CANON §1
    "allowed": ["#0a0a0a","#141414","#f5f5f0","#9a9a92","#cba65e","#b6e64a","#c9ff2e"], // BrandGuardian whitelist
    "sets": { "pe": ["#cba65e","#b6e64a"] }                                      // PE angle (CANON §1)
  },
  "typography": {
    "display": { "family": "Playfair Display", "weights": [400,700,900], "source": "google" },
    "body":    { "family": "Inter",            "weights": [400,500,600,700], "source": "google" },
    "scale":   { "headline": 72, "subhead": 40, "body": 28, "legal": 18, "cta": 32 }
  },
  "logos": [
    { "id": "wordmark",  "lockup": "wordmark",  "assetId": "as_logo_wordmark",  "minWidthPx": 160 },
    { "id": "symbol",    "lockup": "symbol",    "assetId": "as_logo_symbol",    "minWidthPx": 48 }
  ],
  "iconography": {                                                // L7 (from docs/09) — icon system BrandGuardian gates
    "style": "line",                                             // 'line'|'solid'|'duotone'
    "strokeWidthPx": 2,
    "cornerStyle": "sharp",                                      // 'sharp'|'rounded'
    "assetIds": [],                                              // approved icon asset ids
    "avoid": ["emoji","3d-glossy","gradient-mesh"]              // icon styles the brand rejects
  },
  "voice": {
    "register": "sober, editorial, documentary — NOT hype AI",   // CANON §1
    "person": "third",
    "bannedTerms": ["revolutionary","game-changer","10x","AI-powered magic","disrupt","unleash","supercharge"],
    "preferSpecificityOverCleverness": true                       // CANON §7 Copywriter
  },
  "messaging": {                                                  // L7 (from docs/09)
    "approvedClaims": [                                          // claims Copywriter/BrandGuardian may use verbatim
      { "id": "faster_drafting", "de": "40% schnelleres Entwerfen", "en": "40% faster drafting",
        "requiresProof": true, "proofPointId": "drafting_speed" }
    ],
    "taglines": { "de": ["Nüchtern. Präzise. Belegbar."], "en": ["Sober. Precise. Provable."] }
  },
  "proofPoints": [                                                // L7 (from docs/09) — per-locale, TTS-safe `spoken`
    { "id": "customer_count", "value": 1200, "display": { "de": "1.200", "en": "1,200" },
      "spoken": { "de": "zwölfhundert", "en": "twelve hundred" },
      "claim": { "de": "1.200 Kanzleien", "en": "1,200 firms" }, "sourceUrl": null, "verifiedAt": null },
    { "id": "drafting_speed", "value": 40, "display": { "de": "40%", "en": "40%" },
      "spoken": { "de": "vierzig Prozent", "en": "forty percent" },
      "claim": { "de": "40% schneller", "en": "40% faster" }, "sourceUrl": null, "verifiedAt": null }
  ],
  "disclaimers": {
    "legal_ai_de": { "de": "Rechtlicher Hinweis: Ergebnisse ersetzen keine anwaltliche Beratung.",
                     "en": "Legal notice: outputs do not constitute legal advice.", "required": true },
    "pe":          { "de": "Kapitalanlagen bergen Risiken.", "en": "Investments carry risk.", "required": false }
  },
  "requiredDisclaimers": ["legal_ai_de"],                        // L7 (from docs/09) — keys into `disclaimers` that MUST appear
  "disclosures": {                                                // L7 (from docs/09) + CANON L10
    "aiContent": { "required": false,                           // warn by default; error when the tenant vertical requires it
      "de": "Mit KI erstellt.", "en": "Created with AI." }
  },
  "localization": {
    "locales": ["de","en"],
    "default": "de",
    "transcreate": true,                                          // NOT literal translation (CANON §7)
    "ttsNumberSpelling": true                                     // R2 §4.4 (e.g. "zwölfhundert")
  },
  "imagery": {
    "mood": "muted-first, documentary, dark palette, high-contrast subject",
    "negativePromptDefaults": "no text, no watermark, no logo, no captions, no lower-thirds",
    "aspectDefaults": { "single_image": "1:1", "carousel": "1:1", "video": "1:1" },
    "style": { "avoid": ["stock-smiles","neon","hype-tech","gradient-mesh"] }   // L10: wired into the negative prompt
  },
  "safeZoneDefaults": { "profileOverlap": { "top": 0.12, "left": 0.0 }, "seeMoreFold": 0.85 },
  "governance": {                                                 // L7 (from docs/09) — governance metadata
    "owner": "antonio@brutal.ai",
    "approvedBy": null,
    "approvedAt": null,
    "sourceDoc": "docs/09",
    "immutablePerVersion": true                                  // R7 §1.5 — a version is frozen once created
  }
}
```

### 7.2 Brutal seed `BrandKit` row (`supabase/seed.sql`)

```sql
-- Seed the first/seed tenant (Brutal AI — CANON §0/§1) and its v1 brand kit.
insert into workspace (id, name, slug, default_locale)
values ('00000000-0000-0000-0000-000000000001','Brutal AI','brutal','de')
on conflict (id) do nothing;

-- L10: `acidLime` #c9ff2e below is a PLACEHOLDER app-chrome hex, NOT gate-load-bearing.
-- Brand-gate tests MUST NOT hard-assert this exact hex; confirm the real value with Antonio.
insert into brand_kit (workspace_id, version, name, is_active, created_by_kind, data)
values (
  '00000000-0000-0000-0000-000000000001', 1, 'Brutal Seed Kit', true, 'system',
  $${
    "palette": {
      "background": "#0a0a0a", "surface": "#141414", "text": "#f5f5f0", "muted": "#9a9a92",
      "accents": { "gold": "#cba65e", "lime": "#b6e64a", "acidLime": "#c9ff2e" },
      "allowed": ["#0a0a0a","#141414","#f5f5f0","#9a9a92","#cba65e","#b6e64a","#c9ff2e"],
      "sets": { "pe": ["#cba65e","#b6e64a"] }
    },
    "typography": {
      "display": { "family": "Playfair Display", "weights": [400,700,900], "source": "google" },
      "body":    { "family": "Inter", "weights": [400,500,600,700], "source": "google" },
      "scale":   { "headline": 72, "subhead": 40, "body": 28, "legal": 18, "cta": 32 }
    },
    "logos": [
      { "id": "wordmark", "lockup": "wordmark", "assetId": null, "minWidthPx": 160 },
      { "id": "symbol",   "lockup": "symbol",   "assetId": null, "minWidthPx": 48 }
    ],
    "voice": {
      "register": "sober, editorial, documentary — NOT hype AI",
      "person": "third",
      "bannedTerms": ["revolutionary","game-changer","10x","AI-powered magic","disrupt","unleash","supercharge"],
      "preferSpecificityOverCleverness": true
    },
    "disclaimers": {
      "legal_ai_de": { "de": "Rechtlicher Hinweis: Ergebnisse ersetzen keine anwaltliche Beratung.",
                       "en": "Legal notice: outputs do not constitute legal advice.", "required": true },
      "pe": { "de": "Kapitalanlagen bergen Risiken.", "en": "Investments carry risk.", "required": false }
    },
    "localization": { "locales": ["de","en"], "default": "de", "transcreate": true, "ttsNumberSpelling": true },
    "imagery": {
      "mood": "muted-first, documentary, dark palette, high-contrast subject",
      "negativePromptDefaults": "no text, no watermark, no logo, no captions, no lower-thirds",
      "aspectDefaults": { "single_image": "1:1", "carousel": "1:1", "video": "1:1" }
    },
    "safeZoneDefaults": { "profileOverlap": { "top": 0.12, "left": 0.0 }, "seeMoreFold": 0.85 }
  }$$::jsonb
)
on conflict (workspace_id, version) do nothing;
```

> **Assumption flagged:** the seed uses fixed colors/fonts from CANON §1. Logo `assetId`s are `null` until the
> build uploads real logo files to Storage and back-fills them. The exact acid-lime chrome hex (`#c9ff2e`) is a
> **non-gate placeholder** (CANON L10) — CANON §1 names "acid-lime for the app chrome" without a hex. It is
> **not gate-load-bearing: brand-gate tests MUST NOT hard-assert this exact hex.** **VERIFY the exact acid-lime
> value with Antonio before shipping.**

---

## 8. Remaining JSONB shapes (Brief, Strategy, Engagement, GenSpec/GenResult)

### 8.1 `brief.normalized` (`BriefNormalized` — IntakeAgent output, R7 ⚑R-A1)

```jsonc
{
  "audience": "Managing partners at German-speaking law firms (10–100 lawyers)",
  "vertical": "legal_ai_de",                 // 'legal_ai_de' | 'pe' | free string
  "offer": "AI that drafts German contracts in seconds",
  "proofPoints": ["1.200 firms", "40% faster drafting"],
  "mandatoryLegal": ["legal_ai_de"],         // keys into brand_kit.disclaimers
  "languages": ["de"],                        // subset of brand_kit.localization.locales
  "constraints": { "mustInclude": [], "mustAvoid": [] },
  "clarifyingQuestions": []                   // ≤1–2 only when a required field is missing
}
```

### 8.2 `brief.strategy` (`Strategy` — Strategist output, CANON §7)

```jsonc
{
  "angle": "specificity beats hype: name the exact time saved",
  "jtbd": "Draft a compliant German contract without a junior associate",
  "positioning": "the sober tool for firms that distrust AI hype",
  "keyMessage": "1.200 Kanzleien drafting faster — without the risk",
  "proofToLead": "40% faster drafting",
  "recommendedType": "single_image",          // ad_document_type
  "recommendedVariantCount": 5
}
```

### 8.3 `variant.engagement` (`EngagementScores` — **mirrors CANON §6 exactly**; R4 §5)

Every score is a **band + confidence**, never a bare point value (CANON §6/§9, R4 §7).

```jsonc
{
  "backend": "saliency",                       // ENGAGEMENT_BACKEND used
  "saliencySource": "saliency.transalnet",     // driver id (R4 §5.2)
  "modelVersion": "transalnet-1.0",
  "attentionMap": { "assetId": "as_saliency_01", "src": "storage://…" },   // optional (CANON §6)
  "focalClarity":       { "value": 0.72, "band": [0.65,0.79], "confidence": 0.6 },
  "valuePropAttention": { "value": 0.58, "band": [0.50,0.66], "confidence": 0.6 },
  "ctaAttention":       { "value": 0.41, "band": [0.33,0.49], "confidence": 0.6 },  // killer feature (R4 §5.3)
  "clutter":            { "value": 0.22, "band": [0.18,0.28], "confidence": 0.7 },
  "stoppingPower":      { "value": 0.66, "band": [0.55,0.77], "confidence": 0.5 },
  "firstThreeSeconds":  { "value": 0.70, "band": [0.60,0.80], "confidence": 0.4 },  // video only (CANON §6)
  "predictedCtrBand":   { "low": 0.008, "high": 0.021, "confidence": 0.35 },        // CANON §6 (bands only)
  "perSlide": [                                  // carousel only (CANON §6) — one entry per Slide
    { "position": 0, "role": "hook",    "stoppingPower": {"value":0.78,"band":[0.68,0.88],"confidence":0.5},
      "ctaAttention": {"value":0.10,"band":[0.05,0.18],"confidence":0.5} },
    { "position": 1, "role": "reframe", "stoppingPower": {"value":0.52,"band":[0.42,0.62],"confidence":0.5} },
    { "position": 2, "role": "close",   "ctaAttention": {"value":0.61,"band":[0.51,0.71],"confidence":0.5} }
  ],
  "scoredAt": "2026-07-01T09:00:00Z",
  "raw": {}                                      // provider/driver raw payload (CANON §6 EngagementScores.raw)
}
```

### 8.4 `generation_job.spec` (`GenSpec` / `VideoGenSpec` / `TtsSpec` — CANON §6, R2 §1.3/§4)

```jsonc
// image (GenSpec — CANON §6). NOTE: prompt is IMAGERY-ONLY (no legible text — CANON §2).
{ "modality": "image", "prompt": "documentary photo, lawyer at a dark oak desk, muted, high contrast",
  "negativePrompt": "no text, no watermark, no logo, no captions", "aspect": "1:1",
  "seed": 12345, "refs": [{ "assetId": "as_ref_01" }], "model": "flux-2-pro", "params": {} }

// video (VideoGenSpec — CANON §6 + R2 §1.3)
{ "modality": "video", "prompt": "…", "negativePrompt": "…", "aspect": "1:1",
  "seed": 12345, "refs": [{ "assetId": "as_still_01" }], "model": "kling-v2-5-turbo",
  "params": { "mode": "pro", "duration": "5", "image2video": true, "cfg_scale": 0.5 } }

// audio (TtsSpec — R2 §4.1). text is TTS-normalized (numbers pre-spelled for DE — R2 §4.4).
{ "modality": "audio", "text": "Zwölfhundert Kanzleien vertrauen …", "voiceId": "ELEVENLABS_VOICE_ID_DE",
  "model": "eleven_multilingual_v2", "params": { "language_code": "de", "seed": 12345,
  "voice_settings": { "stability": 0.5, "similarity_boost": 0.75, "speed": 1.0 } } }
```

### 8.5 `generation_job.result` (`GenResult` — CANON §6)

```jsonc
{ "assetId": "as_bg_01", "width": 1200, "height": 1200, "provider": "bfl",
  "model": "flux-2-pro", "seed": 12345, "costUsd": 0.03, "raw": { "…": "provider payload" } }
```

---

## 9. Video composition schema (`video_composition` — CANON §5, R2 §5)

Stored in `variant.video_composition` for `ad_document.type='video'`. This is the canonical Remotion payload
(R2 §5): layer/subtitle/audio **tracks** + the Remotion composition id. Muted-first with **burned-in
subtitles** (CANON §8, R2 §5.1). The `variant.layer_tree` on a video variant holds the **poster / persistent
overlay** layers (logo, legal, brand cards); time-varying elements live in the tracks below.

```jsonc
{
  "schemaVersion": 1,
  "compositionId": "BrutalAd",                 // Remotion <Composition id>
  "fps": 30,
  "durationInFrames": 450,                     // 15 s @ 30fps
  "dimensions": { "width": 1080, "height": 1080 },  // 1:1 feed (or 4:5 / 16:9 — CANON §8)
  "ratio": "1:1",
  "mutedFirst": true,                          // CANON §8 — plays without audio; subs carry the story
  "clips": [                                   // <OffthreadVideo> tracks (Kling/Seedance/etc.) — R2 §5.1
    { "id": "clip_01", "assetId": "as_clip_01", "src": "storage://…",
      "startFrame": 0, "endFrame": 150, "trimStartMs": 0,
      "provider": "kling", "model": "kling-v2-5-turbo", "model_version": "v2.5-turbo",
      "seed": 12345, "prompt": "…", "negative_prompt": "…" }     // per-clip lineage (R2 §6)
  ],
  "audio": {
    "vo":    { "assetId": "as_vo_de", "src": "storage://…", "voiceId": "ELEVENLABS_VOICE_ID_DE",
               "model_id": "eleven_multilingual_v2", "seed": 12345, "volume": 1.0 },
    "music": { "assetId": "as_music_01", "src": "storage://…", "volume": 0.15 },   // low sober bed (R2 §4.3)
    "sfx":   [ { "assetId": "as_sfx_01", "startFrame": 148, "volume": 0.4 } ]
  },
  "captions": {                                // burned-in, muted-first (R2 §5.1). Timing from ElevenLabs word ts.
    "style": "tiktok",                         // createTikTokStyleCaptions (R2 §5.1)
    "combineTokensWithinMs": 1200,
    "locale": "de",
    "safeZone": true,
    "cues": [
      { "startMs": 0, "endMs": 1800, "text": "1.200 Kanzleien vertrauen Brutal" }
    ]
  },
  "overlayLayerTreeRef": "variant.layer_tree", // brand cards/CTA/logo/legal come from the variant layer tree
  "render": { "codec": "h264", "crf": 23, "maxBytes": 209715200 },  // ≤200 MB gate (CANON §8; 200*1024*1024)
  "inputPropsHash": "sha256:…"                 // lineage: hash of the props fed to Remotion (R2 §6)
}
```

> `VERIFY current docs before coding` — Remotion `@remotion/captions` / `createTikTokStyleCaptions`,
> `renderMedia` codec/crf options, and the **Remotion Company License** (required for teams of 4+) at
> **remotion.dev/docs** and **remotion.pro** (R2 §5.3). Confirm ElevenLabs `with-timestamps` shape for caption
> timing (R2 §5.1) and Kling `model_name` slugs / `image2video` field set (R2 §1) before wiring clip lineage.

---

## 10. Row-Level Security — multi-tenant isolation by `workspace_id`

`supabase/migrations/0006_rls.sql`. **RLS is enabled on every tenant table from day one** (CANON §4, R7 P0).
The pattern: a `SECURITY DEFINER` helper resolves the caller's workspace membership; every policy uses it.

### 10.1 Membership helper (evaluated once, avoids recursive RLS)

```sql
-- Returns the set of workspace_ids the current auth user belongs to.
-- SECURITY DEFINER so it reads workspace_member without triggering that table's own RLS recursively.
create or replace function public.current_workspace_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select workspace_id from workspace_member where user_id = auth.uid()
$$;

-- Role check helper (for write-gating by role).
create or replace function public.has_workspace_role(ws uuid, roles member_role[])
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from workspace_member
    where user_id = auth.uid() and workspace_id = ws and role = any(roles)
  )
$$;
```

### 10.2 Enable RLS + policies (repeat the tenant pattern for every tenant table)

```sql
-- ── workspace: a user sees workspaces they are a member of ────────────────────
alter table workspace enable row level security;
create policy workspace_select on workspace
  for select using (id in (select public.current_workspace_ids()));
create policy workspace_update on workspace
  for update using (public.has_workspace_role(id, array['owner','admin']::member_role[]));
-- INSERT of a new workspace is done via a SECURITY DEFINER RPC (create_workspace) that also inserts
-- the creating user's owner membership atomically — never a raw client insert.

-- ── workspace_member: see co-members of your workspaces; only owner/admin write ─
alter table workspace_member enable row level security;
create policy wm_select on workspace_member
  for select using (workspace_id in (select public.current_workspace_ids()));
create policy wm_write on workspace_member
  for all using (public.has_workspace_role(workspace_id, array['owner','admin']::member_role[]))
  with check   (public.has_workspace_role(workspace_id, array['owner','admin']::member_role[]));

-- ── GENERIC TENANT PATTERN ────────────────────────────────────────────────────
-- Apply to: brand_kit, campaign, brief, ad_document, variant, slide, asset, render,
--           generation_job, agent_run, experiment, experiment_arm, result, audit_log.
-- SELECT: member of the row's workspace.
-- INSERT/UPDATE/DELETE: member with an editing role (owner/admin/editor). Viewers are read-only.
-- audit_log is SELECT-only for clients (writes come from service-role workers).

-- Example: variant (identical template for the other tables — swap the table name).
alter table variant enable row level security;
create policy variant_select on variant
  for select using (workspace_id in (select public.current_workspace_ids()));
create policy variant_insert on variant
  for insert with check (public.has_workspace_role(workspace_id, array['owner','admin','editor']::member_role[]));
create policy variant_update on variant
  for update using  (public.has_workspace_role(workspace_id, array['owner','admin','editor']::member_role[]))
             with check (public.has_workspace_role(workspace_id, array['owner','admin','editor']::member_role[]));
create policy variant_delete on variant
  for delete using  (public.has_workspace_role(workspace_id, array['owner','admin','editor']::member_role[]));

-- audit_log: read-only to clients; writes only via service role (which bypasses RLS).
alter table audit_log enable row level security;
create policy audit_log_select on audit_log
  for select using (workspace_id in (select public.current_workspace_ids()));
-- (no insert/update/delete policy → clients cannot write; service role bypasses RLS)
```

### 10.3 RLS rollout checklist (the factory MUST verify)

| Check | Assertion |
|---|---|
| Every tenant table has `enable row level security` | No tenant table left with RLS off. |
| Cross-tenant read denied | User in WS-A cannot `select` a WS-B row (returns 0 rows, not an error). |
| Cross-tenant write denied | Insert/update with a foreign `workspace_id` fails the `with check`. |
| Viewers are read-only | `role='viewer'` cannot insert/update/delete. |
| Service-role usage is server-only | `SUPABASE_SERVICE_ROLE_KEY` never reaches `apps/web` client bundle (CANON §10; R7 §7). |
| Storage buckets are RLS'd too | `asset` Storage objects are path-scoped by `workspace_id`; Storage policies mirror table RLS. |

> `VERIFY current docs before coding` — Supabase RLS + `auth.uid()` semantics, `SECURITY DEFINER` + `search_path`
> hardening, and **Storage bucket policies** at **supabase.com/docs/guides/auth/row-level-security** and
> **/storage/security/access-control**. Run `get_advisors` (Supabase security lint) after applying migrations
> to catch tables missing RLS.

> `⚑ R-DM4 (RECOMMENDATION)` — Storage objects (`asset.storage_path`) must be laid out as
> `assets/{workspace_id}/…` and guarded by Storage RLS policies that mirror §10.2, so a signed-URL leak cannot
> cross tenants. This is the one place table RLS does not automatically cover (CANON §4 puts assets in
> Supabase/R2). Additive; no name changes.

---

## 11. Triggers & housekeeping (`supabase/migrations/0007_triggers.sql`)

```sql
-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- attach to every table that has updated_at (example shown; repeat per table)
create trigger trg_variant_touch before update on variant
  for each row execute function public.touch_updated_at();

-- auto-compute CTR on result insert/update
create or replace function public.result_compute_ctr()
returns trigger language plpgsql as $$
begin
  if new.impressions > 0 then new.ctr = round(new.clicks::numeric / new.impressions, 5); end if;
  if new.clicks > 0 and new.spend_usd is not null then new.cpc_usd = round(new.spend_usd / new.clicks, 4); end if;
  return new;
end $$;
create trigger trg_result_ctr before insert or update on result
  for each row execute function public.result_compute_ctr();

-- enforce carousel integrity: a carousel variant must have ≥1 slide before it can be 'ready'
-- (validated in the app layer + a deferred constraint trigger; see docs/04 orchestration).
```

---

## 12. zod schemas mirroring the DB (`packages/shared`)

These are the **single TypeScript source of truth** for the object model + JSONB shapes (CANON §4:
`packages/shared` = types + zod). They mirror the DDL 1:1 and validate every agent output, `LayerPatch`, and
API boundary. Layout:

```
packages/shared/src/
  enums.ts        // string-literal unions matching the pg enums
  brand-kit.ts    // BrandKitData
  layer-tree.ts   // Layer (discriminated union), LayerTree, LayerPatch, smartData
  brief.ts        // BriefNormalized, Strategy
  engagement.ts   // EngagementScores (mirrors CANON §6)
  video.ts        // VideoComposition
  provider.ts     // GenSpec, GenResult, VideoGenSpec, TtsSpec, EngagementScores (CANON §6 contracts)
  entities.ts     // Workspace, BrandKit, Campaign, Brief, AdDocument, Variant, Slide, Asset, Render,
                  // GenerationJob, AgentRun, Experiment, ExperimentArm, Result, AuditLog (row schemas)
  index.ts
```

### 12.1 `enums.ts`

```ts
import { z } from 'zod';
export const ActorKind         = z.enum(['human','agent','system']);
export const MemberRole        = z.enum(['owner','admin','editor','viewer']);
export const AdDocumentType    = z.enum(['single_image','carousel','video']);        // CANON §5
export const AdRatio           = z.enum(['1:1','1.91:1','4:5','16:9','9:16']);        // CANON §6
export const VariantStatus     = z.enum(['draft','generating','ready','failed','approved','archived']);
export const Modality          = z.enum(['image','video','audio']);                   // CANON §6
export const JobStatus         = z.enum(['queued','dispatched','running','succeeded','failed','dead','cancelled','cached']); // L3 frozen superset
export const RenderKind        = z.enum(['png','jpg','pdf','svg']);                    // L3: no pptx (PDF for document/carousel ads)
export const EngagementBackend = z.enum(['saliency','tribe_research']);               // CANON §10
export const LocaleCode        = z.enum(['de','en']);                                 // CANON §1
export const LayerType         = z.enum(['image','text','logo','shape','cta','frame','legal','group','smart']); // CANON §5
export const AgentName         = z.enum(['IntakeAgent','Strategist','Copywriter','ArtDirector',
  'CarouselArchitect','CompositorPlanner','BrandGuardian','Critic','EngagementAnalyst','EditorAgent',
  'LocalizationAgent']);                                                              // CANON §7 (+⚑R-A1)
```

### 12.1a `brand-kit.ts` (`BrandKitData` — L7: the ONE superset shape, back-ported from docs/09)

**L7 (frozen — one shape).** `BrandKitData` is docs/09's superset (adds `iconography`,
`messaging.approvedClaims`, `proofPoints` with per-locale `spoken`, `requiredDisclaimers`,
`disclosures.aiContent`, and `governance` metadata) back-ported here in the same build. `BrandGuardian`
and this zod validate the identical shape (§7.1).

```ts
import { z } from 'zod';
import { AdRatio, LocaleCode } from './enums';

const LocalizedText = z.record(z.string(), z.string());   // { de: '…', en: '…' }

export const BrandKitData = z.object({
  palette: z.object({
    background: z.string(), surface: z.string(), text: z.string(), muted: z.string(),
    accents: z.record(z.string(), z.string()),
    allowed: z.array(z.string()),                          // BrandGuardian whitelist
    sets: z.record(z.string(), z.array(z.string())).optional(),
  }),
  typography: z.object({
    display: z.object({ family: z.string(), weights: z.array(z.number()), source: z.string() }),
    body:    z.object({ family: z.string(), weights: z.array(z.number()), source: z.string() }),
    scale:   z.record(z.string(), z.number()),
  }),
  logos: z.array(z.object({
    id: z.string(), lockup: z.enum(['wordmark','symbol','combined']),
    assetId: z.string().nullable(), minWidthPx: z.number().positive(),
  })),
  iconography: z.object({                                  // L7 (docs/09)
    style: z.enum(['line','solid','duotone']).default('line'),
    strokeWidthPx: z.number().optional(),
    cornerStyle: z.enum(['sharp','rounded']).optional(),
    assetIds: z.array(z.string()).default([]),
    avoid: z.array(z.string()).default([]),
  }).optional(),
  voice: z.object({
    register: z.string(), person: z.string(),
    bannedTerms: z.array(z.string()),
    preferSpecificityOverCleverness: z.boolean().default(true),
  }),
  messaging: z.object({                                    // L7 (docs/09)
    approvedClaims: z.array(z.object({
      id: z.string(), requiresProof: z.boolean().default(false), proofPointId: z.string().optional(),
    }).and(LocalizedText)).default([]),
    taglines: z.record(z.string(), z.array(z.string())).optional(),
  }).optional(),
  proofPoints: z.array(z.object({                          // L7 (docs/09) — per-locale, TTS-safe `spoken`
    id: z.string(), value: z.union([z.string(), z.number()]),
    display: LocalizedText.optional(),
    spoken: LocalizedText.optional(),                      // TTS-safe number spelling (R2 §4.4)
    claim: LocalizedText.optional(),
    sourceUrl: z.string().nullable().optional(),
    verifiedAt: z.string().nullable().optional(),
  })).default([]),
  disclaimers: z.record(z.string(), z.object({
    de: z.string(), en: z.string(), required: z.boolean().default(false),
  })),
  requiredDisclaimers: z.array(z.string()).default([]),    // L7 (docs/09) — keys into `disclaimers`
  disclosures: z.object({                                  // L7 (docs/09) + CANON L10
    aiContent: z.object({ required: z.boolean().default(false) }).and(LocalizedText.partial()).optional(),
  }).optional(),
  localization: z.object({
    locales: z.array(LocaleCode), default: LocaleCode,
    transcreate: z.boolean().default(true),
    ttsNumberSpelling: z.boolean().default(true),
  }),
  imagery: z.object({
    mood: z.string(), negativePromptDefaults: z.string(),
    aspectDefaults: z.record(z.string(), AdRatio),
    style: z.object({ avoid: z.array(z.string()).default([]) }).optional(),  // L10: wired into negative prompt
  }),
  safeZoneDefaults: z.object({
    profileOverlap: z.object({ top: z.number(), left: z.number() }),
    seeMoreFold: z.number(),
  }).optional(),
  governance: z.object({                                   // L7 (docs/09) — governance metadata
    owner: z.string().optional(),
    approvedBy: z.string().nullable().optional(),
    approvedAt: z.string().nullable().optional(),
    sourceDoc: z.string().optional(),
    immutablePerVersion: z.boolean().default(true),
  }).optional(),
});
export type BrandKitDataT = z.infer<typeof BrandKitData>;
```

### 12.2 `layer-tree.ts` (the discriminated union — the anti-baked-pixel spine)

```ts
import { z } from 'zod';
import { LayerType, AdRatio } from './enums';

export const RenderHints = z.object({
  safeZone: z.boolean().default(true),
  maxLines: z.number().int().positive().optional(),
  autoFit: z.boolean().default(true),
  minFontPx: z.number().positive().optional(),
  anchor: z.enum(['top-left','top-center','top-right','center','bottom-left','bottom-center','bottom-right'])
    .default('top-left'),
  pinTo: z.enum(['canvas','parentGroup']).default('canvas'),
}).partial({ maxLines: true, minFontPx: true });

const LayerBase = z.object({
  id: z.string(),
  name: z.string().default(''),
  x: z.number(), y: z.number(), width: z.number(), height: z.number(),
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  zLocked: z.boolean().default(false),
  renderHints: RenderHints.optional(),
  custom: z.record(z.string(), z.unknown()).default({}),
});

export const ImageLayer = LayerBase.extend({ type: z.literal('image'),
  assetId: z.string().nullable(), src: z.string().optional(), fit: z.enum(['cover','contain','fill']).default('cover'),
  flipX: z.boolean().default(false), flipY: z.boolean().default(false),
  crop: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }).optional(),
  filters: z.object({ brightness: z.number(), contrast: z.number(), grayscale: z.number() }).partial().optional() });

export const TextLayer = LayerBase.extend({ type: z.literal('text'),
  text: z.string(), fontFamily: z.string(), fontSize: z.number().positive(),
  fontWeight: z.number().default(400), fontStyle: z.enum(['normal','italic']).default('normal'),
  lineHeight: z.number().default(1.1), letterSpacing: z.number().default(0),
  align: z.enum(['left','center','right','justify']).default('left'),
  verticalAlign: z.enum(['top','middle','bottom']).default('top'),
  color: z.string(), textTransform: z.enum(['none','uppercase','lowercase','capitalize']).default('none'),
  backgroundColor: z.string().nullable().default(null) });

export const LogoLayer = LayerBase.extend({ type: z.literal('logo'),
  assetId: z.string().nullable(), lockup: z.enum(['wordmark','symbol','combined']).default('wordmark'),
  src: z.string().optional(), tint: z.string().nullable().default(null) });

export const ShapeLayer = LayerBase.extend({ type: z.literal('shape'),
  shape: z.enum(['rect','ellipse','line','polygon']), fill: z.string().nullable(),
  stroke: z.string().nullable().default(null), strokeWidth: z.number().default(0),
  cornerRadius: z.number().default(0), points: z.array(z.number()).nullable().default(null) });

export const CtaLayer = LayerBase.extend({ type: z.literal('cta'),
  text: z.string(), style: z.enum(['solid','outline','ghost']).default('solid'),
  fill: z.string(), textColor: z.string(), cornerRadius: z.number().default(8),
  paddingX: z.number().default(28), paddingY: z.number().default(16),
  fontFamily: z.string(), fontSize: z.number(), fontWeight: z.number().default(600),
  icon: z.string().nullable().default(null), href: z.string().nullable().default(null) });

export const FrameLayer = LayerBase.extend({ type: z.literal('frame'),
  frameStyle: z.enum(['border','mask','device']).default('border'), fill: z.string().nullable().default(null),
  stroke: z.string().nullable(), strokeWidth: z.number().default(0), cornerRadius: z.number().default(0),
  clipsChildren: z.boolean().default(false) });

export const LegalLayer = LayerBase.extend({ type: z.literal('legal'),
  text: z.string(), fontFamily: z.string(), fontSize: z.number(), color: z.string(),
  align: z.enum(['left','center','right']).default('left'),
  requiredBy: z.string(),                 // key into brand_kit.disclaimers (BrandGuardian verifies)
  removable: z.boolean().default(false) });

export const SmartLayer = LayerBase.extend({ type: z.literal('smart'),
  render: z.enum(['text','image']).default('text'),
  binding: z.string(), template: z.string(), fallback: z.string().optional(),
  ttsTemplate: z.string().optional(),     // TTS-safe form (R2 §4.4)
  fontFamily: z.string().optional(), fontSize: z.number().optional(), color: z.string().optional(),
  assetId: z.string().nullable().optional() });

export const GroupLayer: z.ZodType<any> = z.lazy(() => LayerBase.extend({ type: z.literal('group'),
  children: z.array(Layer), clip: z.boolean().default(false) }));

export const Layer: z.ZodType<any> = z.lazy(() => z.discriminatedUnion('type', [
  ImageLayer, TextLayer, LogoLayer, ShapeLayer, CtaLayer, FrameLayer, LegalLayer, SmartLayer, GroupLayer,
]));

export const SmartDataEntry = z.object({
  value: z.union([z.string(), z.number()]),
  display: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  spoken: z.record(z.string(), z.string()).optional(),   // per-locale TTS-safe (R2 §4.4)
});

export const LayerTree = z.object({
  schemaVersion: z.literal(1),
  ratio: AdRatio,
  canvas: z.object({ width: z.number(), height: z.number(), unit: z.literal('px').default('px'),
    background: z.string() }),
  safeZones: z.object({
    feedCrop: z.object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() }),
    profileOverlap: z.object({ top: z.number(), left: z.number() }),
    seeMoreFold: z.number(),
  }).partial(),
  layers: z.array(Layer),
  smartData: z.record(z.string(), SmartDataEntry).optional(),
});

// LayerPatch — the chat-to-edit diff (CANON §4/§7 EditorAgent). L6: the ONE reconciled schema =
// doc 06's richer op union wrapped in doc 03's envelope. `applyLayerPatch` implements exactly this union.
export const LayerPatchOp = z.discriminatedUnion('op', [
  z.object({ op: z.literal('setText'),      layerId: z.string(), text: z.string() }),
  z.object({ op: z.literal('resize'),       layerId: z.string(), x: z.number().optional(), y: z.number().optional(),
    width: z.number().positive(), height: z.number().positive() }),
  z.object({ op: z.literal('rotate'),       layerId: z.string(), rotation: z.number() }),
  z.object({ op: z.literal('reorderZ'),     layerId: z.string(), toIndex: z.number().int() }),
  z.object({ op: z.literal('setFont'),      layerId: z.string(), fontFamily: z.string().optional(),
    fontSize: z.number().positive().optional(), fontWeight: z.number().optional(),
    fontStyle: z.enum(['normal','italic']).optional() }),
  z.object({ op: z.literal('setFill'),      layerId: z.string(), fill: z.string() }),
  z.object({ op: z.literal('addLayer'),     afterLayerId: z.string().nullable(), layer: Layer }),
  z.object({ op: z.literal('removeLayer'),  layerId: z.string() }),
  z.object({ op: z.literal('replaceAsset'), layerId: z.string(), assetId: z.string() }),
  z.object({ op: z.literal('setBinding'),   layerId: z.string(), binding: z.string(),
    template: z.string().optional(), fallback: z.string().optional() }),
  z.object({ op: z.literal('setSlideOrder'),order: z.array(z.string()) }),
  z.object({ op: z.literal('setVisible'),   layerId: z.string(), visible: z.boolean() }),
]);
// L6 envelope: { id, variantId, slideId?, origin, createdBy, note?, ops }
export const LayerPatch = z.object({
  id: z.string(),
  variantId: z.string().uuid(),
  slideId: z.string().uuid().optional(),          // set only when the patch targets a carousel slide tree
  origin: z.enum(['chat','canvas','agent','system']),
  createdBy: z.enum(['human','agent','system']),  // actor_kind
  note: z.string().optional(),                    // audit / undo label
  ops: z.array(LayerPatchOp),
});
export const LayerPatchSet = z.array(LayerPatch);  // L6: alias for LayerPatch[]

export type LayerTreeT = z.infer<typeof LayerTree>;
export type LayerPatchOpT = z.infer<typeof LayerPatchOp>;
export type LayerPatchT = z.infer<typeof LayerPatch>;
export type LayerPatchSetT = z.infer<typeof LayerPatchSet>;
```

### 12.3 `engagement.ts` (mirrors CANON §6 `EngagementScores`)

```ts
import { z } from 'zod';
import { EngagementBackend } from './enums';

const Band = z.object({ value: z.number(), band: z.tuple([z.number(), z.number()]), confidence: z.number().min(0).max(1) });
const CtrBand = z.object({ low: z.number(), high: z.number(), confidence: z.number().min(0).max(1) });

export const PerSlideScore = z.object({
  position: z.number().int(), role: z.string().optional(),
  stoppingPower: Band.optional(), ctaAttention: Band.optional(),
  focalClarity: Band.optional(), clutter: Band.optional(),
});

export const EngagementScores = z.object({          // CANON §6 (bands + confidence — R4 §7)
  backend: EngagementBackend.optional(),
  saliencySource: z.string().optional(),
  modelVersion: z.string().optional(),
  attentionMap: z.object({ assetId: z.string(), src: z.string().optional() }).optional(),
  focalClarity: Band.optional(),
  valuePropAttention: Band.optional(),
  ctaAttention: Band.optional(),
  clutter: Band.optional(),
  stoppingPower: Band.optional(),
  firstThreeSeconds: Band.optional(),               // video only
  predictedCtrBand: CtrBand.optional(),
  perSlide: z.array(PerSlideScore).optional(),       // carousel only
  scoredAt: z.string().optional(),
  raw: z.unknown().optional(),
});
export type EngagementScoresT = z.infer<typeof EngagementScores>;
```

### 12.4 `provider.ts` (CANON §6 contracts — the exact signatures)

```ts
import { z } from 'zod';
import { AdRatio, Modality } from './enums';

export const AssetRef = z.object({ assetId: z.string() });

export const GenSpec = z.object({                    // CANON §6 (verbatim)
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  aspect: AdRatio,                                    // '1:1'|'1.91:1'|'4:5'|'16:9'|'9:16'
  seed: z.number().int().optional(),
  refs: z.array(AssetRef).optional(),
  model: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const GenResult = z.object({                  // CANON §6 (verbatim)
  assetId: z.string(), width: z.number(), height: z.number(),
  provider: z.string(), model: z.string(),
  seed: z.number().int().optional(), costUsd: z.number(), raw: z.unknown(),
});

export const VideoGenSpec = GenSpec.extend({ /* params carries mode/duration/image2video/cfg_scale (R2 §1.3) */ });
export const TtsSpec = z.object({
  text: z.string(), voiceId: z.string(), model: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),   // language_code, seed, voice_settings (R2 §4.1)
});
```

> **CANON §6 interface note:** `ImageProvider`, `VideoProvider`, `AudioProvider`, `LlmProvider`,
> `EngagementPredictor`, and `ProviderBus` are the **behavioral interfaces** (methods) declared in
> `packages/shared` per CANON §6 — the zod schemas above validate their **data payloads**
> (`GenSpec`/`GenResult`/`TtsSpec`/`EngagementScores`). Keep the interface declarations verbatim from CANON §6;
> do not redefine them here.

### 12.5 `entities.ts` (row schemas — one per table; abbreviated pattern)

```ts
import { z } from 'zod';
import { AdDocumentType, AdRatio, VariantStatus, LocaleCode, ActorKind, AgentName } from './enums';
import { LayerTree } from './layer-tree';
import { EngagementScores } from './engagement';
import { VideoComposition } from './video';

export const Variant = z.object({
  id: z.string().uuid(), workspaceId: z.string().uuid(), adDocumentId: z.string().uuid(),
  layerTree: LayerTree.nullable(),
  videoComposition: VideoComposition.nullable(),
  status: VariantStatus, locale: LocaleCode, ratio: AdRatio,
  // lineage (CANON §5) —
  briefId: z.string().uuid(), brandKitVersion: z.number().int(),
  provider: z.string().nullable(), model: z.string().nullable(), modelVersion: z.string().nullable(),
  seed: z.number().int().nullable(), prompt: z.string().nullable(), negativePrompt: z.string().nullable(),
  parentVariantId: z.string().uuid().nullable(),
  createdBy: z.string().uuid().nullable(), createdByKind: ActorKind, createdByAgent: AgentName.nullable(),
  engagement: EngagementScores,
  createdAt: z.string(), updatedAt: z.string(), deletedAt: z.string().nullable(),
});
export type VariantT = z.infer<typeof Variant>;
// … Workspace, WorkspaceMember, BrandKit, Campaign, Brief, AdDocument, Slide, Asset, Render,
//    GenerationJob, AgentRun, Experiment, ExperimentArm, Result, AuditLog follow the same 1:1 mirroring.
```

> `VERIFY current docs before coding` — Supabase `mcp__…__generate_typescript_types` can emit DB-derived row
> types; treat the **zod schemas as authoritative** and reconcile the generated types against them in CI (fail
> the build on drift). Confirm the current **zod** major version's `z.discriminatedUnion` / `z.lazy` API before
> coding the recursive `Layer` union.

---

## 13. Migration order & self-consistency checklist

**Apply migrations in this order** (each file self-contained):

```
supabase/migrations/
  0000_extensions.sql        # §0.2
  0001_enums.sql             # §0.3
  0002_tenancy.sql           # §2
  0003_brand_campaign_brief.sql   # §3
  0004_ad_document_variant_slide.sql   # §4
  0005_assets_jobs_experiments.sql     # §5
  0006_rls.sql               # §10
  0007_triggers.sql          # §11
supabase/seed.sql            # §7.2 (Brutal workspace + brand kit v1)
```

**Self-consistency invariants the factory MUST hold:**

| Invariant | Where enforced |
|---|---|
| `AdDocument.type` drives which JSONB is present: single_image→`variant.layer_tree`; carousel→`slide.layer_tree[]` (variant tree null); video→`variant.video_composition` + `variant.layer_tree` (overlays). | `variant_tree_shape` CHECK (§4) + app + docs/04. |
| Every `Variant` pins `brand_kit_version` (lineage, CANON §5). | `variant.brand_kit_version` not null (§4). |
| Exactly one active `BrandKit` per workspace. | `brand_kit_one_active_per_ws` partial unique (§3). |
| Every scored variant reports **bands + confidence**, never a bare CTR. | `EngagementScores` zod + R4 §7. |
| Every external gen call is a `generation_job` with `cost_usd` + cache key. | §5 + CANON §4. |
| TRIBE artifacts stamped `commercial_use=false`, never in a tenant-read `variant.engagement`. | `audit_log.commercial_use` (§5) + R4 §6. |
| RLS on every tenant table; cross-tenant read/write denied. | §10 + `get_advisors`. |
| Layer is JSONB, not a table. | §1 / ⚑R-DM3. |

---

## 14. Consolidated "VERIFY before coding" list (data-model-specific)

1. **Supabase extensions** — `pgmq`, `pg_cron`, `pg_trgm`, `pgcrypto` availability/names on your plan (supabase.com/docs/guides/database/extensions, /guides/queues). §0.2
2. **RLS + Storage policies** — `auth.uid()`, `SECURITY DEFINER` + `search_path` hardening, Storage bucket path-scoping (supabase.com/docs/guides/auth/row-level-security, /storage/security/access-control). §10, ⚑R-DM4
3. **Polotno store JSON** shape the `layer_tree` must round-trip to, and `POLOTNO_API_KEY` licensing (polotno.com/docs, /sdk/pricing). §6, ⚑R-ENV1
4. **Remotion** captions API + `renderMedia` options + **Company License** (remotion.dev/docs, remotion.pro). §9, R2 §5.3
5. **Provider lineage strings** — current `model`/`model_version` slugs to store (`flux-2-pro`, `gemini-3-pro-image`, `kling-v2-5-turbo`/`kling-3.0-omni`, ElevenLabs `eleven_multilingual_v2`) per R1/R2 (L4 canonical slugs) — **do not hardcode**; store what the provider returns. §4/§8
6. **Claude model ids** for `agent_run.model` (`claude-sonnet-5`/`claude-opus-4-8`/`claude-haiku-4-5`, R7 ⚑R-LLM1) — platform.claude.com/docs/en/about-claude/models/overview.
7. **zod major version** `discriminatedUnion`/`lazy` API for the recursive `Layer` union. §12
8. **Acid-lime chrome hex** (`#c9ff2e` placeholder) — confirm exact value with Antonio. §7.2
9. **`facebook/tribev2` still CC-BY-NC-4.0** — gates the `commercial_use=false` stamping logic. R4 §2, §6

---

## 15. Cross-document assumptions made here (flag to sibling docs)

1. **`IntakeAgent` exists** (R7 ⚑R-A1) and is in the `agent_name` enum + `agent_run`. If docs/04 (orchestration)
   or docs/07 (agents) reject it, remove the enum value — nothing else depends on it structurally.
2. **`created_by_kind actor_kind` column** (⚑R-DM1) is added to authorable tables — assumed acceptable to
   docs/04/07 that log agent vs human authorship. CANON §5 only names `created_by (human|agent)` in lineage.
3. **Queue = Supabase Queues (pgmq)** default (R7 ⚑R-INFRA1); `generation_job` is the durable record, pgmq the
   delivery mechanism. docs/04/11 own the queue wiring — this doc only assumes the extension exists.
4. **Video variant carries BOTH** `video_composition` (tracks) **and** `layer_tree` (persistent overlays), per
   R2 §5.1. docs/09 (video) must treat `overlayLayerTreeRef` as pointing at `variant.layer_tree`.
5. **Asset storage layout** `assets/{workspace_id}/…` with Storage RLS (⚑R-DM4) — docs/04/10 (assets/storage)
   must lay out Storage this way for tenant isolation.
6. **`smartData.spoken` per-locale + `smart.ttsTemplate`** carry the TTS-safe number spelling (R2 §4.4);
   docs/09 (video/localization) and the `LocalizationAgent` must populate them.
```


<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: docs/04-provider-integrations.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

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


<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: docs/05-agent-studio.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

# 05 — Creative Studio: Runtime Agents, Orchestration & LayerPatch (CANON §7)

> ⚠️ **CROSS-REFERENCE NOTE — read first (authoritative, per CANON §12 L1).** Some inline `docs/NN` / `doc NN` pointers in this file predate the frozen document map and may cite the wrong number. **Resolve every cross-reference by ROLE using this map, not by the integer written inline:** `01` product · `02` architecture · `03` data-model (all DDL/zod/schemas) · `04` providers · `05` agent-studio · `06` editor + `packages/render` + export · `07` creative-playbook · `08` engagement · `09` brand-kit · `10` build-plan · `11` env · `12` security/ops · `13` acceptance · `14` appendix. There is **no localization doc** (localization lives in `05` LocalizationAgent + `09` brand-kit `localization` + `07`) and **no "exporter" doc** (export lives in `06`). Source paths live under `apps/web/src/**` (never a top-level `lib/` directory under `apps/web`). Where anything here disagrees with CANON §12, **the ledger wins.**

> **Read `handoff/CANON.md` first.** This document specifies the **Creative Studio** — the runtime
> pipeline of Claude agents that turns a normalized `Brief` into a ranked board of on-brand, testable LinkedIn
> ads (CANON §0, §7). It is authored for an autonomous build factory with **zero outside context**. Every
> object-model name, provider interface, agent name, env var, and model tier below is **canonical (CANON §5/§6/§7/§10)**
> and must not be renamed. Where research suggests a deviation, it appears as a clearly-labelled **⚑ RECOMMENDATION**,
> never a silent divergence. Every external API carries a **`VERIFY current docs before coding`** note.
>
> **Scope of this doc:** the agents (`Strategist`, `Copywriter`, `ArtDirector`, `CarouselArchitect`,
> `CompositorPlanner`, `BrandGuardian`, `Critic`, `EngagementAnalyst`, `EditorAgent`, `LocalizationAgent`), their
> exact I/O schemas + system prompts + model tier + guardrails, the orchestration graph (brief→board),
> parallelism, the bounded auto-iterate loop, human-approve gates, `AgentRun` observability, cost caps, and the
> `LayerPatch` contract used by `EditorAgent`.
> **Out of scope (referenced, not defined here):** the layer-tree/object-model DDL (docs/03), the provider drivers
> + `ProviderBus` internals (docs/04), `packages/render` (docs/06), the engagement engine internals (docs/08),
> the editor UI / Polotno `EditorAdapter` (docs/06). This doc consumes their interfaces.

---

## 0. TL;DR — the ten decisions this doc locks

1. **Eleven runtime agents** (the ten canonical CANON §7 agents **+ `IntakeAgent`**, an additive brief-normalizer
   — see `⚑ R-A1`, inherited from R7). Each agent **emits a zod-validated structured artifact, never free text.**
2. **Model tiering (⚑ R-LLM1, from R7):** default **`claude-sonnet-5`**; escalate to **`claude-opus-4-8`** for
   judgment-heavy agents (`ArtDirector`, `Critic`, hard `BrandGuardian` calls, and **any auto-iterate round 2**);
   **`claude-haiku-4-5`** for cheap classification (`IntakeAgent` field-extraction, `smart`-layer binding). CANON
   §4 says "latest models" — this satisfies it and adds a cost lever. **Do not hardcode `claude-opus-4-8` everywhere.**
3. **Two parallel branches, one join.** Copy generation (`Copywriter`) and imagery generation (`ArtDirector` →
   `ProviderBus.image`) run **in parallel** and only meet at `CompositorPlanner`. **Text never enters an image
   prompt** — this is the structurally-enforced anti-re-roll invariant (CANON §2 load-bearing decision).
4. **Two gates, one loop.** `BrandGuardian` is a **mechanical hard gate** (fail → loop back to author agent).
   The **human-approve gate** is judgment (nothing ships un-approved, CANON §7). Auto-iterate is **bounded ≤2 rounds**
   and lives *before* the human sees the board.
5. **`BrandGuardian` and the `legal` layer are hard, not vibes.** Palette / voice-register / banned-terms /
   mandatory-disclaimer / localization are checked mechanically against the **versioned `BrandKit`**.
6. **`EditorAgent` emits typed `LayerPatch` diffs, never full re-rolls** (CANON §4). Contract in §6.
7. **`EngagementAnalyst` always reports bands + confidence** via `EngagementPredictor` (`ENGAGEMENT_BACKEND=saliency`
   on the commercial path); it interprets, it never invents CTR (CANON §6/§9, docs/08).
8. **Every agent call is an `AgentRun`** with `tokens/latency/cost_usd/model/model_version` (CANON §4/§5). **Hard
   per-brief and per-workspace `cost_usd` caps** are enforced **pre-flight** by the orchestrator.
9. **`LocalizationAgent` transcreates DE⇄EN** (not literal translation) and emits **TTS-safe number spelling**
   ("zwölfhundert") for the VO track while keeping numerals in on-screen text layers (CANON §7, R2 §4.4).
10. **Structured outputs via Anthropic tool/JSON schema** (CANON §4). Every agent's output schema lives in
    `packages/shared` as a **zod schema** and is enforced at the boundary. Fan-out (e.g. 6-variant copy) uses the
    **Batch API (50% off)** where non-interactive.

---

## 1. Agent roster at a glance

| # | Agent (canonical) | One-line responsibility | Default model tier | Escalates to | Parallelizable? | Emits (artifact) |
|---|---|---|---|---|---|---|
| 0 | `IntakeAgent` `⚑R-A1` | Normalize one-line brief (+URL/assets) → structured `Brief`; ask ≤1–2 Qs only if a required field is missing | `claude-haiku-4-5` | `claude-sonnet-5` | no (gate) | `NormalizedBrief` |
| 1 | `Strategist` | `Brief` → strategy: audience, angle, JTBD, proof points, funnel stage | `claude-sonnet-5` | `claude-opus-4-8` | no | `Strategy` |
| 2 | `Copywriter` | Strategy → hooks/headlines/intro-text/CTAs (**specificity > cleverness**) | `claude-sonnet-5` | `claude-opus-4-8` | **yes** (with #3) | `CopySet` |
| 3 | `ArtDirector` | Strategy → visual concept + **model choice hint** + **imagery-only** prompt + negPrompt | `claude-opus-4-8` | — | **yes** (with #2) | `ArtDirection` |
| 4 | `CarouselArchitect` | (carousel only) multi-slide narrative hook→reframe→close + continuity | `claude-sonnet-5` | `claude-opus-4-8` | after #1 | `CarouselNarrative` |
| 5 | `CompositorPlanner` | Concept + copy + generated imagery → **layer tree** (join point) | `claude-sonnet-5` | `claude-opus-4-8` | no (join) | `LayerTree` |
| 6 | `BrandGuardian` | **HARD GATE**: palette / voice / banned terms / disclaimer / localization vs `BrandKit` | `claude-sonnet-5` | `claude-opus-4-8` | no (gate) | `BrandVerdict` |
| 7 | `Critic` | Score vs LinkedIn playbook + anti-patterns; structured critique | `claude-opus-4-8` | — | **yes** (with #8) | `CriticReport` |
| 8 | `EngagementAnalyst` | Call `EngagementPredictor`; interpret bands+confidence; recommend | `claude-sonnet-5` | `claude-opus-4-8` | **yes** (with #7) | `EngagementReport` |
| 9 | `EditorAgent` | NL edit request → typed **`LayerPatch[]`** (never a re-roll) | `claude-sonnet-5` | `claude-opus-4-8` | n/a (post-board) | `EditResult` (wraps `LayerPatchSet`) |
| 10 | `LocalizationAgent` | DE⇄EN **transcreation**; TTS-safe number spelling; locale `smart`-layer bindings | `claude-sonnet-5` | `claude-opus-4-8` | n/a (post-board) | `LocalizationResult` |

> `⚑ R-A1 (RECOMMENDATION, inherited from R7 §1.3)` — `IntakeAgent` is **additive**, not a rename. It runs
> *before* `Strategist` to keep the "type a brief → get ads" promise near-zero-friction while preventing
> garbage-in. If the factory prefers strict CANON §7 minimalism, `IntakeAgent`'s logic may be folded into the
> `Strategist` system prompt — but a separate agent is cleaner to observe and cost-cap. Recommended: keep separate.

> `⚑ ASSUMPTION A1` — `claude-sonnet-5`, `claude-opus-4-8`, `claude-haiku-4-5` are the current Anthropic model
> ids per R7 §5.3. **`VERIFY current docs before coding`**: model ids + Sonnet 5 intro-pricing window (intro
> **$2/$10** ends 2026-08-31) at `platform.claude.com/docs/en/about-claude/models/overview`. Model ids live in
> **config, never hardcoded** (see §9.4); a startup check hits the Anthropic Models API and fails fast if a
> pinned model was retired.

---

## 2. The orchestration graph (brief → board)

### 2.1 The full pipeline

```
  one-line brief (+optional URL / attachments)
        │
        ▼
  [0] IntakeAgent ──► NormalizedBrief   (persist Brief; ≤1–2 clarifying Qs ONLY if a required field missing)
        │                                (haiku extraction; sonnet fallback if ambiguous)
        ▼
  [1] Strategist ──► Strategy{audience, angle, jtbd, proofPoints[], funnelStage, tone}
        │
        ├──────────────── PARALLEL FORK (per variant N) ────────────────┐
        ▼                                                               ▼
  [2] Copywriter ──► CopySet                              [3] ArtDirector ──► ArtDirection
      {hooks[], headline, introText, cta,                     {concept, modelHint, imageryPrompt,
       specificityScore}                                       negativePrompt, aspect, refs[]}
      (Batch API fan-out for N variants)                            │
        │                                                           │  ProviderBus.image(job)  (docs/04)
        │  (if AdDocument.type==carousel)                           ▼   → FLUX.2 / Nano-Banana Pro / …
        │  [4] CarouselArchitect ──► CarouselNarrative       GenerationJob (async, cached, cost-metered)
        │      {slides:[{role:hook|reframe|close, beat}]}           │
        └───────────────────────────┬───────────────────────────────┘
                                    ▼
  [5] CompositorPlanner ──► LayerTree   (concept + copy + generated imagery → JSON layer tree;
        │                                 assigns renderHints per layer; binds smart layers)
        ▼
  [6] BrandGuardian ── HARD GATE ──► BrandVerdict{pass|fail, violations[]}
        │  fail ──► route to offending author agent (Copywriter/ArtDirector/CompositorPlanner) ─┐
        │  pass                                                                                  │
        ▼                                                                                        │
  packages/render (docs/06): LayerTree → Polotno store JSON → PNG/JPG (PDF for doc ads) ► Render │
        │                                                                                        │
        ├──────────────── PARALLEL FORK ────────────────┐                                        │
        ▼                                               ▼                                        │
  [7] Critic ──► CriticReport            [8] EngagementAnalyst ──► EngagementReport               │
      {playbookScore, antiPatterns[],        (calls EngagementPredictor;                         │
       fixes[]}                               ENGAGEMENT_BACKEND=saliency, prod)                  │
        └───────────────────┬───────────────────────────┘  scores = BANDS + confidence           │
                            ▼                                                                     │
                     verdict = combine(CriticReport, EngagementReport)                            │
                            │                                                                     │
              weak? ──yes──► AUTO-ITERATE (≤2 rounds; round-2 = opus tier) ──► re-author ─────────┘
                            │ no / round-2 exhausted
                            ▼
        ┌───────────────  THE BOARD  (ranked Variants per workspace)  ───────────────┐
        │  HUMAN in control: review · compare · pick · tweak                         │
        └───────────────────────────┬───────────────────────────────────────────────┘
                                    ▼
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
        EDIT by drag         [9] EditorAgent ──►    [10] LocalizationAgent ──►
        (Polotno canvas,      LayerPatchSet          LocalizationResult
         docs/06)             (typed LayerPatch[])   (DE⇄EN transcreation,
              │                    │                  TTS-safe numbers)
              └─────────────────────┼─────────────────────┘
                                    ▼   (apply LayerPatch → re-render ONLY affected layers; never a re-roll)
                          HUMAN-APPROVE GATE  (nothing ships un-approved — CANON §7)
                                    ▼
                       EXPORT to exact LinkedIn spec (docs/06) → ship → Result (CANON §5)
```

### 2.2 Orchestration invariants (the non-negotiables)

| Invariant | Enforced where | Why |
|---|---|---|
| Copy gen and imagery gen are **parallel** and text **never** enters an image prompt | Orchestrator fork + `ArtDirection.imageryPrompt` schema forbids copy strings | Structural anti-re-roll (CANON §2) |
| Every cross-API step is an **async `GenerationJob`** with UI-subscribed progress | `ProviderBus` + job queue (pgmq default, `⚑R-INFRA1`) | No 30-s synchronous waits (CANON §4) |
| `BrandGuardian` is a **hard gate**; a failing variant **cannot reach the board** | Orchestrator (not the prompt) | Deterministic "on-brand" (CANON §7) |
| Auto-iterate is **bounded ≤2 rounds** | Orchestrator counter, not the prompt | Cost + latency ceiling (CANON §7) |
| **Nothing ships un-approved** | Human-approve gate after edits, before export | Humans in control (CANON §7) |
| Every agent output is **zod-validated** before the next stage consumes it | `packages/shared` zod schemas at each boundary | No free-text hand-offs (R7 §1.3) |
| Cost caps enforced **pre-flight** | Orchestrator refuses a job that would breach the cap | "Won't surprise your card" (CANON §4, R7 §4) |

### 2.3 Where each agent runs

All agents run **server-side in `apps/web`** (Next.js 15 server actions / route handlers, CANON §4) via the
**Anthropic Agent SDK or Messages API** (CANON §4). The orchestrator is a server module
(`apps/web/src/server/studio/orchestrator.ts`). Long-running gen work is dispatched to the **job queue** and polled;
the agent LLM calls themselves are short and run inline in the server action, each wrapped in an `AgentRun`
record (§7). `EngagementAnalyst` is the only agent that calls **`services/engine`** (via `ENGINE_URL`, docs/08);
it does so through `ProviderBus.predictor(job)`, never directly.

### 2.4 Orchestrator skeleton (TypeScript, `apps/web/src/server/studio/`)

```ts
// apps/web/src/server/studio/orchestrator.ts  (skeleton — see docs/04 for ProviderBus, docs/03 for types)
import { z } from "zod";
import { runAgent } from "./agent-runner";          // wraps Anthropic call + AgentRun logging + cost cap (§7)
import { ProviderBus } from "@brutal/shared";        // CANON §6
import type { NormalizedBrief, Strategy, CopySet, ArtDirection,
  CarouselNarrative, LayerTree, BrandVerdict, CriticReport, EngagementReport } from "@brutal/shared";

export async function runBriefToBoard(input: {
  briefText: string; url?: string; attachments?: AssetRef[];
  workspaceId: string; brandKitVersion: number;
  adType: "single_image" | "carousel" | "video";
  variantCount?: number;                              // default 4–6 (R7 §4)
}): Promise<{ variants: VariantRef[] }> {
  const budget = await assertBudget(input.workspaceId, input.briefText);   // pre-flight cost cap (§8)

  // [0] Intake (gate)
  const brief: NormalizedBrief = await runAgent("IntakeAgent", { input, budget });
  if (brief.needsClarification) return { variants: [], clarifyingQuestions: brief.questions }; // ≤1–2 Qs

  // [1] Strategy
  const strategy: Strategy = await runAgent("Strategist", { brief, budget });

  const N = input.variantCount ?? 5;
  const variants = await Promise.all(range(N).map(async (i) => {
    // [2]//[3] PARALLEL: copy || imagery
    const [copy, art] = await Promise.all([
      runAgent<CopySet>("Copywriter", { strategy, variantIndex: i, budget, batch: true }),
      runAgent<ArtDirection>("ArtDirector", { strategy, variantIndex: i, budget }),
    ]);
    // [3b] imagery is an async GenerationJob via the bus (docs/04) — text NEVER in this prompt
    const image = await ProviderBus.image({ workspaceId: input.workspaceId, spec: art.toGenSpec() }).generate(art.toGenSpec());

    // [4] carousel only
    const narrative = input.adType === "carousel"
      ? await runAgent<CarouselNarrative>("CarouselArchitect", { strategy, copy, budget }) : undefined;

    // [5] JOIN → layer tree
    let tree: LayerTree = await runAgent("CompositorPlanner",
      { strategy, copy, art, image, narrative, brandKitVersion: input.brandKitVersion, adType: input.adType, budget });

    // [6] hard gate + bounded auto-iterate (≤2)
    for (let round = 0; round <= 2; round++) {
      const verdict: BrandVerdict = await runAgent("BrandGuardian",
        { tree, brandKitVersion: input.brandKitVersion, budget, escalate: round === 2 });
      if (!verdict.pass) { tree = await repairFrom(verdict, { strategy, copy, art, image, tree, budget }); continue; }

      const render = await renderDocument(tree);                                   // packages/render (docs/06)
      const [critic, eng] = await Promise.all([
        runAgent<CriticReport>("Critic", { render, tree, strategy, budget, escalate: round === 2 }),
        runAgent<EngagementReport>("EngagementAnalyst", { render, tree, budget }),  // → EngagementPredictor (docs/08)
      ]);
      if (!isWeak(critic, eng) || round === 2) return persistVariant({ tree, render, critic, eng, brief, strategy, art, image });
      tree = await autoIterate({ critic, eng, strategy, copy, art, tree, round, budget });  // feed critique back
    }
  }));
  return { variants: rankBoard(variants) };            // ranked by stoppingPower band (docs/08)
}
```

---

## 3. Per-agent specification

Format for each agent: **Responsibility · Input schema · Output schema (zod) · System prompt · Model tier ·
Guardrails.** All schemas live in `packages/shared/src/studio/*.ts` and are enforced at the orchestration
boundary. All prompts are grounded in the LinkedIn playbook (**CANON §8 format specs + §2 hook→reframe→close
narrative + the "specificity > cleverness / sober-editorial-not-hype" voice from CANON §1**). Copy strings are
rendered by the compositor as **editable text layers**, never baked into imagery.

> `⚑ ASSUMPTION A2` — CANON §7 references "the LinkedIn playbook (R3)". At authoring time **R3 does not exist as
> a research file**; the playbook rules embedded in these prompts are derived from **CANON §8 (format specs),
> CANON §2 (hook→reframe→close, the baked-text anti-pattern), and CANON §1 (voice/register)**. **`VERIFY before
> coding`**: reconcile these prompt rules against `handoff/research/R3-linkedin-playbook.md` when it lands;
> the anti-pattern list in §3.7 (`Critic`) is the single place to update.

---

### 3.0 `IntakeAgent` `⚑R-A1`

**Responsibility.** Turn a one-line brief (+optional URL/attachments) into a normalized `Brief` object; ask **at
most 1–2 clarifying questions ONLY when a required field is genuinely missing**, otherwise proceed on
`BrandKit`-derived defaults. Extraction-heavy → cheapest tier.

**Input**
```jsonc
{ "briefText": "Legal AI that drafts German contracts in seconds — target law firm partners",
  "url": "https://brutal.ai/legal",            // optional; fetched + summarized upstream
  "attachments": [{ "assetId": "…", "kind": "logo|screenshot|pdf" }],  // optional
  "brandKit": { "version": 3, "verticals": ["legal-de","pe"], "defaultLanguage": "de" },
  "workspaceLocale": "de" }
```

**Output — `NormalizedBrief` (zod)**
```ts
export const NormalizedBrief = z.object({
  offer: z.string(),                                   // the thing being advertised
  audience: z.string(),                                // who; role/seniority/vertical
  vertical: z.enum(["legal-de", "pe", "other"]),
  proofPoints: z.array(z.string()).default([]),        // e.g. "1200+ firms", "SOC2"
  mandatoryLegal: z.array(z.string()).default([]),     // disclaimers that MUST appear (→ legal layer)
  languages: z.array(z.enum(["de", "en"])).min(1),
  funnelStage: z.enum(["awareness", "consideration", "conversion"]).default("consideration"),
  adType: z.enum(["single_image", "carousel", "video"]).default("single_image"),
  constraints: z.record(z.unknown()).default({}),      // e.g. "no faces", "must show product UI"
  needsClarification: z.boolean(),
  questions: z.array(z.string()).max(2).default([]),   // ONLY if a required field is missing
});
```

**System prompt**
```
You are IntakeAgent for Brutal Ads, which turns a one-line brief into on-brand LinkedIn ads.
Your job: extract a structured Brief from the user's brief text, any provided URL summary, and the workspace
BrandKit. Fill unstated fields from the BrandKit and sensible defaults. Do NOT invent proof points, numbers,
or legal claims — only carry forward facts present in the input or BrandKit; leave unknowns empty.

Required fields that must be known before generation: offer, audience, at least one language, adType.
If and ONLY if one of these is genuinely missing and cannot be defaulted, set needsClarification=true and ask
at most TWO short, specific questions. Never ask about anything you can reasonably default from the BrandKit or
workspace locale. Prefer proceeding over asking.

Voice context (do not change it, just record it): Brutal's register is sober, editorial, documentary — NOT hype
AI. Bilingual German + English. If the brief names a vertical (legal AI for German law firms, or private equity),
set it. Carry any mandatory legal/disclaimer text into mandatoryLegal verbatim.

Return ONLY the NormalizedBrief JSON via the provided tool schema. No prose.
```

**Model tier.** `claude-haiku-4-5` for extraction; if the model's own confidence is low or the brief is
ambiguous, the orchestrator retries once at `claude-sonnet-5`.
**Guardrails.** (1) Never fabricate proof points, numbers, or legal claims. (2) `questions.length ≤ 2`, enforced
by schema. (3) If `needsClarification`, the orchestrator **halts the pipeline** and surfaces the questions in the
UI — no downstream agent runs. (4) Fetched URL content is treated as **untrusted** — summarized, never executed
as instructions (prompt-injection guard, §9.3).

---

### 3.1 `Strategist`

**Responsibility.** `Brief` → a crisp creative strategy: primary audience, the single sharpest angle, the
job-to-be-done, the strongest proof points to lead with, and the funnel stage that sets tone.

**Input.** `{ brief: NormalizedBrief, brandKit: {version, voice, verticals} }`

**Output — `Strategy` (zod)**
```ts
export const Strategy = z.object({
  audience: z.string(),                                // sharpened; e.g. "Managing partners at 5–50-lawyer DE firms"
  angle: z.string(),                                   // the ONE reframe/tension the ad exploits
  jtbd: z.string(),                                    // job-to-be-done, in the buyer's words
  proofPoints: z.array(z.string()).min(1).max(4),      // ranked; lead with #1
  emotionalDriver: z.enum(["status","time","risk","cost","curiosity","fomo","relief"]),
  funnelStage: z.enum(["awareness","consideration","conversion"]),
  tone: z.string(),                                    // must stay within Brutal's sober/editorial register
  doNot: z.array(z.string()).default([]),              // angles to avoid (off-brand, off-vertical)
});
```

**System prompt**
```
You are Strategist for Brutal Ads. Input: a normalized Brief and the workspace BrandKit. Output: ONE focused
creative strategy for a LinkedIn ad — not a menu of options.

LinkedIn is a professional feed. Buyers scroll fast and skeptically. A winning ad has ONE sharp angle, leads
with a CONCRETE proof point, and speaks to a real job-to-be-done — not a feature list. Choose the single angle
with the highest stopping power for THIS audience and funnel stage.

Rules:
- Sharpen the audience to a specific role + context (seniority, firm size, vertical). Vague audiences produce
  vague ads.
- Pick exactly ONE angle. Rank proof points; lead with the most concrete/quantified one. Specificity beats
  cleverness.
- Match funnel stage to tone: awareness = provoke a reframe; consideration = prove the claim; conversion = reduce
  risk + clear next step.
- Stay inside Brutal's register: sober, editorial, documentary. NEVER hype ("revolutionary", "game-changing",
  "unlock", "supercharge"). No emoji-driven strategy. Bilingual context: German + English are first-class.
- Do not invent facts. Use only proofPoints/legal present in the Brief/BrandKit.

Return ONLY the Strategy JSON via the tool schema.
```

**Model tier.** `claude-sonnet-5` default; **escalate to `claude-opus-4-8`** when the brief is high-stakes
(regulated vertical `legal-de`/`pe`) or the orchestrator is in auto-iterate round 2.
**Guardrails.** (1) Exactly one `angle`. (2) `proofPoints` must be a subset of the brief's — schema-level
cross-check in the orchestrator. (3) Banned hype terms rejected by `BrandGuardian` downstream, but the prompt
pre-empts them. (4) No fabricated numbers.

---

### 3.2 `Copywriter`

**Responsibility.** Strategy → the ad's **editable text**: hook options, the headline (≤70 chars, CANON §8),
intro/primary text (~150 chars visible before "see more"; ≤600, CANON §8), and the CTA. **Specificity >
cleverness** (CANON §7). Runs **in parallel with `ArtDirector`**; **produces zero imagery instructions.**

**Input.** `{ strategy: Strategy, adType, language: "de"|"en", variantIndex: number, charLimits: {headline:70, introVisible:150, introMax:600} }`

**Output — `CopySet` (zod)**
```ts
export const CopySet = z.object({
  language: z.enum(["de","en"]),
  hooks: z.array(z.string()).min(3).max(5),            // candidate first-lines / on-image hooks
  headline: z.string().max(70),                        // CANON §8 single-image headline ≤70 chars
  introText: z.string().max(600),                      // CANON §8; front-load the first ~150 chars
  cta: z.object({ label: z.string().max(24), action: z.enum(
    ["learn_more","sign_up","request_demo","download","register","contact_us"]) }),
  onImageText: z.object({                              // text destined for TEXT LAYERS (never image prompt)
    kicker: z.string().max(40).optional(),
    headline: z.string().max(60),
    subhead: z.string().max(80).optional(),
  }),
  smartBindings: z.array(z.object({                    // for smart layers, CANON §5 (e.g. {{customer_count}})
    token: z.string(), value: z.string() })).default([]),
  specificityScore: z.number().min(0).max(1),          // self-rated; Critic re-checks
});
```

**System prompt**
```
You are Copywriter for Brutal Ads. Input: a Strategy, the target language (de or en), and character limits.
Output: the editable TEXT of a LinkedIn ad. You write copy ONLY. You never describe imagery, layout, or colors.

LinkedIn character discipline (hard limits — the platform enforces them):
- Headline ≤ 70 characters. On-image headline ≤ 60. CTA label ≤ 24.
- Intro/primary text: the first ~150 characters are visible before "see more" — put the sharpest value there;
  total ≤ 600.

Voice: sober, editorial, documentary — the register of a serious trade publication, NOT hype AI. Concrete nouns
and numbers beat adjectives. Lead with a specific proof point or a specific tension. Ban: "revolutionary",
"game-changing", "unlock", "supercharge", "next-level", "🚀", exclamation-mark stacking, and vague superlatives.
Specificity > cleverness: "Drafts a German lease in 90 seconds" beats "AI that saves you time."

Bilingual: if language=de, write NATIVE German for professionals (Sie-form for partners/executives unless the
Strategy says otherwise) — do not translate from English in your head; write German that a German lawyer would
respect. Numbers stay as numerals in ON-SCREEN text (legibility).

Give 3–5 hook candidates so the human can pick. Fill onImageText for the layers the compositor will place. If
the Strategy has a countable proof point, expose it as a smart binding token (e.g. {{customer_count}}).

Return ONLY the CopySet JSON via the tool schema. No imagery, no layout.
```

**Model tier.** `claude-sonnet-5` (default). **Batch API** for the N-variant fan-out (non-interactive, 50% off,
R7 §0). Escalate to `claude-opus-4-8` only in auto-iterate round 2.
**Guardrails.** (1) Hard char limits enforced by schema `.max()`. (2) Banned-term list is a shared constant
(`packages/shared/src/brand/banned.ts`), also enforced by `BrandGuardian`. (3) **No imagery/layout fields** in the
schema — structurally cannot leak copy into the image prompt. (4) DE output validated as German (a cheap
`claude-haiku-4-5` language-id check on `language==="de"` outputs).

---

### 3.3 `ArtDirector`

**Responsibility.** Strategy → visual concept + a **model-choice hint** for the router + an **imagery-only**
generation prompt and negative prompt + the target aspect. **Never writes text to be rendered inside the image**
(CANON §2 load-bearing decision). Runs **in parallel with `Copywriter`**.

**Input.** `{ strategy: Strategy, brandKit: {palette, type, styleRefs, moodwords}, adType, aspect: "1:1"|"1.91:1"|"4:5", refs?: AssetRef[] }`

**Output — `ArtDirection` (zod)**
```ts
export const ArtDirection = z.object({
  concept: z.string(),                                 // the visual idea in one paragraph
  imageryPrompt: z.string(),                           // IMAGERY ONLY — no words to render, no UI copy
  negativePrompt: z.string(),                          // e.g. "no text, no watermark, no logos, no captions";
                                                       //   auto-appended with brandKit.imagery.style.avoid tokens (L10)
  aspect: z.enum(["1:1","1.91:1","4:5","16:9","9:16"]),// CANON §6 GenSpec aspect union
  modelHint: z.enum(["photoreal_background","reference_consistent","vector_asset","bulk_cheap","diversity"]),
  refs: z.array(z.object({ assetId: z.string(), role: z.enum(["style","subject","brand"]) })).default([]),
  seedPolicy: z.enum(["random","reuse_parent"]).default("random"),
  paletteLock: z.array(z.string()).default([]),        // hex from BrandKit to steer, e.g. ["#cba65e","#b6e64a"]
});
// helper: ArtDirection.toGenSpec() -> GenSpec (CANON §6) { prompt, negativePrompt, aspect, seed?, refs?, model?, params? }
```

**System prompt**
```
You are ArtDirector for Brutal Ads. Input: a Strategy and the workspace BrandKit (palette, type, style refs,
mood). Output: a visual concept and an IMAGERY-ONLY generation prompt for an image model.

THE ONE UNBREAKABLE RULE: your prompt describes IMAGERY ONLY. Never ask the model to render words, headlines,
UI copy, logos, captions, prices, or any legible text. All text is composited later as editable layers. If you
put text in the prompt, the whole product breaks (baked pixels = illegible, off-brand, un-editable). Your
negativePrompt MUST include: "no text, no words, no letters, no watermark, no logo, no caption, no UI".
It MUST ALSO include every token from the BrandKit's imagery.style.avoid list (e.g. "stock-photo cliché",
"neon gradients", "3D render", "corporate handshake") — these off-brand looks are appended to the negative
prompt automatically so the image model steers away from them (L10).

Brutal's look: sober, editorial, documentary. Dark, muted-first palette; cinematic, restrained; think a serious
photo essay, not a stock-photo ad. Steer toward the BrandKit palette (gold #cba65e, lime #b6e64a for the PE set;
acid-lime for chrome) via lighting/materials/accents — do not spell hex in the prompt, describe the mood. Leave
deliberate NEGATIVE SPACE where the compositor will place the headline/CTA (top-third or lower-third), and note
where in the concept.

Pick a modelHint for the router (docs/04):
- photoreal_background = photoreal hero/background (router → FLUX.2 [pro]).
- reference_consistent = must match a brand/subject/style ref, or edit-in-place (router → Gemini 3 Pro Image / Nano Banana Pro).
- vector_asset = an icon/logo shape (router → Recraft V3 vector).
- bulk_cheap = many cheap variants (router → Seedream 4.5).
- diversity = deliberately different look for A/B variety (router → gpt-image-1.5).

Compose for the aspect given (LinkedIn: 1:1 1200×1200 default, 1.91:1, 4:5). Respect mobile safe zones — keep the
subject clear of the top-left profile overlap and the "see more" fold.

Return ONLY the ArtDirection JSON via the tool schema.
```

**Model tier.** **`claude-opus-4-8` (default)** — art direction is judgment-heavy and directly determines
stopping power (CANON §7 lists `ArtDirector` among escalation-tier agents, R7 §5.3 ⚑R-LLM1).
**Guardrails.** (1) `imageryPrompt` is scanned for text-rendering intent (regex + a `claude-haiku-4-5`
classifier); if it requests words, the orchestrator rejects and re-prompts. (2) `negativePrompt` MUST contain the
no-text tokens (schema `.refine()`). (3) `modelHint` maps to the router policy table (docs/04 §5.3); manual
override always available (CANON §6). (4) `paletteLock` values must be members of the `BrandKit` palette. (5)
`brandKit.imagery.style.avoid` tokens are **automatically appended** to `negativePrompt` by the orchestrator
(deterministic, not left to the LLM) so every off-brand look the BrandKit bans is steered against (L10).

---

### 3.4 `CarouselArchitect`

**Responsibility.** (carousel only) Turn Strategy + CopySet into a **multi-slide narrative** with the canonical
**hook → reframe → close** arc (CANON §2/§8), ensuring **continuity across slides** (visual + verbal), 3–12 slides
(square 1080×1080 recommended, delivered as a PDF document ad, CANON §8).

**Input.** `{ strategy: Strategy, copy: CopySet, slideCount?: number /*default derived*/, language }`

**Output — `CarouselNarrative` (zod)**
```ts
export const CarouselNarrative = z.object({
  slides: z.array(z.object({
    index: z.number().int().min(0),
    role: z.enum(["hook","reframe","proof","close"]),  // hook first, close last; reframe/proof in the middle
    beat: z.string(),                                   // the narrative beat this slide carries
    onImageText: z.object({ kicker: z.string().max(40).optional(),
      headline: z.string().max(60), subhead: z.string().max(80).optional() }),
    imageryDirection: z.string(),                       // IMAGERY-ONLY guidance handed to ArtDirector per slide
    continuityCue: z.string().optional(),               // what carries over from the previous slide (color/motif)
  })).min(3).max(12),
  throughline: z.string(),                              // the single idea binding all slides
  ctaSlideIndex: z.number().int(),                      // which slide carries the CTA (usually the close)
});
```

**System prompt**
```
You are CarouselArchitect for Brutal Ads. Input: a Strategy and a CopySet. Output: a slide-by-slide narrative
for a LinkedIn document/carousel ad (delivered as a multi-page PDF, square 1080×1080).

The proven arc is HOOK → REFRAME → CLOSE:
- Slide 1 (hook) must EARN THE SWIPE — the strongest stopping-power line, a specific tension or number. It is the
  thumbnail; if it fails, nothing else is seen.
- Middle slides (reframe / proof) shift the reader's mental model and back it with concrete proof. One idea per
  slide. Never a wall of text — slides are read in <2 seconds each.
- Final slide (close) states the payoff and carries the CTA.

Continuity is mandatory: a recurring visual motif, consistent palette, and a verbal throughline must bind every
slide so the set reads as ONE story, not N posters. State the continuityCue per slide (what carries over).

Keep on-image text short (headline ≤60 chars) — it becomes editable text layers, never baked pixels. imagery-
Direction is IMAGERY ONLY (no words to render). Choose 3–12 slides; fewer, sharper slides beat more, weaker ones.
Register: sober, editorial, documentary. No hype.

Return ONLY the CarouselNarrative JSON via the tool schema.
```

**Model tier.** `claude-sonnet-5` default; escalate to `claude-opus-4-8` for long (>8-slide) or regulated-vertical
sets, or auto-iterate round 2.
**Guardrails.** (1) First slide `role="hook"`, last slide carries CTA (schema `.refine()`). (2) On-image text char
limits enforced. (3) `imageryDirection` scanned for text-rendering intent (same as `ArtDirector`). (4)
`services/engine` per-slide scoring later requires **slide 1 to have the highest `stoppingPower`** (docs/08 §5.4)
— `CarouselArchitect` is told this so it front-loads the hook.

---

### 3.5 `CompositorPlanner`

**Responsibility.** The **join point.** Combine the visual concept, the generated imagery asset, the copy, and
(for carousel) the narrative into a **canonical layer tree** (CANON §5): assign layer types, positions,
`renderHints` (safe-zone/maxLines/autoFit/minFontPx — `⚑R-LT1`), bind `smart` layers, and place the mandatory
`legal` layer. It also **chooses a named layout archetype** — the **4th variant-matrix axis** (alongside
angle/copy/imagery) that drives board diversity (L10): `full-bleed-hero-lower-third`, `split-panel`,
`editorial-kicker-top`, or `quote-card`. Produces the artifact `packages/render` turns into pixels.

**Input.** `{ strategy, copy: CopySet, art: ArtDirection, image: GenResult, narrative?: CarouselNarrative, brandKit, adType, aspect }`

**Output — `LayerTree`** (the CANONICAL `Layer`/`LayerTree` zod lives in `docs/03` §12.1 = `@brutal/shared`; shown here for the CompositorPlanner's usage, adapted to Polotno at the `EditorAdapter` — R7 §1.1. On any field mismatch, `docs/03` wins; e.g. font size is `fontSize` per doc 03.)
```ts
export const Layer = z.object({
  id: z.string(),
  type: z.enum(["image","text","logo","shape","cta","frame","legal","group","smart"]),  // CANON §5
  x: z.number(), y: z.number(), w: z.number(), h: z.number(),                            // in base-canvas px
  rotation: z.number().default(0), z: z.number().int(),                                  // stacking order
  // type-specific payloads:
  text: z.string().optional(),                          // text|cta|legal|smart
  assetId: z.string().optional(),                       // image|logo
  fill: z.string().optional(),                          // shape|frame — hex from BrandKit palette only
  fontFamily: z.enum(["Playfair Display","Inter"]).optional(),  // CANON §1 seed type; source from BrandKit
  fontSizePx: z.number().optional(),
  binding: z.string().optional(),                       // smart layer token, e.g. "{{customer_count}}"
  renderHints: z.object({                               // ⚑R-LT1 — deterministic multi-ratio re-layout
    safeZone: z.enum(["feed","profile_overlap","see_more_fold","none"]).default("none"),
    maxLines: z.number().int().default(2),
    autoFit: z.boolean().default(true),
    minFontPx: z.number().default(18),
  }).default({}),
});
// Named layout archetypes — the 4th variant-matrix axis (L10). CompositorPlanner picks one per variant;
// board diversity depends on these NOT collapsing to a single archetype (see Critic `layout_homogeneity`).
export const LayoutArchetype = z.enum([
  "full-bleed-hero-lower-third",   // edge-to-edge image, headline/CTA banded across the lower third
  "split-panel",                   // image occupies one panel, copy block the other (vertical or horizontal split)
  "editorial-kicker-top",          // kicker + headline stacked top, image below — trade-publication feel
  "quote-card",                    // large pulled quote/stat as the hero element, image recessed/muted
]);
export const LayerTree = z.object({
  adType: z.enum(["single_image","carousel","video"]),
  base: z.object({ w: z.number(), h: z.number(), aspect: z.enum(["1:1","1.91:1","4:5","16:9","9:16"]) }),
  layoutArchetype: LayoutArchetype,                     // 4th matrix axis (L10); carousels: per-slide below
  // single_image/video: one layers[]; carousel: slides[] each with its own layers[]
  layers: z.array(Layer).optional(),
  slides: z.array(z.object({ index: z.number().int(),
    layoutArchetype: LayoutArchetype, layers: z.array(Layer) })).optional(),
  brandKitVersion: z.number().int(),
});
```

**System prompt**
```
You are CompositorPlanner for Brutal Ads. You are the JOIN POINT: you receive a generated background image, the
ad copy, the art direction, and (for carousels) the slide narrative, and you output a LAYER TREE — the JSON
composition that the renderer turns into a pixel-perfect LinkedIn ad.

Core principle: the image is a BACKGROUND. Every legible element — headline, subhead, CTA, logo, legal, price,
slide copy — is its OWN editable layer on top, using the correct layer type: image | text | logo | shape | cta |
frame | legal | group | smart. Never merge text into the image. This is what makes the ad editable, on-brand,
localizable, and testable.

Layout rules (LinkedIn, mobile-first):
- Choose a named LAYOUT ARCHETYPE for this variant (the 4th diversity axis, alongside angle/copy/imagery):
  full-bleed-hero-lower-third | split-panel | editorial-kicker-top | quote-card. Pick the archetype that best
  serves THIS concept, and — when you know the other variants on the board — deliberately VARY it so the board
  does not collapse into near-identical layouts (a board where ≥3 variants share an archetype is flagged
  `layout_homogeneity` by the Critic). Set layoutArchetype on the tree (and per slide for carousels).
- Base canvas = the given aspect (1:1 1200×1200 default). Place the headline in the negative space the
  ArtDirector left (top-third or lower-third). Keep the CTA prominent and legible.
- Respect safe zones via renderHints.safeZone: keep critical text out of the top-left profile-overlap and above
  the "see more" fold. Set maxLines, autoFit, minFontPx so the same tree re-lays-out cleanly to 1.91:1 and 4:5
  without cropping (smart re-layout, not naive crop).
- Fonts: Playfair Display for display/headline, Inter for body — sourced from the BrandKit, never hardcoded.
  Colors: only hex values from the BrandKit palette.
- Mandatory legal/disclaimer text becomes a `legal` layer — never optional free text, never omitted.
- Countable proof points become `smart` layers bound to tokens (e.g. {{customer_count}}+ firms) so they update
  without touching pixels.
- Carousel: emit slides[] in order; carry the continuityCue (recurring motif/palette) across slides.

Return ONLY the LayerTree JSON via the tool schema. Every layer needs a stable id, position, z-order, and
renderHints.
```

**Model tier.** `claude-sonnet-5` default; escalate to `claude-opus-4-8` for complex carousels or round 2.
**Guardrails.** (1) A `legal` layer **must** exist iff `brief.mandatoryLegal` is non-empty (orchestrator
cross-check — legal is never silently dropped). (2) `fill`/text colors must be `BrandKit` palette members. (3)
`fontFamily` restricted to `BrandKit` fonts. (4) `smart` bindings must resolve against `copy.smartBindings`. (5)
Output must be **losslessly convertible to Polotno store JSON** at the `EditorAdapter` (R7 §1.1); a round-trip
test in `packages/render` CI guards this.

---

### 3.6 `BrandGuardian` — the hard gate

**Responsibility.** **Mechanical gate.** Verify a `LayerTree` (and its copy) against the **versioned `BrandKit`**:
palette adherence, voice register, banned terms, mandatory disclaimer present, localization correctness. A
failing variant **cannot reach the board** — it loops back to the offending author agent (≤2 rounds).

**Input.** `{ tree: LayerTree, copy: CopySet, brandKit: {version, palette, fonts, voiceRules, bannedTerms[], disclaimersByVertical, localizationRules}, vertical }`

**Output — `BrandVerdict` (zod)**
```ts
export const BrandVerdict = z.object({
  pass: z.boolean(),
  violations: z.array(z.object({
    rule: z.enum(["palette","font","voice_register","banned_term","missing_disclaimer",
      "localization","baked_text","safe_zone","char_limit"]),
    severity: z.enum(["hard","soft"]),                  // hard = must fix; soft = warn
    layerId: z.string().optional(),
    detail: z.string(),
    fixHint: z.string(),                                // routed to the author agent for repair
  })).default([]),
  routeTo: z.enum(["Copywriter","ArtDirector","CompositorPlanner","LocalizationAgent","none"]),
});
```

**System prompt**
```
You are BrandGuardian for Brutal Ads — the last mechanical gate before a variant can reach the board. You verify
a LayerTree and its copy against the VERSIONED BrandKit. You are strict and literal. You do not improve the ad;
you only judge whether it is on-brand and compliant, and if not, say precisely what to fix and who fixes it.

Check, in order:
1. PALETTE — every fill/text color must be a member of the BrandKit palette. Flag any off-palette hex (hard).
2. FONTS — display text uses Playfair Display; body uses Inter (or the BrandKit's fonts). Flag others (hard).
3. VOICE REGISTER — sober, editorial, documentary, NOT hype. Flag banned terms (revolutionary, game-changing,
   unlock, supercharge, 🚀, superlative stacking) and any hype tone (hard for banned terms, soft for tone).
4. MANDATORY DISCLAIMER — if the vertical requires a disclaimer, a `legal` layer with that text MUST be present.
   Missing = hard fail.
5. LOCALIZATION — if the ad is German, copy must be native German (not translated-sounding), Sie-form for senior
   audiences unless specified; numbers as numerals on-screen. Flag issues (hard) and route to LocalizationAgent.
6. NO BAKED TEXT — the background image layer must not contain rendered words. If it does, hard fail → ArtDirector.
7. CHAR LIMITS & SAFE ZONES — headline ≤70, on-image headline ≤60, CTA ≤24; critical text inside safe zones.

For each violation give: rule, severity (hard/soft), the offending layerId, a precise detail, and a fixHint.
Set pass=false if ANY hard violation exists. Set routeTo to the single agent best able to fix the most severe
violation. Return ONLY the BrandVerdict JSON via the tool schema.
```

**Model tier.** `claude-sonnet-5` default; **escalate to `claude-opus-4-8` for "hard" borderline calls** (voice
register, localization nuance) and round 2 (CANON §7 lists hard BrandGuardian calls at escalation tier).
**Guardrails.** (1) Palette/font/banned-term/char-limit/disclaimer checks are **also enforced deterministically in
code** (`packages/shared/src/brand/guard.ts`) — the LLM is a second layer for *tone/localization judgment*, not the
sole check for mechanical rules. (2) `pass=false` on any `severity:"hard"`. (3) A **hard cap of 2 repair rounds**;
after round 2 the variant is either passed with soft warnings surfaced to the human, or dropped (orchestrator
policy, configurable). (4) `routeTo` must be a real author agent.

---

### 3.7 `Critic`

**Responsibility.** Score a rendered variant against the **LinkedIn playbook + anti-patterns** (CANON §7). Produce
a structured, actionable critique (not a vibe). Runs **in parallel with `EngagementAnalyst`** after render.

**Input.** `{ render: RenderRef, tree: LayerTree, strategy: Strategy, playbookVersion: string }`

**Output — `CriticReport` (zod)**
```ts
export const CriticReport = z.object({
  playbookScore: z.number().min(0).max(100),           // holistic vs the playbook
  dimensions: z.object({                               // each 0–100
    hookStrength: z.number(), specificity: z.number(), clarity: z.number(),
    ctaStrength: z.number(), brandFit: z.number(), mobileLegibility: z.number(),
  }),
  antiPatterns: z.array(z.enum([
    "baked_text","feature_dump","vague_superlative","weak_hook","buried_cta",
    "low_contrast","overcrowded","generic_stock_look","hype_tone","tiny_mobile_text",
    "layout_homogeneity",   // L10 — BOARD-level: ≥3 variants share the same layoutArchetype
  ])).default([]),
  fixes: z.array(z.object({ target: z.enum(["Copywriter","ArtDirector","CompositorPlanner"]),
    change: z.string() })).default([]),
  verdict: z.enum(["strong","acceptable","weak"]),
});
```

**System prompt**
```
You are Critic for Brutal Ads — a world-class LinkedIn performance marketer reviewing ONE rendered ad against the
playbook. Be specific and honest. Score dimensions and name anti-patterns; then give concrete, routed fixes.

The LinkedIn playbook (what wins in a professional feed):
- STOPPING POWER first. The hook (headline/first line/first slide) must earn attention in <2 seconds on mobile.
- SPECIFICITY over cleverness. Concrete numbers, named outcomes, real proof beat adjectives.
- ONE idea. Feature dumps lose. A single sharp claim wins.
- CLEAR CTA. One obvious next step, legible and prominent.
- MOBILE LEGIBILITY. Text large enough on a phone; high contrast; inside safe zones (profile overlap, "see more"
  fold).
- ON-BRAND. Sober/editorial register; palette + type correct; not generic stock.

Anti-patterns (flag any present): baked_text (words rendered into the image), feature_dump, vague_superlative,
weak_hook, buried_cta, low_contrast, overcrowded, generic_stock_look, hype_tone, tiny_mobile_text,
layout_homogeneity. NOTE: layout_homogeneity is a BOARD-level check, not a single-ad check — flag it when ≥3
variants on the board share the same layoutArchetype (the board reads as one template, not a diverse set). All
other anti-patterns judge THIS ad alone.

Score playbookScore 0–100 and each dimension 0–100. verdict = strong (≥75 and no hard anti-pattern) /
acceptable (60–74) / weak (<60 or a hard anti-pattern like baked_text or buried_cta). For weak/acceptable, list
fixes as {target agent, precise change}. Return ONLY the CriticReport JSON via the tool schema.
```

**Model tier.** **`claude-opus-4-8` (default)** — critique quality directly gates the board (CANON §7 lists
`Critic` at escalation tier).
**Guardrails.** (1) `verdict="weak"` on any hard anti-pattern (`baked_text`, `buried_cta`) regardless of score.
(2) Every `fix.target` is a real author agent (feeds auto-iterate). (3) `Critic` **scores a rendered image**, not
the tree alone — it must receive the `RenderRef`. (4) `playbookVersion` is stamped on the report for
auditability (ties to `⚑ASSUMPTION A2` — the anti-pattern enum is the single update point when R3 lands).

---

### 3.8 `EngagementAnalyst`

**Responsibility.** Call the `EngagementPredictor` (via `ProviderBus.predictor(job)`), interpret the returned
`EngagementScores` as **bands + confidence**, and recommend concrete moves. It **never invents CTR** and **never
touches the TRIBE path** (commercial path is `ENGAGEMENT_BACKEND=saliency`, CANON §9, docs/08). Runs **in parallel
with `Critic`**.

**Input.** `{ render: RenderRef | VideoRef | GridRef, tree: LayerTree, adType }`
→ the analyst calls `ProviderBus.predictor(job).score(input)` → `EngagementScores` (CANON §6):
```ts
// EngagementScores (CANON §6) — the analyst INTERPRETS this, does not compute it:
// { attentionMap?, focalClarity, valuePropAttention, ctaAttention, clutter, stoppingPower,
//   firstThreeSeconds?, predictedCtrBand?{low,high,confidence}, perSlide?:[...], raw }
```

**Output — `EngagementReport` (zod)**
```ts
export const EngagementReport = z.object({
  backend: z.enum(["saliency"]),                        // commercial path ONLY; never "tribe_research"
  saliencySource: z.string(),                           // e.g. "saliency.transalnet" (docs/08 driver id)
  scores: z.object({                                    // mirrors EngagementScores, surfaced as bands
    focalClarity: z.number(), valuePropAttention: z.number(), ctaAttention: z.number(),
    clutter: z.number(), stoppingPower: z.number(),
    firstThreeSeconds: z.number().optional(),
    predictedCtrBand: z.object({ low: z.number(), high: z.number(),
      confidence: z.enum(["low","medium","high"]) }).optional(),
    perSlide: z.array(z.object({ index: z.number(), stoppingPower: z.number(),
      ctaAttention: z.number() })).optional(),
  }),
  interpretation: z.string(),                            // plain-language reading of the bands
  recommendations: z.array(z.object({ target: z.enum(["Copywriter","ArtDirector","CompositorPlanner"]),
    change: z.string(), expectedEffect: z.string() })).default([]),
  weakSlideIndexes: z.array(z.number()).default([]),     // carousel trough detection (docs/08 §5.4)
  disclaimer: z.string(),                                // "directional estimate, not a guarantee"
});
```

**System prompt**
```
You are EngagementAnalyst for Brutal Ads. You do NOT compute engagement — you call the EngagementPredictor and
INTERPRET its output for a marketer. The predictor returns saliency-based scores as BANDS with a confidence
level, calibrated against this workspace's real LinkedIn results over time. You must never present a single CTR
number as truth; always speak in ranges and confidence, and label predictions as directional estimates.

Read the EngagementScores:
- stoppingPower: will the thumb stop? (the #1 metric; for carousels, slide 1 must be highest.)
- focalClarity: is attention concentrated on the subject, or scattered?
- valuePropAttention / ctaAttention: does attention actually land on the headline and CTA? (We know the exact
  layer bboxes, so this is precise.)
- clutter: is the composition noisy?
- firstThreeSeconds (video): does the open earn attention in muted autoplay?
- predictedCtrBand{low,high,confidence}: report the range and confidence; widen the band + lower confidence when
  tenant data is thin.

For carousels, flag weak slides (a stoppingPower dip vs neighbors) as weakSlideIndexes. Turn low ctaAttention
into a CompositorPlanner fix (move/enlarge the CTA), low stoppingPower into an ArtDirector/Copywriter fix
(stronger hook/visual). Give recommendations as {target agent, precise change, expected effect}.

NEVER use or reference the TRIBE research backend — you are on the commercial saliency path only. Always include
the disclaimer that scores are directional, calibrated estimates. Return ONLY the EngagementReport JSON.
```

**Model tier.** `claude-sonnet-5` default; escalate to `claude-opus-4-8` in round 2.
**Guardrails.** (1) `backend` schema-restricted to `"saliency"` — the analyst **cannot** emit a TRIBE-derived
report (defense-in-depth atop the engine's dual gate, docs/08 §6). (2) The analyst calls the predictor **through
`ProviderBus.predictor(job)`**, never `services/engine` directly, and the bus **hard-errors** if a tenant-facing
job resolves to `research.tribe` (docs/08 §6). (3) `predictedCtrBand` is always a range + confidence — a point
CTR is a schema violation. (4) `disclaimer` is mandatory and non-empty.

---

### 3.9 `EditorAgent`

**Responsibility.** Translate a **natural-language edit request** ("make the headline shorter and gold", "move the
CTA up", "swap the background for something calmer") into a **typed `LayerPatch[]`** applied to the current
`LayerTree`. **Never re-rolls** — it emits diffs; the app applies them and re-renders **only affected layers**
(CANON §4). Post-board, human-triggered. Full `LayerPatch` contract in **§6**.

**Input.** `{ instruction: string, tree: LayerTree, selection?: string[] /*layer ids the user selected*/, brandKit }`

**Output — `EditResult` (zod; wraps the frozen `LayerPatchSet = LayerPatch[]`, see §6)**
```ts
export const EditResult = z.object({
  patches: LayerPatchSet,                                // §6 — LayerPatch[] (each a typed, minimal-op envelope)
  affectedLayerIds: z.array(z.string()),                // for partial re-render
  needsImageRegen: z.boolean(),                          // true ONLY if instruction requires new imagery
  summary: z.string(),                                   // one-line human-readable description of the change
  clarify: z.string().optional(),                        // asked ONLY if the instruction is ambiguous
});
```

**System prompt**
```
You are EditorAgent for Brutal Ads. You turn a plain-English edit request into a MINIMAL set of typed LayerPatch
operations on the current layer tree. You never regenerate the whole ad and you never re-run the image model
unless the user explicitly asks for new/different imagery (then set needsImageRegen=true — that dispatches a
GenerationJob, not a patch).

You are given the current LayerTree (ids, types, positions, text, colors, fonts), any layers the user has
selected, and the BrandKit. Emit ONE or more LayerPatch envelopes; each carries an ordered list of typed ops.
Produce the smallest set of ops that satisfies the request (op names are the frozen union):
- Text edits → setText ops on the target text|cta|legal|smart layer.
- Move/resize → resize ops (x,y,w,h); rotate ops for rotation.
- Color/font → setFill / setFont ops, using ONLY BrandKit palette colors and BrandKit fonts. If the user asks for
  an off-brand color, snap to the nearest BrandKit color and note it in summary.
- Add/remove/reorder → addLayer / removeLayer / reorderZ ops; setVisible to hide/show; setSlideOrder for carousels.
- "Swap the background / different image" → a replaceAsset op with regen=true + a target layer id and
  needsImageRegen=true; do NOT invent pixels.

Respect char limits (headline ≤70, on-image ≤60, CTA ≤24) and safe zones. If the instruction is genuinely
ambiguous (which of two headlines? which CTA?), ask ONE short clarifying question via clarify and return no
patches. Otherwise return ONLY the EditResult JSON. List affectedLayerIds for partial re-render.
```

**Model tier.** `claude-sonnet-5` (default — fast, cheap, high-frequency).
**Guardrails.** (1) Patches are **validated against the current tree** (target ids must exist; §6) before apply —
an invalid patch is rejected, not applied. (2) Color/font edits **snapped to `BrandKit`** (off-brand requests are
corrected, not honored). (3) Char limits enforced on `setText`. (4) `needsImageRegen` is the **only** path to new
pixels — a text edit **never** costs an image credit (R7 §4). (5) After apply, the result **still passes
`BrandGuardian`** before the human-approve gate (edits can't sneak past the brand gate). (6) Ambiguous → one
`clarify` question, no patches.

---

### 3.10 `LocalizationAgent`

**Responsibility.** **Transcreate** (not literally translate) a variant DE⇄EN: rewrite copy to feel native in the
target language, keep the sober/editorial register, and emit **TTS-safe number spelling** ("zwölfhundert") for any
VO track while keeping **numerals in on-screen text layers** for legibility (CANON §7, R2 §4.4). Binds locale
`smart` layers. Post-board, human-triggered; emits `LayerPatch[]` for text layers (no re-render of imagery).

**Input.** `{ tree: LayerTree, copy: CopySet, fromLang: "de"|"en", toLang: "de"|"en", forVoiceover: boolean, brandKit }`

**Output — `LocalizationResult` (zod)**
```ts
export const LocalizationResult = z.object({
  toLang: z.enum(["de","en"]),
  patches: LayerPatchSet,                                // §6 — LayerPatch[]; setText ops on text|cta|legal|smart only
  voiceoverScript: z.string().optional(),               // ONLY if forVoiceover: numbers PRE-SPELLED in target lang
  onScreenText: z.record(z.string()),                   // layerId -> transcreated on-screen string (numerals kept)
  ttsNormalizations: z.array(z.object({                 // audit of number/symbol spellings for the VO
    original: z.string(), spelled: z.string() })).default([]),
  notes: z.string().optional(),                          // transcreation choices worth surfacing
});
```

**System prompt**
```
You are LocalizationAgent for Brutal Ads. You TRANSCREATE ads between German and English — you rewrite so the ad
feels native and persuasive to a professional in the target language, NOT a literal translation. Keep Brutal's
register: sober, editorial, documentary. For German B2B, default to Sie-form for senior audiences.

Two outputs from the same idea:
1) ON-SCREEN TEXT (text/cta/legal/smart layers): transcreated copy with NUMBERS KEPT AS NUMERALS (legibility) —
   e.g. "1.200 Kanzleien". Respect char limits (headline ≤70, on-image ≤60, CTA ≤24).
2) VOICEOVER SCRIPT (only if forVoiceover=true): the SAME copy but with every number, date, currency, percent,
   and acronym SPELLED OUT IN WORDS in the target language, because the TTS engine mispronounces raw numerals in
   German. Examples (DE): "1.200" → "zwölfhundert"; "€1.200" → "eintausendzweihundert Euro"; "50 %" → "fünfzig
   Prozent"; "24/7" → "rund um die Uhr". Record each spelling in ttsNormalizations.

Do not touch imagery — only emit setText ops (inside LayerPatch envelopes) for text-bearing layers. Preserve
mandatory legal/disclaimer meaning exactly (legal is not creative — translate faithfully). Return ONLY the
LocalizationResult JSON.
```

**Model tier.** `claude-sonnet-5` (transcreation quality matters; escalate to `claude-opus-4-8` for
legal/regulated copy).
**Guardrails.** (1) `voiceoverScript` present **iff** `forVoiceover=true`. (2) On-screen numerals kept; VO numbers
spelled — a numeral in `voiceoverScript` is a validation warning (a `claude-haiku-4-5` numeral-scan). (3) `legal`
layer text is **translated faithfully, not transcreated** (meaning preserved). (4) Result patches re-pass
`BrandGuardian` (localization rule) before the human-approve gate. (5) Do **not** set `apply_text_normalization`
reliance for DE at the TTS layer — pre-spell here (R2 §4.4); on-screen and VO strings diverge by design.

---

## 4. Parallelism, the join, and the bounded auto-iterate loop

### 4.1 Parallelism map

| Stage | Parallel units | Mechanism | Bound |
|---|---|---|---|
| Variant fan-out | N variants (default 4–6) | `Promise.all` over variant indexes | `N ≤ variantCount` cap; cost cap (§8) |
| Copy ‖ Imagery | `Copywriter` ‖ `ArtDirector` (per variant) | `Promise.all`; **text never in image prompt** | one join at `CompositorPlanner` |
| Copy fan-out | N `Copywriter` calls | **Anthropic Batch API** (non-interactive, 50% off) | Batch job window |
| Imagery gen | N image `GenerationJob`s | job queue (pgmq default) + poll | provider concurrency caps (docs/04) |
| Critique ‖ Engagement | `Critic` ‖ `EngagementAnalyst` (per variant) | `Promise.all` | — |

### 4.2 The join (`CompositorPlanner`)

The **only** synchronization point per variant is `CompositorPlanner`: it cannot start until **both** the
`CopySet` (from `Copywriter`) and the **generated imagery `GenResult`** (from `ArtDirector` → `ProviderBus.image`)
are ready. This is what guarantees the anti-re-roll invariant structurally — copy and pixels are produced by
different code paths and only *composited*, never *co-generated*.

### 4.3 Bounded auto-iterate (≤2 rounds, CANON §7)

```
round = 0
loop:
  BrandGuardian(tree)  → if fail: tree = repair(routeTo, violations); round++; if round>2 break; continue
  render(tree)         → RenderRef
  [Critic ‖ EngagementAnalyst](render, tree)
  weak = Critic.verdict == "weak" OR EngagementReport.scores.stoppingPower < THRESHOLD_STOPPING
                                   OR EngagementReport.scores.ctaAttention  < THRESHOLD_CTA
  if not weak OR round == 2:  return variant                     # stop at round 2 REGARDLESS (hard bound)
  # feed STRUCTURED critique back to the specific author agent(s)
  fixes = merge(Critic.fixes, EngagementReport.recommendations)  # each carries a target agent + precise change
  tree  = reauthor(fixes)   # Copywriter/ArtDirector/CompositorPlanner re-run ONLY for their targeted fixes
  round++
  # round 2 runs targeted agents at claude-opus-4-8 (escalation tier, ⚑R-LLM1)
```

**Rules.**
- The bound (`≤2`) is enforced by the **orchestrator counter**, never by a prompt (a prompt cannot be trusted to
  count). (R7 §1.3.)
- Auto-iterate feeds **structured critique** (`fixes[]` with a `target` agent + a precise `change`) back to the
  **specific** author agent — not a vague "try again". Only targeted agents re-run; untargeted artifacts are
  reused (cheap).
- **Round 2 escalates targeted agents to `claude-opus-4-8`** (the last round gets the best judgment, ⚑R-LLM1).
- Thresholds (`THRESHOLD_STOPPING`, `THRESHOLD_CTA`) live in **workspace config**, start from global priors, and
  are **recalibrated against real `Result`s** over time (docs/08 §7).
- Auto-iterate is **entirely pre-board** — the human never sees a weak-and-un-iterated variant, and never sees a
  half-finished loop.

### 4.4 Human gates (CANON §7)

| Gate | Type | Position | Behavior |
|---|---|---|---|
| `IntakeAgent` clarify | soft | before pipeline | ≤2 questions; pipeline halts until answered (or defaults accepted) |
| `BrandGuardian` | **hard, mechanical** | before render/board | fail → loop back (≤2); a failing variant cannot reach the board |
| **Human-approve** | **hard, judgment** | after edits, before export | **nothing ships un-approved**; export is a human action (CANON §7, R7 §4) |

The **board is the product surface** — agents *rank* variants (by `stoppingPower` band, docs/08), humans *pick,
compare, tweak, and approve*. **Agents never ship.** Publishing to LinkedIn is human-triggered; the platform may
automate *ingest of results* (docs/08 §7) but **never automates spend** (R7 §4).

---

## 5. Observability (`AgentRun`) & cost caps

### 5.1 `AgentRun` — every agent call is logged (CANON §4/§5)

Every LLM call — every agent, every round, every fan-out unit — creates one `AgentRun` row (CANON §5 supporting
object). This is the studio's observability spine.

```sql
-- AgentRun (canonical CANON §5). DDL is authoritative in docs/03; shown here for the studio's fields.
-- VERIFY final column set against docs/03 before coding; names here are canonical.
CREATE TABLE agent_run (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES workspace(id),        -- multi-tenant + RLS (CANON §4)
  brief_id          uuid REFERENCES brief(id),
  variant_id        uuid REFERENCES variant(id),                   -- null for pre-variant agents (Intake/Strategist)
  agent             text NOT NULL,                                 -- 'Strategist' | 'Copywriter' | ... (CANON §7 names)
  round             int  NOT NULL DEFAULT 0,                       -- auto-iterate round (0,1,2)
  model             text NOT NULL,                                 -- 'claude-sonnet-5' | 'claude-opus-4-8' | 'claude-haiku-4-5'
  model_version     text,                                          -- resolved model version at call time
  input_tokens      int  NOT NULL,
  output_tokens     int  NOT NULL,
  cache_read_tokens int  DEFAULT 0,                                -- prompt caching (90% off) accounting
  latency_ms        int  NOT NULL,
  cost_usd          numeric(10,6) NOT NULL,                        -- computed from token usage × model price
  status            text NOT NULL,                                 -- 'ok' | 'schema_error' | 'refused' | 'timeout' | 'budget_exceeded'
  input_hash        text,                                          -- for dedup / cache
  output            jsonb,                                         -- the validated artifact (or error detail)
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON agent_run (workspace_id, brief_id);
CREATE INDEX ON agent_run (workspace_id, created_at);
-- RLS: workspace_id = auth workspace (CANON §4). service-role writes; tenant reads own rows only.
```

**`GenerationJob`** (imagery/video/audio gen) is logged separately (CANON §5, docs/04) with the same
`cost_usd`/`tokens`(n/a)/`latency` discipline; together `agent_run.cost_usd + generation_job.cost_usd` roll up to
the per-brief and per-workspace spend used by the cost caps.

### 5.2 The agent runner (wraps every call)

```ts
// apps/web/src/server/studio/agent-runner.ts  (skeleton)
export async function runAgent<T>(agent: AgentName, ctx: AgentCtx): Promise<T> {
  const model = pickModel(agent, ctx.escalate);                 // ⚑R-LLM1 tiering (§1 table)
  await ctx.budget.assertRoom(agent, model);                   // PRE-FLIGHT cost cap (refuse if would breach)
  const t0 = Date.now();
  const res = await anthropic.messages.create({                // CANON §4: structured output via tool/JSON schema
    model, tools: [toolFor(agent)], tool_choice: { type: "tool", name: schemaName(agent) },
    system: SYSTEM_PROMPT[agent], messages: buildMessages(agent, ctx),
    // prompt caching on the static system prompt (90% off); Batch API for non-interactive fan-out
  });
  const artifact = ZOD[agent].parse(extractToolInput(res));    // zod-validate at the boundary (throws → schema_error)
  await recordAgentRun({ agent, model, res, latency: Date.now() - t0, ctx });   // AgentRun row (§5.1)
  await ctx.budget.charge(costOf(res, model));                 // update per-brief/per-workspace spend
  return artifact as T;
}
```

### 5.3 Failure taxonomy (surfaced, never swallowed — CANON §4 content-mod surface)

| `status` | Cause | Handling |
|---|---|---|
| `schema_error` | Output failed zod validation | 1 retry with the validation error appended; then surface "couldn't structure output" |
| `refused` | Model content refusal | **content-moderation surface** in UI (explain, don't swallow, CANON §4); route to human |
| `timeout` | LLM/provider timeout | retry+backoff; then graceful UI state ("couldn't generate variant 3 — retry / edit brief", R7 §4) |
| `budget_exceeded` | Would breach cost cap | orchestrator refuses **pre-flight**; UI shows remaining budget (§5.4) |

---

## 5.4 Cost caps (hard, pre-flight — CANON §4/§10)

**Two hard caps, both enforced before a job starts:**

| Cap | Scope | Source | Enforcement |
|---|---|---|---|
| **Per-brief `cost_usd` cap** | one `runBriefToBoard` invocation | workspace config (default e.g. $2.00) | `budget.assertRoom` refuses the next agent/gen if projected spend > cap |
| **Per-workspace `cost_usd` cap** | rolling monthly | workspace/plan config | orchestrator refuses to start a brief that would breach the monthly cap |

**Cost levers already built into the studio:**
- **Model tiering** (⚑R-LLM1): Sonnet 5 default vs Opus 4.8 escalation ≈ ~40% LLM cost cut (R7 §4).
- **Bounded auto-iterate (≤2)** is itself a cost cap (§4.3).
- **Caching:** prompt caching (90% off) on static system prompts; provider caching by
  `(provider,model,version,prompt,seed,params)` (CANON §4) makes edits nearly free — **a copy/text edit costs
  zero image credits** because `EditorAgent` emits a `LayerPatch`, not a re-roll (R7 §4).
- **Batch API** (50% off) for the non-interactive N-variant copy fan-out.

The UI shows **remaining per-brief and per-workspace budget** and the orchestrator **never silently overspends**
— a would-breach job returns `status:"budget_exceeded"` with the remaining budget, not a surprise charge (R7 §4).

---

## 6. The `LayerPatch` contract (used by `EditorAgent` and `LocalizationAgent`)

**Purpose (CANON §4).** Chat-to-edit and localization emit **typed `LayerPatch` diffs, never full re-rolls.** A
`LayerPatch` is a **single well-typed envelope** carrying an ordered list of typed **`LayerPatchOp`** operations on
a `LayerTree`; a **`LayerPatchSet`** is simply an alias for a `LayerPatch[]` (L6). The app validates each patch
against the current tree, applies it, and **re-renders only affected layers** (docs/06).

### 6.1 The type (canonical; lives in `packages/shared/src/studio/layer-patch.ts`)

```ts
// packages/shared/src/studio/layer-patch.ts
// ── LayerPatch/LayerPatchOp/LayerPatchSet are defined ONCE (CANON §12 L6). Import the canonical
//    schema — do NOT redefine it here. Single source: docs/03 §12.2 (packages/shared, @brutal/shared). ──
import { LayerPatch, LayerPatchOp, LayerPatchSet } from "@brutal/shared"; // canonical zod: docs/03 §12.2
export { LayerPatch, LayerPatchOp, LayerPatchSet };

// The EditorAgent + LocalizationAgent MUST emit ops with docs/03 §12.2's EXACT field names/enums:
//   setText{layerId,text}   setFill{layerId,fill}   setFont{layerId,fontFamily?,fontSize?,fontWeight?,fontStyle?}
//   resize{layerId,x?,y?,width,height}   rotate{layerId,rotation}   reorderZ{layerId,toIndex}
//   setVisible{layerId,visible}   addLayer{afterLayerId,layer}   removeLayer{layerId}
//   replaceAsset{layerId,assetId}   setBinding{layerId,binding,template?,fallback?}   setSlideOrder{order:string[]}
// Envelope: { id, variantId, slideId?, origin:'chat'|'canvas'|'agent'|'system',
//             createdBy:'human'|'agent'|'system', note?, ops }
// App-level semantics (behaviour, NOT new schema fields): `setFill` is snapped to the BrandKit palette by
// BrandGuardian; char limits (headline ≤70) are re-checked; `replaceAsset` dispatches imagery via
// ProviderBus.image (docs/04) — imagery is NEVER re-rolled inline; every non-imagery op is a pure JSON diff
// (zero image credits). Map internal edit sources onto the canonical `origin`:
// drag→'canvas'; editor-agent/localization/regenerate→'agent'.

// LayerPatchSet is an ALIAS for a LayerPatch[] (L6).
export const LayerPatchSet = z.array(LayerPatch);
export type LayerPatchSet = z.infer<typeof LayerPatchSet>;

// applyLayerPatch (in packages/shared) implements EXACTLY this op union (L6).
// For carousels, ops address a slide's layer via LayerPatch.slideId (+ layerId).
```

### 6.2 Apply semantics (deterministic; lives in `packages/shared` or `packages/render`)

```ts
export function applyLayerPatch(tree: LayerTree, patches: LayerPatchSet): {
  tree: LayerTree; affected: string[]; regenLayerIds: string[]
} {
  // 1. VALIDATE every op against the CURRENT tree (target ids must exist; addLayer id must be unique).
  //    An invalid op is REJECTED (not applied) and reported — never silently dropped.
  // 2. NORMALIZE style ops to the BrandKit (snap off-brand fill to nearest palette color; clamp fonts).
  // 3. ENFORCE char limits on setText (headline ≤70, on-image ≤60, cta ≤24, legal preserved).
  // 4. APPLY each patch's ops in order; collect affectedLayerIds for PARTIAL re-render.
  // 5. replaceAsset / regen:true does NOT mutate pixels here — it returns regenLayerIds for the app to run a
  //    GenerationJob via ProviderBus.image (docs/04). Everything else is a pure JSON diff (zero image credits).
  // 6. POST-CONDITION: the patched tree must still pass BrandGuardian before the human-approve gate.
}
```

### 6.3 `LayerPatch` invariants

| Invariant | Enforced |
|---|---|
| An op targets an **existing** layer (or unique new id) | `applyLayerPatch` validation (rejects invalid) |
| Style edits stay **on-brand** (palette/fonts) | normalize-to-BrandKit step; BrandGuardian re-check |
| Text edits respect **char limits** | `setText` enforcement |
| **`legal` layer** text is never removed by an edit unless the human explicitly does so | `removeLayer` on a `legal` layer requires human confirmation (UI) |
| **New imagery is never a pure patch** | `replaceAsset`/`regen` dispatches a `GenerationJob`; all other ops are pure JSON diffs |
| A text/style/transform edit costs **zero image credits** | pure-diff ops don't touch the provider bus (R7 §4) |
| Patched tree **re-passes `BrandGuardian`** before human-approve | orchestrator post-apply hook |

---

## 7. `AgentRun` lifecycle & the "brief → board" trace

Every brief produces an auditable trace of `AgentRun` rows (§5.1) that reconstructs exactly what happened:

```
brief_id = B
  AgentRun(agent=IntakeAgent,  round=0, model=haiku,  variant_id=null)
  AgentRun(agent=Strategist,   round=0, model=sonnet, variant_id=null)
  per variant V in {v1..vN}:
    AgentRun(agent=Copywriter,        round=0, model=sonnet, variant_id=V)   [Batch]
    AgentRun(agent=ArtDirector,       round=0, model=opus,   variant_id=V)
    GenerationJob(kind=image, variant_id=V)                                  [docs/04]
    AgentRun(agent=CarouselArchitect, round=0, model=sonnet, variant_id=V)   [carousel only]
    AgentRun(agent=CompositorPlanner, round=0, model=sonnet, variant_id=V)
    AgentRun(agent=BrandGuardian,     round=0, model=sonnet, variant_id=V)   [gate]
    Render(variant_id=V)                                                     [docs/06]
    AgentRun(agent=Critic,            round=0, model=opus,   variant_id=V)
    AgentRun(agent=EngagementAnalyst, round=0, model=sonnet, variant_id=V)   [→ EngagementPredictor, docs/08]
    (if weak) round=1 targeted re-author + re-score …
    (if still weak) round=2 targeted re-author + re-score @ opus … STOP
  → board = rank(v1..vN by stoppingPower band)
post-board (human-triggered):
  AgentRun(agent=EditorAgent,        variant_id=V)  → EditResult{patches: LayerPatchSet} → applyLayerPatch → partial re-render
  AgentRun(agent=LocalizationAgent,  variant_id=V)  → LocalizationResult → setText ops → re-render text
  → HUMAN-APPROVE GATE → export (docs/06)
```

Each row carries `cost_usd`; the sum feeds the caps (§5.4). `Variant.engagement{}` (CANON §5 lineage) stores the
final `EngagementReport.scores` for the calibration loop (docs/08 §7). Lineage on the `Variant`
(`brief_id, brand_kit_version, provider, model, model_version, seed, prompt, negative_prompt, parent_variant_id,
created_by, engagement{}`, CANON §5) is populated from `ArtDirection`/`GenerationJob`/`AgentRun` at persist time.

---

## 8. Consolidated guardrails (per CANON §4/§7)

| Guardrail | Mechanism | Agent(s) |
|---|---|---|
| **Text never in image prompt** | schema forbids copy fields on `ArtDirection.imageryPrompt`; classifier scan | ArtDirector, CarouselArchitect |
| **On-brand is mechanical** | code-level palette/font/banned-term checks + LLM tone judgment | BrandGuardian (+ CompositorPlanner, EditorAgent) |
| **No fabricated facts/numbers** | prompts forbid invention; proof points must subset the Brief | Intake, Strategist, Copywriter |
| **Hard char limits** | zod `.max()`; re-checked on every `setText` | Copywriter, CarouselArchitect, EditorAgent, LocalizationAgent |
| **Mandatory disclaimer** | `legal` layer required iff `mandatoryLegal` non-empty | CompositorPlanner, BrandGuardian |
| **TTS-safe numbers** | VO spelled-out; on-screen numerals kept; numeral-scan | LocalizationAgent |
| **No TRIBE on commercial path** | `backend` schema-restricted to `saliency`; bus hard-errors | EngagementAnalyst (+ ProviderBus, docs/08) |
| **Bands, never point CTR** | `predictedCtrBand{low,high,confidence}` required | EngagementAnalyst |
| **Bounded auto-iterate ≤2** | orchestrator counter (not prompt) | orchestrator |
| **Edits never re-roll** | `LayerPatch` diffs; imagery only via `replaceAsset`→job | EditorAgent, LocalizationAgent |
| **Nothing ships un-approved** | human-approve gate before export | orchestrator |
| **Cost caps pre-flight** | `budget.assertRoom` refuses would-breach jobs | agent-runner |
| **Prompt-injection safe** | fetched URLs/attachments treated as untrusted content, never instructions | IntakeAgent (§9.3) |
| **All output structured** | zod-validated at every boundary; schema_error retried once | all agents |

---

## 9. Implementation notes, assumptions & VERIFY checklist

### 9.1 File layout (within CANON's repo tree)

```
apps/web/src/server/studio/
  orchestrator.ts            # runBriefToBoard (§2.4), auto-iterate loop (§4.3)
  agent-runner.ts            # runAgent wrapper: model tiering, AgentRun, cost cap (§5.2)
  prompts/                   # one file per agent — the SYSTEM PROMPTs in §3 (versioned)
  budget.ts                  # per-brief + per-workspace cost caps (§5.4)
packages/shared/src/studio/
  layer-tree.ts              # Layer, LayerTree zod (§3.5)
  layer-patch.ts             # LayerPatchOp union + LayerPatch envelope + LayerPatchSet alias + applyLayerPatch (§6)
  agents.ts                  # NormalizedBrief, Strategy, CopySet, ArtDirection, CarouselNarrative,
                             #   BrandVerdict, CriticReport, EngagementReport, EditResult, LayerPatchSet, LocalizationResult
packages/shared/src/brand/
  banned.ts                  # banned-term list (shared by prompts + BrandGuardian code check)
  guard.ts                   # deterministic palette/font/limit/disclaimer checks (§3.6)
```

### 9.2 Anthropic integration (CANON §4) — `VERIFY current docs before coding`

- **Structured outputs** via **tool use with a JSON schema** (`tool_choice: {type:"tool", name:...}`), or the
  structured-output surface if available. Each agent has exactly one tool = its output schema.
- **Prompt caching** (90% off) on the static system prompt; **Batch API** (50% off) for the non-interactive
  N-variant `Copywriter` fan-out (R7 §0).
- **`VERIFY`**: model ids (`claude-sonnet-5`, `claude-opus-4-8`, `claude-haiku-4-5`), Sonnet 5 intro-pricing
  window (intro $2/$10 ends **2026-08-31**), tool-schema/structured-output surface, Batch + caching semantics —
  `platform.claude.com/docs/en/about-claude/models/overview` and `/pricing`. Model ids in **config, never
  hardcoded**; a boot check hits the Models API and fails fast on a retired model (R7 §7).

### 9.3 Prompt-injection & untrusted content (IntakeAgent, EditorAgent)

Any **URL content or attachment** the `IntakeAgent` ingests is **untrusted**: it is summarized/quoted into the
context as *data*, never followed as *instructions*. The system prompt is authoritative; injected "ignore your
instructions" text in a fetched page must not change agent behavior. The `EditorAgent`'s NL instruction is
user-authored (trusted intent) but still schema- and BrandKit-constrained (§3.9). **`VERIFY`**: apply Anthropic's
current guidance on untrusted-content handling / input tagging.

### 9.4 Assumptions (flagged)

| # | Assumption | Basis | If wrong |
|---|---|---|---|
| A1 | Claude model ids/tiers per ⚑R-LLM1 | R7 §5.3 | swap ids in config; tiering logic unchanged |
| A2 | LinkedIn playbook rules derived from CANON §8/§2/§1 (R3 not yet a file) | CANON | reconcile prompts + `Critic` anti-pattern enum against R3 when it lands |
| A3 | `IntakeAgent` is an accepted additive agent | R7 ⚑R-A1 | fold into `Strategist` prompt if CANON-minimalism preferred |
| A4 | `renderHints` per layer is accepted | R7 ⚑R-LT1 | drop the field; re-layout becomes heuristic in the exporter |
| A5 | Queue = Supabase pgmq default | R7 ⚑R-INFRA1 | `INNGEST_*` adapter; orchestrator unchanged (interface-bound) |
| A6 | Weakness thresholds start from global priors, calibrated per workspace | docs/08 §7 | tune constants; loop logic unchanged |
| A7 | `EngagementPredictor` returns exactly CANON §6 `EngagementScores` | CANON §6 / docs/08 | adjust `EngagementReport` mapping only |

### 9.5 Consolidated "VERIFY before coding"

1. **Anthropic**: model ids + Sonnet 5 intro window (ends 2026-08-31) + tool-schema/structured-output surface +
   Batch/caching semantics. (§9.2)
2. **`EngagementScores` shape** as delivered by `services/engine` matches CANON §6 exactly (docs/08). (§3.8)
3. **`LayerTree` ↔ Polotno store JSON** round-trip is lossless at the `EditorAdapter` (docs/06); CI round-trip
   test. (§3.5)
4. **LinkedIn 2026 format specs** (char limits ≤70/≤600/≤24; ratios 1:1/1.91:1/4:5; ≤5 MB; carousel 1080×1080
   PDF) re-confirmed against LinkedIn's live spec page (CANON §8 is the source of truth; specs drift). (§3.2/§3.4)
5. **R3 playbook** reconciliation when the file lands — update `Critic` anti-pattern enum + prompt rules. (⚑A2)
6. **Banned-term list** (`packages/shared/src/brand/banned.ts`) reviewed with the client for the German set. (§3.6)
7. **TTS number-spelling rules** for DE (`zwölfhundert`, `Prozent`, currency) match ElevenLabs behavior; do **not**
   rely on `apply_text_normalization` for DE (R2 §4.4). (§3.10)
8. **Cost-cap defaults** ($/brief, $/workspace) set with the client per plan tier. (§5.4)

---

## 10. Cross-document contract (what this doc exports / imports)

**Exports (other docs depend on these names/shapes):**
- The **eleven agent names** and their **output schemas** (`NormalizedBrief`, `Strategy`, `CopySet`,
  `ArtDirection`, `CarouselNarrative`, `LayerTree`, `BrandVerdict`, `CriticReport`, `EngagementReport`,
  `EditResult`, `LayerPatchSet`, `LocalizationResult`) — `packages/shared/src/studio`.
- The **`LayerPatchOp`** union + **`LayerPatch`** envelope + **`LayerPatchSet`** (`= LayerPatch[]`) + `applyLayerPatch`
  semantics (§6, frozen per CANON §12 L6; DDL owned by docs/03 §12.2) — consumed by docs/06 (render & editor).
- The **orchestration contract** `runBriefToBoard` (§2.4) — consumed by docs/06/10 (UI/server actions).
- **`AgentRun`** studio fields (§5.1) — consumed by docs/03 (schema) & docs/12 (observability).

**Imports (defined elsewhere; used here by canonical name):**
- Object model / DDL — **docs/03** (`Workspace…Layer`, `AgentRun`, `GenerationJob`, lineage).
- `ProviderBus`, `ImageProvider`, `GenSpec`/`GenResult`, routing policy — **docs/04** (CANON §6).
- `packages/render` (LayerTree → pixels; exporter/re-layout) — **docs/06**.
- `EngagementPredictor`/`EngagementScores`, `ENGAGEMENT_BACKEND`, TRIBE isolation — **docs/08** (CANON §6/§9).
- Polotno `EditorAdapter`, board UI, drag-edit — **docs/06**.
- Env vars (`ANTHROPIC_API_KEY`, `ENGINE_URL`, …), cost/observability infra — **docs/11** (CANON §10).

<!-- Conforms to CANON §4/§5/§6/§7/§10. Canonical names used verbatim: Strategist, Copywriter, ArtDirector,
CarouselArchitect, CompositorPlanner, BrandGuardian, Critic, EngagementAnalyst, EditorAgent, LocalizationAgent;
AgentRun, GenerationJob, LayerPatch, LayerTree, Layer types (image|text|logo|shape|cta|frame|legal|group|smart);
ProviderBus, ImageProvider, GenSpec, GenResult, EngagementPredictor, EngagementScores; ENGAGEMENT_BACKEND
(saliency|tribe_research), RESEARCH_MODE, ENGINE_URL, ANTHROPIC_API_KEY. Model tiers claude-sonnet-5 /
claude-opus-4-8 / claude-haiku-4-5 per R7 ⚑R-LLM1. Additive items flagged: IntakeAgent (⚑R-A1), renderHints
(⚑R-LT1). Deviations flagged ⚑ RECOMMENDATION; assumptions flagged ⚑ ASSUMPTION. -->


<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: docs/06-editor-and-compositor.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

# 06 — Editor & Compositor

> ⚠️ **CROSS-REFERENCE NOTE — read first (authoritative, per CANON §12 L1).** Some inline `docs/NN` / `doc NN` pointers in this file predate the frozen document map and may cite the wrong number. **Resolve every cross-reference by ROLE using this map, not by the integer written inline:** `01` product · `02` architecture · `03` data-model (all DDL/zod/schemas) · `04` providers · `05` agent-studio · `06` editor + `packages/render` + export · `07` creative-playbook · `08` engagement · `09` brand-kit · `10` build-plan · `11` env · `12` security/ops · `13` acceptance · `14` appendix. There is **no localization doc** (localization lives in `05` LocalizationAgent + `09` brand-kit `localization` + `07`) and **no "exporter" doc** (export lives in `06`). Source paths are `apps/web/src/**` (never `apps/web/lib/**`). Where anything here disagrees with CANON §12, **the ledger wins.**

> **Scope.** The editing surface and the render/export engine of Brutal Ads: the **Polotno-based layered
> editor** wrapped behind `EditorAdapter`; **direct manipulation** (drag/resize/type) + **chat-to-edit**
> (`EditorAgent` → typed `LayerPatch`); **regenerate-single-layer**; the **carousel / document builder**
> (ordered `Slide[]`, continuity, reorder, per-slide edit); the **Remotion video editor**; the **SHARED
> HEADLESS RENDER MODEL** that guarantees editor↔export pixel parity; the **multi-format smart re-layout**
> algorithm with safe-zones; **live pre-flight** (WCAG contrast sampled under text, legibility, spec, brand,
> safe-zones); and **export** to JPG/PNG ≤5 MB, **PDF** document ads (the sole v1 document-ad format), and MP4.
> **PPTX is out of scope for v1** (CANON §12 L3): it is NOT a native `polotno-node` output; LinkedIn
> document/carousel ads ship as **PDF**. (LinkedIn *accepts* PPT/PPTX uploads, but our render does not
> produce PPTX in v1; any post-v1 PPTX is a flagged `pptxgenjs` post-render step only — §8.4, never via `polotno-node`.)
>
> **Conforms to `CANON.md`** — object model (`AdDocument → Variant → Slide → Layer`), layer types, provider
> contracts, agent names (`EditorAgent`, `LocalizationAgent`, `BrandGuardian`, `Critic`), env vars, repo
> shape (`apps/web`, `packages/shared`, `packages/render`), and the load-bearing rule: **AI generates imagery
> only; every legible/on-brand element is a composited editable vector/text layer on a JSON layer tree.**
>
> **This document lives in the build order at CANON/R7 phases P1 (render spine), P4 (board + editor), P5
> (export), P7 (carousel), P9 (video).** Cross-refs: `docs/03` (object model & layer-tree schema),
> `docs/05` (agents), `docs/04` (providers/ProviderBus), `docs/08` (engagement), `docs/11` (env vars).

---

## 0. ASSUMPTIONS & FLAGS (read first)

| # | Assumption / flag | Why | Action for builder |
|---|---|---|---|
| **A0** | **Research file `R6-editor-compositor.md` was NOT present** at authoring time (only R1, R2, R4, R7 existed). This spec is derived from **R7 §1.1, §3, §6 (editor/render/`renderHints`/safe-zones/Polotno/`polotno-node`)**, **R2 §5 (Remotion)**, **R1 (export ratios/formats)**, and **CANON §4/§5/§8**. | Transparency. | If an R6 later appears, reconcile; R6 wins on editor/compositor specifics **only where it does not contradict CANON**. |
| **A1** | The **canonical layer tree** (`packages/shared`) is the source of truth; **Polotno store JSON is a derived, lossless projection** produced/merged only at the `EditorAdapter` boundary (R7 §1.1). Polotno is never the canonical store. | Keeps editor swappable (CANON §4); preserves `smart`/`legal`/localization semantics Polotno can't model. | Implement `toPolotno()` / `fromPolotno()` as pure, round-trippable functions with a golden-file test. |
| **A2** | Per-layer **`renderHints`** (R7 `⚑R-LT1`: `{safeZone, maxLines, autoFit, minFontPx}`, extended in §5.1 below) is an **additive** field on `Layer`, not a rename. | Deterministic multi-ratio re-layout (CANON §8). | Add to the `Layer` zod schema in `packages/shared` (coordinate with `docs/03`). |
| **A3** | **Polotno SDK is commercially licensed**; **`polotno-node`** renders headless (store JSON → PNG/JPG/PDF/SVG) with **no per-render fee** (R7 §6). Env key **`POLOTNO_API_KEY`** (R7 `⚑R-ENV1` — CANON §10 omitted it). **PPTX is NOT a native `polotno-node` output and is out of scope for v1** (CANON §12 L3) — LinkedIn document/carousel ads ship as **PDF**. | Legal/runtime blocker if unlicensed (watermark/limits). | Budget license; add `POLOTNO_API_KEY` to `docs/11` env block. |
| **A4** | **Remotion needs a Company License** for 4+ employees (R2 §5, R7 §6). Not a runtime key. | Legal. | Budget it; not an env var. |
| **A5** | The **same headless render code path** (`packages/render`) backs *both* the in-editor preview thumbnail generation *and* final export. The live-editing canvas is Polotno's WebGL/2D DOM renderer; **parity is enforced by a golden-image diff test**, not by assuming two renderers agree. | "editor↔export parity" is the load-bearing correctness property; two independent renderers WILL drift. | Ship the parity test in P1 (§7.4). |
| **A6** | `⚑ RECOMMENDATION (R-ED1)`: **`LayerPatch` is applied to the canonical tree, then re-projected to Polotno** — never applied directly to Polotno's store. This keeps chat-edit and drag-edit converging on one model and one undo stack. | Single source of truth for undo/redo, collab, lineage. | Route ALL edits (drag, chat, regenerate) through `applyLayerPatch(tree, patch)`. |
| **A7** | LinkedIn format numbers (ratios, ≤5 MB, ≤200 MB, char limits) are taken from **CANON §8** verbatim; re-confirm at ship time (R7 checklist #11). | Specs drift. | `VERIFY current docs before coding` at export cutover. |

---

## 1. COMPONENT MAP & FILE LAYOUT

```
apps/web/
  src/editor/
    EditorAdapter.ts            # interface (swappable editor boundary)
    adapters/
      PolotnoAdapter.tsx        # concrete: Polotno SDK <-> canonical tree
      RemotionAdapter.tsx       # concrete: video editor (Remotion Player + timeline)
    canvas/
      StaticCanvas.tsx          # single_image + per-slide carousel canvas (Polotno)
      CarouselBuilder.tsx       # ordered Slide[] strip: reorder, add, dup, per-slide edit
      VideoTimeline.tsx         # Remotion Player + tracks (clips/VO/subs/brand)
    chat/
      ChatToEdit.tsx            # NL box -> EditorAgent -> LayerPatch preview/apply
    preflight/
      PreflightPanel.tsx        # live pre-flight badge list (WCAG/spec/brand/safe-zone)
    regenerate/
      RegenerateLayer.tsx       # "regenerate this layer" (image/text) UI
    state/
      useDocStore.ts            # canonical tree store + undo/redo + patch bus
      layerPatch.ts             # applyLayerPatch(tree, patch) (SHARED impl re-exported)
  src/app/api/
    editor/patch/route.ts       # POST typed LayerPatch (chat-edit)
    editor/regenerate/route.ts  # POST regenerate single layer -> GenerationJob
    export/route.ts             # POST export request -> Render job (delegates to packages/render)
    preflight/route.ts          # POST tree -> PreflightReport (server authoritative)

packages/shared/
  src/
    layerTree.ts                # canonical Layer/Slide/AdDocument types (docs/03 owns)
    layerPatch.ts               # LayerPatch type + applyLayerPatch() (pure, isomorphic)
    renderHints.ts              # RenderHints type + defaults
    relayout.ts                 # smartRelayout(tree, targetRatio) (pure, isomorphic)
    preflight.ts                # PreflightRule[], PreflightReport, runPreflight() (pure)
    schemas/*.zod.ts            # zod for all of the above

packages/render/
  src/
    index.ts                    # renderDocument(spec) facade — ONLY public export (CANON L5); re-exports named internals renderStatic/renderPdf/renderVideoLocal/encodeImageUnder5MB
    polotno/
      toPolotno.ts              # canonical tree -> Polotno store JSON
      fromPolotno.ts            # Polotno store JSON -> canonical tree
      renderStatic.ts           # polotno-node: store JSON -> PNG/JPG/PDF/SVG
    remotion/
      Root.tsx                  # <Composition id="BrutalAd" .../>
      BrutalAd.tsx              # video composition (clips+VO+subs+brand)
      renderVideo.ts            # renderMedia (local) / renderMediaOnLambda (scale)
    export/
      encodeImage.ts            # size-target loop (<=5MB) JPG/PNG
      documentAd.ts             # multi-page PDF assembly (sole v1 document-ad format; PPTX out of scope v1)
      probeSize.ts              # file-size probe + re-encode
    parity/
      goldenDiff.test.ts        # editor-preview vs export pixel-diff gate (A5)
```

**Ownership boundary:** `packages/shared` holds **pure, isomorphic** logic (patch apply, re-layout,
pre-flight rules) so the **exact same code** runs in the browser editor (instant feedback) and on the server
(authoritative gate) and in the headless renderer. `packages/render` holds anything that touches Chromium /
Remotion / encoders. `apps/web/src/editor` holds React/UI only.

---

## 2. `EditorAdapter` — the swappable editor boundary (CANON §4)

The editor is wrapped so Polotno (or a future replacement) is swappable. The adapter speaks **canonical tree
in, canonical tree out** and never leaks Polotno types across the boundary.

```ts
// apps/web/src/editor/EditorAdapter.ts
import type { AdDocument, Variant, Slide, Layer, LayerPatch, RenderHints } from '@brutal/shared';

export type EditorSelection = { slideId?: string; layerIds: string[] };

export interface EditorAdapter {
  /** Mount the editor onto a container for a given Variant (single_image | carousel | video). */
  mount(container: HTMLElement, variant: Variant, opts: EditorMountOpts): Promise<EditorHandle>;
}

export interface EditorMountOpts {
  brandKit: BrandKitResolved;         // fonts, palette, banned terms, safe-zone policy (docs/09)
  locale: 'de' | 'en';
  readOnly?: boolean;
  onChange: (tree: Variant, cause: EditCause) => void;   // canonical tree after every mutation
  onSelect: (sel: EditorSelection) => void;
  onPreflight: (report: PreflightReport) => void;         // live pre-flight stream (§6)
}

export type EditCause =
  | { kind: 'drag' }                    // direct manipulation (move/resize/rotate/type)
  | { kind: 'patch'; patch: LayerPatch }// chat-to-edit or programmatic
  | { kind: 'regenerate'; layerId: string; assetId: string }
  | { kind: 'relayout'; ratio: AspectRatio }
  | { kind: 'reorder'; slideId: string; toIndex: number }
  | { kind: 'undo' } | { kind: 'redo' };

export interface EditorHandle {
  applyPatch(patch: LayerPatch): Promise<Variant>;   // isomorphic applyLayerPatch under the hood
  getTree(): Variant;                                 // canonical tree (NOT polotno json)
  select(sel: EditorSelection): void;
  setLocale(locale: 'de' | 'en'): void;               // triggers text-layer swap (no re-render)
  relayout(ratio: AspectRatio): Promise<Variant>;     // smart re-layout (§5)
  regenerateLayer(layerId: string, override?: GenOverride): Promise<GenerationJob>;
  exportPreviewDataUrl(opts?: { scale?: number }): Promise<string>;  // fast thumbnail
  undo(): void; redo(): void;
  destroy(): void;
}

export type AspectRatio = '1:1' | '1.91:1' | '4:5' | '16:9' | '9:16';   // CANON §6 GenSpec.aspect
```

**Adapter contract rules (MUST):**
1. The adapter **never** exposes a Polotno `store` object across the boundary. Only canonical `Variant`
   trees, `LayerPatch`, and `EditorSelection` cross it.
2. Every user gesture inside Polotno is intercepted, converted to a canonical mutation (ideally a
   `LayerPatch`), applied via `applyLayerPatch`, then re-projected to Polotno (A6). This gives ONE undo
   stack and makes drag-edits and chat-edits identical downstream.
3. `getTree()` is always **losslessly** convertible to Polotno JSON and back (`toPolotno`/`fromPolotno`
   round-trip golden test, A1).

> `VERIFY current docs before coding` — **Polotno SDK**: mounting API (`createStore`, `<PolotnoContainer>`
> / `<Workspace>`), event hooks for element change, custom-element registration (for `smart`/`legal`/`cta`
> layer types), font loading (`store.addFont`), and the commercial license activation flow with
> `POLOTNO_API_KEY`. Confirm `store.toJSON()` / `store.loadJSON()` shape hasn't changed.
> Docs: https://polotno.com/docs · license: https://polotno.com/sdk/pricing

---

## 3. CANONICAL TREE ↔ POLOTNO PROJECTION

### 3.1 Layer-type mapping

CANON layer types: `image | text | logo | shape | cta | frame | legal | group | smart`. Polotno natively
models `image`, `text`, `svg`, `group`. The rest are **canonical semantics** projected onto Polotno
primitives + `custom` metadata so they survive round-trips.

| Canonical `Layer.type` | Polotno element | Projection notes |
|---|---|---|
| `image` | `type:'image'` | background/hero; `src` = Asset URL; `renderHints.role='background'` may pin z=0 + full-bleed. |
| `text` | `type:'text'` | font pinned to BrandKit; `autoFit`/`maxLines` enforced by re-layout, not Polotno auto-grow. |
| `logo` | `type:'image'` or `svg` | `custom.kind='logo'`; locked aspect; safe-zone = brand-mandated clear space. |
| `shape` | `type:'figure'`/`svg` | rectangles, dividers, scrims (see §6 scrim rule). |
| `cta` | `group` (`figure` + `text`) | `custom.kind='cta'`; button-like; contrast rule stricter (§6). |
| `frame` | `svg`/`figure` border | decorative border/frame; excluded from safe-zone occlusion checks. |
| `legal` | `type:'text'` | `custom.kind='legal'`; **never** auto-shrunk below `minFontPx` legal floor; always on top; mandatory-disclaimer source (BrandGuardian). |
| `group` | `group` | preserves parent/child transforms. |
| `smart` | `type:'text'` + `custom.binding` | data-bound (`{{customer_count}}+ firms`); **rendered value baked at render time**, binding preserved in tree. Locale-aware. |

**`smart` layer rule (load-bearing):** the tree stores the **binding expression** (`custom.binding`) AND a
resolved **display string** (`text`). The editor shows the resolved string; export re-resolves against the
current data + locale. `toPolotno()` emits the resolved string; `fromPolotno()` restores the binding from
`custom.binding` (never overwrites the expression with the resolved text). This is what keeps ads
programmatic and localizable without touching pixels (R7 §1.1).

### 3.2 Projection skeletons

```ts
// packages/render/src/polotno/toPolotno.ts
export function toPolotno(variant: Variant, slideId?: string): PolotnoStoreJSON {
  const slide = pickSlide(variant, slideId);           // single_image -> the one implicit slide
  return {
    width: slide.canvas.width, height: slide.canvas.height,
    fonts: brandFonts(variant.brandKit),               // Playfair Display, Inter (embedded)
    pages: [{
      id: slide.id, background: slide.canvas.background ?? 'transparent',
      children: slide.layers.map(toPolotnoElement),     // per §3.1 mapping; carries custom.* metadata
    }],
    // custom doc-level metadata survives round-trip:
    custom: { brandKitVersion: variant.brandKitVersion, locale: variant.locale, renderHintsVersion: 1 },
  };
}

// packages/render/src/polotno/fromPolotno.ts
export function fromPolotno(json: PolotnoStoreJSON, base: Variant): Variant {
  // Merge geometry/text edits back into the CANONICAL tree; restore bindings + renderHints from custom.*
  // MUST be the exact inverse of toPolotno for the golden round-trip test.
}
```

> **Golden test (P1, blocking):** `fromPolotno(toPolotno(v)) ≡ v` for a fixture set covering every layer
> type incl. `smart`, `legal`, nested `group`, and non-ASCII/German text. Any lossy field fails CI.

---

## 4. EDITING — direct manipulation + chat-to-edit + regenerate-layer

### 4.1 `LayerPatch` — the universal edit primitive (CANON §4/§7)

Chat-to-edit emits **typed `LayerPatch` diffs, never full re-rolls** (CANON §4). Per A6, drag and
regenerate also normalize into patches so there is one code path, one undo stack, one lineage trail.

> **Frozen shape (CANON §12 L6).** There is **one** `LayerPatch` schema, defined **once** in
> `packages/shared` via `docs/03` §12.2. It is doc 06's **richer op union** (below) **wrapped in** doc 03's
> **envelope** `{ id, variantId, slideId?, origin, createdBy, note?, ops: LayerPatchOp[] }`. The op union is
> **exactly** these 12 members — `setText | resize | rotate | reorderZ | setFont | setFill | addLayer |
> removeLayer | replaceAsset | setBinding | setSlideOrder | setVisible`. (The earlier generic `set`/`move`
> ops are **removed**: geometry moves are expressed via `resize`/re-anchor + `reorderZ`, and property edits
> go through the specific typed ops — `setText`/`setFont`/`setFill`/`setBinding`/`setVisible`.)
> `LayerPatchSet` is an **alias for `LayerPatch[]`**. The schema is defined ONCE in `docs/03` §12.2
> (`@brutal/shared`); this doc and `docs/05` **import** it — no redefinition (CANON §12 L6).

```ts
// LayerPatch/LayerPatchOp/LayerPatchSet + applyLayerPatch are defined ONCE (CANON §12 L6) in
// packages/shared (canonical zod: docs/03 §12.2). Import them here — do NOT redefine.
import { LayerPatch, LayerPatchOp, LayerPatchSet, applyLayerPatch } from '@brutal/shared';
export { LayerPatch, LayerPatchOp, LayerPatchSet, applyLayerPatch };

// Canonical op union (docs/03 §12.2) — EXACT field names the editor emits:
//   setText{layerId,text}            resize{layerId,x?,y?,width,height}    rotate{layerId,rotation}
//   reorderZ{layerId,toIndex}        setFont{layerId,fontFamily?,fontSize?,fontWeight?,fontStyle?}
//   setFill{layerId,fill}            addLayer{afterLayerId,layer}          removeLayer{layerId}
//   replaceAsset{layerId,assetId}    setBinding{layerId,binding,template?,fallback?}
//   setSlideOrder{order:string[]}    setVisible{layerId,visible}
// Envelope: { id, variantId, slideId?, origin:'chat'|'canvas'|'agent'|'system',
//             createdBy:'human'|'agent'|'system', note?, ops:LayerPatchOp[] } — applied atomically, in order.
// applyLayerPatch(tree, patch) is pure/isomorphic (browser optimistic + server authoritative + renderer).
// Editor edit-sources map onto the canonical `origin`: drag→'canvas'; regenerate/relayout/localize→'agent'.
```

**Atomicity & idempotency (MUST):** `ops` apply all-or-nothing; re-applying the same `patch.id` is a no-op
(dedupe by id). Server re-validates every field against the zod schema and BrandKit before persisting
(client patches are advisory; server is authoritative — mirrors the RLS trust boundary).

### 4.2 Direct manipulation (drag / resize / rotate / type)

| Gesture | Produces | Live pre-flight | Notes |
|---|---|---|---|
| Drag move | `{op:'resize'}` (x/y only) | re-run safe-zone + occlusion on drop (debounced) | position folded into `resize` per L6 (no `move` op); snap to safe-zone guides + other layers (Polotno guides). |
| Resize handle | `{op:'resize'}` (w/h ± x/y) | re-run legibility (font px vs `minFontPx`) | text layers respect `autoFit`/`maxLines`. |
| Rotate | `{op:'rotate'}` | — | disabled for `legal` (must stay upright/legible). |
| Inline text edit | `{op:'setText'}` | WCAG contrast + char-limit (headline ≤70, CANON §8) | typing streams; patch committed on blur. |
| Color swatch | `{op:'setFill'}` | palette-membership (BrandGuardian) + contrast | swatches limited to BrandKit palette by default; "custom" is a warn. |
| Font picker | `{op:'setFont'}` | legibility | fonts limited to BrandKit families (Playfair/Inter). |
| Z-reorder | `{op:'reorderZ'}` | occlusion recheck | `legal` clamped to top; `image` background clamped to bottom. |

All gestures debounce into patches (default 120 ms), apply optimistically to the local canonical tree, and
POST to `/api/editor/patch` for authoritative persist + server pre-flight.

### 4.3 Chat-to-edit (`EditorAgent` → typed `LayerPatch`)

The `EditorAgent` (CANON §7) turns a natural-language instruction + the current tree + current selection
into a **typed `LayerPatch`** (never free text, never a re-roll). Model: **Sonnet 5 default** (R7 `⚑R-LLM1`;
`docs/04` owns routing). Structured output via tool/JSON schema bound to the `LayerPatch` zod schema.

```
POST /api/editor/patch            # apps/web/src/app/api/editor/patch/route.ts
Auth: session (workspace via RLS)
Body:
{
  "variantId": "var_...",
  "slideId": "slide_...",          // optional; required for carousel per-slide
  "instruction": "make the headline shorter and gold, move the CTA up a bit",
  "selection": { "layerIds": ["lyr_headline","lyr_cta"] }   // optional focus
}
Flow:
  1. load canonical tree (RLS-scoped)
  2. EditorAgent.structured(LayerPatchSchema, { tree, selection, instruction, brandKit, locale })
  3. applyLayerPatch(tree, patch)            # server-side, authoritative
  4. runPreflight(next, brandKit)            # §6 — attach report
  5. BrandGuardian quick-check on changed layers (hard fields: palette/banned/legal)
  6. persist Variant + append AgentRun (tokens/cost) + LayerPatch to history
Response 200:
{ "patch": LayerPatch, "variant": Variant, "preflight": PreflightReport, "agentRun": {...cost} }
```

**UX:** the returned patch is shown as a **preview diff** (highlight changed layers + a one-line summary)
with **Apply / Discard**. Applying pushes onto the same undo stack as drag edits. Rejecting logs nothing to
the tree but keeps the `AgentRun` for cost accounting.

**Guardrails:**
- `EditorAgent` **cannot** invent new asset pixels — it may only reference existing `Asset`s, request a
  `regenerate` op (§4.4), or emit layer/geometry/text/style ops. Image *content* changes route to §4.4.
- If the instruction would breach BrandGuardian hard rules (banned term, off-palette on a hard field,
  removing a mandatory `legal` layer), the agent returns the closest compliant patch **plus** a `note`
  explaining the refusal; the UI surfaces it (never silently drops legal/disclaimer).
- Character limits are enforced post-generation (headline ≤70; intro visible ~150) — over-limit text is
  flagged by pre-flight, not truncated.

> `VERIFY current docs before coding` — **Anthropic** structured outputs (tool/JSON schema), model id
> `claude-sonnet-5`, escalation `claude-opus-4-8`. Bind the tool schema to `LayerPatchSchema`.
> Docs: https://platform.claude.com/docs/en/about-claude/models/overview (see `docs/04`).

### 4.4 Regenerate-single-layer (image or text) — no full re-roll

The core anti-re-roll affordance: regenerate **one** layer while every other layer stays byte-identical.

**Image layer regenerate** (`image`/`logo` backing pixels):

```
POST /api/editor/regenerate       # apps/web/src/app/api/editor/regenerate/route.ts
Body:
{
  "variantId": "var_...", "slideId": "slide_...", "layerId": "lyr_bg",
  "instruction": "same scene, warmer light, no people",   // optional imagery-only refinement
  "override": { "provider": "flux.2", "seed": 4211 }       // optional manual override (CANON §6)
}
Flow:
  1. Build GenSpec from the layer's existing lineage (prompt/negPrompt/aspect/seed) + instruction delta.
     - IMAGERY ONLY. Text is never in the prompt (the layer's text stays a vector layer).
     - aspect = slide.canvas ratio; refs = current asset (for edit/consistency, e.g. Gemini/FLUX Kontext).
  2. ProviderBus.image(job).generate|edit(spec)  -> GenerationJob (async, cached by
     (provider,model,version,prompt,seed,params) — CANON §4). Progress streamed to UI.
  3. On completion: new Asset -> emit LayerPatch {op:'replaceAsset', layerId, assetId}
  4. applyLayerPatch + re-run pre-flight (contrast under text may have changed!) + persist.
     Update Variant lineage node for this layer (provider/model/seed/prompt).
Response: { "jobId": "...", "status": "queued" }   # UI subscribes to job stream
```

**Text layer regenerate** = `Copywriter` re-draft of a single string (hook/headline/CTA/legal-safe copy),
respecting char limits + BrandKit voice, emitted as `{op:'setText'}`. Zero image credits.

**Rules:**
- Only the target layer changes; all others are frozen. This is the structural guarantee against the
  re-roll spiral (R7 §0/§1.2): identical requests hit cache and cost nothing.
- Regenerate always shows **before/after** with keep/replace; replacing pushes a `replaceAsset` patch onto
  the undo stack (fully reversible).
- Every regenerate updates the **per-layer lineage** on the Variant (CANON §5): `provider, model,
  model_version, seed, prompt, negative_prompt, parent_variant_id`, `created_by`.

---

## 5. MULTI-FORMAT SMART RE-LAYOUT (safe-zone aware) — CANON §8

**Requirement (CANON §8):** derive all LinkedIn ratios from **one base** via **smart re-layout, not naive
cropping**, respecting safe-zones (feed crop, profile overlap, "see more" fold). R7 `⚑R-LT1` supplies the
mechanism: **per-layer `renderHints`**.

### 5.1 `RenderHints` (per layer)

```ts
// packages/shared/src/renderHints.ts
export interface RenderHints {
  role?: 'background' | 'hero' | 'headline' | 'subhead' | 'cta' | 'logo' | 'legal' | 'decor' | 'body';
  anchor: Anchor;                 // where this layer 'belongs' relative to the safe box
  safeZone: boolean;              // MUST stay inside the active safe box for the target ratio
  autoFit: boolean;              // text: shrink-to-fit within box down to minFontPx
  maxLines?: number;             // text wrap cap
  minFontPx: number;             // legibility floor (never render below; legal has a hard floor)
  scaleWithCanvas?: boolean;      // images: cover/contain behavior on re-layout
  pin?: Partial<Record<'top'|'right'|'bottom'|'left'|'centerX'|'centerY', number>>; // px/%, ratio-relative
  keepAspect?: boolean;          // logos/CTAs: never distort
}

export type Anchor =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export const DEFAULT_HINTS: Record<NonNullable<RenderHints['role']>, Partial<RenderHints>> = {
  background: { anchor: 'center', safeZone: false, scaleWithCanvas: true, autoFit: false, minFontPx: 0 },
  hero:       { anchor: 'center', safeZone: false, scaleWithCanvas: true, keepAspect: true, autoFit: false, minFontPx: 0 },
  headline:   { anchor: 'top-left', safeZone: true, autoFit: true, maxLines: 3, minFontPx: 28 },
  subhead:    { anchor: 'top-left', safeZone: true, autoFit: true, maxLines: 2, minFontPx: 20 },
  body:       { anchor: 'center-left', safeZone: true, autoFit: true, maxLines: 4, minFontPx: 18 },
  cta:        { anchor: 'bottom-left', safeZone: true, autoFit: true, maxLines: 1, minFontPx: 18, keepAspect: true },
  logo:       { anchor: 'top-right', safeZone: true, keepAspect: true, autoFit: false, minFontPx: 0 },
  legal:      { anchor: 'bottom-center', safeZone: true, autoFit: false, maxLines: 3, minFontPx: 12 },
  decor:      { anchor: 'center', safeZone: false, autoFit: false, minFontPx: 0 },
};
```

### 5.2 Canonical ratios, canvases & safe boxes

| Ratio | Canvas (px) | LinkedIn use (CANON §8) | Safe-box insets (% of W×H) — `VERIFY` | Rationale |
|---|---|---|---|---|
| `1:1` | **1200×1200** | single image (default, best mobile feed) | top 6, bottom 12, left 6, right 6 | bottom inset clears "see more" fold + like/comment overlay. |
| `1.91:1` | **1200×627** | single image (landscape) | top 6, bottom 14, left 5, right 5 | short height ⇒ larger bottom fold reserve. |
| `4:5` | **960×1200** | single image (mobile-only) | top 5, bottom 14, left 6, right 6 | tall; more vertical fold overlap. |
| `1080×1080` | **1080×1080** | **carousel/document slide** (recommended) | top 8, bottom 8, left 8, right 8 | symmetric; PDF page, no feed fold on swipe pages. |
| `16:9` | **1920×1080** | video landscape | top 8, bottom 12, left 5, right 5 | captions safe zone bottom. |
| `9:16` | **1080×1920** | video vertical | top 10, bottom 16, left 6, right 6 | large caption/UI reserve. |

> `VERIFY current docs before coding` — LinkedIn's live ad-spec page for **exact px dimensions, max file
> sizes, char limits, and current feed-overlay geometry** (R7 checklist #11). Encode the safe-box insets in
> a single config table; do not scatter constants. Insets above are engineering defaults to be re-confirmed.

### 5.3 `smartRelayout()` algorithm (pure, isomorphic)

```ts
// packages/shared/src/relayout.ts
export function smartRelayout(slide: Slide, target: AspectRatio): Slide {
  const src = CANVAS[slide.canvas.ratio];         // e.g. 1:1 1200x1200
  const dst = CANVAS[target];                     // e.g. 4:5 960x1200
  const safe = SAFE_BOX[target];                  // §5.2 insets -> px rect
  const out = cloneWithCanvas(slide, dst);

  for (const layer of out.layers) {
    const h = resolveHints(layer);                // layer.renderHints ∪ DEFAULT_HINTS[role]
    if (h.role === 'background' || h.scaleWithCanvas) {
      // 1) BACKGROUND: cover-fit to full canvas, re-center focal point (never letterbox an ad bg).
      coverFit(layer, dst, focalPoint(layer));    // focal from ArtDirector or center; smart, not crop-from-topleft
      continue;
    }
    // 2) FOREGROUND: re-anchor within the target SAFE box (not the raw canvas).
    const box = h.safeZone ? safe : fullRect(dst);
    reAnchor(layer, box, h.anchor, h.pin);        // place by anchor + optional pins
    if (isText(layer)) {
      fitText(layer, box, { maxLines: h.maxLines, minFontPx: h.minFontPx, autoFit: h.autoFit });
      // if text cannot fit at minFontPx within box -> mark overflow (pre-flight fails, not silent crop)
    }
    if (h.keepAspect) preserveAspect(layer);      // logos, CTAs never distort
    clampInside(layer, box);                       // guarantee inside safe box for safeZone layers
  }
  return normalizeZ(out);                          // legal on top, background on bottom
}
```

**Guarantees (MUST):**
1. **No naive crop.** Backgrounds are **cover-fit around a focal point**; foregrounds are **re-anchored**,
   never sliced off. The word "crop" appears nowhere as a re-layout strategy for foreground layers.
2. **Safe-zone respected.** Every `safeZone:true` layer ends fully inside the target safe box. Text that
   cannot fit at `minFontPx` triggers a **pre-flight failure** (§6), not silent overflow or shrink below
   floor.
3. **`legal` floor is hard.** `legal` never renders below its `minFontPx` (12 default) regardless of box;
   if it can't fit, re-layout fails and the board shows the ratio as "needs manual adjust."
4. **Deterministic & reversible.** Re-layout is a pure function of `(slide, target)`; it produces a new
   sibling `Variant`/render, never mutates the base. The base 1:1 tree is the source of all ratios.
5. **Locale-stable.** Re-layout runs *after* localization; German strings (longer) may trigger `autoFit`
   or overflow flags that English didn't — surfaced per-locale in pre-flight.

**Focal point:** `ArtDirector`/`CompositorPlanner` may set `layer.custom.focal = {x,y}` on hero/background
(0..1 normalized). Absent, default to center. `coverFit` keeps the focal point in-frame across ratios.

### 5.4 Layout archetypes (CANON §12 L10 — the layout-diversity axis)

A `Slide`/`Variant` carries a named **`layoutArchetype`** chosen by `CompositorPlanner` (CANON §7). It is
the **4th axis of the variant matrix** (alongside angle, imagery concept, copy) so a board doesn't render
four near-identical compositions. The archetype is a preset that seeds each layer's `RenderHints`
(anchor/role/safe-zone) before `smartRelayout` runs — it is **not** a new layer type, just a starting
arrangement that the re-layout engine then adapts per ratio.

```ts
// packages/shared/src/renderHints.ts (co-located with hints; CompositorPlanner picks one per variant)
export type LayoutArchetype =
  | 'full-bleed-hero-lower-third'   // edge-to-edge image; headline/subhead/CTA banded in the lower third
  | 'split-panel'                   // image on one half, solid brand panel with copy on the other
  | 'editorial-kicker-top'          // small kicker + headline anchored top-left, image/quote below (documentary register)
  | 'quote-card';                   // large pull-quote centered on a scrim/solid, minimal imagery

export const ARCHETYPE_HINTS: Record<LayoutArchetype, Partial<Record<NonNullable<RenderHints['role']>, Partial<RenderHints>>>;
// each archetype maps roles -> anchor/safeZone overrides folded into DEFAULT_HINTS before smartRelayout.
```

- **`CompositorPlanner`** assigns one archetype per variant when it turns a concept into a layer tree, and
  should **spread archetypes across the board** for diversity.
- **`Critic`** (CANON §7) carries a `layout_homogeneity` anti-pattern: it **flags a board where ≥3 variants
  share the same archetype**, surfaced alongside the other Critic scores (see `docs/05`/`docs/07`).
- Archetypes compose with §5.1 `RenderHints` and §5.3 `smartRelayout` — the archetype sets the initial
  anchors; re-layout still enforces safe-zones, `autoFit`, and the `legal` floor per ratio.

---

## 6. LIVE PRE-FLIGHT (WCAG contrast under text, legibility, spec, brand, safe-zones)

Pre-flight runs **live in the editor** (client, optimistic, on every debounced change) and
**authoritatively on the server** (`/api/preflight`, and inside the export gate). Same pure code
(`runPreflight`) both places (A5). It is a **hard gate on export** and a **badge list in the editor**.

### 6.1 Rule set

```ts
// packages/shared/src/preflight.ts
export type Severity = 'error' | 'warn' | 'info';
export interface PreflightFinding {
  rule: PreflightRuleId; severity: Severity; layerId?: string; slideId?: string;
  message: string; measured?: number; threshold?: number; fixHint?: string;
}
export interface PreflightReport {
  ok: boolean;                     // false if any 'error'
  findings: PreflightFinding[];
  byRatio?: Record<AspectRatio, { ok: boolean; findings: PreflightFinding[] }>;
}
export type PreflightRuleId =
  | 'wcag.contrast' | 'legibility.minFont' | 'legibility.lineLength'
  | 'safezone.inside' | 'safezone.occlusion'
  | 'spec.charLimit' | 'spec.ratio' | 'spec.fileSize'
  | 'brand.palette' | 'brand.font' | 'brand.bannedTerm' | 'brand.disclaimer' | 'brand.logoClearspace'
  | 'continuity.divergence'          // deck-level: a continuity layer opted out / drifted from baseline (CANON L10)
  | 'a11y.altText';
```

| Rule | Check | Threshold | Severity |
|---|---|---|---|
| `wcag.contrast` | **Sample the actual rendered pixels under each text glyph run** (see §6.2) and compute WCAG 2.x contrast ratio of text color vs the sampled background luminance. | ≥ **4.5:1** normal text; ≥ **3:1** large text (≥24 px bold / ≥28 px regular); CTA text ≥ 4.5:1 | error < min, warn within 10% |
| `legibility.minFont` | rendered font px ≥ `renderHints.minFontPx` after autoFit | role floors (§5.1); legal ≥ 12 | error |
| `legibility.lineLength` | chars/line + line count vs `maxLines` | maxLines per role | warn |
| `safezone.inside` | every `safeZone:true` layer's bbox ⊆ safe box (per ratio) | 0 px overflow | error |
| `safezone.occlusion` | text/CTA/logo not overlapped by decor/frame; text not on busy bg without scrim | — | warn/error |
| `spec.charLimit` | headline ≤ 70; intro visible ~150 (600 max) — CANON §8 | per CANON §8 | error (>hard max), warn (>visible) |
| `spec.ratio` | canvas ∈ allowed set for `AdDocument.type` | CANON §8 | error |
| `spec.fileSize` | encoded export ≤ **5 MB** (image), ≤ **200 MB** (video) | CANON §8 | error (export-time) |
| `brand.palette` | fills/strokes ∈ BrandKit palette (hard fields) | palette set | error (hard field) / warn |
| `brand.font` | font ∈ BrandKit families (Playfair/Inter) | families | warn |
| `brand.bannedTerm` | text ∌ banned terms (BrandGuardian) | banned list | error |
| `brand.disclaimer` | mandatory `legal` disclaimer present per vertical | present | error |
| `brand.logoClearspace` | logo clear-space respected | brand rule | warn |
| `continuity.divergence` | **deck-level (carousel):** each slide's continuity layers match the deck baseline; flags "this slide only" opt-outs / drift (§9.3, CANON L10) | baseline match | warn |
| `a11y.altText` | image layers have alt text (LinkedIn accessibility) | present | info |

### 6.2 WCAG contrast **sampled under text** (not naive fg-vs-solid-bg)

The critical subtlety: text usually sits over a **generated image**, not a solid color. A single fg-vs-bg
comparison is wrong. Algorithm:

```ts
// runs against the SAME render used for export (A5): rasterize slide to an offscreen bitmap at export res
function contrastUnderText(bitmap: ImageData, textLayer: Layer): { min: number; findings: [] } {
  const boxes = glyphRunBoxes(textLayer);          // per-line rects (from layout metrics)
  let worst = Infinity;
  for (const box of boxes) {
    const bgLum = sampleMeanLuminance(bitmap, box, { grid: 8, trimAlpha: true }); // sample UNDER the text
    const fgLum = relativeLuminance(textLayer.style.fill);
    worst = Math.min(worst, contrastRatio(fgLum, bgLum));
  }
  // If a scrim/shape sits between text and image, it is already in the bitmap -> correctly measured.
  return { min: worst, findings: worst < threshold(textLayer) ? [/* error */] : [] };
}
```

**Auto-fix suggestion (never auto-applied without consent):** if `wcag.contrast` fails, pre-flight proposes
a fix patch — the canonical remedy is **insert/enlarge a `shape` scrim** (semi-opaque BrandKit-dark panel or
gradient) behind the text, or bump the text weight/size — offered as an `EditorAgent`-style `LayerPatch`
preview. This keeps text legible on busy AI imagery without re-rolling the image (the exact prior-attempt
pain).

### 6.3 Live wiring

- **Editor (client):** `runPreflight` on the local tree after each debounced patch; badges update in
  `PreflightPanel`; contrast uses a **fast preview rasterization** (`exportPreviewDataUrl`) at reduced
  resolution for interactivity, then the **server** re-checks at full export resolution (authoritative).
- **Multi-ratio:** pre-flight runs per **target ratio** (via `smartRelayout` on the fly) so a 1:1 that
  passes but whose 4:5 re-layout overflows is caught **before** export (`report.byRatio`).
- **Export gate:** `POST /api/export` refuses (`ok:false` errors) until pre-flight passes, mirroring the
  BrandGuardian hard gate + human-approve gate (CANON §7). Warns don't block; errors do.

---

## 7. SHARED HEADLESS RENDER MODEL (editor ↔ export parity)

**The load-bearing correctness property:** *what the user sees in the editor is byte-for-byte what exports.*
Because the live canvas (Polotno DOM/WebGL) and the export renderer (`polotno-node` headless Chromium) are
two engines, parity is **enforced by test**, not assumed (A5).

### 7.1 One store, two renderers, one truth

```
                       canonical Variant tree (packages/shared)  ── SINGLE SOURCE OF TRUTH
                                 │ toPolotno()
                    ┌────────────┴─────────────┐
                    ▼                           ▼
        Polotno live canvas            polotno-node headless render
        (apps/web, interactive)        (packages/render, authoritative export)
        exportPreviewDataUrl()         renderStatic() -> PNG/JPG/PDF/SVG
                    │                           │
                    └──────── GOLDEN PIXEL-DIFF PARITY TEST (7.4) ───────┘
```

Both consume **the same `toPolotno()` output** with **the same embedded fonts** (Playfair Display, Inter)
and the **same BrandKit version**. Divergence sources to eliminate: font loading/subsetting, DPR/scale,
color profile, text shaping, image scaling filter. Pin all of them (§7.3).

### 7.2 `renderStatic` skeleton (`polotno-node`)

```ts
// packages/render/src/polotno/renderStatic.ts
import { createInstance } from 'polotno-node';   // VERIFY current import/init surface

export async function renderStatic(spec: {
  // format is the `render_kind` enum (docs/03): 'png'|'jpg'|'pdf'|'svg'. PPTX is NOT a native
  // polotno-node output and is out of scope for v1 (CANON §12 L3) — LinkedIn doc/carousel ads ship as PDF.
  storeJson: PolotnoStoreJSON; format: 'png'|'jpg'|'pdf'|'svg';
  pixelRatio?: number;                            // 1 for 1200px canvases at target size
  ignoreBackground?: boolean;
}): Promise<Buffer> {
  const instance = await createInstance({ key: process.env.POLOTNO_API_KEY! });  // license key
  try {
    switch (spec.format) {
      case 'png':
      case 'jpg': return await instance.jsonToImageBase64(spec.storeJson,
                      { mimeType: spec.format === 'jpg' ? 'image/jpeg' : 'image/png',
                        pixelRatio: spec.pixelRatio ?? 1 }).then(b64ToBuffer);
      case 'pdf':  return await instance.jsonToPDFBuffer(spec.storeJson, { pixelRatio: spec.pixelRatio ?? 1 });
      case 'svg':  return await instance.jsonToSVG(spec.storeJson).then(strToBuffer);
    }
  } finally { await instance.close(); }
}
```

> `VERIFY current docs before coding` — **`polotno-node`** exact factory/method names
> (`createInstance` / `jsonToImageBase64` / `jsonToPDFBuffer` / `jsonToSVG`), Chromium bundling, concurrency
> limits, and license-key activation. **PPTX is NOT a native `polotno-node` output and is out of scope for
> v1** (CANON §12 L3): do NOT wire a PPTX case here; any post-v1 PPTX is the flagged `pptxgenjs` post-render
> step only (§8.4), never via `polotno-node`.
> Docs: https://polotno.com/docs/nodejs · https://github.com/polotno-project/polotno-node

### 7.3 Determinism pins (MUST, both renderers)

| Concern | Pin |
|---|---|
| Fonts | Embed Playfair Display + Inter as woff2 in `packages/render/assets/fonts`; register in Polotno store (`store.addFont`) AND in headless Chromium; **subset must match**. No system-font fallback. |
| Scale / DPR | `pixelRatio` derived so `canvas.width === render.width` exactly (1:1 default). |
| Color | sRGB everywhere; no ICC transforms; JPG at quality set by size loop (§8). |
| Text shaping | same layout engine (Polotno's); autoFit computed in `packages/shared` and baked into the store before render (do not rely on renderer auto-grow). |
| Image scaling | high-quality resample; pre-scale assets to canvas to avoid renderer-specific filters. |
| Locale | render the resolved `smart`/localized strings; never a binding token in pixels. |

### 7.4 Parity test (P1, blocking CI)

```ts
// packages/render/src/parity/goldenDiff.test.ts
test.each(FIXTURE_TREES)('editor preview == headless export (%s)', async (name, variant) => {
  const store = toPolotno(variant);
  const previewPng = await renderPreviewViaHeadlessChromePolotno(store);  // mimics client canvas path
  const exportPng  = await renderStatic({ storeJson: store, format: 'png' });
  const diff = pixelmatch(previewPng, exportPng, { threshold: 0.02 });     // ≤2% AA tolerance
  expect(diff.mismatchRatio).toBeLessThan(0.005);                          // <0.5% pixels differ
});
```

Fixtures MUST include: German text (umlauts/long words), a `legal` disclaimer, a `smart` bound value, a CTA
group, a scrim-under-text contrast case, and all six ratios.

---

## 8. EXPORT

Single facade; format-specific encoders; every export re-runs pre-flight (server, authoritative) and the
human-approve gate before producing a downloadable `Render` (CANON §7).

### 8.0 `packages/render/src/index.ts` — the public facade (frozen, CANON §12 L5)

`packages/render` exposes **exactly one** public entry point — `renderDocument(spec)` — plus its
result/spec types. Everything else (`renderStatic`, `renderPdf`, `renderVideoLocal`,
`encodeImageUnder5MB`, `toPolotno`/`fromPolotno`, `smartRelayout`) is an **internal** of the package and
is dispatched to *from inside* `renderDocument`. The orchestrator (`docs/02`) and the agent studio
(`docs/05`) call `renderDocument(...)` and **never** `renderStatic`/`renderTree` directly. This is the
single seam other packages depend on; internal signatures are owned by this doc (§7.2, §8.1, §8.2, §10.4).

```ts
// packages/render/src/index.ts  — THE ONLY public surface of packages/render (CANON §12 L5)

// ---- public facade (the one entry the orchestrator calls) ----
export async function renderDocument(spec: RenderSpec): Promise<RenderResult>;

// ---- public types the facade traffics in ----
export type RenderSpec = {
  variant: Variant;                              // canonical tree (source of truth)
  // static formats = `render_kind` (docs/03) 'png'|'jpg'|'pdf'|'svg' + video 'mp4'.
  // PPTX is out of scope for v1 (CANON §12 L3) — deliberately absent; doc/carousel ads ship as PDF.
  format: 'png' | 'jpg' | 'pdf' | 'svg' | 'mp4';
  ratios?: AspectRatio[];                        // static: which ratios to emit (re-layout each from base)
  locale?: 'de' | 'en';                          // default = variant.locale
  pixelRatio?: number;                           // default derived so canvas.width === render.width (1:1)
};
export type RenderResult = {
  renders: Array<{
    ratio: AspectRatio; format: RenderSpec['format'];
    buffer: Buffer; bytes: number; width: number; height: number; sha256: string;
  }>;
};

// ---- NAMED INTERNALS (exported for tests/other render code ONLY; not part of the app contract) ----
// renderDocument dispatches to these by format; callers outside packages/render must not import them.
export { renderStatic } from './polotno/renderStatic';         // png/jpg/pdf/svg via polotno-node (§7.2)
export { renderPdf } from './export/documentAd';               // multi-page document-ad PDF (§8.2)
export { renderVideoLocal } from './remotion/renderVideo';     // Remotion MP4 path (§10.4)
export { encodeImageUnder5MB } from './export/encodeImage';    // ≤5 MB image size-target loop (§8.1)
```

> **Dispatch (inside `renderDocument`):** `png|jpg` → `smartRelayout` per ratio → `encodeImageUnder5MB`
> (which calls `renderStatic`); `pdf` (carousel/document ad) → `renderPdf`; `svg` → `renderStatic svg`;
> `mp4` → `renderVideoLocal`. There is **no `pptx` dispatch** — PPTX is out of scope for v1 (CANON §12 L3);
> doc/carousel ads ship as PDF. `renderPdf` is the canonical name for the document-ad PDF entry
> (`exportDocumentPdf` in `documentAd.ts` is re-exported under this name). `docs/02`/`docs/05` must match
> this facade name exactly.

```
POST /api/export                  # apps/web/src/app/api/export/route.ts
Body:
{
  "variantId": "var_...",
  "format": "jpg" | "png" | "pdf" | "svg" | "mp4",   // PPTX out of scope v1 (CANON §12 L3) — doc ads ship as PDF
  "ratios": ["1:1","1.91:1","4:5"],   // static: which ratios (re-layout each from base)
  "locale": "de"                       // optional; default variant locale
}
Flow:
  1. load Variant (RLS) -> for each ratio: smartRelayout(base, ratio)
  2. runPreflight(each) -> if any error: 422 with PreflightReport (blocked)
  3. require human-approve flag on Variant (CANON §7) else 403
  4. dispatch Render job(s) (pgmq default — R7 ⚑R-INFRA1) -> packages/render
  5. persist Render rows (url, bytes, ratio, format, sha) + lineage
Response 202: { "renders": [{ "ratio":"1:1","status":"queued","jobId":"..." }, ...] }
```

### 8.1 JPG / PNG ≤ 5 MB (CANON §8)

```ts
// packages/render/src/export/encodeImage.ts
export async function encodeImageUnder5MB(store: PolotnoStoreJSON, fmt: 'jpg'|'png'): Promise<Buffer> {
  const MAX = 5 * 1024 * 1024;
  if (fmt === 'png') {
    let buf = await renderStatic({ storeJson: store, format: 'png' });
    if (buf.length <= MAX) return buf;
    buf = await pngquant(buf, { quality: [0.7, 0.95] });        // lossy-palette compress, keep PNG
    if (buf.length <= MAX) return buf;
    return encodeImageUnder5MB(store, 'jpg');                    // fall back to JPG for photographic ads
  }
  // JPG: binary-search quality to land just under 5MB
  let lo = 60, hi = 95, best: Buffer | null = null;
  for (let i = 0; i < 6; i++) {
    const q = (lo + hi) >> 1;
    const buf = await renderStatic({ storeJson: store, format: 'jpg', /* quality:q via mozjpeg */ });
    if (buf.length <= MAX) { best = buf; lo = q + 1; } else { hi = q - 1; }
  }
  if (!best) throw new ExportError('cannot_hit_5mb');            // surfaced gracefully (never raw)
  return best;                                                   // probeSize() double-checks (§8.5)
}
```

- **Default format policy:** PNG for flat/vector-heavy ads (crisp text edges); **JPG (mozjpeg)** for
  photographic backgrounds (hits ≤5 MB far easier). 1200×1200 photographic JPG ≈ well under 5 MB.
- 1:1 → 1200×1200; 1.91:1 → 1200×627; 4:5 → 960×1200 (CANON §8).

> `VERIFY current docs before coding` — encoder choice: `sharp`/`mozjpeg`/`pngquant` availability inside
> the `polotno-node` runtime; whether `polotno-node` exposes JPEG quality directly (if so, skip the extra
> re-encode). Confirm LinkedIn's current 5 MB cap and any GIF path.

### 8.2 PDF document ads (carousel) — CANON §8

Carousel/document ads are **multi-page PDFs** (up to ~10–12 slides), 1080×1080 recommended, hook→reframe→
close narrative preserved slide order.

```ts
// packages/render/src/export/documentAd.ts
export async function exportDocumentPdf(variant: Variant): Promise<Buffer> {
  assert(variant.type === 'carousel');
  const pages = variant.slides                                 // ORDERED (§9)
    .map(s => toPolotno(variant, s.id));                        // one Polotno page per slide
  // polotno-node: multi-page store -> single PDF (native), preserving order + fonts
  return renderStatic({ storeJson: mergePages(pages), format: 'pdf', pixelRatio: 1 });
}
```

- Each slide re-laid to **1080×1080** via `smartRelayout` if authored at another ratio.
- Page order = `Slide.order` (§9). Continuity assets (recurring logo/frame/progress dots) render on every
  page.
- PDF is the LinkedIn document-ad delivery format; file-size and page-count checked in pre-flight.

### 8.3 PPTX — OUT OF SCOPE for v1 (CANON §12 L3)

**PDF is the SOLE v1 document-ad format.** PPTX is **NOT** a native `polotno-node` output and is **out of
scope for v1** (CANON §12 L3): LinkedIn document/carousel ads ship as **PDF** (§8.2). There is **no**
`exportDocumentPptx` function and **no** `pptx` render path in v1 — the render pipeline never produces PPTX
via `polotno-node`.

> Note: LinkedIn *accepts* PPT/PPTX uploads as document-ad source files — that is a true fact about the
> platform. It does **not** mean our render must emit PPTX. In v1 we export PDF (LinkedIn's document-ad
> delivery format) and stop there.

### 8.4 PPTX post-v1 fallback (flagged; never via `polotno-node`)

> `⚑ RECOMMENDATION (R-EXP1) — OUT OF SCOPE v1.` PPTX export is **not** shipped in v1. **If** it is ever
> resurrected post-v1, it is built **only** as a `pptxgenjs` **POST-render** step — **never** via
> `polotno-node` (which does not natively emit PPTX): render each slide to a full-bleed PNG
> (`renderStatic png`) and place it as a background-filling image on a 1080×1080 slide, OR reconstruct
> native text boxes from the layer tree for editability. Prefer the PNG-per-slide route for pixel parity;
> offer native-text reconstruction as a "make editable" option. This entire path is gated behind an
> explicit post-v1 decision and is out of scope for the v1 build.

### 8.5 Size probe (all formats)

```ts
// packages/render/src/export/probeSize.ts — final gate before marking Render complete
export function assertUnderLimit(buf: Buffer, kind: 'image'|'video'): void {
  const MAX = kind === 'image' ? 5 * 2**20 : 200 * 2**20;       // CANON §8
  if (buf.length > MAX) throw new ExportError(`over_limit_${kind}`);   // triggers re-encode/higher crf
}
```

### 8.6 MP4 (video) — delegates to the Remotion path (§10)

Video export is the Remotion `renderMedia` / `renderMediaOnLambda` path (§10), then `assertUnderLimit(buf,
'video')` (≤200 MB, CANON §8) with a crf/preset re-encode loop on overflow (R2 §6).

---

## 9. CAROUSEL / DOCUMENT BUILDER (ordered slides, continuity, reorder, per-slide edit)

CANON §5: carousel `AdDocument` = ordered `Slide[]`, **each slide has its own layer tree**. The builder is
the same static Polotno canvas (§4) plus a **slide strip** for order/continuity, driven by
`CarouselArchitect` (CANON §7: hook→reframe→close narrative, continuity across slides).

### 9.1 Data shape (canonical — coordinate with `docs/03`)

```ts
interface Slide {
  id: string;
  order: number;                 // 0-based, dense, unique within variant
  canvas: { ratio: '1:1'; width: 1080; height: 1080; background?: string };  // doc-ad default
  layers: Layer[];               // own layer tree
  role?: 'hook' | 'reframe' | 'close' | 'body';   // narrative role (CarouselArchitect)
  layoutArchetype?: LayoutArchetype;              // named composition preset (§5.4; CompositorPlanner, CANON L10)
  continuityRefs?: string[];     // ids of shared/continuity layers (logo, progress dots, frame)
}
// Variant.slides: Slide[] (present only when AdDocument.type === 'carousel')
```

### 9.2 Builder operations

| Op | Endpoint / patch | Behavior |
|---|---|---|
| **Add slide** | `{op:'addLayer'}`-style at slide level; new `Slide` appended | inherits continuity layers (logo/frame/progress) + BrandKit; role defaults to `body`. |
| **Duplicate slide** | clone `Slide` (new ids), `order+1` | fast variant of a working slide. |
| **Reorder** | `{op:'setSlideOrder', order:[ids]}` | drag in slide strip; re-densifies `order`; progress dots/continuity recompute. |
| **Delete slide** | remove `Slide` | blocked if it's the only slide; re-densify order. |
| **Per-slide edit** | full §4 editor scoped to `slideId` | select a slide → same canvas, drag/chat/regenerate on that slide's tree only. |
| **Regenerate slide imagery** | §4.4 scoped to slide | one slide's background/hero, others frozen. |
| **Edit continuity layer** | patch fan-out over `continuityRefs` | **defaults to PROPAGATE across all slides** (CANON §12 L10) — edit the logo/frame/progress once → applied to every slide; a **"this slide only"** toggle opts out and scopes the patch to the current `slideId`. |

### 9.3 Continuity (the prior-pain fix)

The prior attempt art-directed every slide independently → visual drift. Continuity mechanisms:

1. **Continuity layers** (`continuityRefs`): logo, frame, brand color band, progress indicator — authored
   once, rendered on every slide. **Editing a continuity layer defaults to PROPAGATE across every slide**
   (CANON §12 L10): the patch fans out over `continuityRefs` on all slides in one undo step. A **"this
   slide only"** opt-out toggle in the edit affordance scopes the patch to the current `slideId` instead,
   after which that slide's copy of the layer is tracked as **diverged** from the deck baseline.
2. **Palette + type locked** to the BrandKit version pinned on the Variant (BrandGuardian gate per slide).
3. **`CarouselArchitect` narrative continuity**: hook→reframe→close copy coherence + visual motif
   consistency (recurring focal treatment, consistent scrim style for text). Continuity is scored by
   `Critic` (CANON §7) and surfaced in pre-flight as a `warn` when a slide breaks the motif.
4. **Cross-slide re-layout**: `smartRelayout` applied uniformly so all slides share the same safe box and
   anchor grid → the deck reads as one document, not 10 posters.
5. **Deck-level divergence warn** (CANON §12 L10): a **deck-level pre-flight** pass compares each slide's
   continuity layers against the deck baseline and emits a `warn` (`continuity.divergence`) listing any
   slide whose continuity layer was opted out / drifted — so a "this slide only" edit that unintentionally
   breaks the through-line is surfaced before export, never silent.

### 9.4 Per-slide pre-flight + export

Pre-flight (§6) runs per slide **and** deck-level (page count ≤ ~10–12, total PDF size, continuity warns).
Export → §8.2 multi-page **PDF** (the sole v1 document-ad format; PPTX out of scope v1 — §8.3), page order = `Slide.order`.

---

## 10. REMOTION VIDEO EDITOR (`AdDocument.type = 'video'`) — CANON §5, R2 §5

Video is a **first-class fast-follow** (CANON §0; R7 phase P9). The canonical video payload is a **Remotion
composition spec + layer/subtitle/audio tracks** (CANON §5). Same load-bearing rule: **brand text is a
composited React/HTML layer, never baked into the model clip** (R2 §5.1).

### 10.1 Canonical video document → Remotion inputProps

```ts
interface VideoDocument {              // Variant when AdDocument.type==='video'
  fps: 30; durationInFrames: number; width: number; height: number;  // ratio-derived (§5.2)
  tracks: {
    clips: Array<{ assetId: string; from: number; durationInFrames: number; fit: 'cover'|'contain'; focal?: XY }>;
    audio: Array<{ assetId: string; kind: 'vo'|'music'|'sfx'; from: number; volume: number }>;
    subtitles: Caption[];              // @remotion/captions Caption[] (word-level; §10.3)
    brandLayers: Layer[];              // canonical layers (cta/logo/legal/text/shape) as overlays
  };
  composition: 'BrutalAd';             // Remotion <Composition id>
}
```

### 10.2 Composition skeleton

```tsx
// packages/render/src/remotion/BrutalAd.tsx
import { AbsoluteFill, Sequence, OffthreadVideo, Audio, useVideoConfig } from 'remotion';
import { createTikTokStyleCaptions } from '@remotion/captions';  // VERIFY current API

export const BrutalAd: React.FC<{ doc: VideoDocument; brandKit: BrandKitResolved }> = ({ doc, brandKit }) => (
  <AbsoluteFill style={{ background: '#0a0a0a' }}>
    {doc.tracks.clips.map((c, i) => (
      <Sequence key={i} from={c.from} durationInFrames={c.durationInFrames}>
        <OffthreadVideo src={assetUrl(c.assetId)} style={coverStyle(c)} />   {/* generated Kling/Veo clip */}
      </Sequence>
    ))}
    {doc.tracks.audio.map((a, i) => (
      <Audio key={i} src={assetUrl(a.assetId)} startFrom={a.from} volume={a.volume} />
    ))}
    {/* brand text layers = SAME canonical Layer components as static (cta/logo/legal/text) */}
    <BrandOverlay layers={doc.tracks.brandLayers} brandKit={brandKit} safeBox={safeBox(doc)} />
    {/* burned-in captions (muted-first) — always-on, high-contrast, safe-zone aware */}
    <BurnedCaptions pages={createTikTokStyleCaptions({ captions: doc.tracks.subtitles,
      combineTokensWithinMilliseconds: 1200 })} brandKit={brandKit} safeBox={safeBox(doc)} />
  </AbsoluteFill>
);
```

### 10.3 Timeline editor UI

- **`VideoTimeline.tsx`**: Remotion `<Player>` (scrub/preview) + a tracks panel (clips, VO, music, SFX,
  subtitles, brand overlays). Direct manipulation = trim/move clips, adjust audio volume, drag brand
  overlays (same §4 patch system on `brandLayers`), edit caption timing/text.
- **Chat-to-edit** applies to `brandLayers` and caption text via the same `EditorAgent`/`LayerPatch` path.
- **Subtitles are the story-carrier (muted-first):** best timing source = **ElevenLabs `with-timestamps`**
  word-level output → `Caption[]` directly (no Whisper needed); fallback `@remotion/install-whisper-cpp`
  (R2 §5.1). Captions are **burned in** because LinkedIn autoplays muted.
- **Localization:** `LocalizationAgent` emits TTS-safe VO strings (German numbers pre-spelled, R2 §4.4)
  **and** on-screen caption strings (numerals kept for legibility) — two representations, one timeline.

### 10.4 Video render (delegates, then size-gate)

```ts
// packages/render/src/remotion/renderVideo.ts  (R2 §5.2)
import { renderMedia, selectComposition } from '@remotion/renderer';
export async function renderVideoLocal(doc: VideoDocument): Promise<Buffer> {
  const comp = await selectComposition({ serveUrl, id: 'BrutalAd', inputProps: { doc } });
  await renderMedia({ composition: comp, serveUrl, codec: 'h264',
    outputLocation: out, inputProps: { doc }, crf: 23 });        // ↑crf ⇒ smaller; tune to ≤200MB
  const buf = readOut(out);
  return ensureUnder200MB(buf, doc);                              // re-encode higher crf if over (§8.5)
}
// Scale path: renderMediaOnLambda + getRenderProgress (R2 §5.2)
```

**Video pre-flight (export gate, CANON §8 + R2 §6):** ratio ∈ {1:1, 4:5, 16:9}; ≤200 MB; burned-in subs
present & legible in safe zones; **muted-first** (plays without audio); first-3-seconds stopping power;
BrandGuardian pass. WCAG contrast (§6.2) sampled on caption/brand-overlay frames over the underlying video
(sample representative frames, not every frame).

> `VERIFY current docs before coding` — **Remotion**: `@remotion/captions` (`createTikTokStyleCaptions`,
> native subs since v4.0.216), `renderMedia`/`renderMediaOnLambda` signatures, `OffthreadVideo` caching,
> Lambda region/memory/IAM, and the **Company License** (4+ employees, R2 §5.3). Docs:
> https://www.remotion.dev/docs — captions: /docs/captions/api — render: /docs/renderer/render-media

---

## 11. STATE, UNDO/REDO, PERSISTENCE, COLLAB

- **`useDocStore`** holds the canonical `Variant` tree + an **undo/redo stack of `LayerPatch`es** (every
  edit — drag/chat/regenerate/relayout — is a patch, A6). Undo = inverse patch; redo = re-apply.
- **Optimistic + authoritative:** client applies patch immediately; POST to `/api/editor/patch` persists +
  server-validates; on server rejection (BrandGuardian/RLS/schema) the client rolls back that patch.
- **Persistence:** the canonical tree is the stored artifact (Supabase; `Variant.layer_tree` JSON, RLS by
  `workspace_id`). Polotno JSON is **never** persisted as source of truth — regenerated on demand via
  `toPolotno()`.
- **Autosave:** debounced patch stream; `Render`s are immutable outputs with their own rows + lineage.
- **Lineage on every mutation** (CANON §5): patches carry `createdBy` (`human|agent`), regenerate updates
  per-layer provider/model/seed/prompt; the Variant's `parent_variant_id` set on fork.
- `⚑ RECOMMENDATION (R-ED2)`: model collab/versioning as an **append-only patch log** per Variant (event
  sourcing). Enables real-time multi-user later, precise "who changed what," and trivially correct
  undo/redo. Not required for MLP; the patch-first architecture makes it a non-breaking add.

---

## 12. END-TO-END EDIT FLOW (sequence)

```
User drags headline / types "make CTA gold, move logo top-right"
      │
      ├─ DRAG  ─► Polotno gesture ─► intercept ─► LayerPatch{move|resize|setText}
      │                                   │
      └─ CHAT  ─► POST /api/editor/patch ─► EditorAgent.structured(LayerPatchSchema) ─► LayerPatch
                                          │
                          applyLayerPatch(canonicalTree, patch)   (packages/shared, isomorphic)
                                          │
                          runPreflight(tree, brandKit) per ratio  (WCAG-under-text, safe-zone, spec, brand)
                                          │
                 ┌────────────────────────┼────────────────────────┐
                 ▼                        ▼                         ▼
         PreflightPanel badges     toPolotno() re-project    persist Variant + patch-log + AgentRun cost
                 │                  (live canvas updates)     (Supabase, RLS)
                 ▼
         (errors block export; warns advise)
                 │  human clicks Export
                 ▼
         POST /api/export ─► smartRelayout(base, ratio)×N ─► runPreflight (authoritative) ─► human-approve gate
                 │
                 ▼
         packages/render: renderStatic()/encodeImageUnder5MB()/documentAd()/renderVideo()
                 │
                 ▼
         Render rows (url, bytes≤5MB img / ≤200MB video, ratio, format, sha, lineage) ─► download / ship
```

---

## 13. ACCEPTANCE CRITERIA (per build phase)

| Phase | Must pass |
|---|---|
| **P1 render spine** | Hand-authored canonical tree → `toPolotno` → `renderStatic png` produces a **pixel-correct 1200×1200** ad with embedded Playfair/Inter; `fromPolotno(toPolotno(v))≡v` golden test green; **parity test** (§7.4) < 0.5% diff. |
| **P4 editor** | Drag move/resize/type any layer; **chat** "make headline shorter and gold" → `LayerPatch` preview → apply, **no image credits spent**; undo/redo across drag+chat; regenerate one image layer leaves all others byte-identical. |
| **P5 export** | One base → spec-valid **1:1 / 1.91:1 / 4:5** via smart re-layout (no crop, safe-zones honored); every export **≤5 MB**; pre-flight blocks a contrast-failing ad until fixed. |
| **P7 carousel** | Build ordered `Slide[]`, reorder in strip, per-slide edit, continuity logo apply-to-all; export **multi-page PDF** in slide order 1080×1080. |
| **P9 video** | Kling clip + ElevenLabs VO + burned-in DE captions + brand overlay → **MP4 h264 ≤200 MB**, muted-first, first-3-s stopping power; WCAG contrast on caption frames passes. |

---

## 14. CONSOLIDATED "VERIFY BEFORE CODING"

1. **Polotno SDK** mount/store/event/custom-element/font APIs + `POLOTNO_API_KEY` license activation.
2. **`polotno-node`** factory + `jsonToImageBase64`/`jsonToPDFBuffer`/`jsonToSVG`, Chromium bundling,
   concurrency. (**No PPTX** — out of scope v1 per CANON §12 L3; doc/carousel ads ship as PDF.)
3. **Image encoders** (`sharp`/`mozjpeg`/`pngquant`) inside the render runtime; whether `polotno-node`
   exposes JPEG quality directly (skip re-encode if so).
4. **Anthropic** structured outputs bound to `LayerPatchSchema`; `claude-sonnet-5` default / `claude-opus-4-8`
   escalation (`docs/04`).
5. **Remotion**: `@remotion/captions` (`createTikTokStyleCaptions`, native subs ≥ v4.0.216),
   `renderMedia`/`renderMediaOnLambda`, `OffthreadVideo` cache, Lambda IAM, **Company License** (4+ emp.).
6. **ElevenLabs** `with-timestamps` word-level output shape (for caption timing); DE number pre-spelling
   (R2 §4.4).
7. **LinkedIn 2026 ad specs** — exact px, ≤5 MB / ≤200 MB, char limits (≤70 headline), safe-zone/fold
   geometry, document-ad page count — re-confirm CANON §8 at ship time (R7 checklist #11).
8. **WCAG** 2.x thresholds (4.5:1 / 3:1) still current for the a11y bar you commit to.

---

## 15. RECOMMENDATIONS SUMMARY (all additive / flagged — nothing silently diverges)

| # | Recommendation | Impact | Conflicts with CANON? |
|---|---|---|---|
| ⚑R-ED1 | Route ALL edits (drag/chat/regenerate/relayout) through `applyLayerPatch` on the canonical tree, then re-project to Polotno | One undo stack, one source of truth, clean lineage | No — implements CANON §4 LayerPatch + §4 EditorAdapter swappability |
| ⚑R-ED2 | Model versioning/collab as an append-only patch log (event sourcing) per Variant | Real-time collab later, exact audit, correct undo | No — additive, MLP-optional |
| ⚑R-EXP1 | **OUT OF SCOPE v1** (CANON §12 L3): PDF is the sole v1 document-ad format. If PPTX is ever resurrected post-v1, it is a `pptxgenjs` **post-render** step only (PNG-per-slide or native text) — never via `polotno-node` | Post-v1 only; no PPTX in v1 | No — v1 ships PDF; PPTX deferred/flagged |
| ⚑R-ENV1 (echo R7) | Add `POLOTNO_API_KEY` to canonical env list (`docs/11`) | Avoids runtime/legal blocker | Minor — fills CANON §10 omission |
| ⚑R-LT1 (echo R7) | Per-layer `renderHints` for deterministic multi-ratio re-layout | Fulfills CANON §8 "smart re-layout, not crop" | No — additive field |
```


<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: docs/07-creative-playbook-linkedin.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

# 07 — LinkedIn Creative Playbook — Brutal Ads

> ⚠️ **CROSS-REFERENCE NOTE — read first (authoritative, per CANON §12 L1).** Some inline `docs/NN` / `doc NN` pointers in this file predate the frozen document map and may cite the wrong number. **Resolve every cross-reference by ROLE using this map, not by the integer written inline:** `01` product · `02` architecture · `03` data-model (all DDL/zod/schemas) · `04` providers · `05` agent-studio · `06` editor + `packages/render` + export · `07` creative-playbook · `08` engagement · `09` brand-kit · `10` build-plan · `11` env · `12` security/ops · `13` acceptance · `14` appendix. There is **no localization doc** (localization lives in `05` LocalizationAgent + `09` brand-kit `localization` + `07`) and **no "exporter" doc** (export lives in `06`). Source paths are `apps/web/src/**` (never `apps/web/lib/**`). Where anything here disagrees with CANON §12, **the ledger wins.**

> **Read `handoff/CANON.md` first.** This document is subordinate to CANON. Every object-model
> name, provider interface, agent name, env var, repo path, and LinkedIn format spec used here is
> canonical (CANON §5–§10). Where research or craft suggests a change, it is written as a clearly-labelled
> **⚑ RECOMMENDATION** and never silently diverges. Every external API carries a
> **`VERIFY current docs before coding`** note. Every assumption is flagged **⚑ ASSUMPTION**.
>
> **Audience:** an autonomous AI build factory with **zero outside context**. This is doc 07 of ~15.
>
> **Scope of this doc:** the **canonical creative rules the Creative Studio agents encode** — the format
> specs the exporter enforces, the conversion hierarchy every layout obeys, the hook/angle libraries the
> `Copywriter`/`Strategist` draw from, the carousel narrative structure the `CarouselArchitect` builds, the
> **variant matrix doctrine** that decides *what set of ads a brief becomes*, directional benchmarks (all
> flagged), the muted-first video rules, the anti-patterns the platform **structurally prevents**, and
> policy/compliance. **Written to be pasted verbatim into agent system prompts** (see §12 for the ready-made
> prompt blocks).
>
> **This doc is authoritative for:** *creative doctrine* — the rules agents apply. It is **not** authoritative
> for mechanisms owned elsewhere: object model → doc 03; agents' orchestration → doc 05; providers → doc 04;
> editor → doc 06; exporter render mechanics → doc 06/`packages/render`; engagement scoring →
> doc 08; localization → doc 05 (`LocalizationAgent`) + doc 09 (BrandKit `localization`) + §9 here. When this
> doc says "the exporter enforces X," doc 06 is authoritative for *how*; this doc is authoritative for *what
> the rule is*.

---

## 0. TL;DR (read this first)

1. **One load-bearing rule governs every creative decision (CANON §2):** *AI generates imagery only; every
   legible/on-brand element — headline, subhead, logo, CTA, legal, price, slide copy — is a **composited,
   editable vector/text `Layer`**, never baked into pixels.* Every rule below is downstream of this.
2. **The conversion hierarchy (§2) is the spine.** Stop the scroll → earn the second look → make the value
   legible in one glance → make the ask obvious. Agents optimize in that order. `Critic` and
   `EngagementAnalyst` score against it.
3. **A brief does not become one ad. It becomes a *matrix* (§5).** The **variant matrix doctrine** defines
   the canonical spread: **angle × hook-family × visual-concept**, deduplicated, producing the **4–6 ranked
   `Variant`s** the board shows. This is *structured diversity*, not random re-rolls.
4. **Specificity beats cleverness (CANON §7).** The `Copywriter` prefers a concrete number, named audience,
   or dated proof over a pun. Vague > clever is a bug.
5. **Muted-first is a hard constraint for video (CANON §8, R2 §5).** LinkedIn autoplays muted; **burned-in
   subtitles carry the story**; the **first 3 seconds** must earn the watch with **zero audio**.
6. **The platform *prevents* the classic LinkedIn-ad failure modes (§8)** rather than merely discouraging
   them — baked text, cropped headlines, missing disclaimers, and off-brand palettes are made *structurally
   impossible* by the layer tree + `BrandGuardian` hard gate + smart re-layout, not left to a human to
   remember.
7. **Every benchmark number in this doc is DIRECTIONAL and flagged (§6).** No benchmark is a promise. Real
   calibration comes only from the tenant's own LinkedIn `Result`s (CANON §9; doc 08).

> **Grounding research (whole-doc scope).** This document is grounded in **`R3-linkedin-playbook.md`**
> (`handoff/research/R3-linkedin-playbook.md` — the performance-CMO-grade 2026 LinkedIn creative
> playbook), alongside **R2/R4/R7** where they touch creative. **Every LinkedIn format fact is grounded in
> CANON §8** (the locked 2026 LinkedIn spec) and cross-checked against R3 §2. Creative craft (conversion
> hierarchy, hook/angle libraries, carousel structure, variant matrix, anti-patterns) is derived from
> **CANON §0–§2, §7–§9**, **R3 §3–§6**, and the client context. **All performance numbers (§6) are
> DIRECTIONAL priors** — labelled as such and **calibrated against the tenant's real LinkedIn `Result`s**
> (R3 §7; CANON §9; doc 08 §7); they are R3-sourced directional priors, not promises. Where R3 and any other
> doc disagree, **CANON §12 + R3 win** (R3 conforms to the ledger L1–L12). Nothing here contradicts CANON §8.

---

## 1. Canonical format specs (the exporter and agents enforce these — CANON §8)

These are the **only** creative dimensions the platform ships. All are lifted verbatim from CANON §8; the
platform **derives every ratio from one base via smart re-layout, never naive cropping**, respecting
safe-zones (CANON §8; R7 ⚑R-LT1). Copy limits are enforced by the `Copywriter` (author-time) **and** the
exporter (ship-time gate).

### 1.1 Single-image ad (`AdDocument.type = 'single_image'`)

| Field | Value | Enforced by | Notes |
|---|---|---|---|
| **Base ratio (default)** | **1:1 → 1200×1200 px** | exporter (base), `CompositorPlanner` | Best mobile feed. All other ratios re-layout from this base. |
| Ratio | **1.91:1 → 1200×627 px** | exporter (re-layout) | Desktop / landscape link-style. |
| Ratio | **4:5 → 960×1200 px** | exporter (re-layout) | **Mobile-only** placement. |
| File type | **JPG / PNG / GIF** | exporter | |
| File size | **≤ 5 MB** | exporter (ship-time gate) | Re-encode/compress if over before marking `Render` complete. |
| **Headline** | **≤ 70 characters** | `Copywriter` + exporter | Hard cap. Truncation at ship = bug. |
| **Intro text ("primary text")** | **~150 chars visible before "see more"; 600 chars max** | `Copywriter` | Front-load the hook into the first ~150 chars (the visible fold). |

### 1.2 Carousel / document ad (`AdDocument.type = 'carousel'`)

| Field | Value | Enforced by | Notes |
|---|---|---|---|
| Pages | **multi-page, up to ~10–12 slides** | `CarouselArchitect` | Ordered `Slide[]`, each with its own layer tree (CANON §5). |
| **Canvas (recommended)** | **square 1080×1080 px** | `CompositorPlanner`, exporter | Per-slide layer tree renders at this canvas. |
| Delivery | **PDF document ad** (multi-page) | exporter (`packages/render` PDF) | PPTX is a later add (doc 01 F21). |
| Narrative | **per-slide hook → reframe → close** | `CarouselArchitect` | The canonical structure (§4). |
| Scoring | **per-slide** `stoppingPower` / `ctaAttention` (`perSlide[]`) | `EngagementAnalyst` (doc 08) | Slide 1 must have the **highest** `stoppingPower`; dip detection between slides (R4 §5.4). |

### 1.3 Video ad (`AdDocument.type = 'video'`) — first-class fast-follow

| Field | Value | Enforced by | Notes |
|---|---|---|---|
| Ratios | **1:1 or 4:5 or 16:9** | exporter (re-layout) | 9:16 is *not* a LinkedIn feed target here (CANON §8 lists 1:1/4:5/16:9). |
| **File size** | **≤ 200 MB** (client's proven paid limit) | exporter spec-check (`probeFileSize()`) | Re-encode at higher `crf` if over (R2 §6). |
| **Audio** | **muted-first**; burned-in subtitles carry the story; sound-on optional | Remotion assembly (§7) | LinkedIn autoplays muted (R2 §5). |
| **Opening** | **first 3 seconds carry stopping power** | `Strategist`/`Copywriter` storyboard; `EngagementAnalyst` scores `firstThreeSeconds` | Hard design constraint (CANON §8; §7 here). |

> **VERIFY current docs before coding** — **LinkedIn ad specs drift.** Before implementing the exporter,
> re-confirm on LinkedIn's current official spec pages (Campaign Manager help + Marketing Solutions ad-specs):
> (a) exact pixel sizes and byte limits per placement; (b) whether 4:5 remains mobile-only; (c) headline /
> intro / character limits per ad format (single image vs document vs video); (d) video codec/container
> requirements and the current max file size for *paid* video; (e) document-ad page count ceiling. **CANON §8
> is the locked internal contract; the LinkedIn live docs are the external ground truth. If they diverge,
> raise it as ⚑ RECOMMENDATION — do not silently change CANON §8's numbers.**

---

## 2. The conversion hierarchy (the creative spine every layout obeys)

Every ad — static, carousel slide, or video frame — is optimized against this **ordered** hierarchy. Higher
tiers dominate: a beautiful ad that fails Tier 1 is a failed ad. `Critic` scores in this order;
`CompositorPlanner` lays out in this order; `EngagementAnalyst` maps its scores (from doc 08) onto these
tiers.

| Tier | Job of the ad | The creative question | Primary `EngagementScores` signal (CANON §6 / doc 08) | Owned by |
|---|---|---|---|---|
| **T1 — STOP** | Stop the thumb in a muted, fast feed | *Would this survive a 0.5 s glance?* | `stoppingPower`, `focalClarity` | `ArtDirector` (imagery), slide-1 / first-3s |
| **T2 — HOOK** | Earn the second look / the "see more" tap / the swipe | *Does the first line create a curiosity or stakes gap?* | intro-text hook; slide-1 headline; `firstThreeSeconds` (video) | `Copywriter`, `CarouselArchitect` |
| **T3 — VALUE** | Make the single value proposition legible in one glance | *Can a scanner get the promise without reading everything?* | `valuePropAttention`, `clutter` (lower = better) | `Copywriter` + `CompositorPlanner` |
| **T4 — PROOF** | Make the claim believable (number, name, source, logo) | *Why should they believe it?* | `focalClarity` on proof element | `Strategist` (proof), `Copywriter` |
| **T5 — ACT** | Make the ask unmistakable and low-friction | *Is the next step obvious and singular?* | `ctaAttention` | `Copywriter` (CTA), `CompositorPlanner` (`cta` layer placement) |

**Rules that fall out of the hierarchy (agents MUST apply):**

- **R-CH1 — One idea per ad.** Exactly **one** value proposition (T3) and exactly **one** primary CTA (T5)
  per `Variant`. Two asks = zero asks. Enforced by `Critic` (anti-pattern §8 AP-07).
- **R-CH2 — Front-load everything.** The hook (T2) lives in the **first ~150 chars** of intro text and in
  the **top-left-to-center** of the visual (the reading path). Never bury the promise below the "see more"
  fold or outside the feed-crop safe zone.
- **R-CH3 — Glance test before beauty.** `CompositorPlanner` must pass a "5-word / 0.5-second" glance check:
  the value + brand must read at thumbnail size before any decorative refinement. This is why `stoppingPower`
  and `focalClarity` (T1) outrank `valuePropAttention` (T3) in ranking weight.
- **R-CH4 — CTA is a first-class `cta` layer**, never body text. `ctaAttention` (T5) is only measurable
  because the CTA has its own layer bbox (doc 08 §5.3 — "our killer feature vs pixel-only vendors").
- **R-CH5 — Proof is specific or absent.** A vague proof ("trusted by many") is worse than none; the
  `Strategist` must supply a concrete proof token (count, named client, date, %, source) or the ad drops to a
  no-proof template. Ties to specificity>cleverness (§3).

> **⚑ ASSUMPTION — hierarchy naming.** The five-tier STOP→HOOK→VALUE→PROOF→ACT ladder is a synthesis of the
> conversion craft in **R3 §3** (the 1.7-second thumb-stop, hook doctrine, one-idea/one-CTA, proof-beats-promise,
> offer↔funnel matching), CANON's north star ("stop the scroll → get a testable ad"), and the
> `EngagementScores` field set (CANON §6). It is a *doctrine*, not a CANON-locked structure, and is consistent
> with R3 §3. Downstream docs should reference tiers by T1–T5.

---

## 3. Hook & angle libraries (what `Strategist` and `Copywriter` draw from)

These are **libraries the agents select from and adapt** — not a fixed menu to paste literally. The
`Strategist` picks **angles** (the strategic frame); the `Copywriter` writes **hooks** (the specific opening
line) within the chosen angle. **Specificity > cleverness is the overriding rule (CANON §7):** a concrete
number, named audience, or dated fact beats a clever turn of phrase every time.

### 3.1 Angle library (strategic frames — `Strategist` selects)

Each angle is a strategic lens on the same offer. The variant matrix (§5) spreads a brief across **distinct**
angles so the board isn't five paraphrases of one idea.

| ID | Angle | The frame | Best when | Example shape (fill from `Brief`) |
|---|---|---|---|---|
| **A1** | **Pain / cost-of-inaction** | Name the expensive status quo | Audience feels a recurring, quantifiable pain | "Every {task} your team does by hand costs {N} hours a week." |
| **A2** | **Contrarian / reframe** | Challenge a widely-held belief | Category is full of lookalike claims | "{Common practice} is why {bad outcome}. Here's the opposite." |
| **A3** | **Proof / outcome** | Lead with a concrete result | You have a hard number or named client | "{Named client} cut {metric} by {N%} in {timeframe}." |
| **A4** | **Authority / insight** | Teach one non-obvious thing | Educational, thought-leadership register | "The one thing {audience} gets wrong about {topic}." |
| **A5** | **Specific audience call-out** | Name the exact reader | Sharp ICP (e.g. "German-speaking law firms") | "For {specific role} at {specific org type}:" |
| **A6** | **Before/after / transformation** | Contrast two states | Product produces a visible delta | "From {before state} to {after state}, without {cost}." |
| **A7** | **Objection-killer** | Answer the #1 hesitation head-on | Known adoption blocker | "Worried about {objection}? {Reassurance + proof}." |
| **A8** | **Time / urgency (honest)** | A real, dated reason to act now | Genuine deadline/scarcity exists | "{Real event/date}: {what changes}." (Never fabricated urgency — §8 AP-09.) |

> **Angle library — mapping to R3's 13-angle set.** The prior client workflow used **13 angles × 3 slides**
> for carousels (CANON §2), and **R3 §4.1 enumerates that 13-angle set** (pain/cost-of-status-quo · contrarian
> reframe · named-outcome/ROI · speed/time-saved · risk/liability/compliance · authority/POV · social-proof/case ·
> comparison vs. alternative · "how it works" demystify · objection-handling · trend/"what's changing" ·
> founder/insider story · provocative question). The **A1–A8 set above is the canonicalized superset** covering
> those frames (e.g. R3's risk/liability and comparison fold into A1/A2/A7); the `Strategist` may draw the full
> R3 13-angle list and generate more. The variant matrix (§5) chooses *how many* angles a given brief spawns
> based on `AdDocument.type` and the requested variant count — the number "13" is a library size, not a per-brief
> quota.

### 3.2 Hook library (opening lines — `Copywriter` writes within the angle)

Hook *families* the `Copywriter` composes from. The chosen family must serve T2 (earn the second look) and be
grounded in a real fact from the `Brief` — no clickbait the ad can't pay off (§8 AP-04).

| ID | Hook family | Pattern | Note |
|---|---|---|---|
| **H1** | **Number-led** | Open with a specific figure | Strongest default; ties to specificity>cleverness. |
| **H2** | **Named-audience** | "For {specific role/vertical}:" | Self-selects the reader; strong for sharp ICPs. |
| **H3** | **Question (stakes)** | A question the reader can't answer complacently | Must imply real stakes, not filler ("Did you know…"). |
| **H4** | **Contrarian statement** | Flip a truism | Pairs with angle A2. |
| **H5** | **Cost / loss framing** | Frame the status quo as an ongoing loss | Pairs with A1; loss aversion. |
| **H6** | **Curiosity gap (payable)** | Withhold one specific piece the ad then delivers | The gap **must** be closed by the ad (no bait). |
| **H7** | **Direct proof** | Lead with the outcome/number itself | Pairs with A3; needs a real proof token. |
| **H8** | **Pattern-interrupt visual + terse line** | Let imagery carry T1; keep the line to ≤5 words | For strong-image ads; the line just labels the promise. |

**Copy rules the `Copywriter` MUST encode (CANON §7):**

- **C1 — Specificity > cleverness.** Prefer a concrete number/name/date over a pun. If a headline has no
  concrete noun or number, rewrite it.
- **C2 — One promise.** Headline states one value proposition (T3). No "and also."
- **C3 — Register: sober, editorial, documentary — NOT hype AI (CANON §1).** Banned tone: exclamation
  stacks, "revolutionary," "game-changer," "🚀 unleash," hustle-speak. This is enforced by `BrandGuardian`
  banned-terms (§9).
- **C4 — Headline ≤ 70 chars; hook in first ~150 chars of intro (§1.1).**
- **C5 — CTA is a verb + object, singular** (e.g. "Book the 20-minute demo"), not "Learn more / Sign up /
  Contact us" stacked. One CTA (R-CH1).
- **C6 — Numbers on screen stay numerals; numbers in VO get pre-spelled** for TTS (video only — "1.200" →
  "zwölfhundert"); see §7 and doc 05 (`LocalizationAgent`) + doc 09 (BrandKit `localization`) (R2 §4.4).
- **C7 — Bilingual by construction (CANON §1).** Copy is written so a DE **transcreation** (not literal
  translation) exists; the `LocalizationAgent` owns the second language (doc 05; BrandKit `localization` in doc 09).

### 3.3 CTA verb library (the `cta` layer text)

Singular, low-friction, action-first. `Copywriter` picks **one** per Variant.

`Book {a call/the demo}` · `Get {the guide/the template}` · `See {how it works}` · `Start {the trial}` ·
`Download {the report}` · `Request {access/a quote}` · `Talk to {sales/us}` · `Watch {the 2-min demo}`

> **⚑ ASSUMPTION.** LinkedIn's Campaign-Manager CTA *button* options (a fixed enum like "Learn More",
> "Download", "Register", "Sign Up") are set at campaign build time, **not** in the creative, and are not
> enumerated in CANON. The **in-creative `cta` layer text** above is our own copy and is independent of the
> platform button. **VERIFY** the current LinkedIn CTA-button enum when building the export/handoff surface;
> keep the in-creative CTA copy consistent with (not contradicting) the button the tenant will pick.

---

## 4. Carousel narrative structure (what `CarouselArchitect` builds)

A carousel is **not** *N* independent slides. It is **one argument told across ordered slides** with
**continuity** (CANON §7 `CarouselArchitect`: "multi-slide narrative: hook→reframe→close, continuity across
slides"). This directly fixes the client's prior pain (13 angles × 3 baked-text PNGs, each art-directed in
isolation — CANON §2).

### 4.1 The canonical arc

| Phase | Slides | Job (maps to conversion hierarchy §2) | Required properties |
|---|---|---|---|
| **HOOK** | Slide **1** (always) | T1 + T2: stop the thumb, promise the payoff | **Highest `stoppingPower` of any slide** (doc 08 §5.4). Boldest single line. No CTA yet. |
| **REFRAME** | Slides **2 … N−1** | T3 + T4: shift the reader's frame; deliver value + proof, one idea per slide | Each slide = **one** point. Escalating argument. Recurring motif for continuity. |
| **CLOSE** | Slide **N** (last) | T5: the single ask | **High `ctaAttention`**; the **only** slide with the primary CTA + `legal` layer if required. |

- **Minimum viable arc = 3 slides** (hook / reframe / close). Default when the user specifies no count.
- **Up to ~10–12 slides** (§1.2). More slides ⇒ more REFRAME beats; HOOK and CLOSE stay singular.
- **One idea per REFRAME slide.** A slide that makes two points is split or cut (`Critic` anti-pattern §8).

### 4.2 Continuity rules (`CarouselArchitect` MUST encode)

- **CN1 — Visual through-line.** A recurring motif/color/character across slides (same `BrandKit`, consistent
  style/seed/reference imagery — R1 brand-consistent lane). The reader should *feel* it is one piece.
- **CN2 — Narrative escalation.** Each REFRAME slide advances the argument; no slide is skippable without
  breaking the logic. If a slide can be removed with no loss, remove it.
- **CN3 — Slide-1 dominance.** Slide 1 carries the strongest hook and the highest stopping-power; it must
  work **alone** as a thumbnail (many users never swipe). `EngagementAnalyst` flags any carousel whose slide
  1 is *not* the stopping-power max (doc 08 §5.4).
- **CN4 — Dip detection.** No interior slide may be a stopping-power **trough** relative to its neighbors
  (the static analogue of video weak-moment detection — trough detection over the per-slide sequence, our own
  code, no TRIBE — doc 08 §5.4). Flagged for re-work.
- **CN5 — Single close.** Exactly one CLOSE slide with exactly one CTA. Disclaimers (if the vertical requires
  them) live as a `legal` layer on the CLOSE slide.

### 4.3 Per-slide layer-tree contract (feeds `CompositorPlanner`)

Each `Slide` is its own layer tree (CANON §5). Canonical slot map per phase:

```jsonc
// HOOK slide (slide 1)
{ "phase": "hook",
  "layers": ["image(bg)", "text(hook_headline)", "logo", "shape(motif)?"] }  // NO cta, NO legal
// REFRAME slide (2..N-1)
{ "phase": "reframe",
  "layers": ["image(bg)", "text(point_headline)", "text(support)?", "smart(proof)?", "logo", "shape(motif)?"] }
// CLOSE slide (N)
{ "phase": "close",
  "layers": ["image(bg)", "text(close_headline)", "cta", "logo", "legal?"] }  // the ONLY cta + legal slide
```

Layer types are canonical (CANON §5: `image|text|logo|shape|cta|frame|legal|group|smart`). `smart` layers
are data-bound (e.g. `{{customer_count}}+ firms`).

---

## 5. The variant matrix doctrine (what a brief *becomes*)

**A brief does not become one ad. It becomes a structured matrix, deduplicated to the board's 4–6 ranked
`Variant`s.** This is the doctrine that turns "generate variations" from random re-rolls (the old pain) into
**structured diversity** — every Variant differs on a *named, testable axis*, so the board is a real test,
not five near-duplicates.

### 5.1 The matrix axes

| Axis | Values (from libraries above) | Owned by | Why it's an axis |
|---|---|---|---|
| **Angle** (§3.1) | A1…A8+ | `Strategist` | Different strategic frame = genuinely different bet. |
| **Hook family** (§3.2) | H1…H8 | `Copywriter` | Different opening = different T2 test. |
| **Visual concept** | ArtDirector concepts (imagery-only) | `ArtDirector` | Different T1 stopping mechanism. |
| **Layout archetype** (§5.1.1) | `full-bleed-hero-lower-third` · `split-panel` · `editorial-kicker-top` · `quote-card` | `CompositorPlanner` | Different composition = different T1/T3 read; the axis that structurally prevents `layout_homogeneity` (§8 AP-16). |
| **(video only) Opening device** | e.g. motion cold-open vs text card vs face | `Strategist`/`ArtDirector` | Different first-3s stopping test. |

#### 5.1.1 Named layout archetypes (`CompositorPlanner` selects; the 4th matrix axis)

`CompositorPlanner` assigns each Variant a **named layout archetype** so the board spreads across compositions,
not just words and imagery. The canonical starting set:

| Archetype | Composition | Best for |
|---|---|---|
| **`full-bleed-hero-lower-third`** | Edge-to-edge image; headline + CTA banded in a lower third | Strong single hero image; pattern-interrupt visuals (H8). |
| **`split-panel`** | Image on one side, text block on the other | Before/after (A6); side-by-side proof. |
| **`editorial-kicker-top`** | Small kicker/eyebrow line top, large headline, image below | Authority/insight (A4); sober editorial register. |
| **`quote-card`** | Centered pull-quote / named-client testimonial treatment | Proof/outcome (A3); named-client social proof. |

The board must span archetypes: **`Critic` flags `layout_homogeneity` when ≥3 Variants share one archetype**
(§8 AP-16), and `CompositorPlanner` is sent back to re-spread. Additionally, `CompositorPlanner`/`ArtDirector`
**wire `brandKit.imagery.style.avoid` tokens into the imagery negative prompt automatically** (per CANON §12
L10) so off-brand visual styles are structurally excluded, not left to prompt discipline.

### 5.2 The generation rule (orchestrator + agents encode this)

1. **`Strategist` selects K distinct angles** for the brief (K scales with requested variant count and
   `AdDocument.type`; default board = **4–6 Variants**, CANON §7 / doc 01).
2. For each angle, **`Copywriter` writes ≥1 hook** (from a *different* hook family where possible) and
   **`ArtDirector` proposes ≥1 visual concept**.
3. The orchestrator forms candidate `(angle, hook, visual)` triples, **deduplicates near-identical triples**,
   and selects the **4–6 most *distinct*** to become `Variant`s. **Diversity across axes is the selection
   criterion** — never five paraphrases of one angle.
4. Each `Variant` records its matrix coordinates in lineage (`brief_id`, plus the chosen angle/hook/visual as
   part of `prompt`/metadata) so the board and later `Experiment`s are legible (CANON §5 lineage).
5. **Carousel:** the matrix operates at the *document* level — Variants are **different narrative takes on the
   same argument** (e.g. proof-led vs contrarian-led carousels), each an ordered `Slide[]`.
6. **Video:** add the *opening-device* axis; each Variant is a distinct first-3s stopping bet.

### 5.3 Matrix doctrine rules

- **VM1 — Distinct or dropped.** Two Variants that share angle **and** hook family **and** visual concept are
  the same ad; drop one. The board must span the matrix, not clump.
- **VM2 — Bounded, not exhaustive.** Do **not** generate the full Cartesian product (cost + noise). Generate
  the **4–6 most distinct** covering the widest matrix span within the per-brief cost cap (CANON §4, doc 10).
- **VM3 — One control.** Include one "safe" Variant (strongest single angle, most literal proof) as a
  baseline against which the bolder Variants are read.
- **VM4 — Ranked, not chosen.** Agents **rank** the matrix by predicted engagement (bands+confidence);
  **the human picks** (CANON §7). The matrix produces the *test*, not the *decision*.
- **VM5 — Every Variant is `Experiment`-ready.** Because each differs on a named axis, promoting the board
  into an `Experiment` with `ExperimentArm`s is mechanical (CANON §5; doc 01 F15).

> **Variant count — reconciled with R3.** CANON fixes the **board at 4–6 Variants** (CANON §7, echoed doc
> 01/R7). **R3 §5 prescribes the matrix as a 4-axis (near-)cartesian product** — Angle × Hook × Proof ×
> **Layout archetype** — deduplicated down to the board; the layout-archetype axis (§5.1.1) is mandatory to
> defeat `layout_homogeneity` (§8 AP-16). VM1–VM5 are the doctrine that fills the 4–6 slots with
> maximally-distinct bets across those axes, consistent with R3 §5. Where R3 §5's axis set is richer than an
> earlier draft here, **R3 wins** and this §5 conforms to it; the 4–6 board size (CANON) is unchanged.

---

## 6. Directional benchmarks — **ALL FLAGGED, none are promises**

> **DIRECTIONAL — calibrate on real `Result`s (read before using any number here).** These numbers are
> **directional priors sourced from R3 §7** (third-party 2026 LinkedIn aggregates), **not performance
> promises and not pass/fail thresholds.** They exist only to (a) seed cold-start `predictedCtrBand` priors
> with a *wide* band and *low* confidence (doc 08 §7; R3 §7.4 "calibration hook"), and (b) give `Critic`
> rough sanity rails. **They MUST be:** (1) shown to tenants only as **bands + confidence** with a
> "directional estimate" label (CANON §9; doc 08 §7); (2) **calibrated toward the tenant's real LinkedIn
> `Result`s** as data accrues (the calibration loop is the moat — R7 §1.4; R3 §7.4); (3) VERIFY-refreshed
> against R3's cited sources at build time per L12 (code the prior now; never gate on it). **Never surface a
> raw number as truth.** Fuller by-objective/by-industry benchmark tables live in **R3 §7**.

| Signal | Directional prior (R3 §7 — calibrate on real Results) | How the platform uses it |
|---|---|---|
| Single-image LinkedIn CTR band (cold-start) | **~0.40%–0.65%** (median ~0.50%; wide, low-confidence — R3 §7.1) | Seed `predictedCtrBand{low,high,confidence=low}`; widen further when tenant data is thin (doc 08 §7). |
| "Strong" vs "weak" stopping-power split | relative, per-tenant | `EngagementAnalyst` ranks *within* a board; absolute thresholds are **calibrated, not fixed**. |
| Video: fraction of watch decided in first 3 s | **most of it** (muted feed) | Justifies the first-3s hard constraint (§7); not a numeric gate. |
| Carousel: share of viewers who never swipe past slide 1 | **large majority** | Justifies CN3 (slide 1 must stand alone); not a numeric gate. |
| Intro-text hook fold | **~150 chars visible** | This one **is** a CANON §8 spec, not a benchmark — front-load the hook (R-CH2). |

**Doctrine:** the platform's competitive edge is **not** a claimed benchmark; it is **the per-tenant
calibration loop** that makes predictions *this-tenant-true* over time (CANON §9; R7 §1.4; doc 08 §7). Treat
every number here as a temporary crutch to be discarded on first contact with real data.

---

## 7. Muted-first video rules (the video creative contract)

Video is a **first-class fast-follow** (CANON §0). LinkedIn **autoplays muted**, so **burned-in subtitles
carry the story** and the **first 3 seconds must stop the scroll with zero audio** (CANON §8; R2 §5). The
composited-not-baked rule still holds: **brand text is a Remotion vector/HTML layer, never baked into the
model output** (CANON §2; R2 §5.1).

### 7.1 Hard rules (`Strategist`/`ArtDirector`/`CompositorPlanner`/exporter encode)

- **V1 — Muted-first is the default; sound-on is the exception.** Design assuming **no audio**. Model-native
  audio is almost always discarded (R2 §0). A sound-on variant is opt-in and rare.
- **V2 — Burned-in captions are mandatory and always-on.** Source timing from ElevenLabs `with-timestamps`
  (word-level) → `@remotion/captions` `createTikTokStyleCaptions(...)` → high-contrast, **safe-zone-aware**,
  **burned into pixels** (R2 §5.1). No optional/soft subtitle track.
- **V3 — First 3 seconds carry stopping power.** The opening frame + first cut must deliver T1 with no sound:
  a bold visual, an on-screen line, or a motion pattern-interrupt. `EngagementAnalyst` scores
  `firstThreeSeconds` + `stoppingPower` (doc 08 §5.5); weak openings auto-iterate (≤2 rounds).
- **V4 — On-screen numerals; pre-spelled VO.** On-screen caption/brand text keeps **numerals** for legibility
  ("1.200"); the **VO string is TTS-normalized** ("zwölfhundert", "%" → "Prozent") by the `LocalizationAgent`
  (R2 §4.4; doc 05 `LocalizationAgent` + doc 09 BrandKit `localization`). **DE number pre-spelling is mandatory** — ElevenLabs mispronounces DE numbers.
- **V5 — Sober register in motion too (CANON §1).** Documentary/editorial pacing; no hype stingers, no
  frantic cuts, no meme energy. Music (if any) is a **low, sober bed**, muted-first (R2 §4).
- **V6 — Text safe-zones respected.** Captions and brand cards stay inside the feed-crop / profile-overlap /
  UI-chrome safe zones for the target ratio; the exporter re-lays out 1:1 ↔ 4:5 ↔ 16:9 by smart re-layout,
  not crop (R2 §5.1; CANON §8).
- **V7 — Ship-time spec-check gate** (exporter): ✓ ratio ∈ {1:1, 4:5, 16:9} ✓ **≤200 MB** (`probeFileSize()`)
  ✓ captions present & legible in safe zones ✓ **plays correctly muted** ✓ first-3s stopping power present
  ✓ `BrandGuardian` pass (R2 §6, §8; doc 01 §4.3 C12).

### 7.2 Video storyboard skeleton (what the agents emit)

```
Storyboard (muted-first):
  [0–3s]  HOOK shot   → T1+T2: bold visual / on-screen line / motion interrupt; NO reliance on audio
  [3s..]  BODY shots  → T3+T4: one point per shot; burned-in captions carry every claim; motif continuity
  [end]   CLOSE card  → T5: single CTA (brand card / lower-third, vector layer); legal layer if required
Tracks: <OffthreadVideo> clips  +  <Audio> VO/bed/SFX (muted-first)  +  brand/CTA/logo/legal (HTML/CSS layers)
        +  always-on burned-in caption layer
```

> **VERIFY current docs before coding (video/audio APIs drift — R2 §8):** Kling host + model slugs + JWT
> HS256 exp window; Kling 3.0 Omni "elements"; Veo 3.1 slugs (3.0 sunset **2026-06-30**); Runway Gen-4 Aleph
> sunset **2026-07-30**; HeyGen v2 until **2026-10-31** (or v3 wallet API); ElevenLabs
> `eleven_multilingual_v2` + `with-timestamps` shape + **DE number pre-spelling mandatory** + Music API
> commercial-license terms; Remotion **Company License** (4+ people / funded) + `@remotion/captions`
> (native subs since v4.0.216) + Lambda region/memory; the exact `crf`/preset that keeps 1:1/4:5/16:9 clips
> **≤200 MB**. (Full detail: doc 01 §4.3 note; R2 §8.)

---

## 8. Anti-patterns the platform STRUCTURALLY PREVENTS

The point of Brutal Ads is that the classic LinkedIn-ad failure modes are **made impossible by
construction**, not merely discouraged. Each anti-pattern below names **what** is wrong, **which mechanism
prevents it**, and **where** that mechanism lives. `Critic` scores against this list; several are hard-blocked
upstream so `Critic` should rarely even see them.

| ID | Anti-pattern | Why it kills the ad | **How the platform PREVENTS it (structural)** | Enforced at |
|---|---|---|---|---|
| **AP-01** | **Baked-in text** (headline/CTA rendered by the image model) | Illegible, off-brand, uneditable → endless re-rolls (the client's original pain, CANON §2) | Image prompts are **structurally forbidden** to contain ad copy; all legible text is a vector `Layer` (P1). | `ArtDirector` (imagery-only prompt) + code assertion/lint (doc 01 DoD) |
| **AP-02** | **Cropped headline / lost CTA** in a non-base ratio | The ask disappears in 4:5 or 1.91:1 | **Smart re-layout** from one base with `renderHints`/safe-zones — **never naive crop** (CANON §8; R7 ⚑R-LT1). | exporter (`packages/render`) |
| **AP-03** | **Missing / wrong disclaimer** (esp. regulated verticals: legal, PE) | Compliance risk | **`legal` first-class layer** + `BrandGuardian` hard gate: no mandatory disclaimer ⇒ **cannot reach the board**. | `BrandGuardian` (hard gate) |
| **AP-04** | **Clickbait hook the ad can't pay off** | Burns trust; hurts the sober/editorial brand | `Copywriter` C-rules: curiosity gaps must be closed by the ad (H6); `Critic` flags unpaid hooks. | `Copywriter` + `Critic` |
| **AP-05** | **Off-brand palette / type / voice** | Breaks the seed brand (dark palette, Playfair+Inter, gold/lime) | Versioned **`BrandKit`** pinned by every render + `BrandGuardian` hard gate on palette/type/voice. | `BrandGuardian` + render pins `brand_kit_version` |
| **AP-06** | **Hype AI tone** ("revolutionary", 🚀, exclamation stacks) | Contradicts CANON §1 register (sober/editorial/documentary) | `BrandGuardian` **banned-terms** list (§9) + `Copywriter` C3. | `BrandGuardian` + `Copywriter` |
| **AP-07** | **Two value props / two CTAs** (message dilution) | Splits attention; nothing converts | R-CH1 one-idea/one-CTA; `Critic` flags dual-ask; `CompositorPlanner` allows one `cta` layer as the primary. | `Critic` + `CompositorPlanner` |
| **AP-08** | **Cluttered / low-focal-clarity layout** | Fails T1; nothing stops the thumb | `EngagementAnalyst` `clutter` + `focalClarity` signals; auto-iterate ≤2 (doc 08). | `EngagementAnalyst` |
| **AP-09** | **Fabricated urgency / false scarcity** | Compliance + trust risk | Angle A8 requires a **real** dated reason; `BrandGuardian`/`Critic` block invented deadlines. | `Strategist` + `BrandGuardian` |
| **AP-10** | **Literal translation** (DE that reads translated) | Fails the "native in both languages" bar (CANON §1) | `LocalizationAgent` does **transcreation, not literal translation** (CANON §7; doc 05; BrandKit `localization` in doc 09). | `LocalizationAgent` |
| **AP-11** | **Numbers mispronounced in DE VO** (video) | "1.200" spoken wrong destroys credibility | VO strings **pre-spelled** for TTS ("zwölfhundert"); on-screen keeps numerals (V4; R2 §4.4). | `LocalizationAgent` |
| **AP-12** | **Buried hook / promise below the fold** | Reader never sees the value | R-CH2 front-load; hook in first ~150 chars (§1.1); glance-test (R-CH3). | `Copywriter` + `CompositorPlanner` |
| **AP-13** | **Random re-rolls instead of structured variants** | A board of near-duplicates isn't a test | **Variant matrix doctrine** (§5): every Variant differs on a named axis; dedup near-identical triples (VM1). | orchestrator + `Strategist`/`Copywriter`/`ArtDirector` |
| **AP-14** | **Autonomous shipping / auto-spend** | Removes human judgment; unsafe | **Human-approve gate** — nothing ships un-approved; agents rank, humans choose (CANON §7). | orchestrator (gate) |
| **AP-15** | **Soft / optional subtitles on video** | Muted autoplay ⇒ silent, story lost | Captions are **always-on, burned-in** (V2); exporter spec-check requires them (V7). | Remotion assembly + exporter |
| **AP-16** | **`layout_homogeneity`** — a board where **≥3 Variants share the same layout archetype** | Same-looking board fails the *structured-diversity* promise (§5); it reads as re-rolls, not a real layout test | **Layout archetype is the 4th variant-matrix axis** (§5.1) chosen by `CompositorPlanner`; `Critic` flags `layout_homogeneity` when ≥3 Variants share an archetype and the board is sent back to spread archetypes. | `CompositorPlanner` (spread) + `Critic` (flag) |

---

## 9. Policy & compliance (what `BrandGuardian` mechanically enforces)

`BrandGuardian` is a **hard mechanical gate**, not a vibe (CANON §7; doc 01 P4). A Variant that fails **cannot
reach the board**; it loops back to the authoring agent (≤2 rounds) and, if still failing, is surfaced with a
reason — **never silently shipped**. All rules pin to the **versioned `BrandKit`** (CANON §5); the check
result and `brand_kit_version` are recorded in lineage.

### 9.1 The gate checklist (mechanical)

| Check | Rule | Source of truth |
|---|---|---|
| **Palette** | Only `BrandKit` colors (seed: dark palette; gold `#cba65e`, lime `#b6e64a`; acid-lime chrome). | `BrandKit.palette` |
| **Type** | Only `BrandKit` fonts (seed: **Playfair Display** display / **Inter** body). | `BrandKit.type` |
| **Voice / register** | Sober, editorial, documentary — **not hype** (CANON §1). | `BrandKit.voice` |
| **Banned terms** | No terms on the `BrandKit` banned list (hype words, competitor slurs, prohibited claims). | `BrandKit.bannedTerms` |
| **Mandatory disclaimer** | Required disclaimer(s) **per vertical** present as a `legal` layer (e.g. regulated legal-AI / PE claims). | `BrandKit.disclaimers[vertical]` |
| **AI-content disclosure** | AI-generated-creative disclosure present when required. **Hard gate:** `BrandGuardian` **warns by default; errors (blocks the board) when the tenant vertical requires it** (e.g. EU legal / PE). | `BrandKit.disclosures.aiContent` (doc 09; L7/L10) |
| **Localization** | DE/EN is transcreated (not literal); TTS-safe number spelling for VO (video). | `BrandKit.localization` (doc 09) + `LocalizationAgent` (doc 05) |
| **Composite rule** | No ad copy baked into imagery; all legible text is a `Layer` (P1). | code assertion (AP-01) |
| **One-idea rule** | One value prop, one primary CTA (R-CH1). | `Critic` handoff |

### 9.2 Regulated-vertical notes (client-specific — CANON §1)

- **Legal AI for German-speaking law firms:** legal-services advertising in DE-speaking markets is regulated.
  The `BrandKit` MUST carry the required disclaimer(s) as `legal` layer content, and claims about legal
  outcomes/accuracy must be defensible (no "guaranteed" outcomes). **⚑ ASSUMPTION:** CANON does not enumerate
  the exact DE legal-advertising disclaimer text. **VERIFY current legal-advertising rules (e.g. relevant DE
  professional-conduct / advertising rules) with the client's counsel and encode the exact disclaimer into
  the seed `BrandKit` before shipping to that vertical.**
- **Private-equity angle:** financial-promotion rules may require risk disclaimers / audience restrictions.
  **⚑ ASSUMPTION / VERIFY:** confirm the applicable financial-promotion disclaimer and encode it as a
  `legal` layer requirement in the `BrandKit` for the PE vertical before shipping.
- **AI-generated-imagery disclosure — `BrandGuardian`-enforceable gate (not a note):** creative is
  AI-generated, and some platforms/jurisdictions expect that to be disclosed. This is enforced mechanically,
  not left to a human: `BrandKit.disclosures.aiContent` (the frozen `BrandKitData` superset, CANON §12 L7)
  drives a **`BrandGuardian` rule that WARNS by default and ERRORS (blocks the board) when the tenant vertical
  requires disclosure** (per L10 — relevant for EU legal / PE). When it errors, the Variant loops back (≤2
  rounds) and, if still non-compliant, is surfaced with the reason — never silently shipped. The disclosure
  is realized as a `legal` layer (or the metadata field defined by `disclosures.aiContent`).
  **VERIFY** LinkedIn's current AI-content/disclosure policy and the exact per-vertical trigger; **code the
  warn-by-default + error-when-required behavior now** and only adjust the vertical trigger set if policy
  differs (L12).

> **VERIFY current docs before coding** — **LinkedIn Ads policies drift.** Before shipping, re-confirm
> LinkedIn's current **Advertising Policies** (prohibited/restricted content, claims substantiation, targeting
> restrictions, AI-content disclosure) and the current **ad-review** requirements. The `BrandKit` banned-terms
> and disclaimer lists are the enforcement surface; keep them in sync with LinkedIn policy + the client's
> legal counsel. **CANON does not encode jurisdiction-specific legal text — that is a `BrandKit`/counsel
> responsibility, flagged here.**

---

## 10. How each agent uses this playbook (the encoding map)

Every agent's system prompt embeds the relevant slice of this doc (ready-made blocks in §12). This table is
the index; agent orchestration is doc 05's authority.

| Agent (CANON §7) | Encodes from this doc |
|---|---|
| `Strategist` | Conversion hierarchy §2 (T3/T4 ownership); angle library §3.1; variant-matrix angle selection §5.2; specificity>cleverness. |
| `Copywriter` | Hook library §3.2; copy rules C1–C7; CTA verbs §3.3; headline/intro limits §1.1; per-slide copy §4.3. |
| `ArtDirector` | T1 stopping-power; **imagery-only** prompts (AP-01); visual-concept axis §5.1; carousel motif continuity CN1. |
| `CarouselArchitect` | Carousel arc §4; continuity CN1–CN5; slide-1 dominance; per-slide layer contract §4.3. |
| `CompositorPlanner` | Layer slot maps §4.3; glance test R-CH3; one `cta`/one value prop; safe-zone-aware placement; **layout-archetype axis §5.1.1** (spread the board, avoid AP-16); wire `brandKit.imagery.style.avoid` into the negative prompt. |
| `BrandGuardian` | Policy gate §9 (mechanical checklist); banned terms; disclaimers; **AI-content disclosure gate (warn/err) §9**; composite rule. |
| `Critic` | Scores vs conversion hierarchy §2 + anti-patterns §8 (incl. **`layout_homogeneity` AP-16**). |
| `EngagementAnalyst` | Maps `EngagementScores` (doc 08) onto tiers §2; carousel dip/slide-1 checks §4.2; directional-band caveat §6. |
| `EditorAgent` | Preserves all rules under edits (never re-introduces AP-01/AP-02/AP-07 via a `LayerPatch`). |
| `LocalizationAgent` | Transcreation (AP-10); TTS number pre-spelling (V4/AP-11); numerals-on-screen (doc 05 agent + doc 09 BrandKit `localization`). |

---

## 11. Cross-doc anchors (quick index)

- **Object model / layer types / lineage:** CANON §5 → **doc 03** authoritative.
- **Provider contracts / `EngagementScores`:** CANON §6 → **doc 04 / doc 08** authoritative.
- **Agents:** CANON §7 → **doc 05** authoritative.
- **LinkedIn format specs (§1 here):** CANON §8 → **doc 06** authoritative for render/re-layout
  *mechanics*; this doc authoritative for the *creative rules*.
- **Engagement stance / calibration / bands:** CANON §9 → **doc 08** authoritative (§2, §6 here consume it).
- **Env vars:** CANON §10 → **doc 11** authoritative.
- **Product spec / journeys / DoD:** **doc 01** (this doc's rules are the creative content of those journeys).

---

## 12. Paste-into-agent-prompt blocks (verbatim)

Drop these directly into the named agent's system prompt. They are self-contained and use only canonical
names.

### 12.1 Global creative preamble (prepend to every Creative Studio agent)

```
You produce LinkedIn ads for Brutal Ads. Non-negotiable rules:
1. AI generates IMAGERY ONLY. Never put ad copy (headline, subhead, CTA, legal, price, slide text) into an
   image/video generation prompt. Every legible/on-brand element is a composited, editable vector Layer.
2. Register: sober, editorial, documentary — NOT hype AI. No "revolutionary", no rocket emojis, no
   exclamation stacks, no hustle-speak.
3. Specificity beats cleverness: a concrete number, named audience, or dated fact beats a pun. Always.
4. One ad = one value proposition + one primary CTA. Two asks = zero asks.
5. Optimize in this order (higher wins): STOP (stop the thumb) → HOOK (earn the second look) → VALUE
   (one legible promise) → PROOF (a specific, believable fact) → ACT (one obvious CTA).
6. Bilingual by construction (DE + EN); the German version is a transcreation, never a literal translation.
7. Agents rank; humans choose; nothing ships without human approval.
```

### 12.2 `Copywriter` block

```
Write within the angle chosen by the Strategist. Hook families to compose from: number-led, named-audience,
stakes-question, contrarian, cost/loss framing, payable curiosity gap, direct proof, pattern-interrupt line.
Rules: headline ≤ 70 chars; put the hook in the first ~150 chars of intro text (visible before "see more");
intro ≤ 600 chars. CTA = one verb+object, singular ("Book the 20-minute demo"), never a stack of
"Learn more / Sign up / Contact us". A curiosity gap MUST be paid off by the ad — no clickbait. On-screen
numbers stay numerals; VO numbers are pre-spelled for TTS (DE: "1.200" → "zwölfhundert", "%" → "Prozent").
Output structured JSON per the schema in doc 05.
```

### 12.3 `CarouselArchitect` block

```
A carousel is ONE argument across ordered slides, not N independent slides. Arc: Slide 1 = HOOK (highest
stopping power, works alone as a thumbnail, NO CTA); middle slides = REFRAME (one idea each, escalating,
recurring visual motif for continuity); last slide = CLOSE (the single CTA + any legal disclaimer, the ONLY
slide with a cta layer). Minimum 3 slides; up to ~10–12. Remove any slide that can be removed without
breaking the logic. No interior slide may be a stopping-power trough versus its neighbors. Emit an ordered
slide plan; each slide is its own layer tree.
```

### 12.4 `BrandGuardian` block

```
You are a HARD GATE, not a reviewer. A Variant that fails any check CANNOT reach the board — loop it back to
the authoring agent (≤2 rounds) then surface the reason; never silently ship. Check, mechanically, against
the versioned BrandKit: (1) palette = only BrandKit colors; (2) type = only BrandKit fonts; (3) voice = sober
editorial documentary, not hype; (4) no banned terms; (5) required disclaimer(s) for this vertical present as
a legal layer; (6) AI-content disclosure (BrandKit.disclosures.aiContent) — WARN by default, ERROR (block the
board) when this tenant's vertical requires it; (7) DE/EN transcreated, VO numbers pre-spelled; (8) no ad copy
baked into imagery; (9) one value prop + one CTA. Record brand_kit_version and the check result in lineage.
```

### 12.5 `Critic` block

```
Score the Variant against the conversion hierarchy (STOP → HOOK → VALUE → PROOF → ACT) and flag any
anti-pattern: baked text, cropped/lost CTA, missing disclaimer, unpaid clickbait hook, off-brand
palette/type/voice, hype tone, two value props or two CTAs, cluttered/low-focal-clarity layout, fabricated
urgency, literal translation, mispronounced-DE-number VO, hook buried below the fold, near-duplicate variants,
soft/optional video subtitles, layout_homogeneity (≥3 Variants sharing one layout archetype). Output findings
+ a per-tier score; you rank, you do not ship.
```

---

## 13. Consolidated assumptions (flagged, for the factory)

1. **Grounding — R3 is present and cited (whole-doc).** `R3-linkedin-playbook.md` grounds this doc (format
   facts cross-checked against CANON §8 + R3 §2; craft from CANON §0–§2/§7–§9 + R3 §3–§6 + R2/R4/R7). **All
   benchmark numbers (§6) are DIRECTIONAL priors sourced from R3 §7, calibrated on the tenant's real
   `Result`s** — R3-sourced directional priors, never surfaced as truth. Where R3 and any other doc disagree,
   **CANON §12 + R3 win** (R3 conforms to L1–L12).
2. **⚑ ASSUMPTION — conversion hierarchy labels (T1–T5).** STOP→HOOK→VALUE→PROOF→ACT is a doctrine mapped to
   the `EngagementScores` field set (CANON §6) and R3 §3, not a CANON-locked structure.
3. **Angle set — reconciled with R3.** §3.1's A1–A8 is the canonicalized superset of the client's prior "13
   angles" (CANON §2), which **R3 §4.1 now enumerates**; the `Strategist` may draw R3's full 13-angle list and
   the variant matrix (§5) decides how many a brief spawns.
4. **⚑ ASSUMPTION — in-creative CTA vs LinkedIn CTA button.** LinkedIn's Campaign-Manager CTA-button enum is
   set at campaign build time and is not in CANON; the in-creative `cta` copy (§3.3) is our own and must be
   VERIFIED for consistency with the platform button at export time.
5. **⚑ ASSUMPTION — regulated-vertical disclaimer text.** CANON does not encode the exact DE legal-advertising
   or PE financial-promotion disclaimer text; §9.2 flags these as `BrandKit` + counsel responsibilities to
   VERIFY before shipping to those verticals.

**Cross-document assumptions I am relying on (so other authors stay consistent):**
**(a)** doc 08 owns `EngagementScores` semantics and the calibration loop this doc's §2/§6 consume (bands +
confidence; slide-1/dip checks; directional-prior caveat) — this doc must not contradict doc 08.
**(b)** doc 05 owns the `LocalizationAgent` (transcreation + TTS number pre-spelling) and doc 09 owns the
BrandKit `localization` block that §7 V4 and AP-10/AP-11 reference.
**(c)** the editor/exporter doc (doc 06 / `packages/render`) owns the *mechanics* of smart re-layout,
safe-zones, `renderHints` (R7 ⚑R-LT1), `probeFileSize()`, and PDF/MP4 output that §1/§7/AP-02 assume; this
doc only states the creative *rules*, not the render mechanism.
**(d)** doc 05 embeds the §12 prompt blocks into the named agents and, per doc 01, may fold `IntakeAgent`
(R7 ⚑R-A1) in front of `Strategist`; the matrix doctrine (§5) is agnostic to that choice.
None of these contradict CANON; each is a flagged, additive dependency.

<!-- Conforms to CANON §0–§10. Canonical names used verbatim: Workspace, BrandKit, Campaign, Brief,
AdDocument (single_image|carousel|video), Variant, Slide, Layer (image|text|logo|shape|cta|frame|legal|
group|smart), Asset, Render, Experiment, ExperimentArm, Result, AgentRun, GenerationJob, AuditLog;
Strategist, Copywriter, ArtDirector, CarouselArchitect, CompositorPlanner, BrandGuardian, Critic,
EngagementAnalyst, EditorAgent, LocalizationAgent; EngagementScores fields (stoppingPower, focalClarity,
valuePropAttention, ctaAttention, clutter, firstThreeSeconds, predictedCtrBand, perSlide); ProviderBus;
ENGAGEMENT_BACKEND; services/engine; packages/render. Deviations flagged ⚑ RECOMMENDATION; assumptions
flagged ⚑ ASSUMPTION; every external API carries a VERIFY-before-coding note. -->


<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: docs/08-engagement-testing.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

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


<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: docs/09-brand-kit.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

# 09 — Brand Kit: the versioned on-brand contract

> **Read CANON.md first.** This document expands the canonical `BrandKit` object (CANON §5), the mechanical
> gate `BrandGuardian` runs against it (CANON §7), the seed Brutal AI kit (CANON §0/§1), and the env vars
> (CANON §10). It is the single source of truth for **how "on-brand" is made deterministic, versioned, and
> auditable**. Every render, every agent, and every `Variant` lineage record pins to a specific
> `brand_kit.version` (CANON §5). "On-brand" is never a vibe — it is a diff against this object.
>
> **Canonical names used verbatim** (never rename): `Workspace`, `BrandKit`, `Campaign`, `Brief`,
> `AdDocument`, `Variant`, `Slide`, `Layer`, `Asset`, `AgentRun`, `AuditLog`; agents `Strategist`,
> `Copywriter`, `ArtDirector`, `CarouselArchitect`, `CompositorPlanner`, `BrandGuardian`, `Critic`,
> `EngagementAnalyst`, `EditorAgent`, `LocalizationAgent` (+ `IntakeAgent`, added in R7 ⚑R-A1 and the
> data-model doc's `agent_name` enum). Env: `ANTHROPIC_API_KEY`, `RECRAFT_API_KEY`, `SUPABASE_URL`,
> `SUPABASE_SERVICE_ROLE_KEY`, `APP_BASE_URL`, etc. (CANON §10).
>
> **This doc is authoritative for the `brand_kit` table and `BrandKitData` JSONB shape. It MUST stay
> byte-identical with `docs/03-data-model.md §3` (DDL) and `§7` (shape + seed).** Where this doc adds fields
> beyond what `03-data-model.md §7.1` shows, those additions are marked **`[+extends 03 §7.1]`**. Per
> **CANON §12 L7**, this doc's superset `BrandKitData` (the `[+extends]` fields: `iconography`,
> `messaging.approvedClaims`, `proofPoints` with per-locale `spoken`, `requiredDisclaimers`,
> `disclosures.aiContent`, plus governance metadata) **is the single authoritative shape and is back-ported
> into `03-data-model.md §7.1` + the zod in §12 in this same build** — this is a settled reconciliation, not a
> deferred task. `BrandGuardian` and both zod modules validate the identical shape. Every external API /
> drift-prone fact carries a **`VERIFY current docs before coding`** flag. Every assumption is **⚑ flagged**.

---

## 0. Why this object exists (the load-bearing rationale)

CANON §2's core lesson: baked-text PNGs were "hard to edit" AND "off-brand." Splitting imagery (AI) from
legible/on-brand elements (composited vector/text layers) dissolves *editability*. The **`BrandKit` dissolves
*brand drift***: instead of re-prompting until an image "feels Brutal," `BrandGuardian` runs a **mechanical
check** — is every color in `palette.allowed`? is every font in `typography`? does the copy contain a
`voice.bannedTerms` entry? is the mandatory `legal` layer present for this vertical? — and hard-gates the
`Variant` before it reaches the board (CANON §7; R7 §1.5).

Three properties are non-negotiable:

| Property | What it buys | Mechanism |
|---|---|---|
| **Versioned & immutable** | "Was this ad built on brand v3 or v4?" answerable forever; reproducible renders | New version = new row; old rows never mutate (§4). Every `Variant.brand_kit_version` pins one (CANON §5). |
| **Mechanically gatable** | "On-brand" is deterministic, not a judgment call | `BrandGuardian` runs `checkVariant()` against the pinned version (§6). |
| **Tenant data, not product logic** | Brutal is the seed tenant; every other workspace gets its own kit | Seed is one row in `supabase/seed.sql` (§9). No hex/font is hardcoded in app logic (CANON §1). |

**⚑ ASSUMPTION A-09-1 (cross-doc):** The `brand_kit` table DDL and the `BrandKitData` JSONB base shape are
**owned by `docs/03-data-model.md`** (it is the migrations/zod home). This doc **restates them verbatim** and
**extends** the JSONB with the additional sub-objects the CANON brief for this document demands
(`imagery.style` detail, `iconography`, verbal `approvedClaims`/`proofPoints`/`valueProps`/`productNames`,
`readingLevel`, `requiredDisclaimers` roles, richer `localization`, plus governance metadata). All `[+extends
03 §7.1]` additions are **backward-compatible** (all optional) so the existing seed row and zod schema keep
validating. **The build MUST reconcile `03 §7.1`, the zod `BrandKitData` schema, and this doc's §3 in one
pass** — this doc's §3 is the superset and, per **CANON §12 L7**, is the authoritative shape back-ported into
`03 §7.1` + the §12 zod in this same build (a settled reconciliation — do not defer it).

---

## 1. Object identity, lifecycle & ownership

```
Workspace ──1:N──► BrandKit (versioned; exactly one is_active per workspace)
                      │
                      └── data: BrandKitData (JSONB) ── §3
```

- A `BrandKit` **row = one immutable version** of a workspace's brand contract.
- `version` is `1,2,3…` monotonic **per workspace** (`unique (workspace_id, version)`).
- Exactly **one** row per workspace has `is_active = true` (`brand_kit_one_active_per_ws` partial unique idx).
- A `Brief` may pin a specific `brand_kit_id` (`brief.brand_kit_id`); if null, resolution uses the active
  version at brief-creation time (§5.2).
- Every `Variant` stores `brand_kit_version` (integer) in lineage — the **version number**, resolved to the
  row via `(workspace_id, version)`. **⚑ ASSUMPTION A-09-2:** lineage pins the *version integer*, not the
  `brand_kit_id` UUID, matching `03-data-model.md §4` (`variant.brand_kit_version integer not null`). Both
  uniquely identify the row given `workspace_id`; the integer is the canonical lineage key.

---

## 2. DDL — `brand_kit` (verbatim from `03-data-model.md §3`; do not diverge)

`supabase/migrations/0003_brand_campaign_brief.sql` (this table is created there; restated here for
self-containment).

```sql
-- brand_kit (VERSIONED — CANON §5). One workspace has many versions; exactly one is_active per workspace.
create table brand_kit (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspace(id) on delete cascade,
  version         integer not null,                 -- 1,2,3… monotonically per workspace
  name            text not null default 'Brand Kit',
  is_active       boolean not null default false,   -- exactly one true per workspace (partial unique idx)
  data            jsonb not null,                   -- BrandKitData shape — §3
  created_by      uuid references auth.users(id),
  created_by_kind actor_kind not null default 'human',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (workspace_id, version),
  constraint brand_kit_data_is_object check (jsonb_typeof(data) = 'object')
);
create unique index brand_kit_one_active_per_ws on brand_kit (workspace_id) where (is_active is true);
create index brand_kit_ws_version_idx on brand_kit (workspace_id, version desc);
```

> **`VERIFY current docs before coding`** — `actor_kind` and the `auth.users` FK are defined in
> `0001_enums.sql` / `0002_tenancy.sql` (`03-data-model.md §0–2`). Confirm those exist before this migration.

### 2.1 Governance sidecar tables `[+extends 03]`

Versioning bookkeeping and drift signals do NOT belong in the immutable `data` blob. Add two tables in the
same migration file. **⚑ These are new relative to `03-data-model.md` and MUST be back-ported into it.**

```sql
-- brand_kit_diff — human-readable + machine changelog between two versions (populated on publish, §4.2)
create table brand_kit_diff (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references workspace(id) on delete cascade,
  from_version     integer,                          -- null for v1 (creation)
  to_version       integer not null,
  summary          text not null,                    -- LLM- or diff-generated, one paragraph
  changes          jsonb not null default '[]'::jsonb, -- BrandKitChange[] — §4.2
  created_by       uuid references auth.users(id),
  created_by_kind  actor_kind not null default 'human',
  created_at       timestamptz not null default now(),
  unique (workspace_id, to_version)
);

-- brand_drift_event — a rendered/published Variant flagged as off-contract post-hoc (§8)
create table brand_drift_event (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspace(id) on delete cascade,
  variant_id        uuid not null references variant(id) on delete cascade,
  brand_kit_version integer not null,                -- version the Variant was checked against
  kind              text not null,                   -- BrandGuardianViolation.code — §6.3
  severity          text not null default 'error',   -- 'error' | 'warn'
  detail            jsonb not null default '{}'::jsonb,
  detected_at       timestamptz not null default now(),
  resolved_at       timestamptz,                     -- null while open
  resolution        text                             -- 'refixed' | 'kit_updated' | 'waived' | null
);
create index brand_drift_open_idx on brand_drift_event (workspace_id) where resolved_at is null;
```

RLS for both mirrors every tenant table (`03-data-model.md §10`): `workspace_id` must match a
`workspace_member` row for `auth.uid()`. Service-role bypasses RLS for server jobs.

---

## 3. `BrandKitData` — the full JSONB shape (superset of `03 §7.1`)

Order of keys is not significant. `[+extends 03 §7.1]` marks fields beyond what `03-data-model.md §7.1`
currently shows; all are **optional** so existing rows/zod stay valid. Types are given as inline comments;
the authoritative zod schema is §7.

```jsonc
{
  // ── SCHEMA / META ─────────────────────────────────────────────────────────
  "schemaVersion": 1,                    // [+extends] BrandKitData schema version (bump = migration)
  "kind": "brutal",                      // [+extends] machine key for the tenant/brand family; free string

  // ── VISUAL: PALETTE ───────────────────────────────────────────────────────
  "palette": {
    "background": "#0a0a0a",
    "surface":    "#141414",
    "text":       "#f5f5f0",
    "muted":      "#9a9a92",
    "accents":    { "gold": "#cba65e", "lime": "#b6e64a", "acidLime": "#c9ff2e" }, // CANON §1
    "allowed":    ["#0a0a0a","#141414","#f5f5f0","#9a9a92","#cba65e","#b6e64a","#c9ff2e"], // whitelist
    "sets":       { "pe": ["#cba65e","#b6e64a"] },     // named palette sets (PE angle — CANON §1)
    // [+extends] semantic ROLES so agents/compositor pick colors by intent, not by hex:
    "roles": {
      "pageBg":       "background",   // key OR hex; keys resolve against this object's leaves
      "cardBg":       "surface",
      "bodyText":     "text",
      "mutedText":    "muted",
      "primaryAccent":"accents.gold", // dotted path resolves within palette
      "ctaFill":      "accents.acidLime",
      "ctaText":      "background",
      "legalText":    "muted",
      "hairline":     "muted"
    },
    "toleranceDeltaE": 3.0             // [+extends] max CIEDE2000 distance to count as "an allowed color"
  },

  // ── VISUAL: TYPOGRAPHY ────────────────────────────────────────────────────
  "typography": {
    "display": { "family": "Playfair Display", "weights": [400,700,900], "source": "google",
                 "fallback": ["Georgia","serif"] },                                // [+extends] fallback
    "body":    { "family": "Inter",            "weights": [400,500,600,700], "source": "google",
                 "fallback": ["system-ui","Helvetica","Arial","sans-serif"] },
    // [+extends] optional self-hosted font assets (uploaded to Storage); when present, render uses these:
    "fontAssets": [
      { "family": "Playfair Display", "weight": 900, "style": "normal", "assetId": null, "format": "woff2" }
    ],
    "scale":   { "headline": 72, "subhead": 40, "body": 28, "legal": 18, "cta": 32 }, // px @ 1200-base
    // [+extends] role → {family, weight, tracking, case} so Copywriter/Compositor never guess:
    "roles": {
      "headline": { "use": "display", "weight": 900, "tracking": -0.01, "case": "none" },
      "subhead":  { "use": "display", "weight": 700, "tracking": -0.005, "case": "none" },
      "body":     { "use": "body",    "weight": 400, "tracking": 0,     "case": "none" },
      "cta":      { "use": "body",    "weight": 600, "tracking": 0.02,  "case": "none" },
      "legal":    { "use": "body",    "weight": 400, "tracking": 0,     "case": "none" },
      "kicker":   { "use": "body",    "weight": 600, "tracking": 0.08,  "case": "upper" }
    }
  },

  // ── VISUAL: LOGOS ─────────────────────────────────────────────────────────
  "logos": [
    { "id": "wordmark", "lockup": "wordmark", "assetId": "as_logo_wordmark", "minWidthPx": 160,
      "onDark": true, "onLight": false,                                            // [+extends] contrast use
      "clearSpaceRatio": 0.5,                                                       // [+extends] × logo height
      "tintable": false },                                                         // [+extends] recolor allowed?
    { "id": "symbol",   "lockup": "symbol",   "assetId": "as_logo_symbol",   "minWidthPx": 48,
      "onDark": true, "onLight": true, "clearSpaceRatio": 0.5, "tintable": true },
    { "id": "combined", "lockup": "combined", "assetId": null,               "minWidthPx": 180,
      "onDark": true, "onLight": false, "clearSpaceRatio": 0.5, "tintable": false } // [+extends] 3rd lockup
  ],

  // ── VISUAL: IMAGERY STYLE ─────────────────────────────────────────────────
  "imagery": {
    "mood": "muted-first, documentary, dark palette, high-contrast subject",       // CANON §1
    "negativePromptDefaults": "no text, no watermark, no logo, no captions, no lower-thirds", // CANON §2
    "aspectDefaults": { "single_image": "1:1", "carousel": "1:1", "video": "1:1" }, // CANON §8 base ratios
    // [+extends] structured style the ArtDirector prepends to every imagery-only prompt:
    "style": {
      "descriptors": ["editorial","documentary","sober","cinematic","desaturated","high-contrast"],
      "lighting": "low-key, single hard source, deep shadows",
      "grade": "cool shadows, warm gold highlights, low saturation",
      "composition": "negative space for text overlay; subject off-center; eye-level",
      "subjects": ["law-firm interiors","documents & contracts","hands at work","modern German offices"],
      "avoid": ["stock-photo smiles","neon gradients","3D-render clichés","emoji","clip-art","AI sheen"],
      "promptPrefix": "Editorial documentary photograph, sober and muted, dark palette, cinematic low-key lighting,",
      "referenceAssetIds": []                        // brand reference images for ref-conditioned models (R1)
    }
  },

  // ── VISUAL: ICONOGRAPHY ───────────────────────────────────────────────────
  "iconography": {                                                                  // [+extends] whole block
    "style": "line",                     // 'line' | 'solid' | 'duotone'
    "strokeWidth": 1.5,                  // for line icons, at 24px grid
    "cornerStyle": "sharp",              // 'sharp' | 'rounded'
    "gridPx": 24,
    "color": "muted",                    // palette role/key/hex
    "source": "lucide",                  // icon set the editor exposes; 'lucide' ships with shadcn/ui
    "generatedProvider": "recraft",      // vector-icon generation uses Recraft V3 vector (R7; RECRAFT_API_KEY)
    "allowedIcons": null                 // null = whole set allowed; or an array of icon names to restrict
  },

  // ── VERBAL: VOICE ─────────────────────────────────────────────────────────
  "voice": {
    "register": "sober, editorial, documentary — NOT hype AI",                     // CANON §1
    "person": "third",                                                             // 'first'|'second'|'third'
    "readingLevel": { "targetGrade": 9, "maxGrade": 11, "metric": "flesch_kincaid" }, // [+extends]
    "bannedTerms": ["revolutionary","game-changer","10x","AI-powered magic","disrupt","unleash","supercharge"],
    "bannedPatterns": [                                                             // [+extends] regex, case-insens
      "\\bworld[- ]?class\\b", "\\bnext[- ]?gen(eration)?\\b", "!{2,}", "🚀|✨|🔥"
    ],
    "preferSpecificityOverCleverness": true,                                        // CANON §7 Copywriter
    "punctuation": { "exclamationMax": 0, "emojiAllowed": false, "oxfordComma": true }, // [+extends]
    "tone": {                                                                       // [+extends] axes 0..1
      "formality": 0.75, "warmth": 0.35, "urgency": 0.25, "playfulness": 0.05, "confidence": 0.8
    },
    "doExamples": [                                                                 // [+extends] few-shot anchors
      "1.200 Kanzleien entwerfen Verträge 40 % schneller.",
      "Legal AI that drafts German contracts in seconds — reviewed by your team."
    ],
    "dontExamples": [
      "The revolutionary AI that will 10x your firm! 🚀",
      "Unleash game-changing productivity with our disruptive platform."
    ]
  },

  // ── VERBAL: MESSAGING (product names, claims, proof, value props) ─────────
  "messaging": {                                                                   // [+extends] whole block
    "productNames": [
      { "canonical": "Brutal AI", "aliases": ["Brutal","brutal.ai"], "casing": "as-written",
        "neverTranslate": true }                     // product name identical in DE & EN
    ],
    "valueProps": [
      { "id": "vp_speed",   "de": "Verträge in Sekunden statt Stunden.",
                            "en": "Contracts in seconds, not hours." },
      { "id": "vp_trust",   "de": "Von Ihrem Team geprüft — nie blind übernommen.",
                            "en": "Reviewed by your team — never taken on blind faith." },
      { "id": "vp_german",  "de": "Für deutschsprachige Kanzleien gebaut.",
                            "en": "Built for German-speaking law firms." }
    ],
    "approvedClaims": [                              // claims Copywriter MAY use verbatim; BrandGuardian gates
      { "id": "cl_firms", "de": "Über 1.200 Kanzleien nutzen Brutal AI.",
                          "en": "Over 1,200 firms use Brutal AI.",
        "proofId": "pf_firms", "requiresProof": true, "verticals": ["legal_ai_de"] },
      { "id": "cl_faster","de": "40 % schnelleres Entwerfen.",
                          "en": "40% faster drafting.",
        "proofId": "pf_faster", "requiresProof": true, "verticals": ["legal_ai_de"] }
    ],
    "proofPoints": [                                 // evidence backing claims (lineage for trust)
      { "id": "pf_firms",  "stat": "1.200", "unit": "firms", "asOf": "2026-06",
        "source": "internal-metrics", "spoken": { "de": "eintausendzweihundert", "en": "one thousand two hundred" } },
      { "id": "pf_faster", "stat": "40", "unit": "%", "asOf": "2026-Q2",
        "source": "customer-study-2026", "spoken": { "de": "vierzig Prozent", "en": "forty percent" } }
    ],
    "bannedClaims": [                               // claims that are legally/ethically off-limits
      { "de": "garantierter Prozesserfolg", "en": "guaranteed case success" },
      { "de": "ersetzt Ihren Anwalt", "en": "replaces your lawyer" }
    ]
  },

  // ── VERBAL: DISCLAIMERS (required legal, per vertical) ────────────────────
  "disclaimers": {
    "legal_ai_de": {
      "de": "Rechtlicher Hinweis: Ergebnisse ersetzen keine anwaltliche Beratung.",
      "en": "Legal notice: outputs do not constitute legal advice.",
      "required": true,
      "appliesToVerticals": ["legal_ai_de"],        // [+extends] when this disclaimer is mandatory
      "placement": "footer", "minFontPx": 18, "removable": false // [+extends] render/lint rules
    },
    "pe": {
      "de": "Kapitalanlagen bergen Risiken.",
      "en": "Investments carry risk.",
      "required": false,
      "appliesToVerticals": ["pe"], "placement": "footer", "minFontPx": 18, "removable": false
    }
  },

  // ── DISCLOSURES (AI-content transparency, per vertical) ───────────────────
  "disclosures": {                                                                 // [+extends] whole block (CANON §12 L10)
    "aiContent": {                       // AI-generated-content disclosure (EU legal/PE relevance)
      "de": "Mit KI erstellt.",
      "en": "Created with AI.",
      "enabled": true,                   // include the disclosure by default when a Variant uses AI imagery
      "placement": "footer",             // 'footer' | 'header' | 'overlay' | 'caption'
      "minFontPx": 18,
      // BrandGuardian severity by vertical: 'error' verticals hard-gate absence; else it warns (default).
      // Empty/absent errorVerticals ⇒ warn everywhere (CANON §12 L10).
      "errorVerticals": ["legal_ai_de","pe"]
    }
  },

  // ── LOCALIZATION (DE / EN first-class) ────────────────────────────────────
  "localization": {
    "locales": ["de","en"],
    "default": "de",                                // CANON §1 seed default is German
    "transcreate": true,                            // NOT literal translation (CANON §7 LocalizationAgent)
    "ttsNumberSpelling": true,                      // e.g. "zwölfhundert" (R2 §4.4)
    // [+extends] per-locale rules the LocalizationAgent & renderer obey:
    "byLocale": {
      "de": { "quotes": "„…“", "decimalSep": ",", "thousandSep": ".", "formality": "Sie",
              "dateFormat": "DD.MM.YYYY", "numberSpellOut": true },
      "en": { "quotes": "“…”", "decimalSep": ".", "thousandSep": ",", "formality": "neutral",
              "dateFormat": "MMM D, YYYY", "numberSpellOut": true }
    },
    "glossary": [                                   // terms that must render identically per locale
      { "term": "Brutal AI", "de": "Brutal AI", "en": "Brutal AI", "neverTranslate": true },
      { "term": "Kanzlei",   "de": "Kanzlei",   "en": "law firm",  "neverTranslate": false }
    ]
  },

  // ── SAFE ZONES (LinkedIn crop/overlap defaults; CANON §8) ─────────────────
  "safeZoneDefaults": {
    "profileOverlap": { "top": 0.12, "left": 0.0 },  // fraction of canvas covered by the profile avatar/name
    "seeMoreFold": 0.85                              // fraction below which text risks the "see more" fold
  }
}
```

### 3.1 Field reference (roles, types, who consumes it)

| Path | Type | Required | Consumed by | Notes |
|---|---|---|---|---|
| `schemaVersion` | int | yes | migrations | bump ⇒ `BrandKitData` migration; distinct from `brand_kit.version` |
| `palette.allowed` | string[] hex | yes | `BrandGuardian` | whitelist; every layer fill/stroke must be within `toleranceDeltaE` of one |
| `palette.roles` | map | yes | `CompositorPlanner`, editor | agents pick by role → color, never raw hex |
| `palette.toleranceDeltaE` | number | no (def 3.0) | `BrandGuardian` | CIEDE2000 distance; 0 = exact match only |
| `typography.roles` | map | yes | `Copywriter`, `CompositorPlanner`, render | role → family/weight/tracking/case |
| `typography.fontAssets` | array | no | `packages/render` | self-hosted fonts; Google fonts fetched by `source` otherwise |
| `logos[].onDark/onLight` | bool | yes | `CompositorPlanner` | which logo variant on which background |
| `logos[].clearSpaceRatio` | number | yes | `BrandGuardian`, editor | min padding = ratio × logo height |
| `imagery.style.promptPrefix` | string | yes | `ArtDirector` | prepended to every imagery-only prompt (CANON §2) |
| `imagery.negativePromptDefaults` | string | yes | `ArtDirector` | ensures no baked text (CANON §2) |
| `iconography.*` | object | no | editor, `CompositorPlanner` | icon set + style; `recraft` for generated vector icons |
| `voice.bannedTerms` | string[] | yes | `BrandGuardian`, `Copywriter` | exact-token ban (case-insensitive, word-boundary) |
| `voice.bannedPatterns` | string[] regex | no | `BrandGuardian` | regex ban; compile once, cache |
| `voice.readingLevel` | object | no | `Copywriter`, `Critic` | Flesch-Kincaid target/max grade |
| `messaging.approvedClaims` | array | no | `Copywriter`, `BrandGuardian` | claims usable verbatim; `requiresProof` ties to a proof point |
| `messaging.proofPoints` | array | no | `Copywriter`, `LocalizationAgent` | evidence; `spoken` is TTS-safe per locale (R2 §4.4) |
| `messaging.bannedClaims` | array | no | `BrandGuardian` | hard-blocked claims (legal/ethical) |
| `disclaimers.<key>.required` | bool | yes | `BrandGuardian` | if true & vertical matches ⇒ mandatory `legal` layer |
| `disclaimers.<key>.appliesToVerticals` | string[] | no | `BrandGuardian` | scopes mandatory-ness to verticals |
| `disclosures.aiContent` | object | no | `BrandGuardian`, `CompositorPlanner` | AI-content disclosure text/placement; **warn by default, error when the Variant's vertical ∈ `errorVerticals`** (CANON §12 L10) |
| `disclosures.aiContent.errorVerticals` | string[] | no | `BrandGuardian` | verticals where absence hard-gates (e.g. `legal_ai_de`, `pe`); empty ⇒ warn-only everywhere |
| `localization.default` | locale | yes | `IntakeAgent`, `LocalizationAgent` | default target locale |
| `localization.byLocale.<l>` | object | no | render, `LocalizationAgent` | quotes/separators/formality per locale |
| `safeZoneDefaults` | object | yes | `CompositorPlanner`, exporter | seeds `LayerTree.safeZones` |

**Cross-reference — how `disclaimers` connects to the `legal` layer (from `03-data-model.md §6`):** a `legal`
layer carries `requiredBy: "brand_kit.disclaimers.legal_ai_de"` so `BrandGuardian` can verify presence by
provenance. `smart` layers (`03 §12.2` `SmartLayer`) bind to `messaging.proofPoints` via `binding` and use
`spoken`/`ttsTemplate` for TTS-safe numbers.

---

## 4. Governance, versioning & the publish flow

### 4.1 Immutability rules (enforced, not conventional)

1. **A published `BrandKit` row is immutable.** No `UPDATE` to `data` after creation, except the
   `is_active` boolean and `updated_at`. Enforce with a trigger:

```sql
-- 0007_triggers.sql — forbid mutating a published brand kit's data
create or replace function brand_kit_guard_immutable() returns trigger
language plpgsql as $$
begin
  if (old.data is distinct from new.data)
     or (old.version is distinct from new.version)
     or (old.workspace_id is distinct from new.workspace_id) then
    raise exception 'brand_kit % v% is immutable; publish a new version instead', old.id, old.version;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger brand_kit_immutable before update on brand_kit
  for each row execute function brand_kit_guard_immutable();
```

2. **Drafts live outside `brand_kit`.** In-progress edits are held in app state / a `draft` row keyed by
   `(workspace_id, base_version)` (see §4.3) and only *materialized* as a new `brand_kit` row on **Publish**.
   **⚑ ASSUMPTION A-09-3:** drafts are stored in a `brand_kit_draft` table (or Supabase Storage JSON) —
   **the build MAY choose either**; the contract is only that nothing enters `brand_kit` until Publish.

3. **Activation is atomic.** Publishing v(N+1) as active must, in one transaction: insert the new row with
   `is_active=true`, and set the prior active row's `is_active=false`. The partial unique index enforces the
   "exactly one active" invariant (a race that leaves two active rows fails the index).

```sql
-- server action (pseudo-SQL, run in a transaction with SUPABASE_SERVICE_ROLE_KEY)
begin;
  update brand_kit set is_active = false
   where workspace_id = $ws and is_active = true;
  insert into brand_kit (workspace_id, version, name, is_active, data, created_by, created_by_kind)
   values ($ws, (select coalesce(max(version),0)+1 from brand_kit where workspace_id=$ws),
           $name, true, $data::jsonb, $uid, 'human');
commit;
```

### 4.2 The version diff (`brand_kit_diff`)

On every Publish, compute a structured diff old→new and write a `brand_kit_diff` row. This powers the "what
changed between v3 and v4?" audit and lets `BrandGuardian` explain drift.

```ts
// packages/shared — BrandKitChange
type BrandKitChange = {
  path: string;                 // JSON pointer, e.g. "/palette/allowed/2"
  op: 'add' | 'remove' | 'replace';
  before?: unknown;
  after?: unknown;
  impact: 'breaking' | 'additive' | 'cosmetic'; // breaking = old Variants may now fail gate
};
```

- **`impact` classification (deterministic):** removing an `allowed` color / adding a `bannedTerm` /
  raising `required` on a disclaimer ⇒ **breaking** (previously-passing Variants may now be off-contract →
  seed §8 drift scan). Adding a color / claim / value prop ⇒ **additive**. Changing a `promptPrefix` or
  `tone` axis ⇒ **cosmetic**.
- The one-paragraph `summary` MAY be authored by an LLM call (`ANTHROPIC_API_KEY`; the `LocalizationAgent`
  or a lightweight prompt) but the `changes[]` array is a **pure structural diff** (deterministic; no LLM).

> **`VERIFY current docs before coding`** — use a maintained JSON-diff/JSON-Patch lib (RFC 6902 shape).
> Confirm the current API of whatever lib you pick (`fast-json-patch`, `microdiff`, etc.) before coding.

### 4.3 Version lifecycle state machine

```
(none) ──create/import──►  DRAFT ──validate(zod+BrandGuardian.validateKit)──► VALID_DRAFT
                                                                                  │ publish (atomic §4.1)
                                                                                  ▼
   ┌───────────────────────────────────────────────────────────►  ACTIVE (is_active=true)
   │                                                                    │ new version published
   │                                                                    ▼
   └──────────────────────────────────────────────────────────►  SUPERSEDED (is_active=false, immutable)
```

- You can **re-activate** a superseded version (roll back) — atomic flip of `is_active`; no data mutation.
- Every activation and publish writes an `AuditLog` row (`03-data-model.md` audit table) and, on publish,
  a `brand_kit_diff` row.

---

## 5. Resolution: which kit does a given render use?

### 5.1 Precedence (highest wins)

1. `brief.brand_kit_id` if non-null → that exact row (and thus its `version`).
2. Else the workspace's `is_active` row **at the time the `Brief` was created** (pin, don't float).
3. Else (no kit at all) → **guided bootstrap** (§10) seeded from the Brutal defaults for the seed tenant, or
   a minimal generated kit for a new tenant.

### 5.2 Pinning helper (server)

```ts
// apps/web — resolve + pin at brief creation; store on brief.brand_kit_id and copy version into every Variant
async function resolveBrandKit(sb: SupabaseClient, workspaceId: string, briefBrandKitId?: string) {
  if (briefBrandKitId) return getById(sb, briefBrandKitId);
  const { data } = await sb.from('brand_kit')
    .select('*').eq('workspace_id', workspaceId).eq('is_active', true).single();
  if (!data) throw new NeedsBootstrap(workspaceId);   // → §10 guided flow
  return data; // caller writes variant.brand_kit_version = data.version (lineage — CANON §5)
}
```

**Invariant:** once a `Variant` exists, its `brand_kit_version` never changes — even if the kit is later
updated. Re-brand = new Variants (or explicit re-gen), never silent mutation.

---

## 6. `BrandGuardian` — the mechanical gate

`BrandGuardian` (CANON §7) is a **hard gate**: a `Variant`/`Slide` that fails cannot reach the board; it
loops back to the author agent (`Copywriter`/`ArtDirector`/`CompositorPlanner`), bounded to **≤2 rounds**
(CANON §7; R7 §1.5). All runs are logged as `AgentRun` with `cost_usd`. It runs **two phases**:

- **`validateKit(data)`** — is the `BrandKit` itself well-formed? (zod §7 + semantic checks: every
  `roles.*` resolves, every `approvedClaims.proofId` exists, every `disclaimers` locale ⊇ `localization.locales`).
- **`checkVariant(variant, kit)`** — is this rendered Variant on-contract? Returns `BrandGuardianReport`.

### 6.1 `checkVariant` — the complete rule set

| # | Rule | Reads | Fail code | Severity |
|---|---|---|---|---|
| 1 | Every `text/cta/legal/logo tint/shape fill/stroke` color ∈ `palette.allowed` (within `toleranceDeltaE`) | `palette` | `COLOR_OFF_PALETTE` | error |
| 2 | Every text/cta/legal `fontFamily` ∈ `typography` families (display/body/fallback) | `typography` | `FONT_OFF_KIT` | error |
| 3 | Copy contains no `voice.bannedTerms` (case-insens, word-boundary) | `voice.bannedTerms` | `BANNED_TERM` | error |
| 4 | Copy matches no `voice.bannedPatterns` regex | `voice.bannedPatterns` | `BANNED_PATTERN` | error |
| 5 | Copy uses no `messaging.bannedClaims` | `messaging.bannedClaims` | `BANNED_CLAIM` | error |
| 6 | Every required disclaimer for the Variant's vertical is present as a `legal` layer (matched via `requiredBy`) | `disclaimers` | `MISSING_DISCLAIMER` | error |
| 7 | Any non-approved statistical claim must map to a `proofPoints` entry (heuristic: `\d+ *%|\d[\d.,]*\+? (firms|Kanzleien)`) | `messaging` | `UNPROVEN_CLAIM` | warn→error* |
| 8 | Reading level ≤ `voice.readingLevel.maxGrade` (per locale) | `voice.readingLevel` | `READING_LEVEL` | warn |
| 9 | Logo clear-space ≥ `logos[].clearSpaceRatio` × height; logo width ≥ `minWidthPx` | `logos` | `LOGO_VIOLATION` | error |
| 10 | Correct logo variant for background (`onDark`/`onLight`) | `logos`, canvas bg | `LOGO_CONTRAST` | warn |
| 11 | Localized Variant present for every `Brief.languages` (transcreated, not empty) | `localization` | `MISSING_LOCALE` | error |
| 12 | Text color vs background contrast ≥ WCAG AA (4.5:1 body / 3:1 large) | derived | `LOW_CONTRAST` | warn |
| 13 | Every `smart` layer `binding` resolves against `messaging.proofPoints`/brief data | `messaging` | `SMART_UNBOUND` | error |
| 14 | If `disclosures.aiContent.enabled` & the Variant uses AI-generated imagery, an AI-content disclosure `legal` layer is present | `disclosures.aiContent` | `MISSING_AI_DISCLOSURE` | warn→error† |

\* Rule 7 is **warn** in draft, **error** at publish/export when `requiresProof` claims are used without a
matching proof point.

† Rule 14 (CANON §12 L10) is **warn by default**, and **error** when the Variant's `vertical` ∈
`disclosures.aiContent.errorVerticals` (e.g. `legal_ai_de`, `pe` — EU legal/PE require it). Empty/absent
`errorVerticals` ⇒ warn everywhere. Fix hint returns the localized `disclosures.aiContent.<locale>` string and
its `placement` so `CompositorPlanner` can add the `legal` layer mechanically.

### 6.2 Signature & report shape

```ts
// packages/shared — BrandGuardian contracts
interface BrandGuardian {
  validateKit(data: BrandKitData): KitValidation;
  checkVariant(input: {
    layerTree?: LayerTreeT; videoComposition?: VideoCompositionT;
    copy: { locale: LocaleCode; text: string }[]; vertical: string; canvasBg: string;
  }, kit: BrandKitData): BrandGuardianReport;
}
type BrandGuardianViolation = {
  code: 'COLOR_OFF_PALETTE'|'FONT_OFF_KIT'|'BANNED_TERM'|'BANNED_PATTERN'|'BANNED_CLAIM'|
        'MISSING_DISCLAIMER'|'UNPROVEN_CLAIM'|'READING_LEVEL'|'LOGO_VIOLATION'|'LOGO_CONTRAST'|
        'MISSING_LOCALE'|'LOW_CONTRAST'|'SMART_UNBOUND'|'MISSING_AI_DISCLOSURE';
  severity: 'error'|'warn';
  layerId?: string; slideIndex?: number; locale?: LocaleCode;
  message: string;               // human-readable, localized to the operator's UI locale
  found?: unknown; expected?: unknown;
  fixHint?: string;              // machine hint the author agent can act on (e.g. nearest allowed color)
};
type BrandGuardianReport = { pass: boolean; violations: BrandGuardianViolation[]; checkedVersion: number; };
```

`pass = violations.every(v => v.severity !== 'error')`. On `!pass`, the orchestrator loops back to the
authoring agent with `violations` (each `fixHint` makes the fix mechanical — e.g. `COLOR_OFF_PALETTE` returns
the nearest `palette.allowed` hex; `BANNED_TERM` returns the offending token so `Copywriter` rewrites).

### 6.3 Reference implementations (deterministic; no LLM in the hot path)

```ts
// nearest-allowed-color check (rule 1) — deltaE via CIEDE2000
import { differenceCiede2000, converter } from 'culori'; // VERIFY current API before coding
const toLab = converter('lab');
function nearestAllowed(hex: string, allowed: string[], tol: number) {
  const de = differenceCiede2000();
  let best = { hex: allowed[0], d: Infinity };
  for (const a of allowed) { const d = de(toLab(hex), toLab(a)); if (d < best.d) best = { hex: a, d }; }
  return { ok: best.d <= tol, nearest: best.hex, delta: best.d };
}

// banned-term check (rule 3) — word-boundary, case-insensitive, diacritic-aware
function findBannedTerms(text: string, banned: string[]): string[] {
  const norm = (s: string) => s.normalize('NFKC').toLowerCase();
  const t = norm(text);
  return banned.filter(b => new RegExp(`\\b${escapeRegExp(norm(b))}\\b`, 'iu').test(t));
}

// reading level (rule 8) — Flesch-Kincaid grade; use a maintained lib per locale
// VERIFY: `text-readability`/`flesch-kincaid` support DE syllable counting; DE needs a German syllable model.
```

> **`VERIFY current docs before coding`** — (a) `culori` `differenceCiede2000`/`converter` signatures;
> (b) a Flesch-Kincaid implementation with **German** syllabification (English-only libs mis-score DE — use a
> DE-aware syllable counter or Amstad/Toni-Amstad DE readability variant). **⚑ ASSUMPTION A-09-4:** if no
> reliable DE reading-level lib exists at build time, rule 8 ships **warn-only** for `de` and the target grade
> is advisory until calibrated.

---

## 7. `packages/shared` zod schema (`brand-kit.ts`) — authoritative

Mirrors §3 exactly. This is the reconciliation target for `03-data-model.md §12` (`brand-kit.ts`
`BrandKitData`). All `[+extends]` fields are `.optional()` so the existing seed validates.

```ts
import { z } from 'zod';
import { LocaleCode } from './enums';

const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected #rrggbb');
const PaletteRoleVal = z.string();            // hex OR dotted key resolved at use (e.g. "accents.gold")

export const FontSpec = z.object({
  family: z.string(), weights: z.array(z.number().int()).default([400]),
  source: z.enum(['google','self','system']).default('google'),
  fallback: z.array(z.string()).default([]),
});
export const FontRole = z.object({
  use: z.enum(['display','body']), weight: z.number().int(),
  tracking: z.number().default(0), case: z.enum(['none','upper','lower','title']).default('none'),
});
export const LogoSpec = z.object({
  id: z.string(), lockup: z.enum(['wordmark','symbol','combined']),
  assetId: z.string().nullable(), minWidthPx: z.number().int(),
  onDark: z.boolean().default(true), onLight: z.boolean().default(false),
  clearSpaceRatio: z.number().default(0.5), tintable: z.boolean().default(false),
});
export const LocalizedText = z.object({ de: z.string(), en: z.string() });

export const ClaimSpec = z.object({
  id: z.string(), de: z.string(), en: z.string(),
  proofId: z.string().optional(), requiresProof: z.boolean().default(false),
  verticals: z.array(z.string()).default([]),
});
export const ProofPoint = z.object({
  id: z.string(), stat: z.string(), unit: z.string().optional(), asOf: z.string().optional(),
  source: z.string().optional(),
  spoken: z.record(z.string(), z.string()).optional(),   // per-locale TTS-safe (R2 §4.4)
});
export const DisclaimerSpec = z.object({
  de: z.string(), en: z.string(), required: z.boolean().default(false),
  appliesToVerticals: z.array(z.string()).optional(),
  placement: z.enum(['footer','header','overlay']).default('footer'),
  minFontPx: z.number().int().default(18), removable: z.boolean().default(false),
});
// [+extends] AI-content disclosure (CANON §12 L10). warn-by-default; error when vertical ∈ errorVerticals.
export const AiContentDisclosure = z.object({
  de: z.string(), en: z.string(),
  enabled: z.boolean().default(true),
  placement: z.enum(['footer','header','overlay','caption']).default('footer'),
  minFontPx: z.number().int().default(18),
  errorVerticals: z.array(z.string()).default([]),
});
export const Disclosures = z.object({ aiContent: AiContentDisclosure.optional() });

export const BrandKitData = z.object({
  schemaVersion: z.literal(1).default(1),
  kind: z.string().optional(),

  palette: z.object({
    background: Hex, surface: Hex, text: Hex, muted: Hex,
    accents: z.record(z.string(), Hex),
    allowed: z.array(Hex).min(1),
    sets: z.record(z.string(), z.array(Hex)).optional(),
    roles: z.record(z.string(), PaletteRoleVal).optional(),
    toleranceDeltaE: z.number().default(3.0),
  }),

  typography: z.object({
    display: FontSpec, body: FontSpec,
    fontAssets: z.array(z.object({ family: z.string(), weight: z.number().int(),
      style: z.string().default('normal'), assetId: z.string().nullable(),
      format: z.string().default('woff2') })).optional(),
    scale: z.record(z.string(), z.number()),
    roles: z.record(z.string(), FontRole).optional(),
  }),

  logos: z.array(LogoSpec),

  imagery: z.object({
    mood: z.string(), negativePromptDefaults: z.string(),
    aspectDefaults: z.record(z.string(), z.string()),
    style: z.object({
      descriptors: z.array(z.string()).default([]),
      lighting: z.string().optional(), grade: z.string().optional(),
      composition: z.string().optional(),
      subjects: z.array(z.string()).default([]), avoid: z.array(z.string()).default([]),
      promptPrefix: z.string().default(''),
      referenceAssetIds: z.array(z.string()).default([]),
    }).optional(),
  }),

  iconography: z.object({
    style: z.enum(['line','solid','duotone']).default('line'),
    strokeWidth: z.number().default(1.5), cornerStyle: z.enum(['sharp','rounded']).default('sharp'),
    gridPx: z.number().int().default(24), color: z.string().default('muted'),
    source: z.string().default('lucide'), generatedProvider: z.string().default('recraft'),
    allowedIcons: z.array(z.string()).nullable().default(null),
  }).optional(),

  voice: z.object({
    register: z.string(), person: z.enum(['first','second','third']).default('third'),
    readingLevel: z.object({ targetGrade: z.number(), maxGrade: z.number(),
      metric: z.string().default('flesch_kincaid') }).optional(),
    bannedTerms: z.array(z.string()).default([]),
    bannedPatterns: z.array(z.string()).default([]),
    preferSpecificityOverCleverness: z.boolean().default(true),
    punctuation: z.object({ exclamationMax: z.number().int().default(0),
      emojiAllowed: z.boolean().default(false), oxfordComma: z.boolean().default(true) }).optional(),
    tone: z.record(z.string(), z.number()).optional(),
    doExamples: z.array(z.string()).default([]), dontExamples: z.array(z.string()).default([]),
  }),

  messaging: z.object({
    productNames: z.array(z.object({ canonical: z.string(), aliases: z.array(z.string()).default([]),
      casing: z.string().default('as-written'), neverTranslate: z.boolean().default(true) })).default([]),
    valueProps: z.array(LocalizedText.extend({ id: z.string() })).default([]),
    approvedClaims: z.array(ClaimSpec).default([]),
    proofPoints: z.array(ProofPoint).default([]),
    bannedClaims: z.array(LocalizedText).default([]),
  }).optional(),

  disclaimers: z.record(z.string(), DisclaimerSpec),

  disclosures: Disclosures.optional(),   // [+extends] AI-content disclosure (CANON §12 L10)

  localization: z.object({
    locales: z.array(LocaleCode).min(1), default: LocaleCode,
    transcreate: z.boolean().default(true), ttsNumberSpelling: z.boolean().default(true),
    byLocale: z.record(z.string(), z.object({
      quotes: z.string().optional(), decimalSep: z.string().optional(), thousandSep: z.string().optional(),
      formality: z.string().optional(), dateFormat: z.string().optional(),
      numberSpellOut: z.boolean().optional(),
    })).optional(),
    glossary: z.array(z.object({ term: z.string(), de: z.string(), en: z.string(),
      neverTranslate: z.boolean().default(false) })).default([]),
  }),

  safeZoneDefaults: z.object({
    profileOverlap: z.object({ top: z.number(), left: z.number() }),
    seeMoreFold: z.number(),
  }),
});
export type BrandKitDataT = z.infer<typeof BrandKitData>;
```

> **`VERIFY current docs before coding`** — confirm the installed **zod** major version's `z.record(keyType,
> valueType)` two-arg form and `.default()` semantics (zod v3 vs v4 differ). Keep this file and
> `03-data-model.md §12` byte-identical; a CI check should `deepEqual` the two schema modules or import one
> from the other (prefer a single source: `packages/shared/schemas/brand-kit.ts`, re-exported by both docs).

---

## 8. Drift detection

Two flavors: **pre-ship** (the `BrandGuardian` gate, §6 — blocks) and **post-hoc** (this section — flags
already-shipped Variants when the kit changes or a manual edit slips through).

### 8.1 Triggers that run a post-hoc scan

| Trigger | Scope scanned | Why |
|---|---|---|
| New `brand_kit` version published with a **breaking** `impact` change (§4.2) | all active/exported Variants pinned to older versions | a removed color / new banned term retroactively invalidates old ads |
| Manual editor save (`LayerPatch` applied outside the gen loop) | the edited Variant | drag-editing can introduce off-palette colors |
| Nightly `Cron`/`Inngest` job | Variants exported in the last N days | catch anything the gate missed |
| Pre-export | the exact Variant being exported | last line of defense before a file leaves the platform |

### 8.2 Scan implementation

```ts
// apps/web/server or an Inngest function — reuses BrandGuardian.checkVariant (§6)
async function scanForDrift(sb, workspaceId: string, opts: { since?: string; onlyExported?: boolean }) {
  const kit = await getActiveKitData(sb, workspaceId);
  const variants = await loadVariants(sb, workspaceId, opts);   // RLS-scoped
  for (const v of variants) {
    const report = brandGuardian.checkVariant(toCheckInput(v), kit);
    for (const viol of report.violations.filter(x => x.severity === 'error')) {
      await sb.from('brand_drift_event').insert({
        workspace_id: workspaceId, variant_id: v.id, brand_kit_version: v.brand_kit_version,
        kind: viol.code, severity: viol.severity, detail: viol,
      });
    }
  }
}
```

- Open `brand_drift_event` rows surface in the UI as a **"Brand drift" queue**. Each row offers three
  resolutions: **Re-fix** (auto-iterate the Variant against the current kit → `resolution='refixed'`),
  **Update kit** (the intended color/term was a deliberate change → `resolution='kit_updated'`), or
  **Waive** (accepted exception; requires a note → `AuditLog`).
- **Never** silently mutate a shipped Variant — drift resolution always creates a new Variant or a new kit
  version, preserving lineage (CANON §5).

### 8.3 Semantic voice drift (LLM, advisory only)

Mechanical checks catch tokens/colors/fonts. **Register drift** ("this reads like hype even without a banned
word") is caught by an **advisory** LLM pass (`ANTHROPIC_API_KEY`; reuse the `brand-voice-enforcement`
skill's validator or a `Critic` sub-call) that scores copy against `voice.tone`/`doExamples`/`dontExamples`.
It **never hard-gates** (non-deterministic); it raises a `warn` and a suggested rewrite for human review.

---

## 9. SEED — the Brutal AI Brand Kit (v1)

Canonical seed from CANON §0/§1. This restates `03-data-model.md §7.2` and **adds** the `[+extends]` blocks
from §3. It seeds the first tenant so a fresh install can generate an on-brand ad with zero setup.

`supabase/seed.sql` (append to the workspace insert already in `03 §7.2`):

```sql
-- Seed the first/seed tenant (Brutal AI — CANON §0/§1) and its v1 brand kit.
insert into workspace (id, name, slug, default_locale)
values ('00000000-0000-0000-0000-000000000001','Brutal AI','brutal','de')
on conflict (id) do nothing;

insert into brand_kit (workspace_id, version, name, is_active, created_by_kind, data)
values (
  '00000000-0000-0000-0000-000000000001', 1, 'Brutal Seed Kit', true, 'system',
  $${
    "schemaVersion": 1,
    "kind": "brutal",
    "palette": {
      "background": "#0a0a0a", "surface": "#141414", "text": "#f5f5f0", "muted": "#9a9a92",
      "accents": { "gold": "#cba65e", "lime": "#b6e64a", "acidLime": "#c9ff2e" },
      "allowed": ["#0a0a0a","#141414","#f5f5f0","#9a9a92","#cba65e","#b6e64a","#c9ff2e"],
      "sets": { "pe": ["#cba65e","#b6e64a"] },
      "roles": {
        "pageBg": "background", "cardBg": "surface", "bodyText": "text", "mutedText": "muted",
        "primaryAccent": "accents.gold", "ctaFill": "accents.acidLime", "ctaText": "background",
        "legalText": "muted", "hairline": "muted"
      },
      "toleranceDeltaE": 3.0
    },
    "typography": {
      "display": { "family": "Playfair Display", "weights": [400,700,900], "source": "google",
                   "fallback": ["Georgia","serif"] },
      "body":    { "family": "Inter", "weights": [400,500,600,700], "source": "google",
                   "fallback": ["system-ui","Helvetica","Arial","sans-serif"] },
      "scale":   { "headline": 72, "subhead": 40, "body": 28, "legal": 18, "cta": 32 },
      "roles": {
        "headline": { "use": "display", "weight": 900, "tracking": -0.01, "case": "none" },
        "subhead":  { "use": "display", "weight": 700, "tracking": -0.005, "case": "none" },
        "body":     { "use": "body",    "weight": 400, "tracking": 0,     "case": "none" },
        "cta":      { "use": "body",    "weight": 600, "tracking": 0.02,  "case": "none" },
        "legal":    { "use": "body",    "weight": 400, "tracking": 0,     "case": "none" },
        "kicker":   { "use": "body",    "weight": 600, "tracking": 0.08,  "case": "upper" }
      }
    },
    "logos": [
      { "id": "wordmark", "lockup": "wordmark", "assetId": null, "minWidthPx": 160,
        "onDark": true, "onLight": false, "clearSpaceRatio": 0.5, "tintable": false },
      { "id": "symbol",   "lockup": "symbol",   "assetId": null, "minWidthPx": 48,
        "onDark": true, "onLight": true,  "clearSpaceRatio": 0.5, "tintable": true }
    ],
    "imagery": {
      "mood": "muted-first, documentary, dark palette, high-contrast subject",
      "negativePromptDefaults": "no text, no watermark, no logo, no captions, no lower-thirds",
      "aspectDefaults": { "single_image": "1:1", "carousel": "1:1", "video": "1:1" },
      "style": {
        "descriptors": ["editorial","documentary","sober","cinematic","desaturated","high-contrast"],
        "lighting": "low-key, single hard source, deep shadows",
        "grade": "cool shadows, warm gold highlights, low saturation",
        "composition": "negative space for text overlay; subject off-center; eye-level",
        "subjects": ["law-firm interiors","documents & contracts","hands at work","modern German offices"],
        "avoid": ["stock-photo smiles","neon gradients","3D-render clichés","emoji","clip-art","AI sheen"],
        "promptPrefix": "Editorial documentary photograph, sober and muted, dark palette, cinematic low-key lighting,",
        "referenceAssetIds": []
      }
    },
    "iconography": {
      "style": "line", "strokeWidth": 1.5, "cornerStyle": "sharp", "gridPx": 24,
      "color": "muted", "source": "lucide", "generatedProvider": "recraft", "allowedIcons": null
    },
    "voice": {
      "register": "sober, editorial, documentary — NOT hype AI",
      "person": "third",
      "readingLevel": { "targetGrade": 9, "maxGrade": 11, "metric": "flesch_kincaid" },
      "bannedTerms": ["revolutionary","game-changer","10x","AI-powered magic","disrupt","unleash","supercharge"],
      "bannedPatterns": ["\\bworld[- ]?class\\b","\\bnext[- ]?gen(eration)?\\b","!{2,}","🚀|✨|🔥"],
      "preferSpecificityOverCleverness": true,
      "punctuation": { "exclamationMax": 0, "emojiAllowed": false, "oxfordComma": true },
      "tone": { "formality": 0.75, "warmth": 0.35, "urgency": 0.25, "playfulness": 0.05, "confidence": 0.8 },
      "doExamples": [
        "1.200 Kanzleien entwerfen Verträge 40 % schneller.",
        "Legal AI that drafts German contracts in seconds — reviewed by your team."
      ],
      "dontExamples": [
        "The revolutionary AI that will 10x your firm! 🚀",
        "Unleash game-changing productivity with our disruptive platform."
      ]
    },
    "messaging": {
      "productNames": [
        { "canonical": "Brutal AI", "aliases": ["Brutal","brutal.ai"], "casing": "as-written", "neverTranslate": true }
      ],
      "valueProps": [
        { "id": "vp_speed",  "de": "Verträge in Sekunden statt Stunden.", "en": "Contracts in seconds, not hours." },
        { "id": "vp_trust",  "de": "Von Ihrem Team geprüft — nie blind übernommen.", "en": "Reviewed by your team — never taken on blind faith." },
        { "id": "vp_german", "de": "Für deutschsprachige Kanzleien gebaut.", "en": "Built for German-speaking law firms." }
      ],
      "approvedClaims": [
        { "id": "cl_firms",  "de": "Über 1.200 Kanzleien nutzen Brutal AI.", "en": "Over 1,200 firms use Brutal AI.",
          "proofId": "pf_firms", "requiresProof": true, "verticals": ["legal_ai_de"] },
        { "id": "cl_faster", "de": "40 % schnelleres Entwerfen.", "en": "40% faster drafting.",
          "proofId": "pf_faster", "requiresProof": true, "verticals": ["legal_ai_de"] }
      ],
      "proofPoints": [
        { "id": "pf_firms",  "stat": "1.200", "unit": "firms", "asOf": "2026-06", "source": "internal-metrics",
          "spoken": { "de": "eintausendzweihundert", "en": "one thousand two hundred" } },
        { "id": "pf_faster", "stat": "40", "unit": "%", "asOf": "2026-Q2", "source": "customer-study-2026",
          "spoken": { "de": "vierzig Prozent", "en": "forty percent" } }
      ],
      "bannedClaims": [
        { "de": "garantierter Prozesserfolg", "en": "guaranteed case success" },
        { "de": "ersetzt Ihren Anwalt", "en": "replaces your lawyer" }
      ]
    },
    "disclaimers": {
      "legal_ai_de": { "de": "Rechtlicher Hinweis: Ergebnisse ersetzen keine anwaltliche Beratung.",
                       "en": "Legal notice: outputs do not constitute legal advice.",
                       "required": true, "appliesToVerticals": ["legal_ai_de"],
                       "placement": "footer", "minFontPx": 18, "removable": false },
      "pe":          { "de": "Kapitalanlagen bergen Risiken.", "en": "Investments carry risk.",
                       "required": false, "appliesToVerticals": ["pe"],
                       "placement": "footer", "minFontPx": 18, "removable": false }
    },
    "disclosures": {
      "aiContent": { "de": "Mit KI erstellt.", "en": "Created with AI.",
                     "enabled": true, "placement": "footer", "minFontPx": 18,
                     "errorVerticals": ["legal_ai_de","pe"] }
    },
    "localization": {
      "locales": ["de","en"], "default": "de", "transcreate": true, "ttsNumberSpelling": true,
      "byLocale": {
        "de": { "quotes": "„…“", "decimalSep": ",", "thousandSep": ".", "formality": "Sie",
                "dateFormat": "DD.MM.YYYY", "numberSpellOut": true },
        "en": { "quotes": "“…”", "decimalSep": ".", "thousandSep": ",", "formality": "neutral",
                "dateFormat": "MMM D, YYYY", "numberSpellOut": true }
      },
      "glossary": [
        { "term": "Brutal AI", "de": "Brutal AI", "en": "Brutal AI", "neverTranslate": true },
        { "term": "Kanzlei",   "de": "Kanzlei",   "en": "law firm",  "neverTranslate": false }
      ]
    },
    "safeZoneDefaults": { "profileOverlap": { "top": 0.12, "left": 0.0 }, "seeMoreFold": 0.85 }
  }$$::jsonb
)
on conflict (workspace_id, version) do nothing;

-- v1 creation diff (from_version null)
insert into brand_kit_diff (workspace_id, from_version, to_version, summary, created_by_kind)
values ('00000000-0000-0000-0000-000000000001', null, 1, 'Initial Brutal AI seed kit (v1).', 'system')
on conflict (workspace_id, to_version) do nothing;
```

> **⚑ ASSUMPTION A-09-5 (carried from `03 §7.2`, unchanged):** the exact **acid-lime chrome hex `#c9ff2e`**
> is a placeholder — CANON §1 names "acid-lime for the app chrome" without a hex. **VERIFY with Antonio.**
> Per **CANON §12 L10, `#c9ff2e` is NOT gate-load-bearing: brand-gate tests MUST NOT hard-assert this exact
> hex.** It stays a valid `allowed`/`accents.acidLime` entry the seed ships, but the gate treats it as a
> swappable placeholder (assert palette-role resolution / membership, never the literal `#c9ff2e` constant).
> Logo `assetId`s are `null` until real logo files are uploaded to Storage and back-filled (a
> `brand_kit` version bump when they land — logos are `data`, and `data` is immutable, so back-filling
> assetIds = publishing v2). **⚑ Proof-point stats (1.200 firms / 40% faster) and their `asOf`/`source` are
> illustrative — VERIFY the real, current numbers with Antonio before any ad using them ships.**

---

## 10. Bootstrapping a new tenant's Brand Kit

A new (non-seed) `Workspace` has no kit. Three ingestion paths converge on a **draft `BrandKitData`** that the
operator reviews/edits, then **Publishes** as `version 1` (§4). All three MAY be assisted by Claude
(`ANTHROPIC_API_KEY`) but the output is always **validated by `BrandGuardian.validateKit` (zod §7 + semantics)
before publish**.

### 10.1 Path A — URL scrape (60-second import)

```
POST /api/brand-kit/bootstrap/url   { workspaceId, url }         (apps/web route handler)
  1. Fetch the page(s) server-side (WebFetch/headless). VERIFY robots.txt / ToS; respect rate limits.
  2. Extract signals:
     - colors: parse inline styles + linked CSS custom properties; cluster; rank by area-weighted frequency
       → propose palette.background/surface/text/accents + allowed[].
     - fonts: @font-face / font-family in computed styles → propose typography.display/body (+source).
     - logo: <img> in header/nav, favicon, og:image, apple-touch-icon → upload to Storage → logos[].assetId.
     - copy: og:title/description, <h1>, hero, meta → seed voice examples + candidate valueProps/claims.
  3. Claude (structured output, BrandKitData zod schema) maps signals → draft BrandKitData; low-confidence
     fields flagged for the operator.
```

> **`VERIFY current docs before coding`** — legal/robots posture of scraping the target URL; the exact
> WebFetch/headless tool available in the runtime; color-extraction lib (e.g. `node-vibrant`, or CSS parse).
> **⚑ Palette extraction is heuristic** — always route through operator review; never auto-publish.

### 10.2 Path B — PDF brand-guideline ingest

```
POST /api/brand-kit/bootstrap/pdf   multipart: { workspaceId, file }
  1. Store the PDF in Supabase Storage (RLS-scoped bucket).
  2. Extract: text (pdf parse) + embedded images (candidate logos) + named colors (hex/Pantone/CMYK strings).
     Prefer a vision-capable Claude pass over rendered pages for layout-heavy guideline decks.
  3. Claude (structured output → BrandKitData) fills palette (with roles), typography, voice register,
     banned terms, disclaimers, do/don't examples from the guideline prose.
  4. Map Pantone/CMYK → sRGB hex (VERIFY conversion table/lib); flag any color it could not resolve.
```

> **`VERIFY current docs before coding`** — PDF text/image extraction lib; whether the Anthropic model in use
> accepts PDF/document input directly vs page-image rendering (see `docs/claude-api` reference / model card).

### 10.3 Path C — the brand-voice skills (verbal kit)

For the **verbal** half (voice/tone/banned terms/claims/do-don't), reuse the installed **`brand-voice`**
skills rather than reinventing:

| Skill (name) | Role in bootstrapping |
|---|---|
| `brand-voice:discover-brand` (`discover-brand`) | Autonomously search connected platforms (Notion/Drive/Slack/Figma/…) for existing brand materials; produce a discovery report. |
| `brand-voice:generate-guidelines` (`guideline-generation`) | Turn a discovery report / uploaded docs / call transcripts into structured, LLM-ready guidelines (writes `.claude/brand-voice-guidelines.md`). |
| `brand-voice:enforce-voice` (`brand-voice-enforcement`) | Runtime voice validation — reused by §8.3 semantic drift and by `Copywriter`/`BrandGuardian` for advisory register checks. |

**Adapter:** a `guidelinesToBrandKit()` mapper converts `.claude/brand-voice-guidelines.md` (voice constants,
tone flexes, banned words, do/don't) into the `voice` + `messaging` sub-objects of `BrandKitData`. The
visual half (palette/typography/logos/imagery/iconography) comes from Path A/B or manual entry.

> **⚑ ASSUMPTION A-09-6:** these skills produce a Markdown guideline doc, not a `BrandKitData` JSON. The
> `guidelinesToBrandKit()` mapper is the bridge and is **owned by this platform** (not the skill). Field
> coverage is partial (verbal only) — visual fields still need Path A/B/manual. Skill availability at runtime
> is not guaranteed for every deploy target; the mapper degrades to "operator fills the form" if absent.

### 10.4 Path D — manual / minimal (always available fallback)

The guided 60-second form (R7 §"empty states"): **logo + 2 colors + 2 fonts**, pre-filled with the Brutal seed
for the seed tenant. Produces a minimal valid `BrandKitData` (all required §7 fields; empty optional blocks),
publishable as v1 immediately.

### 10.5 Bootstrap endpoints (summary)

| Method + path | Body | Returns |
|---|---|---|
| `POST /api/brand-kit/bootstrap/url` | `{ workspaceId, url }` | `{ draft: BrandKitData, confidence: Record<path,number>, warnings[] }` |
| `POST /api/brand-kit/bootstrap/pdf` | multipart `{ workspaceId, file }` | same as above |
| `POST /api/brand-kit/bootstrap/guidelines` | `{ workspaceId, guidelinesMarkdown }` | `{ draft: BrandKitData(partial), warnings[] }` |
| `POST /api/brand-kit/validate` | `{ data: BrandKitData }` | `KitValidation` (§6) |
| `POST /api/brand-kit/publish` | `{ workspaceId, data, name }` | `{ id, version, is_active:true }` (atomic §4.1) |
| `POST /api/brand-kit/:id/activate` | `{}` | flips `is_active` (rollback/reactivate) |
| `GET  /api/brand-kit/active?workspaceId=` | — | active `BrandKit` row |
| `GET  /api/brand-kit/diff?workspaceId=&from=&to=` | — | `brand_kit_diff` row |

All routes are **server-side**, service-role only for writes, RLS-scoped for reads (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`; never ship the service-role key to the client — CANON §4).

---

## 11. Consumers — who reads the Brand Kit and how

| Consumer | Reads | Uses it to |
|---|---|---|
| `IntakeAgent` (⚑R-A1) | `localization.default`, `messaging`, `disclaimers` | fill unstated brief fields; pick language; attach mandatory legal |
| `Strategist` | `messaging.valueProps`, `voice`, `imagery.mood` | ground positioning/angle in real value props |
| `Copywriter` | `voice.*`, `messaging.approvedClaims/proofPoints/bannedClaims`, `typography.roles` | write hooks/CTAs; specificity > cleverness; never a banned term |
| `ArtDirector` | `imagery.style` (`promptPrefix`, `negativePromptDefaults`, `avoid`), `palette` | build imagery-**only** prompts (no legible text — CANON §2) |
| `CarouselArchitect` | `imagery.style`, `messaging`, `voice` | keep hook→reframe→close continuity on-brand across slides |
| `CompositorPlanner` | `palette.roles`, `typography.roles`, `logos`, `safeZoneDefaults`, `iconography` | pick colors/fonts/logo by role; seed `LayerTree.safeZones` |
| `BrandGuardian` | **all of it** | mechanical gate (§6) + `validateKit` |
| `Critic` | `voice.tone/doExamples`, LinkedIn playbook | score vs brand + playbook (advisory) |
| `LocalizationAgent` | `localization.*`, `messaging.proofPoints.spoken`, `glossary` | DE⇄EN transcreation; TTS-safe numbers (R2 §4.4) |
| `EditorAgent` | `palette.roles`, `typography.roles` | resolve NL edits ("make the CTA gold") to allowed values |
| `packages/render` | `typography.fontAssets`/`source`, `logos[].assetId`, `palette` | load fonts, place logos, apply colors |

---

## 12. Self-consistency checklist (the factory MUST hold)

| Invariant | Enforced by |
|---|---|
| `brand_kit` DDL identical to `03-data-model.md §3` | copy-paste; CI diff of migration files |
| `BrandKitData` zod (§7) ⊇ `03-data-model.md §12` shape; all `[+extends]` optional | single source `packages/shared/schemas/brand-kit.ts`; CI `deepEqual` |
| Every `Variant.brand_kit_version` references an existing `(workspace_id, version)` | FK-by-convention + `scanForDrift` |
| Exactly one `is_active` per workspace | `brand_kit_one_active_per_ws` partial unique index |
| Published kit rows immutable | `brand_kit_immutable` trigger (§4.1) |
| Every required disclaimer → a `legal` layer with matching `requiredBy` | `BrandGuardian` rule 6 (§6.1) |
| AI-imagery Variants carry an AI-content disclosure (error in `disclosures.aiContent.errorVerticals`) | `BrandGuardian` rule 14 (§6.1; CANON §12 L10) |
| Seed kit validates against §7 zod | CI: `BrandKitData.parse(seed.data)` in a test |
| `disclaimers`/`messaging`/`localization` cover all `localization.locales` | `validateKit` semantic check |
| No hex/font hardcoded in app logic (all from `BrandKit`) | code review; grep guard in CI |
| Service-role key server-only | CANON §4; env lint |

---

## 13. Assumptions & recommendations (consolidated)

- **⚑ A-09-1** — `brand_kit` DDL + base `BrandKitData` are owned by `03-data-model.md`; this doc is the
  **superset** and, per **CANON §12 L7**, its §3/§7 shape (incl. `disclosures.aiContent`) is the authoritative
  `BrandKitData` and **is back-ported into `03 §7.1` + the §12 zod in this same build** — a settled
  reconciliation, not a deferred one. All additions are optional/back-compatible.
- **⚑ A-09-2** — lineage pins the `version` **integer** (per `03 §4`), not the row UUID.
- **⚑ A-09-3** — draft storage (pre-publish) is unspecified in CANON; build may use a `brand_kit_draft` table
  or Storage JSON. Contract: nothing enters `brand_kit` until Publish.
- **⚑ A-09-4** — DE reading-level scoring may lack a reliable lib; rule 8 ships warn-only for `de` until a
  DE-aware syllable counter is confirmed.
- **⚑ A-09-5** — acid-lime `#c9ff2e`, logo `assetId`s (null), and proof-point stats are placeholders — VERIFY
  with Antonio before shipping ads that use them. Per **CANON §12 L10**, `#c9ff2e` is **not gate-load-bearing**:
  brand-gate tests must not hard-assert this exact hex (assert role resolution / `allowed` membership instead).
- **⚑ A-09-6** — the `brand-voice` skills emit Markdown guidelines, not JSON; `guidelinesToBrandKit()` is a
  platform-owned mapper covering the **verbal** half only.
- **⚑ RECOMMENDATION R-09-1** — add the two governance tables (`brand_kit_diff`, `brand_drift_event`) and the
  `brand_kit_immutable` trigger to `03-data-model.md`'s migration set and `agent_name`-adjacent enums. They
  are the mechanism behind CANON §5's "versioned" and CANON §7's "hard gate" promises; without them
  "versioned + auditable" is aspirational.
- **⚑ RECOMMENDATION R-09-2** — expose `palette.roles`/`typography.roles` in the editor and agents so
  "on-brand" is expressed as **intent** (ctaFill) not **hex**, making re-brands a one-row change.
- **⚑ RECOMMENDATION R-09-3** — calibrate `voice.readingLevel` and `voice.tone` targets against the tenant's
  **real LinkedIn results** over time (mirrors the engagement-scoring calibration stance, CANON §9).

---

**End of `docs/09-brand-kit.md`.**


<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: docs/10-build-plan.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

# 10 — BUILD PLAN (the roadmap the one-shot factory follows)

> ⚠️ **CROSS-REFERENCE NOTE — read first (authoritative, per CANON §12 L1).** Some inline `docs/NN` / `doc NN` pointers in this file predate the frozen document map and may cite the wrong number. **Resolve every cross-reference by ROLE using this map, not by the integer written inline:** `01` product · `02` architecture · `03` data-model (all DDL/zod/schemas) · `04` providers · `05` agent-studio · `06` editor + `packages/render` + export · `07` creative-playbook · `08` engagement · `09` brand-kit · `10` build-plan · `11` env · `12` security/ops · `13` acceptance · `14` appendix. There is **no localization doc** (localization lives in `05` LocalizationAgent + `09` brand-kit `localization` + `07`) and **no "exporter" doc** (export lives in `06`). Source paths are always under `apps/web/src/**` — never the legacy `apps/web/`+`lib/` layout (CANON §12 L2). Where anything here disagrees with CANON §12, **the ledger wins.**

> **Read `CANON.md` first.** This document is subordinate to CANON. Every object-model name,
> provider interface, agent name, env var, repo path, and LinkedIn spec used here is **canonical**
> (CANON §4–§10) and is used **verbatim** — never renamed. Where research suggests a change it appears
> only as a clearly-labelled **⚑ RECOMMENDATION** (all inherited from `research/R7-blank-slate-arch.md`
> §3/§5/§6/§8, already ratified in docs 01/03/04/05/06). Every external API carries a
> **`VERIFY current docs before coding`** note. Every assumption is flagged **⚑ ASSUMPTION**.
>
> **Audience.** An autonomous AI build factory with **zero outside context**. This is doc 10 of ~15.
> This is the **execution roadmap**: the exact ordered phases (**P0 → P10**), each with concrete
> deliverables, file/dir targets, what to **stub vs build**, and a machine-checkable **acceptance gate**
> (commands + expected output). The factory executes phases **strictly in order**; a phase may not begin
> until the previous phase's acceptance gate is **green**.
>
> **What is authoritative where.** This plan sequences and gates the work; it does **not** redefine
> mechanisms. When a phase says "build X per doc NN," **doc NN is authoritative** for X's internals:
> - `docs/01` product spec / Definition of Done · `docs/02` architecture (⚑ if numbered differently, see §0.4)
> - `docs/03` data model (DDL, RLS, zod, seed) · `docs/04` provider integrations (`ProviderBus`, drivers, jobs)
> - `docs/05` agent studio (agents, orchestrator, `AgentRun`, cost caps) · `docs/06` editor & compositor
> - `docs/07` creative-playbook · `docs/08` engagement · `docs/09` brand-kit · `docs/11` env/ops.
>   (Export lives in `docs/06`, not a standalone "exporter" doc; localization lives in `docs/05`
>   `LocalizationAgent` + `docs/09` brand-kit `localization` + `docs/07` — there is no standalone
>   localization doc. — CANON §12 L1.)
>
> **Grounding research:** `research/R7-blank-slate-arch.md` §3 (the exact build order — this doc is its
> operational expansion), §5 (provider routing), §6 (infra), §8 (recommendations). Secondary: R1 (image),
> R2 (video/audio), R4 (engagement).

---

## 0. How to read and execute this plan

### 0.1 The one rule

**Phases ship in order P0 → P10. Each phase has ONE acceptance gate. Do not start phase N+1 until
phase N's gate command exits `0` and prints the expected output.** The gate is the contract; the
deliverables list is how you satisfy it.

### 0.2 The MLP line (where "done enough to love" is)

```
P0 Skeleton → P1 Render spine → P2 One image provider → P3 Agent loop (static)
   → P4 Board + editor → P5 Export to spec        ◄── MLP LINE (minimal LOVABLE product)
── fast-follows on the same spine ──
   → P6 Critic + Engagement (clean path) → P7 Carousel → P8 Localization
   → P9 Video → P10 Results feedback + calibration
```

This ordering is **risk-first** (R7 §3): the two things most likely to sink the project — **layer-tree
render fidelity** (P1) and **multi-tenant RLS** (P0) — are front-loaded where they are cheap to fix; the
flashiest-but-most-decoupled work (video, TRIBE R&D) is deferred. Every phase ships something demoable;
**no phase requires ripping out an earlier phase.**

### 0.3 Global "stub vs build" doctrine

The factory must resist building breadth early. Default rules:

| Rule | Meaning |
|---|---|
| **Build the spine, stub the fleet** | One provider driver real (P2); the other six registered but returning `NotImplemented` until their phase. |
| **Build one modality fully before the next** | Static single-image E2E (P0–P6) before carousel (P7), localization (P8), video (P9). |
| **Stub = typed, registered, throws `NotImplemented('<phase>')`** | Never a silent `null`. A stub satisfies the interface, appears in the registry, and fails loudly with the phase that will implement it. |
| **Gate on real behavior, not on stubs** | An acceptance gate never passes by exercising a stub; gates assert the *built* path. |
| **`RESEARCH_MODE` / TRIBE stays quarantined** | The `tribe_research` backend is never on the commercial path (CANON §9); a CI license gate (P6) enforces it. |
| **Fonts, brand kit, LinkedIn specs are DATA** | Seed `BrandKit` and format specs are config/seed rows (CANON §1/§8), never hardcoded in product logic. |

### 0.4 ⚑ ASSUMPTION — doc numbering & the master prompt

- **⚑ ASSUMPTION (A-NUM):** the docs referenced above (`02` architecture, `07` creative-playbook, `08` engagement,
  `09` brand-kit, `11` env/ops) exist or will exist at those numbers, consistent with the frozen map
  in `docs/01` §intro (CANON §12 L1). Export lives in `docs/06`; there is no standalone "exporter" or
  "localization" doc. If the final package renumbers them, treat the **titles** as authoritative and
  re-point references. This plan cites docs by **role**, so it survives renumbering.
- **⚑ ASSUMPTION (A-MP):** the factory is driven by `BUILD.md` (CANON §3) which will point
  at this file for sequencing. This doc is written to be that sequencer.
- **⚑ ASSUMPTION (A-PM):** package manager is **pnpm** (CANON §4 "pnpm monorepo"); Node **≥ 20 LTS**,
  Python **3.11** (CANON §4). If the pinned Node differs, only the `engines` field and `.nvmrc` change.

### 0.5 Conventions used by every gate

| Convention | Value |
|---|---|
| Repo root | `brutal-ads/` (CANON §11 tree) |
| Gate exit code | `0` = pass; non-zero = **stop, do not advance** |
| Gate location | Each phase's gate is a script at `scripts/gate-P<N>.sh` (the factory creates these as it goes) plus the standard `pnpm` scripts below |
| Standard scripts (root `package.json`) | `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build` · `pnpm gate:P<N>` |
| Env | `.env.example` is canonical (CANON §10 + ⚑R-ENV1 `POLOTNO_API_KEY`); `.env` is git-ignored |
| "VERIFY" | Any external endpoint/slug/price must be re-confirmed against live docs before coding (R7 §9 checklist) |

---

## 1. Phase map (one-screen overview)

| Phase | Name | Ships (headline) | Hard dependency | Acceptance proves |
|---|---|---|---|---|
| **P0** | Skeleton | pnpm monorepo, `packages/shared` object model + zod, Supabase (Postgres+RLS+Auth+Storage), seed `BrandKit` v1, `.env.example` | — | Types compile; workspace + brand kit exist; **RLS blocks cross-tenant reads** |
| **P1** | Render spine | `packages/render`: layer-tree → Polotno store JSON → PNG/JPG headless (`polotno-node`) | P0 | Hand-authored tree → **pixel-correct 1200×1200** ad with real fonts |
| **P2** | One image provider + `ProviderBus` | `ProviderBus.image` w/ **one** driver (`bfl` FLUX.2) + cache + async `GenerationJob` | P1 | Prompt → generated **background** → composited under text → rendered ad |
| **P3** | Agent loop (static) | `IntakeAgent`→`Strategist`→`Copywriter`→`ArtDirector`→`CompositorPlanner`→`BrandGuardian`; `AgentRun` + cost caps | P2 | Type a **brief** → 3–6 on-brand static ads on a board |
| **P4** | Board + editor | Board UI; Polotno canvas behind `EditorAdapter`; `EditorAgent` (NL→`LayerPatch`); human-approve gate | P3 | Move/retype any layer by **drag**; "make headline shorter and gold" by **chat** — no re-roll |
| **P5** | Export to spec | Exporter: 1:1 / 1.91:1 / 4:5 via **smart re-layout** (renderHints, safe-zones) + `≤5 MB` | P4 | Download **spec-valid** asset in all three ratios from one base |
| — | **MLP LINE** | *(P0–P5 = minimal lovable product)* | | |
| **P6** | Critic + Engagement (clean path) | `Critic` + `EngagementAnalyst` + `EngagementPredictor` (`saliency`) in `services/engine`; **bands+confidence**; ranks board | P5 | Board arrives **ranked** with focal-clarity / stopping-power bands; **TRIBE license CI gate green** |
| **P7** | Carousel | `CarouselArchitect`; `Slide[]` per `AdDocument`; **PDF document-ad** export | P6 | Brief → multi-slide doc ad → **PDF** (hook→reframe→close) |
| **P8** | Localization | `LocalizationAgent` (DE⇄EN transcreation; TTS-safe numbers); `smart` layers bound to locale | P7 | One ad, **two languages**, on-brand, from the same tree |
| **P9** | Video (fast-follow) | `VideoProvider` (`kling` primary) + ElevenLabs VO + **Remotion** assembly; muted-first + burned-in subs | P8 | Brief → 1:1/4:5/16:9 **MP4**, muted-first, ≤200 MB |
| **P10** | Results feedback + calibration | `Result` ingest (manual paste / LinkedIn API) → re-fit predictor bands per workspace | P9 | Predicted bands **tighten** against real CTR over time |

---

## 2. Phase 0 — Skeleton (scaffold, types, tenancy, seed)

> **Goal:** every downstream artifact pins to these types and this RLS. Getting multi-tenancy wrong later
> is a rewrite (R7 §3), so it is proven **first**.

### 2.1 Deliverables & file/dir targets

| # | Deliverable | Target path | Authoritative doc |
|---|---|---|---|
| 0.1 | pnpm monorepo skeleton (CANON §11 tree) | `brutal-ads/{apps/web,services/engine,packages/shared,packages/render,supabase}`, root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.nvmrc`, `.gitignore` | CANON §4/§11 |
| 0.2 | `.env.example` — **all** CANON §10 vars + `POLOTNO_API_KEY` (⚑R-ENV1) | `.env.example` | doc env/ops (11), CANON §10 |
| 0.3 | Canonical object-model TS types + zod schemas | `packages/shared/src/*` (see §2.2) | doc data-model (03), CANON §5/§6 |
| 0.4 | Provider **contract** types (interfaces only, no drivers) | `packages/shared/src/providers.ts` | CANON §6 |
| 0.5 | Supabase migrations `0000`–`0007` (extensions→enums→tenancy→brand/campaign/brief→addoc/variant/slide→assets/jobs/experiments→RLS→triggers) | `supabase/migrations/000{0..7}_*.sql` | doc data-model (03) §0–§11 |
| 0.6 | RLS policies: every tenant table isolated by `workspace_id` | `supabase/migrations/0006_rls.sql` | doc data-model (03) §RLS |
| 0.7 | Seed: one `Workspace` (Brutal), one `WorkspaceMember` (antonio@brutal.ai), seed **`BrandKit` v1** (dark palette, Playfair/Inter, gold `#cba65e` + lime `#b6e64a`, voice register, banned terms, DE/EN) | `supabase/seed.sql` | doc data-model (03) seed; CANON §1 |
| 0.8 | `apps/web` Next.js 15 App Router + TS + Tailwind v4 + shadcn/ui boot (blank authed shell only) | `apps/web/` | CANON §4 |
| 0.9 | `services/engine` FastAPI 3.11 skeleton (`/healthz` only; no scoring yet) | `services/engine/{app,pyproject.toml}` | CANON §4 |
| 0.10 | CI workflow: `typecheck + lint + test + build` on every push | `.github/workflows/ci.yml` | this doc |

### 2.2 `packages/shared` layout to create (canonical file names, from docs 03/05/06)

```
packages/shared/src/
  index.ts
  model/                 # object model TS types (CANON §5)
    workspace.ts brandKit.ts campaign.ts brief.ts adDocument.ts variant.ts slide.ts layer.ts
    asset.ts render.ts experiment.ts result.ts agentRun.ts generationJob.ts auditLog.ts
  layerTree.ts           # the canonical layer tree (superset of Polotno store JSON — R7 §1.1)
  renderHints.ts         # ⚑R-LT1 per-layer {safeZone,maxLines,autoFit,minFontPx}
  relayout.ts            # ratio derivation contract (impl in P5)
  layerPatch.ts          # typed LayerPatch diff type (impl consumers in P4)
  providers.ts           # CANON §6 interfaces: GenSpec/GenResult/ImageProvider/VideoProvider/AudioProvider/LlmProvider/EngagementPredictor/ProviderBus
  brand/
    guard.ts banned.ts   # BrandGuardian rule types + banned-term list (enforced P3)
  studio/
    layer-patch.ts       # studio-side patch schema (EditorAgent, P4)
  preflight.ts           # cost-cap preflight types (enforced P3)
  zod/                   # zod mirrors of every model type; single source for runtime validation
```

> **Build:** types, zod, migrations, RLS, seed, both app skeletons.
> **Stub:** `relayout.ts`, `layerPatch.ts` consumers, `providers.ts` **drivers** (interfaces only — no bodies).
> Every provider interface method that has no P0 implementation `throw new Error('NotImplemented(P2+)')`.

### 2.3 External APIs touched in P0 (VERIFY before coding)

| API | Use | VERIFY note |
|---|---|---|
| **Supabase** (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) | Postgres + RLS + Auth + Storage | `VERIFY current docs before coding`: RLS policy syntax, `auth.uid()` / `auth.jwt()` helpers, Storage bucket policy DSL. Service-role key is **server-only, never shipped to client** (R7 §7). |
| **pgmq / Supabase Queues** | reserved for P2 dispatch (⚑R-INFRA1) | `VERIFY`: pgmq extension availability + visibility-window semantics (R7 §9.10). Do **not** build the queue in P0 — only confirm the extension can be enabled. |

### 2.4 Acceptance gate — P0

**Command (`pnpm gate:P0`):**
```bash
pnpm install \
 && pnpm typecheck \
 && pnpm --filter @brutal/shared test \
 && supabase db reset --linked=false \
 && supabase db push \
 && psql "$SUPABASE_DB_URL" -f scripts/gate/p0_rls_check.sql
```

**`scripts/gate/p0_rls_check.sql` must assert (expected output shown):**
```
-- 1. Seed present
select count(*) from workspace;                         -- expect: 1
select count(*) from brand_kit where version = 1;       -- expect: 1  (Brutal seed)
select count(*) from workspace_member;                  -- expect: 1  (antonio@brutal.ai)
-- 2. Cross-tenant RLS denial (run as a DIFFERENT workspace's JWT/role)
--    Reading tenant A's brand_kit while authed as tenant B must return 0 rows, NOT an error.
set local role authenticated;
set local request.jwt.claims = '{"sub":"<user-in-workspace-B>"}';
select count(*) from brand_kit;                          -- expect: 0  (RLS blocks tenant A rows)
```

**PASS when:** `pnpm typecheck` compiles the whole object model + zod; migrations `0000`–`0007` apply
clean; seed inserts exactly the Brutal workspace + member + `BrandKit` v1; **a query authenticated as a
second workspace returns 0 rows of tenant A's data** (the RLS proof). CI (`.github/workflows/ci.yml`) is
green.

**FAIL / STOP if:** any cross-tenant query returns >0 rows (RLS leak — highest-severity, rewrite risk),
or the shared package does not compile.

---

## 3. Phase 1 — Render spine (layer-tree → pixels)

> **Goal:** prove the load-bearing thesis (CANON §2 "editable layers, not baked pixels") by rendering a
> **hand-authored** layer tree to a pixel-correct 1:1 ad. De-risk the hardest, least-flashy part first
> (R7 §3). **No image generation, no agents, no UI** in this phase.

### 3.1 Deliverables & file/dir targets

| # | Deliverable | Target path | Authoritative doc |
|---|---|---|---|
| 1.1 | `packages/render` package boot (`polotno-node` headless-Chromium) | `packages/render/{package.json,src/index.ts}` | doc editor (06); R7 §6 |
| 1.2 | Canonical tree ⇄ Polotno store adapters | `packages/render/src/polotno/toPolotno.ts`, `fromPolotno.ts` | doc editor (06) |
| 1.3 | Static renderer: store JSON → PNG/JPG buffer | `packages/render/src/polotno/renderStatic.ts` | doc editor (06) |
| 1.4 | Brand fonts embedded for headless render (Playfair Display, Inter) | `packages/render/assets/fonts/*` | CANON §1 |
| 1.5 | Golden-file parity test (rendered PNG ≈ committed reference, ΔE/pixel-diff threshold) | `packages/render/src/parity/goldenDiff.test.ts` + `packages/render/fixtures/*` | doc editor (06) |
| 1.6 | One hand-authored fixture tree: 1200×1200 Brutal ad (bg rect + headline `text` + `logo` + `cta` + `legal`) | `packages/render/fixtures/single-image-1x1.json` | doc data-model (03) layer-tree schema |

### 3.2 Build vs stub

- **Build:** `polotno-node` render path, font embedding, canonical⇄Polotno adapters, golden-diff test.
- **Stub:** image `Layer` uses a **local placeholder asset** (a committed gradient PNG) — **no provider
  call in P1**. `image` provider still throws `NotImplemented(P2)`.
- **Do not build yet:** PDF export (P7), video/Remotion (P9), multi-ratio re-layout (P5).

### 3.3 External APIs / licenses touched (VERIFY before coding)

| Item | VERIFY note |
|---|---|
| **Polotno SDK + `polotno-node`** (`POLOTNO_API_KEY`, ⚑R-ENV1) | `VERIFY current docs before coding`: commercial license terms + price ($899/mo self-serve reported), `polotno-node` store-JSON→PNG/JPG/PDF fidelity **with Playfair/Inter**, no per-render fee (R7 §6, §9.8). Watermark appears if unlicensed — the golden-diff test will catch it. |
| Headless Chromium | `VERIFY`: `polotno-node` bundles/needs a Chromium; confirm the CI runner has required system libs. |

### 3.4 Acceptance gate — P1

**Command (`pnpm gate:P1`):**
```bash
pnpm --filter @brutal/render build \
 && pnpm --filter @brutal/render test \
 && node packages/render/scripts/render-fixture.mjs \
      --in fixtures/single-image-1x1.json --out /tmp/p1.png \
 && node packages/render/scripts/assert-image.mjs /tmp/p1.png --w 1200 --h 1200 --maxDiff 0.02
```

**Expected output:**
```
render: fixtures/single-image-1x1.json → /tmp/p1.png
assert-image: 1200x1200 ✓   fonts=[Playfair Display, Inter] ✓   goldenDiff=0.9% (< 2%) ✓
PASS P1
```

**PASS when:** the hand-authored tree renders a **1200×1200** PNG with the real embedded fonts (no
system-font fallback, no Polotno watermark), and the golden-diff is under threshold.

**FAIL / STOP if:** dimensions wrong, fonts substituted, watermark present, or diff over threshold.

---

## 4. Phase 2 — One image provider + `ProviderBus` (async jobs + cache)

> **Goal:** prove the async `GenerationJob`/cache pattern and the **imagery-only** contract with the
> least surface area — **one** driver only (R7 §3, §5.3 rank-1 photoreal = FLUX.2 [pro] via `bfl`).

### 4.1 Deliverables & file/dir targets

| # | Deliverable | Target path | Authoritative doc |
|---|---|---|---|
| 2.1 | `ProviderBus` skeleton + driver registry + policy table (image only) | `apps/web/src/server/providers/bus.ts`, `apps/web/src/server/providers/registry.ts` | doc providers (04) |
| 2.2 | **`bfl` driver** — FLUX.2 [pro], async create→poll, `GenSpec`→`GenResult` | `apps/web/src/server/providers/bfl.ts` | doc providers (04) §BFL |
| 2.3 | Cache keyed by `(provider, model, version, prompt, seed, params)` → asset in Storage | `apps/web/src/server/providers/_shared/cache.ts` | CANON §4; R7 §1.2 |
| 2.4 | `GenerationJob` lifecycle (enqueue→dispatch→poll→complete/fail) on **pgmq** (⚑R-INFRA1); `JobQueue` interface so Inngest is a drop-in | `apps/web/src/server/jobs/*`, webhook/poll handler `apps/web/src/app/api/webhooks/{bfl}/route.ts` | doc providers (04) job lifecycle; R7 §6 |
| 2.5 | Cost metering: every job writes `cost_usd` to `generation_job` | (in job lifecycle) | CANON §4; doc data-model (03) |
| 2.6 | The other 6 image drivers **registered but stubbed** (`fal`, `gemini`, `ideogram`, `recraft`, `openai`, `seedream`) throwing `NotImplemented(P<phase>)` | `apps/web/src/server/providers/{fal,gemini,ideogram,recraft,openai,seedream}.ts` | doc providers (04) |

### 4.2 Build vs stub

- **Build:** `bfl` driver end-to-end, cache, one working `GenerationJob` path on pgmq, cost metering.
- **Stub:** all non-`bfl` image drivers (registered, typed, throw). `video`/`audio` providers absent
  (P9). The router policy table lists ranks 2–3 but the bus **falls back to a graceful error** (no raw
  failure — R7 §7) since ranks 2–3 are stubs in P2.
- **Invariant to enforce here (structural, not a lint):** the `prompt` field sent to `bfl` carries
  **imagery only — never headline/CTA/legal text** (CANON §2, anti-re-roll). Add a unit test that fails
  if a known copy string leaks into a `GenSpec.prompt`.

### 4.3 External APIs touched (VERIFY before coding)

| API | Endpoint skeleton | VERIFY note |
|---|---|---|
| **BFL FLUX.2** (`BFL_API_KEY`) | `POST https://api.bfl.ai/v1/flux-2-pro` (header `x-key`); `→ {id, polling_url}`; `GET /v1/get_result?id=…` until `status:"Ready"` | `VERIFY current docs before coding`: exact path slug (`flux.2 pro`), body keys (`aspect_ratio` vs `width/height`, `input_image`), `x-key` header, poll semantics, credit price (1 credit=$0.01) at `docs.bfl.ai` (R7 §5.4, §9.2). Store resolved model slug + `cost_usd` in `GenResult`/lineage; never hardcode price in logic (doc 04). |
| **Supabase Queues (pgmq)** | enqueue/read/delete via pgmq SQL or Supabase client | `VERIFY`: visibility-window + Edge Function timeout (~150s) adequacy — dispatch/poll only; long gen lives at provider (R7 §6, §9.10). |
| **Supabase Storage** | put generated asset, signed URL | `VERIFY`: bucket RLS; assets tenant-scoped. |

### 4.4 Acceptance gate — P2

**Command (`pnpm gate:P2`):**
```bash
pnpm --filter web test -- providers \
 && node apps/web/scripts/gen-e2e.mjs \
      --prompt "editorial dark photoreal boardroom, gold rim light, no text" \
      --aspect 1:1 --workspace brutal --out /tmp/p2.png \
 && node apps/web/scripts/gen-e2e.mjs --same-args   # second run must hit cache
```

**Expected output:**
```
job#1  provider=bfl model=flux-2-pro  status=Ready  cost_usd=0.0X  cache=MISS  → asset stored
compose: background + [headline,logo,cta,legal] text layers → /tmp/p2.png (1200x1200) ✓
prompt-purity check: no copy strings in GenSpec.prompt ✓
job#2  cache=HIT  cost_usd=0.000000  (identical key)                          ✓
PASS P2
```

**PASS when:** a prompt produces a generated **background** via `bfl`, it is composited **under** the
P1 text layers and rendered to a correct 1:1 ad; the job is async with `cost_usd` recorded; an identical
second request is a **cache HIT at $0**; the prompt-purity test passes (no copy in the image prompt).

**FAIL / STOP if:** copy text leaks into the image prompt, the job is synchronous/blocking, or the cache
misses on an identical key.

---

## 5. Phase 3 — The agent loop (static)

> **Goal:** a **brief** (not a hand-authored tree) produces 3–6 on-brand static ads. This is the "wow,"
> built on the proven P1/P2 spine. Static single-image only — carousel/video/localization are later.

### 5.1 Deliverables & file/dir targets

| # | Deliverable | Target path | Authoritative doc |
|---|---|---|---|
| 3.1 | Orchestrator (brief → board graph, parallel branches, bounded ≤2 auto-iterate) | `apps/web/src/server/studio/orchestrator.ts` | doc agent-studio (05) §2 |
| 3.2 | `agent-runner` — wraps Anthropic call + `AgentRun` logging + **pre-flight cost cap** | `apps/web/src/server/studio/agent-runner.ts` | doc agent-studio (05) §5 |
| 3.3 | Agents (each = system prompt + I/O zod schema + model tier), static subset: `IntakeAgent` (⚑R-A1), `Strategist`, `Copywriter`, `ArtDirector`, `CompositorPlanner`, `BrandGuardian` | `apps/web/src/server/studio/agents/*` | doc agent-studio (05) §3 |
| 3.4 | Model tiering (⚑R-LLM1): default `claude-sonnet-5`; escalate `claude-opus-4-8` (ArtDirector, Critic later, hard BrandGuardian, auto-iterate round 2); `claude-haiku-4-5` for classification/smart-layer binding | (in agents' `model` field, config-driven) | doc agent-studio (05); R7 §5.3 |
| 3.5 | `BrandGuardian` **hard gate** (palette/voice/banned terms/mandatory disclaimer/localization); fail → loop back (≤2 rounds) | `apps/web/src/server/studio/agents/brandGuardian.ts` + `packages/shared/src/brand/{guard,banned}.ts` | doc agent-studio (05) §3; CANON §7 |
| 3.6 | Brief intake server action + minimal board API (returns ranked-by-nothing-yet Variants) | `apps/web/src/app/api/studio/brief/route.ts` | doc agent-studio (05) |

### 5.2 Build vs stub

- **Build:** the 6 static agents, orchestrator graph, `AgentRun` + cost caps, `BrandGuardian` hard gate,
  bounded auto-iterate counter (enforced in the **orchestrator**, never a prompt — doc 05 §4).
- **Stub:** `Critic`, `EngagementAnalyst`, `CarouselArchitect`, `LocalizationAgent`, `EditorAgent`
  present as typed no-ops / `NotImplemented(P<phase>)`. Board arrives **unranked** (ranking is P6).
- **Stub:** UI is minimal — a brief input + a plain grid of rendered Variants (rich board = P4).
- **Enforce:** imagery-gen and copy-gen are **parallel branches** meeting only at `CompositorPlanner`
  (anti-re-roll invariant, R7 §2). `ArtDirector` emits an **imagery-only** prompt; add a schema check.

### 5.3 External APIs touched (VERIFY before coding)

| API | Use | VERIFY note |
|---|---|---|
| **Anthropic** (`ANTHROPIC_API_KEY`) | all agents; structured outputs via tool/JSON schema; Batch API 50% off for 6-variant fan-out; prompt caching 90% off | `VERIFY current docs before coding`: model ids `claude-sonnet-5` / `claude-opus-4-8` / `claude-haiku-4-5` + **Sonnet 5 intro pricing window (ends 2026-08-31)** at `platform.claude.com/docs/en/about-claude/models/overview` (R7 §5.3, §9.1). Model ids live in config, never hardcoded (R7 §7). |
| BFL (from P2) | imagery per Variant | reuse P2 driver. |

### 5.4 Acceptance gate — P3

**Command (`pnpm gate:P3`):**
```bash
pnpm --filter web test -- studio \
 && node apps/web/scripts/brief-e2e.mjs \
      --workspace brutal \
      --brief "Legal AI that drafts German contracts in seconds, for mid-size law firms" \
      --n 6 --out-dir /tmp/p3
```

**Expected output:**
```
IntakeAgent  → Brief{audience,vertical=legal-de,offer,mandatoryLegal,langs=[de]}  (0 clarifying Qs)
Strategist   → Strategy{angle,JTBD,proof}
Copywriter × 6 [Batch]  ArtDirector × 6 [opus]  (parallel branches)
CompositorPlanner × 6 → layer trees
BrandGuardian: 6/6 PASS (palette ✓ voice ✓ banned-terms ✓ disclaimer ✓)
render × 6 → /tmp/p3/variant-{1..6}.png (1200x1200)
AgentRun rows: 15   generation_job rows: 6   total cost_usd=0.XX  (< per-brief cap ✓)
PASS P3
```

**PASS when:** a one-line brief yields **3–6** rendered, **on-brand** static ads; **every** Variant
passed `BrandGuardian`; every LLM call produced an `AgentRun` with `cost_usd`; the per-brief cost cap was
respected pre-flight; auto-iterate never exceeded 2 rounds.

**FAIL / STOP if:** any shipped Variant failed BrandGuardian, cost caps were exceeded, an agent emitted
free text instead of schema-valid JSON, or copy text appeared in an image prompt.

---

## 6. Phase 4 — The board + editor (drag & chat)

> **Goal:** the "easy to edit" half of the promise. Drag + chat editing is what makes it *lovable*.
> Edits are **`LayerPatch` diffs, never full re-rolls** (CANON §5).

### 6.1 Deliverables & file/dir targets

| # | Deliverable | Target path | Authoritative doc |
|---|---|---|---|
| 4.1 | Board UI (ranked-ready grid, compare, select, empty/loading states) | `apps/web/src/app/(studio)/board/*` | doc product (01) journeys; doc editor (06) |
| 4.2 | Polotno canvas behind `EditorAdapter` (swappable — CANON §4) | `apps/web/src/editor/EditorAdapter.ts`, `apps/web/src/app/(studio)/edit/*` | doc editor (06) |
| 4.3 | `EditorAgent`: NL → typed `LayerPatch` | `apps/web/src/server/studio/agents/editorAgent.ts` + `packages/shared/src/studio/layer-patch.ts` | doc agent-studio (05); doc editor (06) |
| 4.4 | Patch apply route: validate → apply → **re-pass BrandGuardian** → re-render affected layers only | `apps/web/src/app/api/editor/patch/route.ts` | doc editor (06) |
| 4.5 | Optional imagery regenerate route (explicit, not automatic) | `apps/web/src/app/api/editor/regenerate/route.ts` | doc editor (06) |
| 4.6 | **Human-approve gate** — nothing ships un-approved (CANON §7) | (board→approve state machine) | doc product (01); CANON §7 |

### 6.2 Build vs stub

- **Build:** board, Polotno-via-`EditorAdapter` drag editing, `EditorAgent` chat→`LayerPatch`,
  patch-apply with BrandGuardian re-check, human-approve gate.
- **Enforce:** a chat copy edit (e.g. "make the headline shorter and gold") triggers **zero** image
  credits (cache/no-gen) — assert `generation_job` count unchanged across the edit.
- **Stub:** ranking still absent (P6) — board renders in creation order; export button disabled/stub (P5).

### 6.3 External APIs touched (VERIFY before coding)

| API | Use | VERIFY note |
|---|---|---|
| **Polotno SDK** (browser) | canvas editing behind `EditorAdapter` | `VERIFY current docs before coding`: SDK version + `POLOTNO_API_KEY` init, store-JSON shape parity with `packages/render` adapters (R7 §6). |
| **Anthropic** | `EditorAgent` (default `claude-sonnet-5`) | reuse P3 runner; `VERIFY` model id. |

### 6.4 Acceptance gate — P4

**Command (`pnpm gate:P4`):**
```bash
pnpm --filter web test -- editor \
 && pnpm --filter web test:e2e -- board-edit   # headless: drag a layer, chat-edit, approve
```

**Expected output:**
```
board: 6 variants rendered, selectable ✓
drag: moved logo layer → LayerPatch{op:move} applied, re-render(logo) only ✓
chat: "make the headline shorter and gold" → EditorAgent → LayerPatch{op:setText,op:setFill} ✓
  BrandGuardian re-check on patched tree: PASS ✓
  generation_job delta = 0  (no image credits spent on a copy edit) ✓
approve: variant#3 → status=approved (human-approve gate) ✓
PASS P4
```

**PASS when:** any layer moves by drag; a chat instruction becomes a typed `LayerPatch`, the patched tree
re-passes `BrandGuardian`, only affected layers re-render, **no image credits are spent on a copy edit**,
and a Variant can only reach "approved" via the human gate.

**FAIL / STOP if:** a chat edit re-rolls the whole image, a patch bypasses BrandGuardian, or anything
reaches an "approved/shippable" state without the human gate.

---

## 7. Phase 5 — Export to spec (closes the MLP loop)

> **Goal:** a real, **spec-correct** LinkedIn asset leaves the building. Multi-ratio from **one base**
> via **smart re-layout** (renderHints + safe-zones), never naive cropping (CANON §8; ⚑R-LT1).

### 7.1 Deliverables & file/dir targets

| # | Deliverable | Target path | Authoritative doc |
|---|---|---|---|
| 5.1 | Re-layout engine: one base tree → 1:1 / 1.91:1 / 4:5 using `renderHints` + safe-zones | `packages/shared/src/relayout.ts` (+ `renderHints.ts`) | the export path (doc 06); doc editor (06); ⚑R-LT1 |
| 5.2 | Exporter: render each ratio → JPG/PNG; enforce `≤5 MB` | `packages/render/src/export/encodeImage.ts`, `packages/render/src/export/probeSize.ts` | the export path (doc 06); CANON §8 |
| 5.3 | Export route + download UX (single-image, three ratios) | `apps/web/src/app/api/export/route.ts` | the export path (doc 06) |
| 5.4 | Spec-validation asserts (dimensions, file type, size, headline ≤70 chars enforced upstream) | `packages/render/src/export/*` tests | CANON §8; the export path (doc 06) |

### 7.2 Build vs stub

- **Build:** re-layout for the **three single-image ratios**, JPG/PNG encode + size cap, export route.
- **Stub:** PDF document-ad export (P7), video MP4 (P9). PPTX is out of scope for v1 (ledger L3);
  otherwise defer.
- **Enforce:** 4:5 is mobile-only 960×1200; 1.91:1 is 1200×627; 1:1 is 1200×1200 (CANON §8). Re-layout
  must **not crop the headline** or cross the "see more" fold / profile-overlap safe zone (⚑R-LT1).

### 7.3 External APIs touched (VERIFY before coding)

| Item | VERIFY note |
|---|---|
| **LinkedIn 2026 ad format specs** | `VERIFY current docs before coding`: re-confirm ratios (1:1 1200×1200, 1.91:1 1200×627, 4:5 960×1200), `≤5 MB` image limit, headline ≤70 chars, intro ~150 visible/600 max against LinkedIn's live ad-spec page (specs drift; CANON §8 is intended source of truth — R7 §9.11). |

### 7.4 Acceptance gate — P5 (MLP gate)

**Command (`pnpm gate:P5`):**
```bash
node apps/web/scripts/export-e2e.mjs --variant /tmp/p3/variant-1.png.tree.json --out-dir /tmp/p5 \
 && node packages/render/scripts/assert-export.mjs /tmp/p5
```

**Expected output:**
```
relayout: base(1:1) → 1:1 1200x1200 ✓  1.91:1 1200x627 ✓  4:5 960x1200 ✓
export: 3 files JPG   sizes: 1.2MB / 0.9MB / 1.1MB  (all ≤ 5MB) ✓
safe-zone: headline within safe area in all ratios (no crop, no fold overlap) ✓
PASS P5  —— MLP COMPLETE ——
```

**PASS when:** one approved base yields **three spec-valid** assets (correct dimensions, JPG/PNG, each
≤5 MB) via re-layout with no headline crop. **This is the MLP gate** — P0–P5 together satisfy the
Definition of Done for the minimal lovable product (doc product 01).

**FAIL / STOP if:** any exported asset has wrong dimensions, exceeds 5 MB, or the re-layout crops/hides
required copy.

---

## 8. Phase 6 — Critic + Engagement (commercially-clean path)

> **Goal:** ranking makes the board **testable**, not just pretty. **Clean saliency path only; TRIBE stays
> quarantined** behind `ENGAGEMENT_BACKEND=tribe_research` + `RESEARCH_MODE`, never on the commercial path
> (CANON §9). Report **bands + confidence** (CANON §6/§9).

### 8.1 Deliverables & file/dir targets

| # | Deliverable | Target path | Authoritative doc |
|---|---|---|---|
| 6.1 | `EngagementPredictor` (`saliency` backend): bottom-up saliency + grid-salience heuristics (contrast/color/position/focus/clutter) | `services/engine/app/predictors/saliency.py` | doc engagement (08); R7 §1.4 |
| 6.2 | Engine scoring endpoint; returns `EngagementScores` (focalClarity, valuePropAttention, ctaAttention, clutter, stoppingPower, predictedCtrBand{low,high,confidence}) | `services/engine/app/api/score.py` (`ENGINE_URL`) | doc engagement (08); CANON §6 |
| 6.3 | `EngagementAnalyst` agent (calls predictor, interprets, recommends) + `Critic` agent (LinkedIn playbook + anti-patterns) | `apps/web/src/server/studio/agents/{engagementAnalyst,critic}.ts` | doc agent-studio (05) |
| 6.4 | Board ranking by scores; scores shown as **bands + confidence** | `apps/web/src/app/(studio)/board/*` | doc product (01); doc engagement (08) |
| 6.5 | TRIBE v2 backend **quarantined** in `services/engine`, gated by BOTH `ENGAGEMENT_BACKEND=tribe_research` AND `RESEARCH_MODE` | `services/engine/research/tribe/*` | CANON §9; R7 §1.4 |
| 6.6 | **CI license gate** — build-time check that TRIBE (CC-BY-NC) code paths are **unreachable** on the commercial build | `.github/workflows/ci.yml` + `scripts/gate/license-containment.sh` | R7 §7 (highest-severity failure) |

### 8.2 Build vs stub

- **Build:** the commercially-clean `saliency` predictor, engine scoring endpoint, `Critic` +
  `EngagementAnalyst`, board ranking, the **CI license-containment gate**.
- **Quarantine (do not put on commercial path):** TRIBE v2 (`facebook/tribev2`) — research-only, GPU on
  Modal/Replicate, unreachable unless both flags set.
- **Enforce:** wire the ≤2 auto-iterate loop to actually consume `Critic`/`EngagementAnalyst` scores now
  (in P3 it was bounded but had no scorer to trigger on).

### 8.3 External APIs / assets touched (VERIFY before coding)

| Item | VERIFY note |
|---|---|
| **`facebook/tribev2`** (HF) | `VERIFY current docs before coding`: still **CC-BY-NC-4.0** (non-commercial) — confirms research-only gating; if Meta relicenses, revisit. The `saliency` prod path does **not** depend on this (R7 §1.4, §9.7). |
| Modal / Replicate (engine GPU) | `VERIFY`: GPU runtime for saliency/TRIBE research; the clean saliency path should run CPU-cheap where possible. |
| Whisper / Ollama (research only) | `VERIFY`: only inside the quarantined research backend. |

### 8.4 Acceptance gate — P6

**Command (`pnpm gate:P6`):**
```bash
bash scripts/gate/license-containment.sh \
 && (cd services/engine && pytest -q) \
 && node apps/web/scripts/score-board.mjs --board /tmp/p3 --backend saliency
```

**Expected output:**
```
license-containment: ENGAGEMENT_BACKEND=saliency build → NO import path reaches services/engine/research/tribe ✓
                     tribe import ONLY reachable when RESEARCH_MODE=1 && ENGAGEMENT_BACKEND=tribe_research ✓
engine: saliency predictor tests pass ✓
score-board: 6 variants → EngagementScores{focalClarity,ctaAttention,stoppingPower,predictedCtrBand{low,high,confidence}}
board ranked by stoppingPower; scores shown as BANDS + confidence ✓
PASS P6
```

**PASS when:** the board arrives **ranked** with focal-clarity / stopping-power **bands + confidence**
from the `saliency` backend; the **license-containment CI gate is green** (TRIBE unreachable on the
commercial build).

**FAIL / STOP if:** the license gate finds any reachable TRIBE import on the commercial path
(**legal, highest-severity — STOP**), or scores are reported as point values rather than bands.

---

## 9. Phase 7 — Carousel (document ads)

> **Goal:** same spine, **+ ordered `Slide[]`**. High client value (their prior pain), low new risk
> (R7 §3). Per-slide **hook → reframe → close** narrative; delivered as a **PDF document ad** (CANON §8).

### 9.1 Deliverables & file/dir targets

| # | Deliverable | Target path | Authoritative doc |
|---|---|---|---|
| 7.1 | `CarouselArchitect` agent (multi-slide narrative hook→reframe→close, continuity across slides) | `apps/web/src/server/studio/agents/carouselArchitect.ts` | doc agent-studio (05); CANON §7 |
| 7.2 | `AdDocument.type='carousel'` path: ordered `Slide[]`, each slide its own layer tree | (orchestrator branch) + doc data-model schemas | doc data-model (03); CANON §5 |
| 7.3 | PDF document-ad exporter (multi-page, square 1080×1080 recommended, up to ~10–12 slides) | `packages/render/src/export/documentAd.ts` | the export path (doc 06); CANON §8 |
| 7.4 | Board/editor support for multi-slide Variants (reorder, per-slide edit) | `apps/web/src/app/(studio)/*` | doc editor (06) |

### 9.2 Build vs stub

- **Build:** `CarouselArchitect`, carousel orchestration branch, PDF doc-ad export, multi-slide editing.
- **Reuse:** all P1–P6 machinery (render, providers, agents, engagement per-slide via `perSlide[]` in
  `EngagementScores`).
- **Enforce:** cross-slide **continuity** (visual + narrative) — `CarouselArchitect` output schema must
  carry continuity constraints; `CompositorPlanner` respects them per slide.

### 9.3 External APIs touched (VERIFY before coding)

| Item | VERIFY note |
|---|---|
| **`polotno-node` PDF export** | `VERIFY current docs before coding`: multi-page store-JSON → PDF fidelity + fonts (R7 §6). |
| **LinkedIn document-ad spec** | `VERIFY`: page count (~10–12), square 1080×1080 recommendation, PDF delivery (CANON §8; R7 §9.11). |

### 9.4 Acceptance gate — P7

**Command (`pnpm gate:P7`):**
```bash
node apps/web/scripts/carousel-e2e.mjs --workspace brutal \
   --brief "Why German law firms are switching to AI contract drafting" \
   --slides 5 --out /tmp/p7.pdf \
 && node packages/render/scripts/assert-pdf.mjs /tmp/p7.pdf --pages 5 --w 1080 --h 1080
```

**Expected output:**
```
CarouselArchitect → 5 slides: [hook, reframe, reframe, proof, close]  continuity=ok ✓
per-slide layer trees + imagery ✓   BrandGuardian: 5/5 PASS ✓
export: /tmp/p7.pdf  pages=5  1080x1080  ≤ size-limit ✓
PASS P7
```

**PASS when:** a brief yields a multi-slide carousel with a coherent hook→reframe→close narrative and
cross-slide continuity, every slide passes BrandGuardian, and it exports to a spec-valid **PDF**.

**FAIL / STOP if:** slides lack narrative/visual continuity, any slide fails BrandGuardian, or the PDF
violates page-count/dimension spec.

---

## 10. Phase 8 — Localization (DE ⇄ EN)

> **Goal:** bilingual is **first-class** for Brutal (CANON §1). One ad → two languages **from the same
> tree** via a **text-layer swap**, never a re-render/re-roll (R7 §2).

### 10.1 Deliverables & file/dir targets

| # | Deliverable | Target path | Authoritative doc |
|---|---|---|---|
| 8.1 | `LocalizationAgent` — DE⇄EN **transcreation** (not literal translation); TTS-safe number spelling (e.g. "zwölfhundert") | `apps/web/src/server/studio/agents/localizationAgent.ts` | doc agent-studio (05) `LocalizationAgent` + doc brand-kit (09) `localization` + doc creative-playbook (07); CANON §7 |
| 8.2 | `smart` layers bound to locale; localized text variants stored per language | doc data-model (03) `smart`/`text` layer + locale binding | doc brand-kit (09) `localization` block; CANON §5 |
| 8.3 | Locale-aware re-layout (DE strings run longer — `renderHints.autoFit`/`maxLines` must hold) | `packages/shared/src/relayout.ts` (extend) | ⚑R-LT1; doc editor (06) (export/re-layout) |
| 8.4 | `BrandGuardian` localization rule check (per-language banned terms/voice/disclaimer) | `packages/shared/src/brand/guard.ts` (extend) | doc agent-studio (05); CANON §7 |

### 10.2 Build vs stub

- **Build:** `LocalizationAgent`, per-locale text binding, locale-aware re-layout/auto-fit, per-language
  BrandGuardian rules.
- **Enforce:** switching language spends **zero** image credits (text swap only) — assert
  `generation_job` delta = 0 across a DE→EN switch.

### 10.3 External APIs touched (VERIFY before coding)

| API | VERIFY note |
|---|---|
| **Anthropic** (`LocalizationAgent`, `claude-sonnet-5`) | **Code default `claude-sonnet-5` now; only adjust if the live call errors (4xx).** VERIFY is never a stop for the factory (CANON §12 L12). Re-confirm model id; transcreation prompt quality for DE legal register + TTS-safe number spelling (doc agent-studio (05) + doc brand-kit (09); R7 §5.3). |

### 10.4 Acceptance gate — P8

**Command (`pnpm gate:P8`):**
```bash
node apps/web/scripts/localize-e2e.mjs --variant /tmp/p3/variant-1.png.tree.json \
   --from de --to en --out-dir /tmp/p8
```

**Expected output:**
```
LocalizationAgent: DE→EN transcreation (not literal) ✓  numbers TTS-safe ✓
text-layer swap only:  generation_job delta = 0  (no image re-roll) ✓
relayout: EN + DE both fit safe-zones (autoFit/maxLines held) ✓
BrandGuardian per-language: PASS (de) PASS (en) ✓
render: /tmp/p8/variant-1.de.png  /tmp/p8/variant-1.en.png  (on-brand, same imagery) ✓
PASS P8
```

**PASS when:** one ad renders in both languages from the same tree, imagery is unchanged (no image
credits), both pass per-language BrandGuardian, and neither overflows safe zones.

**FAIL / STOP if:** localization triggers an image re-roll, DE text overflows, or a language fails
BrandGuardian.

---

## 11. Phase 9 — Video (first-class fast-follow)

> **Goal:** the explicitly first-class fast-follow (CANON §0). Heaviest infra, so it comes **after** the
> static loop is loved (R7 §3). **Muted-first with burned-in subtitles; first 3 seconds carry stopping
> power** (CANON §8).

### 11.1 Deliverables & file/dir targets

| # | Deliverable | Target path | Authoritative doc |
|---|---|---|---|
| 9.1 | `VideoProvider` (`kling` primary — default `kling-v2-5-turbo`, escalate `kling-3.0-omni` for face/sound-on per CANON §12 L4; JWT HS256; task create→poll); fallbacks `veo-3.1-*`/Runway/Seedance via `fal` registered | `apps/web/src/server/providers/{kling,veo,runway,seedance}.ts` | doc providers (04); CANON §6; R7 §5.2 |
| 9.2 | `AudioProvider` (`elevenlabs` TTS/VO, DE + EN; chunk >3k chars) | `apps/web/src/server/providers/elevenlabs.ts` | doc providers (04); R7 §5.2 |
| 9.3 | Remotion composition (`AdDocument.type='video'` = Remotion spec + layer/subtitle/audio tracks) | `packages/render/src/remotion/BrutalAd.tsx`, `packages/render/src/remotion/renderVideo.ts` | doc editor (06)/export path (doc 06); CANON §5 |
| 9.4 | Muted-first burned-in subtitles + first-3-seconds stopping-power check (via `EngagementScores.firstThreeSeconds`) | (Remotion + engine) | doc engagement (08); CANON §8 |
| 9.5 | Export: 1:1 / 4:5 / 16:9 MP4, **≤200 MB** | `packages/render/src/remotion/renderVideo.ts` | CANON §8 |

### 11.2 Build vs stub

- **Build:** `kling` video driver, `elevenlabs` audio driver, Remotion assembly, muted-first subtitles,
  MP4 export with size cap, first-3-seconds scoring.
- **Register but keep as fallbacks:** Veo/Runway/Seedance (via `fal`) — `bus` routes to them only on
  Kling failure (R7 §5.3). **Failed Kling tasks are free** — surface that in cost accounting.

### 11.3 External APIs touched (VERIFY before coding)

| API | Endpoint skeleton | VERIFY note |
|---|---|---|
| **Kling** (`KLING_ACCESS_KEY`, `KLING_SECRET_KEY`) | JWT HS256 `{iss,exp:now+1800,nbf:now-5}` → `POST <kling-host>/v1/videos/image2video {model_name:"kling-v2-5-turbo",...}` → poll until `succeed`. **`kling-v2-5-turbo` is the everyday default (CANON §12 L4); escalate to `kling-3.0-omni` for face-consistency / sound-on dialogue.** | **Code default `kling-v2-5-turbo` now; only adjust if the live call errors (4xx).** VERIFY is never a stop for the factory (CANON §12 L12). Re-confirm host + task path slugs + JWT claims at KlingAI Open Platform console (unauth fetch returned 446); failed tasks don't consume credits (R7 §5.4, §9.4). |
| **ElevenLabs** (`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_*`) | `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` header `xi-api-key`, `{text,model_id:"eleven_v3",voice_settings}` | `VERIFY`: exact `model_id` slug for Eleven v3; **3k-char/request → chunk long VO**; pin voice IDs per language (R7 §5.4, §9.5). |
| **Remotion** (license) | render project → MP4 | `VERIFY`: **Company License** required (4+ employees); plan choice seat vs render (R7 §6, §9.9). Not a runtime secret — a cost line item. |

### 11.4 Acceptance gate — P9

**Command (`pnpm gate:P9`):**
```bash
node apps/web/scripts/video-e2e.mjs --workspace brutal \
   --brief "German legal AI — 12 hours of contract review in 12 minutes" \
   --ratio 4:5 --lang de --out /tmp/p9.mp4 \
 && node packages/render/scripts/assert-video.mjs /tmp/p9.mp4 --w 960 --h 1200 --maxMB 200
```

**Expected output:**
```
kling: model_name=kling-v2-5-turbo (default) task created (JWT) → succeed ✓   (failed tasks would be free)
elevenlabs: DE VO, chunked ≤3k chars ✓   voice=ELEVENLABS_VOICE_ID_DE ✓
remotion: assembled muted-first, burned-in subtitles ✓   first-3s stoppingPower=HIGH band ✓
export: /tmp/p9.mp4  4:5 960x1200  48MB (≤200MB) ✓
PASS P9
```

**PASS when:** a brief yields a **muted-first** MP4 with burned-in subtitles in a valid ratio, ≤200 MB,
with DE VO and a scored first-3-seconds stopping-power band.

**FAIL / STOP if:** subtitles are not burned in, VO is missing/unchunked, the file exceeds 200 MB, or the
ratio is invalid.

---

## 12. Phase 10 — Results feedback + calibration (the moat)

> **Goal:** turn predictions from generic to **this-tenant-true** (R7 §1.4). Ingest real LinkedIn
> `Result`s, re-fit the `EngagementPredictor` bands **per workspace**. Ingest **results only — never
> automate spend** (R7 §4).

### 12.1 Deliverables & file/dir targets

| # | Deliverable | Target path | Authoritative doc |
|---|---|---|---|
| 10.1 | `Result` ingest: manual paste UI + optional LinkedIn API import (real CTR/impressions/engagement) | `apps/web/src/app/(studio)/results/*`, `apps/web/src/app/api/results/route.ts` | doc data-model (03) `Result`; doc engagement (08) |
| 10.2 | Calibration loop: re-fit `predictedCtrBand` per workspace from real `Result`s | `services/engine/app/calibration/*` | doc engagement (08) |
| 10.3 | `Experiment`/`ExperimentArm`/`Result` wiring so a Variant's real outcome closes the lineage loop | doc data-model (03) entities | CANON §5 |
| 10.4 | Predictor reports **tightening** bands over time (calibration metric surfaced) | (engine + board) | doc engagement (08) |

### 12.2 Build vs stub

- **Build:** manual `Result` paste + calibration re-fit + per-workspace band tightening.
- **Optional (behind flag):** LinkedIn API auto-import of results (never auto-spend).
- **Enforce:** calibration is **per `workspace_id`** (RLS-scoped) — one tenant's results never influence
  another's bands.

### 12.3 External APIs touched (VERIFY before coding)

| API | VERIFY note |
|---|---|
| **LinkedIn Marketing / Ads API** (optional results import) | `VERIFY current docs before coding`: auth (OAuth), analytics endpoints, rate limits, whether results export is available to the account tier. Results ingest only — **no spend automation** (R7 §4). ⚑ ASSUMPTION (A-LIN): manual paste is the guaranteed path; API import is best-effort. |

### 12.4 Acceptance gate — P10

**Command (`pnpm gate:P10`):**
```bash
node apps/web/scripts/results-e2e.mjs --workspace brutal \
   --ingest fixtures/linkedin-results.csv \
 && (cd services/engine && pytest -q calibration)
```

**Expected output:**
```
ingest: 40 Result rows (workspace=brutal) ✓   linked to Variants via lineage ✓
calibration: per-workspace re-fit → predictedCtrBand width  0.9%→0.4%  (tightened) ✓
isolation: workspace B bands unchanged by workspace A results ✓
PASS P10  —— FULL PLATFORM COMPLETE ——
```

**PASS when:** real results ingest per workspace, the predictor re-fits and its bands **tighten** against
real CTR, and calibration is tenant-isolated.

**FAIL / STOP if:** calibration crosses tenants, or ingest is not linked to Variant lineage.

---

## 13. Cross-cutting invariants (must hold at EVERY gate)

These are checked continuously, not once. Any regression **fails the current phase gate.**

| # | Invariant | Enforced by | First introduced |
|---|---|---|---|
| INV-1 | **RLS: no cross-tenant read/write** (`workspace_id` isolation) | `p0_rls_check.sql`; every gate runs a cross-tenant probe | P0 |
| INV-2 | **Imagery-only prompts** — no headline/CTA/legal/copy text ever enters a `GenSpec.prompt` (anti-re-roll, CANON §2) | prompt-purity unit test | P2 |
| INV-3 | **Edits are `LayerPatch` diffs, never full re-rolls**; copy edits spend **0** image credits | `generation_job` delta assertion | P4 |
| INV-4 | **BrandGuardian hard gate** — nothing reaches the board un-guarded; patched trees re-pass | orchestrator + patch route | P3 |
| INV-5 | **Human-approve gate** — nothing ships un-approved (CANON §7) | board state machine | P4 |
| INV-6 | **Cost caps pre-flight** — per-brief & per-workspace `cost_usd` caps; auto-iterate ≤2 rounds | `agent-runner` + orchestrator counter | P3 |
| INV-7 | **Every external call is an async `GenerationJob`** with a fallback chain and graceful UI (no raw failure) | job lifecycle + bus | P2 |
| INV-8 | **License containment** — TRIBE (CC-BY-NC) unreachable on the commercial build | CI license gate | P6 |
| INV-9 | **Model ids / prices in config, never hardcoded**; resolved slug + `cost_usd` stored in lineage | provider drivers + `agent-runner` | P2/P3 |
| INV-10 | **Bands + confidence**, never point scores; calibrated per workspace | engine + board | P6 |
| INV-11 | **Scores/specs derive from ONE base tree** via smart re-layout (renderHints + safe-zones), never naive crop | `relayout.ts` | P5 |

---

## 14. The factory's per-phase verification protocol (how to self-check)

For **every** phase, the factory executes this loop and does not advance until step 6 is green:

```
1. READ the authoritative doc(s) for this phase (table in §1 / each phase header).
2. For each external API in the phase's "VERIFY before coding" table:
     re-confirm slug/endpoint/auth/price against LIVE docs → record resolved values in config.
3. BUILD the deliverables to their exact file/dir targets (do not build later phases' scope).
4. STUB everything not in scope as typed NotImplemented('<phase>') — never silent null.
5. RUN:  pnpm typecheck && pnpm lint && pnpm test && pnpm gate:P<N>
6. ASSERT the gate's "Expected output" matches; exit 0.
     - If red: fix within THIS phase's scope only; do not borrow later phases.
     - If an invariant in §13 regressed: fix before advancing (they are non-negotiable).
7. COMMIT with the phase tag (e.g. "P<N>: <name> — gate green").
8. ADVANCE to P<N+1>.
```

**Global "definition of green" for a phase:** `pnpm typecheck` + `pnpm lint` + `pnpm test` + `pnpm
gate:P<N>` all exit `0`, the printed gate output matches the phase's **Expected output**, and **no §13
invariant regressed** (each gate re-runs the cross-tenant RLS probe and, from P2/P4/P8, the
image-credit-delta probe).

---

## 15. Milestone → demo mapping (what a human sees at each gate)

| After | The human can… | Which promise it proves (CANON §0) |
|---|---|---|
| P0 | log into an empty, multi-tenant workspace with the Brutal brand kit | multi-tenant foundation |
| P1 | see a pixel-perfect on-brand ad render from JSON | "editable layers, not baked pixels" |
| P2 | watch a background generate and composite under editable text | imagery-only generation + async jobs |
| P3 | **type a brief → get 3–6 on-brand ads on a board** | "type a brief → get a board of ads" |
| P4 | **drag a layer / chat "make it gold" → instant, no re-roll** → approve | "tweak any element by drag or by chat" |
| P5 | **download spec-correct 1:1 / 1.91:1 / 4:5 assets** — **MLP** | "export to exact LinkedIn spec" |
| P6 | see the board **ranked** by stopping-power (bands + confidence) | "testable ads / predict engagement" |
| P7 | get a **multi-slide PDF document ad** (hook→reframe→close) | carousel (prior pain, solved) |
| P8 | flip one ad **DE ⇄ EN** with zero re-roll | bilingual, first-class |
| P9 | get a **muted-first MP4** with burned-in subtitles | "video as a first-class fast-follow" |
| P10 | ingest real results → predictions **tighten** to this tenant | the compounding moat |

---

## 16. Summary of recommendations carried into this plan (all inherited from R7, none new)

| # | Recommendation | Where it lands in the build |
|---|---|---|
| ⚑R-A1 | Add `IntakeAgent` before `Strategist` | P3 deliverable 3.3 |
| ⚑R-LT1 | Per-layer `renderHints` for deterministic multi-ratio re-layout | P0 (`renderHints.ts`), realized P5/P8 |
| ⚑R-LLM1 | Default **Sonnet 5**, escalate **Opus 4.8**, **Haiku 4.5** cheap tasks | P3 deliverable 3.4 (config-driven) |
| ⚑R-PROV1 | Ideogram/Recraft **fallback-only** for image gen | P2 (registered, low-rank), never wins normal routing |
| ⚑R-PROV2 | Source Seedream via `FAL_KEY`; keep `SEEDREAM_API_KEY` source-agnostic | P2 stub → later fallback |
| ⚑R-INFRA1 | Default queue = **Supabase Queues (pgmq)**; Inngest = adapter | P2 deliverable 2.4 |
| ⚑R-ENV1 | Add `POLOTNO_API_KEY` to canonical env; budget Remotion Company License | P0 (`.env.example`), P1 (Polotno), P9 (Remotion) |

> **This document introduces no new divergence from CANON.** Every ⚑ note above was raised and ratified in
> `research/R7-blank-slate-arch.md` and the upstream docs (01/03/04/05/06); this plan only *sequences and
> gates* them. If the factory finds a genuine conflict, it must halt and surface it as a new
> ⚑ RECOMMENDATION rather than silently diverge (CANON §preamble).

---

## 17. Consolidated "VERIFY before coding" index (by phase)

| Phase | Must re-verify against live docs (R7 §9 numbers in parentheses) |
|---|---|
| P0 | Supabase RLS/Auth/Storage policy syntax; pgmq availability (10) |
| P1 | Polotno + `polotno-node` license/price + Playfair/Inter render fidelity (8) |
| P2 | BFL FLUX.2 slug/body/`x-key`/poll + credit price (2); pgmq visibility window (10) |
| P3 | Claude model ids + Sonnet 5 intro pricing window ends 2026-08-31 (1) |
| P4 | Polotno SDK version + store-JSON parity with render adapters |
| P5 | LinkedIn 2026 single-image ratios/size/char limits (11) |
| P6 | `facebook/tribev2` still CC-BY-NC-4.0 (7); Modal/Replicate GPU |
| P7 | `polotno-node` PDF fidelity; LinkedIn document-ad spec (11) |
| P8 | Claude model id for `LocalizationAgent`; DE legal register quality |
| P9 | Kling host/path/JWT (4); ElevenLabs v3 `model_id` + 3k chunking (5); Remotion Company License (9); Seedream fal source (6) |
| P10 | LinkedIn Marketing/Ads API auth + analytics endpoints (results only) |

**End of doc 10 — Build Plan.**


<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: docs/11-env-and-keys.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

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


<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: docs/12-security-cost-ops.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

# 12 — SECURITY, COST & OPS

> **Scope.** This is the enforceable operations contract for **Brutal Ads**: multi-tenant isolation (Supabase
> RLS + Storage), secret handling, content-moderation surfacing on generation failure, the **PII stance (ads
> only — no member/audience data)**, provider rate limiting, retries/backoff, idempotency + caching keys,
> **hard per-brief and per-workspace SPEND CAPS with pre-flight enforcement + rollup**, cost/token/latency
> **observability** (`agent_run`, `generation_job`), the append-only **audit log**, and a concrete **cost model
> (est. $/ad by path)**. Everything here is meant to be *built as written* — DDL, code skeletons, exact
> policies, and thresholds, not prose.
>
> **Conforms to `CANON.md`.** Object-model names (`Workspace`, `Brief`, `Variant`, `AgentRun`,
> `GenerationJob`, `AuditLog`, `WorkspaceMember`, …), provider contracts (`GenSpec`/`GenResult`/`ProviderBus`),
> agent names (§7), env-var names (§10), repo shape (§4), and locked decisions are canonical and are **not**
> re-decided here. Where I extend a sibling doc I say so; where I diverge I flag **`⚑ RECOMMENDATION`**.
>
> **Grounding:** `research/R7-blank-slate-arch.md` (`ProviderBus`, caching, cost caps, moderation surface,
> license containment, model tiering ⚑R-LLM1), `research/R1-image-models.md` + `research/R2-video-audio.md`
> (per-call prices that feed the cost model), and the sibling build docs **`docs/03-data-model.md`** (schema +
> RLS pattern — the single source of DDL truth for the object model) and **`docs/04-provider-integrations.md`**
> (the `httpJson` retry helper, `ProviderError` taxonomy, `provider_pricing`, `assertBudget`, cost formulas).
> **This doc owns the parts those two leave open:** the *deepened* RLS/Storage hardening checklist, the
> secret-handling matrix, the PII stance, the **rate-limit governor**, the **idempotency table**, the **spend
> rollup + reservation ledger**, the **observability/alerting surface**, and the **$/ad cost model**.
>
> **⚠️ Drift warning.** Every external price / limit / endpoint below is tagged **`VERIFY current docs before
> coding`**. Pricing is the single most drift-prone field in the whole package (R1/R2). Store all prices as
> **data** (`provider_pricing`, §7), never as code constants.

---

## 0. TL;DR — the ten enforceable controls (read first)

| # | Control | Enforced where | Fail-closed? |
|---|---|---|---|
| 1 | **Tenant isolation** — RLS on *every* tenant table + Storage; `apps/web` uses anon key + user JWT | Postgres RLS (`docs/03 §10`) + Storage policies (§2) | ✅ (default deny) |
| 2 | **Service-role key never ships to the client** — server-only (route handlers, workers, webhooks) | Build gate + CI grep (§3.4) | ✅ |
| 3 | **PII stance: ads only, no member/audience data** — no LinkedIn member PII ever ingested (§4) | Schema (no PII columns) + IntakeAgent redaction + CI schema-lint | ✅ |
| 4 | **Moderation surface on every gen failure** — refused images explained, never swallowed | `generation_job.moderation` + `ModerationEvent` (§5) | ✅ (surfaced) |
| 5 | **Pre-flight spend cap** — orchestrator refuses any job that would breach per-brief/per-workspace caps | `assertBudget` + reservation ledger (§8) | ✅ |
| 6 | **Rate-limit governor** — per-provider concurrency + token buckets, workspace-fair | `provider_rate_limit` + governor (§6) | ✅ (queues) |
| 7 | **Idempotency** — every mutating job/webhook carries an idempotency key; replays are no-ops | `idempotency_key` table (§7.4) | ✅ |
| 8 | **Caching** — `sha256(provider,model,version,prompt,seed,params)`; cache hit ⇒ `cost_usd=0` | `asset.cache_key` unique-per-ws (§7) | — |
| 9 | **Full cost/token/latency observability** — every `agent_run` + `generation_job` logs cost | schema + rollup views (§9) | — |
| 10 | **License containment** — TRIBE (CC-BY-NC) unreachable on commercial path; every run stamped | CI gate + `audit_log.commercial_use` (§11) | ✅ |

**Cost headline (VERIFY):** a default static single-image ad (Sonnet-5 agent loop + 1× FLUX.2 [pro] hero,
1:1) lands at **≈ $0.11–0.18 all-in**; a 6-variant board **≈ $0.55–0.95**; a carousel doc-ad (6 slides)
**≈ $0.45–0.80**; a 15 s video (Kling i2v + ElevenLabs VO + Remotion) **≈ $3.00–5.50**. Full model in §12.

---

## 1. Trust boundaries & data-flow (what runs where, who holds what key)

```
                 ┌──────────────────────────── BROWSER (untrusted) ────────────────────────────┐
                 │  apps/web client bundle                                                      │
                 │  • Supabase JS: SUPABASE_URL + SUPABASE_ANON_KEY  (+ user JWT after login)    │
                 │  • RLS ENFORCED on every query. NO service-role key. NO provider keys.        │
                 └───────────────┬──────────────────────────────────────────────────────────────┘
                                 │  HTTPS (user JWT)
                 ┌───────────────▼──────────────────────── apps/web SERVER (trusted) ───────────┐
                 │  Next.js route handlers / server actions / job workers / webhook receivers    │
                 │  • Holds ALL provider secrets (ANTHROPIC/BFL/FAL/GEMINI/KLING_*/ELEVENLABS/…)  │
                 │  • Holds SUPABASE_SERVICE_ROLE_KEY (bypasses RLS) — server-only                │
                 │  • Enforces: spend caps, rate governor, idempotency, moderation surface        │
                 │  • Enqueues GenerationJob (pgmq) ; logs agent_run/generation_job/audit_log      │
                 └───────┬───────────────────────┬───────────────────────────┬───────────────────┘
                         │ pgmq (Supabase Queues) │ HTTPS + provider auth     │ HTTPS (ENGINE_URL)
                 ┌───────▼──────┐        ┌────────▼─────────┐        ┌─────────▼───────────┐
                 │ Supabase     │        │ External gen APIs │        │ services/engine      │
                 │ Postgres+RLS │        │ BFL/fal/Gemini/…  │        │ (FastAPI, saliency)  │
                 │ Auth/Storage │        │ Kling/ElevenLabs  │        │ TRIBE = flag-gated   │
                 └──────────────┘        └───────────────────┘        └─────────────────────┘
```

**Invariants (all fail-closed):**
- **The browser never holds a secret beyond the anon key + the user's own JWT.** Every provider key and the
  service-role key live only in server env (Vercel encrypted env vars; `services/engine` env). (CANON §10; R7 §7.)
- **Every DB read/write from the client is RLS-scoped.** The service-role key (RLS-bypassing) is used *only* by
  trusted server code (workers, webhooks, RPCs) — `docs/03 §0.2`.
- **Every arrow to an external gen API is an async `GenerationJob`** (pgmq default, Inngest adapter — R7
  ⚑R-INFRA1) with a fallback chain and a moderation surface — no synchronous provider call from a request handler.
- **`services/engine` is called only server→server** over `ENGINE_URL` with a shared secret (§3.2); it is not
  publicly routable and never receives a user JWT.

---

## 2. Supabase RLS / tenant isolation (deepens `docs/03 §10`)

`docs/03 §10` is the **source of truth** for the RLS DDL (the `current_workspace_ids()` /
`has_workspace_role()` helpers and the generic per-table `select/insert/update/delete` policies). Do **not**
re-author those policies here. This section adds the **hardening + Storage isolation** that `docs/03` flags but
does not fully specify, and the **acceptance tests** the factory must pass.

### 2.1 The isolation model (recap — build to `docs/03 §10`, not to memory)

- Tenant boundary = `workspace`. Every tenant table carries `workspace_id uuid not null references
  workspace(id) on delete cascade` (`docs/03 §0.2`).
- The RLS pivot is `workspace_member`. Policies answer *"is `auth.uid()` a member of the row's `workspace_id`
  (with an editing role for writes)?"* via the two `SECURITY DEFINER` helpers.
- `apps/web` client = **anon key + user JWT** ⇒ RLS enforced. Trusted server code = **service-role key** ⇒ RLS
  bypassed (and therefore MUST filter by `workspace_id` itself).

### 2.2 `SECURITY DEFINER` hardening (mandatory — a common RLS footgun)

Both helpers in `docs/03 §10.1` are `security definer`. Harden them exactly as follows, or a compromised
`search_path` becomes a privilege-escalation path:

```sql
-- Every SECURITY DEFINER function MUST pin search_path (already in docs/03; verify it is present)
-- and MUST be owned by a role the app cannot alter. Lock EXECUTE to authenticated only.
alter function public.current_workspace_ids() owner to postgres;
alter function public.has_workspace_role(uuid, member_role[]) owner to postgres;
revoke all on function public.current_workspace_ids() from public;
revoke all on function public.has_workspace_role(uuid, member_role[]) from public;
grant execute on function public.current_workspace_ids() to authenticated;
grant execute on function public.has_workspace_role(uuid, member_role[]) to authenticated;
```

> `VERIFY current docs before coding` — Supabase `SECURITY DEFINER` + `search_path` hardening and `auth.uid()`
> semantics at **supabase.com/docs/guides/database/postgres/row-level-security** and
> **/database/functions#security-definer-vs-invoker**. Run the Supabase **security advisor** (`get_advisors`,
> lint type `security`) after every migration — it flags tables missing RLS and mutable `search_path`.

### 2.3 Storage bucket isolation (the one place table-RLS does NOT cover — implements `docs/03 ⚑R-DM4`)

Assets live in Supabase Storage / R2 (CANON §4). A signed-URL leak or a mis-scoped path can cross tenants even
when table RLS is perfect. **Enforce path-scoping + Storage RLS that mirrors table RLS.**

- **Canonical object path:** `assets/{workspace_id}/{asset_id}.{ext}` (and `renders/{workspace_id}/…`,
  `exports/{workspace_id}/…`). `asset.storage_path` (`docs/03`) MUST begin `assets/{workspace_id}/`.
- **Bucket is private** (never public). All delivery is via **short-TTL signed URLs** minted server-side
  (§2.4).
- **Storage RLS policy** (Supabase stores objects in `storage.objects`; the tenant id is the first path
  segment):

```sql
-- supabase/migrations/0008_storage_rls.sql
-- Buckets are private. Reads/writes require workspace membership derived from the object path.
-- storage.foldername(name) returns the path segments; [1] is the workspace_id segment.
create policy storage_assets_select on storage.objects
  for select using (
    bucket_id = 'assets'
    and (storage.foldername(name))[1]::uuid in (select public.current_workspace_ids())
  );
create policy storage_assets_write on storage.objects
  for insert with check (
    bucket_id = 'assets'
    and (storage.foldername(name))[1]::uuid in (select public.current_workspace_ids())
    and public.has_workspace_role((storage.foldername(name))[1]::uuid,
                                  array['owner','admin','editor']::member_role[])
  );
-- Repeat for update/delete and for the 'renders' / 'exports' buckets (swap bucket_id).
```

> `VERIFY current docs before coding` — Storage access-control + `storage.foldername`/signed-URL semantics at
> **supabase.com/docs/guides/storage/security/access-control**. If assets are on **R2** instead (CANON §4
> allows Supabase/R2), the equivalent is a **Worker/edge proxy that checks membership before issuing a
> presigned R2 URL** — never a public R2 bucket.

### 2.4 Signed-URL policy (all asset delivery)

| Rule | Value | Why |
|---|---|---|
| Default TTL | **300 s (5 min)** for provider-source re-hosts; **3600 s (1 h)** for editor/preview | Provider URLs (BFL/Kling) already expire ~10 min (R1 §2/R2 §1.4); minimize leaked-URL window |
| Minting | **server-side only**, after an RLS-checked membership read | Signed URLs bypass RLS by design — the *decision* to mint must be RLS-gated |
| Downloads for export | one-time, TTL 60 s, logged to `audit_log` (`action='export.downloaded'`) | Auditable egress of the deliverable |
| Never | embed a long-lived/public URL in `AdDocument`/`Variant` JSON | JSON is copied into lineage/exports; a baked public URL is a permanent leak |

### 2.5 RLS acceptance tests (CI must pass — extends `docs/03 §10.3`)

Ship these as **pgTAP / SQL assertions** in `supabase/tests/rls.sql`, run in CI against a seeded 2-workspace DB
(`WS-A`, `WS-B`; users `alice@A`, `bob@B`, `viewer@A`):

| # | Assertion | Expected |
|---|---|---|
| T1 | `bob@B` `select * from variant where workspace_id = WS-A` | **0 rows** (not an error) |
| T2 | `bob@B` insert into `variant` with `workspace_id = WS-A` | **fails `with check`** |
| T3 | `viewer@A` insert/update/delete on `variant` | **fails** (viewer read-only) |
| T4 | `bob@B` `select` a WS-A object via Storage signed path | **denied** by storage policy |
| T5 | Anonymous (no JWT) `select` on any tenant table | **0 rows** |
| T6 | Every tenant table has `rowsecurity = true` in `pg_tables` | **all true** (query the catalog) |
| T7 | `audit_log` insert from an `authenticated` role (not service role) | **fails** (no insert policy) |
| T8 | Service-role key present in any file under `apps/web/**` that ends up in the client bundle | **CI grep = 0 hits** (§3.4) |

```sql
-- sketch of T6 (fail the migration if any tenant table has RLS off)
do $$
declare t text;
begin
  for t in select unnest(array['brand_kit','campaign','brief','ad_document','variant','slide','asset',
                               'render','generation_job','agent_run','experiment','experiment_arm',
                               'result','audit_log','workspace','workspace_member'])
  loop
    if not (select relrowsecurity from pg_class where relname = t) then
      raise exception 'RLS not enabled on %', t;
    end if;
  end loop;
end $$;
```

---

## 3. Secret handling

### 3.1 Secret inventory & placement (env-var names verbatim from CANON §10 — do not rename)

| Secret (env var) | Holder | Client-safe? | Rotation | Notes |
|---|---|---|---|---|
| `SUPABASE_ANON_KEY` | browser + server | **yes** (RLS-scoped) | on compromise | Publishable; safe by design |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (workers/webhooks/RPC) | **NO — never client** | 90d + on compromise | Bypasses RLS; §3.4 CI gate |
| `SUPABASE_URL`, `APP_BASE_URL`, `ENGINE_URL` | server (+ URL client) | url only | — | `ENGINE_URL` server-only |
| `ANTHROPIC_API_KEY` | server (all agents) | **NO** | 90d | Whole studio |
| `BFL_API_KEY` | server | **NO** | 90d | `x-key` header |
| `FAL_KEY` | server | **NO** | 90d | Aggregator |
| `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY` | server | **NO** | 90d | Fallback-only (R7 ⚑R-PROV1) |
| `GEMINI_API_KEY`, `OPENAI_API_KEY` | server | **NO** | 90d | Edit / diversity |
| `SEEDREAM_API_KEY` | server | **NO** | 90d | Source-agnostic (R7 ⚑R-PROV2) |
| `KLING_ACCESS_KEY`, `KLING_SECRET_KEY` | server | **NO** | 90d | JWT HS256 minted per request (<30 min) |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_*` | server | **NO** (id can be config) | 90d | `xi-api-key` |
| `POLOTNO_API_KEY` | server (+ possibly client for editor) | ⚠️ see note | on compromise | R7 ⚑R-ENV1: add to canonical env list |
| `INNGEST_*` | server | **NO** | 90d | Reserved (pgmq default) |
| `ENGINE_SHARED_SECRET` | server ↔ engine | **NO** | 90d | §3.2 (⚑ add to env list) |
| `WEBHOOK_SIGNING_SECRET` | server | **NO** | 90d | §3.3 (⚑ add to env list) |

> `⚑ R-ENV2 (RECOMMENDATION)` — CANON §10 does not enumerate **`ENGINE_SHARED_SECRET`** (web↔engine auth) or
> **`WEBHOOK_SIGNING_SECRET`** (provider callback verification). Both are required for a secure build. Add them
> to the canonical env block in `docs/11`. This mirrors R7 ⚑R-ENV1 (which added `POLOTNO_API_KEY`); it is
> additive and renames nothing.

### 3.2 Web ↔ engine authentication

`services/engine` is **not publicly routable** (private network / IP allowlist) and additionally requires a
shared-secret header on every request:

```
POST {ENGINE_URL}/score
Authorization: Bearer {ENGINE_SHARED_SECRET}
X-Workspace-Id: {workspace_id}        # for engine-side logging/quotas only; never trusted for auth
```

The engine validates the bearer, rejects on mismatch (401), and **never** receives or trusts a user JWT. All
authorization decisions were already made server-side in `apps/web` before the call.

### 3.3 Inbound webhook verification (BFL / fal / Kling callbacks)

Provider callbacks (BFL `webhook_url`, fal `?fal_webhook=`, Kling `callback_url`) hit
`{APP_BASE_URL}/api/webhooks/{provider}`. **Never trust a webhook body until verified.**

- If the provider signs (HMAC over the raw body): verify with the provider's signing secret **before** parsing
  JSON. **`VERIFY current docs before coding`** the exact header/HMAC scheme for each (R1 §2.3 flags BFL
  `webhook_secret`; fal/Kling schemes vary).
- If the provider does **not** sign: treat the webhook as an *untrusted hint only* — do not act on its payload;
  instead use it as a signal to **re-poll the provider's task endpoint** (authenticated) for the authoritative
  result. Look the job up by `generation_job.provider_task_id`; ignore any webhook whose `provider_task_id` is
  unknown or already terminal (idempotency, §7.4).
- Bind webhooks to our own `WEBHOOK_SIGNING_SECRET` where a provider lets us set a shared secret; reject
  otherwise.

### 3.4 Client-bundle leak prevention (fail-closed CI gate)

The single highest-severity secret failure is shipping `SUPABASE_SERVICE_ROLE_KEY` (or any provider key) into
the client bundle. Enforce mechanically:

- **Naming discipline:** in `apps/web`, only vars prefixed `NEXT_PUBLIC_` are client-exposed. **No secret is
  ever `NEXT_PUBLIC_`.** `SUPABASE_ANON_KEY` may be `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the service-role key must
  never be.
- **CI grep gate** (blocks merge — RLS acceptance test T8):

```bash
# scripts/ci/secret-scan.sh  (exit 1 on any hit)
set -euo pipefail
# 1) no service-role / provider keys referenced from client-reachable code
if grep -RInE 'SERVICE_ROLE_KEY|BFL_API_KEY|FAL_KEY|ANTHROPIC_API_KEY|KLING_SECRET_KEY|ELEVENLABS_API_KEY' \
     apps/web/src 2>/dev/null \
     | grep -vE 'server-only|/server/|\.server\.'; then
  echo "SECRET referenced from potentially client-reachable code"; exit 1; fi
# 2) build the app, then scan the emitted client bundle for secret VALUES (from a test env)
pnpm --filter web build
if grep -RIl "$SUPABASE_SERVICE_ROLE_KEY" apps/web/.next/static 2>/dev/null; then
  echo "SERVICE ROLE KEY LEAKED INTO CLIENT BUNDLE"; exit 1; fi
```

- Import `server-only` in every module that touches a secret (Next.js will error if such a module is imported
  into a client component).
- Provider keys are read **once** in a server-only `env` module; never passed to a React prop, never logged.

### 3.5 Rotation & storage of secrets

- Secrets live in **Vercel encrypted environment variables** (web) and the engine host's secret store — never
  in the repo, never in `.env` committed to git. `.env.example` (CANON tree) contains **names only**, no values.
- Rotation cadence **90 days** for provider/service keys; **immediate** on any suspected leak.
- Log **key fingerprints** (`sha256(key)[:8]`), never the key, when you must record which credential a call used.

---

## 4. PII stance — **ads only, no member/audience data**

**This is a product-defining boundary, not a nice-to-have.** Brutal Ads generates *creative* (imagery + copy +
layout). It is **not** an audience/targeting/CRM tool. It therefore holds essentially **no personal data about
LinkedIn members or ad audiences** — which drastically shrinks the GDPR surface (relevant: the seed tenant
serves **German-speaking law firms** — CANON §1 — a high-sensitivity vertical).

### 4.1 What Brutal Ads holds vs never holds

| Category | Held? | Where / retention |
|---|---|---|
| Ad **creative** (layer trees, prompts, generated imagery, copy, exports) | **yes** | tenant tables + Storage; soft-delete (`docs/03`) |
| **Brief** text (the one-line brief + normalized fields) | **yes** | `brief` (may contain *tenant's own* offer/proof — treat as tenant-confidential, not member PII) |
| **Workspace member** identity (login email, role) | **yes, minimal** | `auth.users` + `workspace_member`; auth only |
| **Aggregate** ad results (impressions, clicks, CTR, spend) | **yes** | `result` — **counts/rates only, no per-person data** |
| LinkedIn **member** PII (names, profiles, emails of the audience) | **NEVER** | not ingested; no column exists for it |
| **Targeting/audience** definitions, lookalikes, contact lists | **NEVER** | out of scope; no table exists |
| End-user behavioral/tracking data | **NEVER** | — |
| Payment card data | **NEVER** (billing via a PCI-compliant processor, tokens only) | processor holds it |

### 4.2 Enforcement (mechanical)

- **Schema is the guardrail.** There is no table/column for member PII, audiences, or contact lists (`docs/03`
  has none). Adding one is a schema-review red flag — CI schema-lint (§4.4) fails the build if a column name
  matches a PII blocklist.
- **`result` is aggregate-only.** `impressions/clicks/ctr/spend_usd/cpc_usd/conversions/cvr` are counts and
  rates. `result.raw` stores the *untouched source payload* — a CI check + a runtime allowlist strip any
  member-level fields from a LinkedIn API pull before persisting (only aggregate metrics are retained).
- **IntakeAgent redaction.** If a user pastes a brief/URL that contains obvious personal data (a person's
  contact details, a client roster), `IntakeAgent` (R7 ⚑R-A1) redacts it from the normalized `Brief` and logs
  `audit_log(action='pii.redacted')`. The *raw* pasted text is not persisted beyond the normalization step.
- **Prompts to providers carry imagery-only, non-personal content.** Because text is composited (never baked —
  CANON §2), image prompts describe *scenes*, not people-by-name. Reference images uploaded by the tenant are
  the tenant's own brand assets.

### 4.3 GDPR posture (for the DE tenant)

- **Data residency:** prefer the **EU BFL host `api.eu.bfl.ai`** for image gen for EU tenants (R1 §2). **`VERIFY
  current docs before coding`** data-residency terms for fal / Gemini / Kling / ElevenLabs; if EU residency is
  contractually required, route through EU endpoints or gate those providers off for the tenant.
- **Right to erasure:** a workspace delete **hard-cascades** all tenant rows (`on delete cascade`, `docs/03`)
  and a worker purges Storage objects under `assets/{workspace_id}/…`. Provide a `DELETE workspace` RPC that
  does both atomically and writes a final `audit_log(action='workspace.erased')`.
- **DPA/subprocessors:** the provider list (CANON §4) are subprocessors — maintain a subprocessor list; this is
  a legal/ops artifact, not code, but the audit log makes *which provider touched which artifact* answerable.

### 4.4 PII CI schema-lint

```bash
# scripts/ci/pii-schema-lint.sh — fail if a new column looks like member/audience PII
BLOCK='(email|phone|first_name|last_name|full_name|address|dob|birth|ssn|passport|audience|lookalike|contact_list|member_id|profile_url)'
# scan the current schema (generated types) for tenant tables (exclude auth.users, workspace_member roles)
if grep -RInE "\"($BLOCK)\"" packages/shared/src/db-types.ts \
   | grep -vE 'workspace_member|auth\.'; then
  echo "Possible member/audience PII column introduced — review PII stance (docs/12 §4)"; exit 1; fi
```

---

## 5. Content-moderation surfacing on generation failure (CANON §4)

`docs/04 §3` defines the shared `ProviderError` taxonomy and the `code='moderation'` handling — **build to it**;
this section defines the **surfaced artifact + UX contract + audit** so a refused generation is *explained*,
never swallowed (R7 §4: "never a raw model failure in the UI").

### 5.1 Where moderation is recorded

`generation_job.moderation jsonb` already exists (`docs/03`). On any `code='moderation'` outcome, the worker
writes a `ModerationEvent` there and an `audit_log` row:

```jsonc
// generation_job.moderation  (ModerationEvent — extends docs/04 §3.3)
{
  "code": "moderation",
  "provider": "bfl",
  "model": "flux-2-pro",
  "provider_reason": "Request Moderated",          // raw provider signal (VERIFY per-provider strings, docs/04 §3.4)
  "category": "safety_generic",                     // our normalized bucket (below)
  "action": "surfaced_to_user",                     // surfaced_to_user | moderation_fallback | auto_revise
  "user_message": "We couldn't generate imagery for this variant because the provider flagged the request. Try rephrasing the scene, or edit the brief.",
  "safe_to_retry_same_prompt": false,
  "occurred_at": "2026-07-01T09:20:00Z"
}
```

### 5.2 Moderation decision policy (extends `docs/04 §3.2`, the canonical retry matrix)

| Situation | Retry same driver? | Fallback driver? | Surface to user | Audit |
|---|---|---|---|---|
| `moderation` (prompt/refs likely the cause) | **❌ never** (same prompt re-blocks) | ⚠️ **only** if the block is model-idiosyncratic → try next driver **once**, tag `moderation_fallback` | if unresolved → **✅ explain** | `audit_log(action='gen.moderated')` |
| `moderation` after fallback still blocked | ❌ | ❌ | **✅ explain + offer "edit brief / rephrase"** | ✅ |
| Non-moderation failure (rate_limit/timeout/network) | ✅ backoff | ✅ after retries | silent unless exhausted | warn if sustained |
| All drivers exhausted | — | — | **✅ explain + manual retry** | ✅ + ops alert |

- **Do not silently re-roll a moderated prompt** — that reintroduces the re-roll spiral CANON §2 exists to kill.
- **Optional `auto_revise`:** the orchestrator MAY ask `ArtDirector` to produce **one** softened imagery-only
  prompt (imagery only, still no baked text) and try again, tagged `auto_revise`, counted against the ≤2
  auto-iterate bound (CANON §7). Never more than once.

### 5.3 UX contract (the "it just works" promise — R7 §4)

- The board card for the failed variant shows a **calm explanatory state** ("We couldn't generate imagery for
  variant 3 — retry / edit brief"), **never a stack trace or a raw provider string**.
- The `user_message` is drawn from `moderation.user_message` (already localized DE/EN via `LocalizationAgent`
  where the workspace locale is DE).
- The event is visible to the tenant in a per-variant "why did this fail" affordance, sourced from
  `generation_job.moderation` (RLS-scoped).

---

## 6. Rate limiting, retries & backoff

### 6.1 Retries/backoff — build to `docs/04 §2.2`

`docs/04 §2.2` defines the canonical `httpJson` helper: **4 retries, exponential backoff `0.5s → 1s → 2s → 4s`
with full jitter, honoring `Retry-After`, retry on `429`/`5xx`, never retry classified `4xx`** (except
`rate_limit`). Do not re-implement — import it. Retry semantics per error code are the matrix in `docs/04 §3.2`.

Additional retry rules this doc pins:

| Concern | Rule |
|---|---|
| **Poll caps** | Cap provider polling: image ~**8 min**, video ~**15 min** (`docs/04 §2.3`'s `maxMs`); on cap → `timeout` → fallback then surface |
| **Failed-task cost** | **Kling failed tasks are free** (R2 §1.4) — retry cheaply; still count attempts to bound loops |
| **Idempotent retries** | Every retry reuses the same `idempotency_key` (§7.4) so a provider-side dup is a no-op |
| **Max attempts** | `generation_job.attempts` hard-capped (default **5**); beyond → terminal `failed` + surface + ops alert |

### 6.2 The **rate-limit governor** (this doc owns it)

External providers impose concurrency/RPM caps (e.g. BFL **24 concurrent active tasks**, `flux-kontext-max`
**6** — R1 §2; fal prepaid credits; Anthropic org RPM/TPM; ElevenLabs concurrency). A naive worker pool will
trip 429s and, worse, let one workspace starve another. Enforce a **workspace-fair token-bucket + concurrency
governor** in front of the `ProviderBus`.

**Config table (data, not code — VERIFY every limit before coding):**

```sql
-- supabase/migrations/0009_rate_limits.sql
create table provider_rate_limit (
  provider        text primary key,        -- 'bfl','fal','gemini','openai','kling','elevenlabs','anthropic'
  max_concurrent  integer not null,        -- active in-flight tasks (VERIFY per provider)
  rpm             integer,                 -- requests/min (null = unmetered here)
  tpm             integer,                 -- tokens/min (Anthropic)
  notes           text
);
insert into provider_rate_limit (provider, max_concurrent, rpm, notes) values
  ('bfl',        24, null, 'flux-kontext-max sub-limit 6 — enforce per-model (VERIFY R1 §2)'),
  ('fal',        16, null, 'aggregator; prepaid credits — also gate on balance'),
  ('gemini',      8, null, 'VERIFY quota tier'),
  ('openai',      8, null, 'VERIFY quota tier'),
  ('kling',       6, null, 'task-based; failed tasks free (VERIFY R2 §1)'),
  ('elevenlabs',  4, null, 'concurrency + 3k-char/request chunking (VERIFY R2 §4)'),
  ('anthropic',  20, null, 'org RPM/TPM — VERIFY tier; use Batch API for fan-out (50% off)');
-- per-model sub-limits (e.g. flux-kontext-max=6) live in a JSON column or a companion table.
```

**Governor behavior (server-side, before dispatch):**

```ts
// _shared/governor.ts  (pseudocode — sits between the pgmq consumer and ProviderBus)
// 1) Concurrency: a per-(provider[,model]) semaphore backed by an atomic counter
//    (Postgres advisory lock or a small `provider_inflight` table with SELECT ... FOR UPDATE).
// 2) Fairness: round-robin dispatch across workspaces with queued jobs so no single
//    workspace consumes all slots for a provider (weighted by remaining budget).
// 3) Token bucket for RPM/TPM where the provider meters it (Anthropic TPM especially).
// 4) On saturation: DO NOT drop — leave the job in pgmq (visibility timeout) and re-poll;
//    surface "queued (N ahead)" progress to the UI. Fail-closed = queue, never 429 the user.
async function acquireSlot(provider: string, model?: string, workspaceId?: string): Promise<Lease>;
```

- **Per-model sub-limits** (e.g. `flux-kontext-max = 6`) are enforced in addition to the provider-level
  concurrency (R1 §2).
- **Fan-out uses Anthropic Batch API** (50% off, R7 §5.2) for the 6-variant copy generation rather than 6 live
  RPM-consuming calls — both a cost and a rate-limit win.
- **The governor is workspace-fair**: dispatch is round-robin across workspaces with pending jobs, weighted by
  remaining budget, so a burst in WS-A cannot starve WS-B (multi-tenant fairness).

> `VERIFY current docs before coding` — every concurrency/RPM/TPM number above: BFL (24 / kontext-max 6),
> Anthropic org rate limits + Batch API, fal prepaid-credit throttling, ElevenLabs concurrency + 3k-char
> chunking, Kling task caps. These drift; store them in `provider_rate_limit`, not in code.

---

## 7. Idempotency & caching keys

### 7.1 Caching (build to `docs/04 §2.4/§2.5`)

The cache key is canonical (CANON §4): **`cache_key = sha256(canonicalJson({provider, model, version, prompt,
seed, params}))`**. `docs/04 §2.4` defines the helper; `docs/03` stores it on `asset.cache_key` (unique per
workspace) and `generation_job.cache_key`.

| Rule | Value |
|---|---|
| Key inputs | `provider, model, version, prompt, seed, params` — **exactly** (CANON §4) |
| `version` | the resolved provider **model version** string → a model upgrade **busts** the cache automatically (`docs/04 §2.5`) |
| Cache hit | `cost_usd = 0`, `generation_job.cache_hit = true`, `result.raw.cached = true`; return existing `Asset`, **no provider call** |
| Scope | **per workspace** (`asset_cache_key_uniq on asset (workspace_id, cache_key)`, `docs/03`) — no cross-tenant asset reuse (isolation > dedup savings) |
| Why it kills re-rolls | text is never in the prompt (composited), so prompts are **stable across copy edits** → identical requests are free (R7 §1.2) |

**⚑ Isolation-over-dedup note:** caching is deliberately **per-tenant**. Two workspaces issuing an identical
prompt do **not** share an asset — that would leak the existence/content of one tenant's generation to another.
Accept the small duplicate-spend cost for hard isolation.

### 7.2 Deterministic ratio re-layout is *not* a regeneration

Re-sizing 1:1 → 1.91:1 / 4:5 is a **re-layout of the same layer tree** (renderHints + safe zones — R7 ⚑R-LT1),
producing a new **`render`** row (`render_hash` dedup, `docs/03`), **not** a new `generation_job`. It costs
**render compute only** (≈ $0), never image credits. Copy edits and localizations are `LayerPatch` diffs →
re-render affected layers only → **zero image credits** (CANON §2 load-bearing).

### 7.3 Cost-model implication

Because of caching + re-layout-is-free + copy-edits-are-free, the **marginal cost of an edit or a locale swap
or an extra ratio is ~$0**. Only *new imagery/video/audio generation* costs money. The §12 cost model prices
the **first** render of each path; iterations are near-free.

### 7.4 Idempotency (this doc owns it)

Every **mutating** external action (enqueueing a gen job, dispatching to a provider, processing a webhook,
recording spend) MUST be idempotent so retries, at-least-once pgmq delivery, and duplicate webhooks never
double-spend or double-write.

```sql
-- supabase/migrations/0010_idempotency.sql
create table idempotency_key (
  key           text primary key,            -- see derivation below
  workspace_id  uuid not null references workspace(id) on delete cascade,
  scope         text not null,               -- 'gen_dispatch' | 'webhook' | 'spend_apply' | 'export'
  status        text not null default 'in_progress',  -- in_progress | done | failed
  result_ref    jsonb,                        -- e.g. { generation_job_id, asset_id }
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '7 days')
);
create index idempotency_expiry_idx on idempotency_key (expires_at);
```

**Key derivation:**

| Scope | `key` = |
|---|---|
| `gen_dispatch` | `sha256(generation_job_id + ':' + attempt_provider)` — one dispatch per (job, provider attempt) |
| `webhook` | `provider + ':' + provider_task_id` — one processing per provider task, whatever the webhook fires |
| `spend_apply` | `generation_job_id + ':spend'` — spend for a job is applied **exactly once** (§8) |
| `export` | `variant_id + ':' + ratio + ':' + render_hash` |

**Protocol:** `insert ... on conflict (key) do nothing`. If the insert wins → do the work, then set
`status='done'` + `result_ref`. If it conflicts and the existing row is `done` → **return the stored
`result_ref` (no-op)**. If `in_progress` → the work is already running elsewhere; back off and re-check.
Webhooks whose `provider_task_id` maps to a job already `succeeded`/`failed` are dropped (§3.3).

---

## 8. Spend caps — per-brief & per-workspace, with enforcement (CANON §4/§10)

`docs/04 §9.3` defines `assertBudget` (pre-flight refuse) and the `provider_pricing`-backed cost formulas —
**build to it.** This section makes the enforcement **complete and race-safe**: the *reservation ledger* (so
concurrent jobs can't collectively overshoot a cap), the *rollup* (so `workspace.spend_used_usd_monthly` is
accurate), and the *cap sources*.

### 8.1 Where caps live

| Cap | Column / config | Default (VERIFY / tenant-tunable) |
|---|---|---|
| **Per-workspace, monthly** | `workspace.spend_cap_usd_monthly` (`docs/03`) | **$500.00/mo** (`docs/03` default) |
| Running monthly spend | `workspace.spend_used_usd_monthly` (`docs/03`) | rolled up (§8.4) |
| **Per-brief** | `caps.perBriefUsd` config (`docs/04 §9.3`) | ⚑ default **$5.00/brief** (see below) |

> `⚑ R-COST1 (RECOMMENDATION)` — CANON §4 mandates a **per-brief** cap but neither CANON nor `docs/03` gives it
> a column; `docs/04 §9.3` reads it from `caps` config. **Add `brief.spend_cap_usd numeric(12,2) not null
> default 5.00`** so a per-brief cap is a first-class, tenant-tunable, auditable value (mirrors the per-workspace
> column) rather than a global constant. Additive; consistent with `docs/03`'s `workspace.spend_cap_usd_monthly`
> pattern. Rationale: a 6-variant board of static ads costs **~$0.55–0.95** (§12), so $5/brief comfortably
> covers auto-iteration + a few video attempts while still catching a runaway loop. A video-heavy brief may
> raise its own cap explicitly.

### 8.2 The reservation ledger (race-safe enforcement)

`assertBudget` alone is not enough under concurrency: N jobs each individually under the cap can *collectively*
breach it if they all check-then-spend in parallel. Fix with a **reserve → confirm/release** ledger.

```sql
-- supabase/migrations/0011_spend_ledger.sql
create type spend_ledger_state as enum ('reserved','confirmed','released');
create table spend_ledger (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspace(id) on delete cascade,
  brief_id       uuid references brief(id) on delete cascade,
  generation_job_id uuid references generation_job(id) on delete cascade,
  agent_run_id   uuid references agent_run(id) on delete cascade,
  estimated_usd  numeric(12,6) not null,       -- reserved amount (pre-flight)
  actual_usd     numeric(12,6),                -- filled on confirm (GenResult.costUsd)
  state          spend_ledger_state not null default 'reserved',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index spend_ledger_ws_state_idx    on spend_ledger (workspace_id, state);
create index spend_ledger_brief_state_idx on spend_ledger (brief_id, state);
```

Enforce atomically inside a single transaction (advisory lock per workspace so the check + reserve is serial):

```sql
-- supabase/migrations/0011_spend_ledger.sql (cont.)
create or replace function public.reserve_spend(
  p_workspace_id uuid, p_brief_id uuid, p_estimate numeric,
  p_gen_job uuid default null, p_agent_run uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_ws_cap numeric; v_brief_cap numeric;
  v_ws_committed numeric; v_brief_committed numeric;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_workspace_id::text));  -- serialize per workspace
  select spend_cap_usd_monthly into v_ws_cap from workspace where id = p_workspace_id;
  select coalesce(spend_cap_usd, 5.00) into v_brief_cap from brief where id = p_brief_id;  -- ⚑R-COST1
  -- committed = confirmed spend + still-outstanding reservations (current calendar month)
  select coalesce(sum(coalesce(actual_usd, estimated_usd)),0) into v_ws_committed
    from spend_ledger
   where workspace_id = p_workspace_id and state in ('reserved','confirmed')
     and created_at >= date_trunc('month', now());
  select coalesce(sum(coalesce(actual_usd, estimated_usd)),0) into v_brief_committed
    from spend_ledger where brief_id = p_brief_id and state in ('reserved','confirmed');
  if v_ws_committed + p_estimate > v_ws_cap then
    raise exception 'WORKSPACE_CAP_EXCEEDED: % + % > %', v_ws_committed, p_estimate, v_ws_cap
      using errcode = 'P0001';
  end if;
  if v_brief_committed + p_estimate > v_brief_cap then
    raise exception 'BRIEF_CAP_EXCEEDED: % + % > %', v_brief_committed, p_estimate, v_brief_cap
      using errcode = 'P0001';
  end if;
  insert into spend_ledger (workspace_id, brief_id, generation_job_id, agent_run_id, estimated_usd)
    values (p_workspace_id, p_brief_id, p_gen_job, p_agent_run, p_estimate)
    returning id into v_id;
  return v_id;
end $$;
```

**Confirm/release:**

```sql
-- on provider success: record the real cost (idempotent via idempotency_key 'spend_apply', §7.4)
create or replace function public.confirm_spend(p_ledger_id uuid, p_actual numeric)
returns void language sql security definer set search_path = public as $$
  update spend_ledger set state='confirmed', actual_usd=p_actual, updated_at=now()
   where id = p_ledger_id and state='reserved';
$$;
-- on failure / cache-hit(0) / cancel: release the reservation so it stops counting
create or replace function public.release_spend(p_ledger_id uuid)
returns void language sql security definer set search_path = public as $$
  update spend_ledger set state='released', updated_at=now()
   where id = p_ledger_id and state='reserved';
$$;
```

### 8.3 Enforcement lifecycle (per job / per agent call)

```
estimate cost  ── (image: model+resolution via provider_pricing; video: perSecond*duration;
   │              agent: est. tokens*rate; cache-hit lookup first → est=0)
   ▼
reserve_spend(ws, brief, estimate)  ──►  raises CAP_EXCEEDED  ──►  refuse job (status stays 'queued'→'cancelled',
   │  (advisory-locked, race-safe)                                 agent_run.status='budget_exceeded'),
   │                                                               surface "remaining budget $X" in UI (R7 §4)
   ▼ ok (ledger row 'reserved')
dispatch to ProviderBus (governor slot, §6)  ──►  success ─► confirm_spend(actual = GenResult.costUsd)
   │                                            └─ failure/cache-hit0/cancel ─► release_spend
   ▼
increment counters BEFORE marking generation_job.succeeded (docs/04 §2.6)
```

- **Refuse, don't truncate:** a job that would breach the cap is **refused pre-flight** with a clear
  remaining-budget message — never partially run. `agent_run.status='budget_exceeded'` is a first-class enum
  value (`docs/03 §0.3`).
- **Auto-iterate (≤2) and caching are themselves caps** (R7 §4): they bound how much a single brief can spend.
- **Down-tiering under pressure:** if a brief is near its cap, the router MAY down-tier the model (e.g.
  FLUX.2 [pro] → Seedream 4.5 or FLUX.2 [klein]; Opus 4.8 → Sonnet 5) and **flag** it, rather than refuse
  outright (`docs/04 §8`; R7 ⚑R-LLM1). Never *silently* exceed a hard cap.

### 8.4 Rollup — keeping `workspace.spend_used_usd_monthly` truthful

`workspace.spend_used_usd_monthly` (`docs/03`) is the human-facing monthly figure. Roll it up from confirmed
ledger spend so the UI and cap checks agree:

```sql
-- pg_cron (Supabase) — hourly rollup of confirmed spend into the workspace mirror
select cron.schedule('spend_rollup_hourly', '0 * * * *', $$
  update workspace w set spend_used_usd_monthly = coalesce(s.total, 0)
  from (
    select workspace_id, sum(actual_usd) total
      from spend_ledger
     where state='confirmed' and created_at >= date_trunc('month', now())
     group by workspace_id
  ) s
  where s.workspace_id = w.id;
$$);
-- monthly reset is implicit: the date_trunc('month', now()) window resets the sum on the 1st.
```

> `VERIFY current docs before coding` — Supabase **pg_cron** + **pgmq** semantics (Edge Function timeout ~150s
> for the dispatch/poll step; visibility-window semantics) at **supabase.com/docs/guides/cron** and
> **/guides/queues** (R7 ⚑R-INFRA1). Advisory-lock + `security definer` hardening per §2.2.

### 8.5 Cap alerting

Emit an ops signal at **80% / 100%** of either cap (§10): a `workspace` at 80% monthly warns the owner in-app;
at 100% new gen jobs are refused (edits/re-layouts/exports of *existing* assets still work — they cost ~$0).

---

## 9. Observability — cost / token / latency (`agent_run`, `generation_job`)

Every Claude agent call is an `agent_run`; every provider gen is a `generation_job`. Both carry
`cost_usd`, and `agent_run` additionally carries `input_tokens/output_tokens/latency_ms` (`docs/03`). This doc
adds the **rollup views + metrics + traces** so cost/latency are queryable and alertable — not just stored.

### 9.1 What each row must always capture (already in `docs/03` — verify present)

| Signal | `agent_run` | `generation_job` |
|---|---|---|
| Cost | `cost_usd` | `cost_usd` (0 on cache hit) |
| Tokens | `input_tokens`, `output_tokens` | n/a |
| Latency | `latency_ms` | `queued_at`→`started_at`→`finished_at` (derive queue + run latency) |
| Model | `model` (`claude-sonnet-5`/`opus-4-8`/`haiku-4-5`) | `provider`, `model`, `model_version` |
| Lineage | `brief_id`, `variant_id`, `agent`, `iterate_round`, `parent_run_id` | `variant_id`, `brief_id`, `job_kind`, `cache_hit`, `attempts`, `provider_task_id` |
| Outcome | `status` (incl. `refused`, `budget_exceeded`) | `status`, `error`, `moderation` |

### 9.2 Rollup views (build these — the console + alerts read them)

```sql
-- supabase/migrations/0012_observability_views.sql

-- cost per brief (agents + generation), the number a user sees on the board
create or replace view v_brief_cost as
select b.id as brief_id, b.workspace_id,
       coalesce(a.agent_cost,0)  as agent_cost_usd,
       coalesce(g.gen_cost,0)    as gen_cost_usd,
       coalesce(a.agent_cost,0)+coalesce(g.gen_cost,0) as total_cost_usd,
       coalesce(a.in_tok,0) as input_tokens, coalesce(a.out_tok,0) as output_tokens
from brief b
left join (select brief_id, sum(cost_usd) agent_cost,
                  sum(input_tokens) in_tok, sum(output_tokens) out_tok
             from agent_run group by brief_id) a on a.brief_id = b.id
left join (select brief_id, sum(cost_usd) gen_cost
             from generation_job group by brief_id) g on g.brief_id = b.id;

-- per-workspace daily spend + model mix (ops dashboard)
create or replace view v_workspace_spend_daily as
select workspace_id, date_trunc('day', created_at) as day,
       sum(cost_usd) as cost_usd
from (
  select workspace_id, created_at, cost_usd from agent_run
  union all
  select workspace_id, queued_at as created_at, cost_usd from generation_job
) x group by workspace_id, date_trunc('day', created_at);

-- latency percentiles per agent + per job_kind (perf regressions)
create or replace view v_agent_latency as
select agent, model, count(*) n,
       percentile_cont(0.5)  within group (order by latency_ms) p50_ms,
       percentile_cont(0.95) within group (order by latency_ms) p95_ms
from agent_run where latency_ms is not null group by agent, model;

create or replace view v_gen_latency as
select job_kind, provider, model, count(*) n,
       percentile_cont(0.5)  within group (order by extract(epoch from finished_at - started_at)*1000) p50_ms,
       percentile_cont(0.95) within group (order by extract(epoch from finished_at - started_at)*1000) p95_ms
from generation_job where finished_at is not null and started_at is not null
group by job_kind, provider, model;

-- cache effectiveness (savings)
create or replace view v_cache_effectiveness as
select workspace_id,
       count(*) filter (where cache_hit) as hits,
       count(*)                          as total,
       round(100.0*count(*) filter (where cache_hit)/greatest(count(*),1),1) as hit_pct
from generation_job group by workspace_id;
```

### 9.3 Metrics, tracing & log hygiene

- **Trace correlation:** stamp a `trace_id` (or reuse `brief_id`) across every `agent_run` + `generation_job`
  of one brief so a whole "brief → board" run is reconstructable end-to-end. `parent_run_id` already threads the
  agent pipeline (`docs/03`).
- **Structured logs:** every worker log line = JSON `{ trace_id, workspace_id, brief_id, entity, entity_id,
  event, cost_usd, latency_ms }`. **Never log secrets, full prompts with tenant-confidential content, or
  signed URLs.** Log prompt *hashes* + token counts, not prompt bodies, in prod.
- **Provider dashboards:** rely on provider-side spend dashboards (BFL credits, fal balance, Anthropic usage)
  as a **cross-check** against our `provider_pricing`-derived `cost_usd` — a > **10%** drift between our
  computed spend and the provider invoice means a stale `provider_pricing` row (alert, §10).
- **Metrics sink:** expose the views above to whatever dashboard the tenant uses; the minimum viable surface is
  an in-app **"cost & usage"** panel reading `v_brief_cost` + `v_workspace_spend_daily`.

---

## 10. Alerting & ops runbook (the on-call surface)

| Alert | Condition | Severity | Action |
|---|---|---|---|
| **Workspace 80% cap** | `spend_used_usd_monthly ≥ 0.8 * spend_cap_usd_monthly` | warn | notify owner in-app |
| **Workspace 100% cap** | ≥ cap | high | refuse new gen jobs; owner must raise cap |
| **Brief cap hit** | brief committed ≥ `brief.spend_cap_usd` | info→warn | surface remaining budget; offer raise |
| **Sustained 429s** | one provider `rate_limit` > N/min | warn | governor should absorb; if not, lower `max_concurrent` |
| **Provider outage** | all ranked drivers for a `job_kind` failing | high | fallback exhausted → surface graceful error; page ops |
| **Cost drift** | our `cost_usd` sum vs provider invoice differ > 10% | high | a `provider_pricing` row is stale — update (data, not deploy) |
| **Model retired** | startup Models-API check finds a pinned model gone | high (fail-fast) | swap the config slug (R7 §7 model-drift resilience) |
| **RLS regression** | `get_advisors` (security) flags a table w/o RLS | **critical** | block deploy |
| **TRIBE on commercial path** | CI license gate hits TRIBE import with commercial flag | **critical (legal)** | block build (§11) |
| **Service-role leak** | secret-scan finds key in client bundle | **critical** | block build (§3.4) |

**Model-drift resilience (R7 §7):** model ids live in config, never hardcoded. A startup check hits the
Anthropic Models API and BFL/Gemini reachability and **fails fast** with a clear message if a pinned model was
retired (e.g. Gemini preview slug shutdown 2026-06-25; `gpt-image-1` deprecating 2026-10-23 — R1 §1).

---

## 11. License containment (highest-severity — legal, not technical)

**Commercial launch is gated on the sign-offs below.** Every third-party model/library/service that touches the
commercial path carries a licensing obligation; a single un-cleared gate blocks launch. These were previously
scattered across R7/CANON — they are **consolidated here as the one authoritative licensing-gate table** (per
CANON §12 L9). Each gate must be **signed off before commercial launch**; the mechanical containment (CI gate,
runtime stamp) below enforces the highest-severity one (TRIBE).

### 11.1 Commercial-licensing gate table (the single source — sign off ALL before launch)

| # | Component | License / tier | Obligation → what must be true at launch | Owner / gate |
|---|---|---|---|---|
| L-1 | **TRIBE v2** (`facebook/tribev2`) | **CC-BY-NC-4.0 (non-commercial)** | **R&D-only, double-gated** (`ENGAGEMENT_BACKEND=tribe_research` **AND** `RESEARCH_MODE`); **unreachable on the commercial path**. The shipped **v1 saliency + calibrator MUST use only TranSalNet (MIT) + real `Result` rows — ZERO TRIBE input**. Any **TRIBE-informed coefficient is hard-blocked, legal-review-gated, post-v1**. Grid-salience **weights re-derived by the calibration loop** (clean-room), **never** the reference repo's literal constants. | Legal + Eng — **CI gate + runtime stamp (§11.2), fail-closed** |
| L-2 | **ElevenLabs Music** | ElevenLabs commercial terms | Confirm **ElevenLabs Music** commercial-use terms cover generated music beds shipped in tenant ads (distinct from TTS/VO terms). | Legal sign-off before enabling music-bed generation |
| L-3 | **Bria** | Bria commercial / indemnity | If Bria is used (source-imagery / background), confirm **commercial license + indemnity** covers tenant ad output. | Legal sign-off before enabling Bria on any path |
| L-4 | **Remotion** | **Remotion Company License (4+ seats)** | Video assembly (`packages/render` Remotion project) requires a **Remotion Company License** once the org is at **4+ seats**. | Purchase/confirm before video ships commercially |
| L-5 | **BFL / FLUX.2** | BFL commercial output-license tier + **EU host** | Use the **BFL commercial output-license tier**; for the DE/EU tenant route image gen through the **EU host `api.eu.bfl.ai`** (GDPR data residency — §4.3). | Legal + Eng before commercial image gen |

> These five gates are **launch-blocking**. Track them to explicit sign-off; do not ship commercially with any
> row unresolved. R7/CANON references that mention these obligations individually **repoint here** — this table
> is authoritative (CANON §12 L9).

### 11.2 TRIBE containment (mechanical enforcement of gate L-1)

TRIBE v2 (`facebook/tribev2`) is **CC-BY-NC-4.0 (non-commercial)** (CANON §9; R7 §1.4). It must be
**unreachable on the commercial path.** The production predictor is the commercially-clean **`saliency`**
backend built on **TranSalNet (MIT)**; TRIBE is R&D behind **both** `ENGAGEMENT_BACKEND=tribe_research` **and**
`RESEARCH_MODE` (CANON §10). The shipped **v1 calibrator consumes only TranSalNet output + real `Result` rows —
ZERO TRIBE input**; any TRIBE-informed coefficient is a **hard-blocked, legal-review-gated, post-v1** item.

- **Clean-room weights:** the grid-salience **weights are re-derived by the calibration loop** against the
  tenant's real `Result` rows — **never** shipped as the reference repo's literal constants.
- **CI gate (build-time, fail-closed):** when the commercial build flag is set, a check ensures no code path
  imports/loads TRIBE weights or the `facebook/tribev2` model. Any hit **fails the build** (§10 critical).

```bash
# scripts/ci/license-guard.sh  (exit 1 on any hit when COMMERCIAL_BUILD=1)
set -euo pipefail
if [ "${COMMERCIAL_BUILD:-0}" = "1" ]; then
  if grep -RInE 'facebook/tribev2|tribev2|tribe_research' services/engine apps/web/src \
       | grep -vE 'RESEARCH_MODE|flag|guard|comment'; then
    echo "TRIBE (CC-BY-NC) reachable on COMMERCIAL build — blocked (docs/12 §11)"; exit 1; fi
fi
```

- **Runtime stamp:** every engagement run writes `audit_log.commercial_use` (`docs/03`): `saliency` runs stamp
  `true`; any `tribe_research` run stamps **`false`** with `action='tribe.research_run'`. This makes "was any
  non-commercial artifact ever used commercially?" answerable forever.
- **Always report scores as bands + confidence**, calibrated against the tenant's real `result` rows (CANON §9)
  — a property of the clean path (TranSalNet + real Results), independent of TRIBE.

> `VERIFY current docs before coding` — re-confirm `facebook/tribev2` is still CC-BY-NC-4.0 (HF model card) and
> no commercially-licensed successor exists (R7 §1.4); confirm the ElevenLabs Music, Bria, Remotion Company
> License (4+ seats), and BFL commercial-tier + EU-host terms above. The `saliency`/TranSalNet path does not
> depend on TRIBE.

---

## 12. Cost model — estimated $/ad by path

**All figures are DERIVED from `provider_pricing` seed rows in `docs/04 §9.2` (which are themselves from R1/R2)
and the model-tiering pricing in R7 ⚑R-LLM1. VERIFY every number against live pricing before coding — pricing
is data (`provider_pricing`), not code.** Ranges reflect Sonnet-5-default vs Opus-4.8-escalation (agents) and
model choice (imagery/video).

### 12.1 Agent-loop cost (Claude — R7 ⚑R-LLM1)

Pricing (VERIFY): **Sonnet 5** `$3/$15` per MTok (intro `$2/$10` through 2026-08-31); **Opus 4.8** `$5/$25`;
**Haiku 4.5** `$1/$5`. Prompt caching (90% off) + Batch API (50% off) apply to the fan-out steps.

| Agent (per brief) | Model (default) | Est. in/out tokens | Est. cost |
|---|---|---|---|
| IntakeAgent | Haiku 4.5 | 1k / 0.4k | ~$0.003 |
| Strategist | Sonnet 5 | 3k / 1.5k | ~$0.03 |
| Copywriter (6 variants, Batch) | Sonnet 5 (Batch 50%) | 4k / 3k | ~$0.03 |
| ArtDirector | **Opus 4.8** (escalation) | 3k / 1.5k | ~$0.05 |
| CompositorPlanner | Sonnet 5 | 4k / 2k | ~$0.04 |
| BrandGuardian | Sonnet 5 (Opus on hard calls) | 2k / 0.5k | ~$0.015 |
| Critic + EngagementAnalyst | Opus 4.8 / Sonnet 5 | 3k / 1.5k | ~$0.04 |
| **Agent-loop subtotal (per brief, board of ~6)** | | | **~$0.20–0.35** |

Per-variant editing (EditorAgent, LayerPatch) ≈ **$0.005–0.02** each; localization (LocalizationAgent, DE⇄EN)
≈ **$0.02** per language — both near-free vs generation.

### 12.2 Generation cost by asset (VERIFY — from `docs/04 §9.2`)

| Asset | Provider/model | Unit basis | Est. cost |
|---|---|---|---|
| Static hero, 1:1 (1200×1200 ≈ 1.44 MP) | FLUX.2 [pro] (MP-metered) | `0.03 + max(0,ceil(1.44)-1)*0.03` = 2 MP | **~$0.06** |
| Static hero, cost-optimized | Seedream 4.5 | per-image | **~$0.04** |
| Draft thumbnail | Luma Photon Flash | per-image | **~$0.002** |
| Brand-consistent edit / product-in-scene | Gemini 3 Pro Image (1K/2K) | per-image | **~$0.13** |
| In-ecosystem edit | FLUX.1 Kontext [pro] | per-image | **~$0.04** |
| Carousel slide bg (×6, seed+Kontext continuity) | FLUX.2 [pro] | per-image | **~$0.06 × 6 ≈ $0.36** |
| Video clip, 15 s i2v | Kling v2.5-turbo pro (~$0.14/s) | per-second | **~$2.10** |
| Video VO, ~60 s DE (~450 chars) | ElevenLabs multilingual_v2 ($0.10/1k) | per-char | **~$0.05** |
| Video SFX/music bed (optional) | ElevenLabs sound/music | per-gen | **~$0.05–0.15** |
| Render (static/carousel PDF) | polotno-node (self-host) | compute | **~$0.00** |
| Render (video, Remotion local/Lambda) | Remotion | compute | **~$0.02** |

### 12.3 End-to-end $/ad by path (headline table)

| Path | Agents | Generation | Render | **All-in (VERIFY)** |
|---|---|---|---|---|
| **Static single-image, 1 variant** (Sonnet default, FLUX.2 [pro] 1:1) | ~$0.05* | ~$0.06 | ~$0 | **~$0.11–0.18** |
| **Static board, 6 variants** | ~$0.20–0.35 | 6×~$0.04–0.06 = ~$0.24–0.36 | ~$0 | **~$0.55–0.95** |
| **Static board, cost-optimized** (Seedream/klein, all Sonnet) | ~$0.20 | 6×~$0.02–0.04 | ~$0 | **~$0.35–0.55** |
| **Carousel doc-ad, 6 slides** | ~$0.15–0.25 | ~$0.36 (6 slide bgs) | ~$0 (PDF) | **~$0.45–0.80** |
| **Video ad, 15 s** (Kling i2v + VO + Remotion) | ~$0.20 | ~$2.10 clip + ~$0.05 VO (+opt $0.10 SFX) | ~$0.02 | **~$3.00–5.50** |
| **Edit / re-layout / locale swap** (any of the above) | ~$0.005–0.02 | **$0** (cached/re-layout) | ~$0 | **~$0.01–0.05** |

\* per-variant amortized share of the shared agent loop.

### 12.4 Cost levers (all already in the architecture — ranked by impact)

| Lever | Mechanism | Savings |
|---|---|---|
| **Caching** (CANON §4) | identical `(provider,model,version,prompt,seed,params)` ⇒ $0 | up to 100% on repeats |
| **Edits are LayerPatch, re-layout is free** (CANON §2) | copy/ratio/locale changes cost **$0** image credits | ~all iteration cost |
| **Model tiering** (R7 ⚑R-LLM1) | Sonnet-5 default, Opus only on escalation | ~40% of LLM cost |
| **Batch API** (50% off) for 6-variant fan-out | Copywriter/variant gen | ~50% of that step |
| **Prompt caching** (90% off) | shared brand/system context across agents | large on repeated context |
| **Down-tier under cap pressure** (`docs/04 §8`) | FLUX.2 [pro]→Seedream/klein; Opus→Sonnet | path-dependent |
| **Bounded auto-iterate ≤2** (CANON §7) | caps worst-case spend per brief | bounds tail |
| **Kling failed tasks are free** (R2 §1.4) | cheap video retries | retry cost → $0 |

### 12.5 Cap sizing sanity-check

With the ⚑R-COST1 default of **$5/brief**: a static 6-variant board (~$0.55–0.95) leaves ample room for
auto-iteration; a single 15 s video (~$3–5.50) may approach/exceed it → a video brief should **raise its own
`brief.spend_cap_usd`** explicitly (surfaced in the UI before generation), consistent with "never surprise your
card" (R7 §4). The **$500/workspace/month** default (`docs/03`) covers ~500–900 static boards or ~90–160 videos
per month — tenant-tunable.

---

## 13. Consolidated "VERIFY before coding" checklist (this doc)

1. **Supabase RLS + `SECURITY DEFINER`/`search_path` hardening** + `auth.uid()` semantics; run `get_advisors`
   (security lint) after every migration — supabase.com/docs/guides/database/postgres/row-level-security. (§2)
2. **Supabase Storage access-control** (`storage.foldername`, private buckets, signed-URL TTL) — or the R2
   presigned-URL-via-membership-check equivalent. (§2.3/§2.4)
3. **Provider webhook signing schemes** (BFL `webhook_secret`/HMAC; fal `?fal_webhook=`; Kling `callback_url`)
   — verify each before trusting a payload; else re-poll authoritatively. (§3.3)
4. **Per-provider rate limits** — BFL 24 concurrent / kontext-max 6; Anthropic org RPM/TPM + Batch API; fal
   prepaid-credit throttling; ElevenLabs concurrency + 3k-char chunking; Kling task caps. Store in
   `provider_rate_limit`. (§6)
5. **Supabase pgmq + pg_cron** semantics (visibility window, Edge Function ~150s timeout) for
   dispatch/poll/rollup (R7 ⚑R-INFRA1). (§8.4)
6. **All prices** in §12 / `provider_pricing` (`docs/04 §9.2`) — FLUX.2 MP metering, Gemini/Ideogram/Recraft
   tiers, Kling per-second, ElevenLabs per-char, Claude Sonnet-5/Opus-4.8/Haiku-4.5 (+ Sonnet-5 intro window
   ending 2026-08-31). Pricing is the most drift-prone field. (§12)
7. **`facebook/tribev2` still CC-BY-NC-4.0** (HF model card) — confirms the commercial-path exclusion. (§11)
8. **EU data-residency** terms for BFL (`api.eu.bfl.ai`), fal, Gemini, Kling, ElevenLabs for the DE tenant. (§4.3)
9. **LinkedIn results API** (if used for `result` ingest) returns **aggregate** metrics only — strip any
   member-level fields before persisting (§4.2).

---

## 14. Assumptions flagged (cross-document)

1. **`brief.spend_cap_usd` column (⚑R-COST1).** CANON §4 mandates a per-brief cap; `docs/03` has a per-workspace
   cap column but no per-brief column, and `docs/04 §9.3` reads the per-brief cap from `caps` config. I assume a
   **`brief.spend_cap_usd numeric(12,2) not null default 5.00`** column is added (mirrors
   `workspace.spend_cap_usd_monthly`). If the factory keeps the per-brief cap as global config instead, replace
   the `select … from brief` in `reserve_spend` (§8.2) with the config value; nothing else changes.
2. **New env vars `ENGINE_SHARED_SECRET` + `WEBHOOK_SIGNING_SECRET` (⚑R-ENV2).** Required for web↔engine auth and
   webhook verification but absent from CANON §10. I assume `docs/11` adds them to the canonical env block
   (alongside R7's `POLOTNO_API_KEY` ⚑R-ENV1). If the build uses a different mechanism (e.g. mTLS for the
   engine), the secret rows in §3.1 map to that mechanism.
3. **New migrations `0008`–`0012`.** I assume the migration numbering in `docs/03` ends at `0007_triggers.sql`,
   so this doc's tables/views are `0008_storage_rls` … `0012_observability_views`. If `docs/03` already claims
   higher numbers, shift these accordingly — the file *contents* are what matter, not the ordinal.
4. **`services/engine` is privately networked.** I assume the engine is not publicly routable (IP allowlist /
   private network) and additionally shared-secret-gated. If it must be public, the bearer check in §3.2 is the
   minimum and should be paired with an allowlist.
5. **Per-tenant caching (no cross-tenant asset dedup).** I assume `asset.cache_key`'s per-workspace uniqueness
   (`docs/03`) is intentional isolation-over-dedup; the cost model prices generation per tenant accordingly.


<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: docs/13-acceptance-tests.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

# 13 — Acceptance Tests (the factory's output MUST pass these)

> **Read `handoff/CANON.md` first.** This document is the **executable definition of "done."** It is the
> final gate an autonomous build factory runs against its own output before declaring Brutal Ads shippable.
> Each scenario is a concrete, end-to-end test with **fixtures, exact steps, exact endpoints, and measurable
> pass criteria**. If any AT below fails, the build is **not** done — no exceptions, no "mostly passing."
>
> **This document uses ONLY canonical names** from CANON §5/§6/§7/§8/§10 and the interfaces already specified in
> `docs/03` (data model), `docs/04` (providers/`ProviderBus`), `docs/05` (agents/orchestrator/`LayerPatch`),
> `docs/06` (editor/compositor/pre-flight/export/render), `docs/07` (LinkedIn playbook), `docs/08` (engagement).
> Object model: `Workspace → BrandKit → Campaign → Brief → AdDocument → Variant → (Slide) → Layer`; agents:
> `IntakeAgent, Strategist, Copywriter, ArtDirector, CarouselArchitect, CompositorPlanner, BrandGuardian, Critic,
> EngagementAnalyst, EditorAgent, LocalizationAgent`; interfaces: `ImageProvider, VideoProvider, AudioProvider,
> LlmProvider, EngagementPredictor, ProviderBus`. **Do not rename any of these.**
>
> Where a test relies on a drift-prone external fact, it carries **VERIFY before coding**. Every assumption is
> tagged **[ASSUMPTION]**. Any deviation from a naive reading is tagged **⚑ RECOMMENDATION** — never a silent
> divergence.

---

## 0. How to read & run this document

### 0.1 The eight required acceptance tests (CANON §0 north star, decomposed)

| AT | Name | Proves (CANON) | Blocking? |
|---|---|---|---|
| **AT-1** | Brief → single image, 1200×1200, on-brand, ≤5 MB, with lineage | brief→ad + export spec + lineage (§0, §8, §5) | **yes** |
| **AT-2** | Brief → 3-slide carousel (hook→reframe→close) → PDF document ad | carousel narrative + doc-ad export (§8, §2) | **yes** |
| **AT-3** | Chat-edit ("punchier headline / switch theme / move logo") emits `LayerPatch`, never a re-roll | editable-not-re-roll load-bearing decision (§2, §4) | **yes** |
| **AT-4** | Pre-flight catches a low-contrast headline | quality gate (§8 export, editor pre-flight) | **yes** |
| **AT-5** | Engagement score returns a band + per-slide breakdown | bands+confidence, not point CTR (§6, §9) | **yes** |
| **AT-6** | DE localization **transcreates**, not literal translation | localization is first-class (§1, §7) | **yes** |
| **AT-7** | Provider fallback when the primary image API errors | providers behind interfaces + fallback (§4, §6) | **yes** |
| **AT-8** | Spend cap blocks a runaway brief | hard per-brief/per-workspace caps (§4, §10) | **yes** |

**All eight are release-blocking.** The build is "done" **iff** `AT-1 … AT-8` are green **and** the phase-level
`docs/06 §13` acceptance criteria (P1 render spine, P4 editor, P5 export, P7 carousel, P9 video) are green.

### 0.2 Test taxonomy & where each AT lives in the repo

```
brutal-ads/
  e2e/                                  # ← THIS DOCUMENT'S HOME (playwright + node test runner)
    fixtures/
      workspace.seed.sql                # AT-0 fixture: Brutal seed tenant + BrandKit v1 (supabase/seed reuse)
      brief.legal-de.json               # canonical brief fixtures (AT-1, AT-2, AT-6)
      brief.runaway.json                # AT-8: variantCount huge / tiny cap
      trees/                            # hand-authored canonical Variant trees (AT-3, AT-4 determinism)
        single_image.on-brand.json      #   passes everything (golden)
        single_image.low-contrast.json  #   AT-4: gold headline on light scrim → must FAIL wcag.contrast
      mocks/
        image-provider.mock.ts          # deterministic fake ImageProvider (seeded PNG) — no live spend in CI
        image-provider.flaky.ts         # AT-7: rank-1 driver throws ProviderError('provider_failed')
        engine.mock.ts                  # deterministic EngagementScores (AT-5) — no GPU in CI
        anthropic.mock.ts               # canned structured tool outputs per agent (deterministic agents)
    at-1.single-image.spec.ts
    at-2.carousel-pdf.spec.ts
    at-3.chat-edit-patch.spec.ts
    at-4.preflight-contrast.spec.ts
    at-5.engagement-band.spec.ts
    at-6.localization-de.spec.ts
    at-7.provider-fallback.spec.ts
    at-8.spend-cap.spec.ts
    lib/
      assertions.ts                     # shared measurable assertions (§0.5)
      probe.ts                          # file-size / dimension / colorspace probes (sharp)
      contrast.ts                       # WCAG 2.x contrast recompute (independent oracle for AT-4)
```

### 0.3 Two run modes — both MUST pass

| Mode | Providers / LLM / engine | Purpose | Cost | Gate |
|---|---|---|---|---|
| **CI (default, `E2E_MODE=mock`)** | mocked (deterministic) via `mocks/` | fast, deterministic, zero external spend, runs on every PR | $0 | **hard — blocks merge** |
| **Live (`E2E_MODE=live`)** | real `ProviderBus`, real Anthropic, real `services/engine` | proves the wiring against reality; nightly + pre-release | metered (each run under a **$1 per-brief cap**, `AT-8` proves the cap) | **hard — blocks release** |

> **[ASSUMPTION]** CI uses mocks so the suite is deterministic and free; the **same specs** run in `live` mode
> against real APIs. Mocks implement the **canonical interfaces verbatim** (`ImageProvider`, `EngagementPredictor`,
> `LlmProvider`) so nothing under test knows it is mocked. The DI seam is the `Registry`/`ProviderBus`
> (`docs/04 §5.5`) and the `anthropic` client in the agent-runner (`docs/05 §5.2`). **⚑ RECOMMENDATION:** inject
> both via a single `makeTestContainer(env)` so `live` vs `mock` is one env flag.

### 0.4 Global preconditions (AT-0 — run once before every AT)

```gherkin
Scenario: AT-0 — seed the Brutal tenant and assert a clean slate
  Given a fresh Supabase project migrated from supabase/migrations (docs/03)
  And   e2e/fixtures/workspace.seed.sql is applied
  Then  a Workspace 'Brutal AI' exists with:
          - one BrandKit at version 1 (dark palette; Playfair Display + Inter;
            palette includes #cba65e and #b6e64a; banned-terms list non-empty; verticals ['legal-de','pe'])
          - workspace.spend_cap_usd_monthly = 500.00, spend_used_usd_monthly = 0.00   (docs/03 §workspace)
          - workspace.spend_cap_usd_per_brief = 2.00 USD (real column — CANON §12 L8)  (docs/03 §workspace)
  And   RLS is ON for every tenant table (docs/03) — a cross-workspace read returns 0 rows
  And   .env.example contains every CANON §10 env var + ENGINE_SHARED_SECRET + WEBHOOK_SIGNING_SECRET
        (both required — CANON §12 L8; docs/11 §6) + POLOTNO_API_KEY (docs/06 A3; docs/08 §10)  — assert presence, not values
```

**AT-0 pass criteria (all MUST hold):** migrations apply clean; the `job_status` enum in `docs/03` is exactly the
frozen superset `('queued','dispatched','running','succeeded','failed','dead','cancelled','cached')` (spelling
`cancelled`, two l's — CANON §12 L3) and `agent_run_status` includes `'budget_exceeded'`; seed inserts exactly one
`workspace`, one `brand_kit` (version 1); RLS denies cross-tenant reads (proven by a second workspace seeing 0 of
the first's rows); `pnpm -w typecheck` and `pnpm -w build` are green; the `docs/06 §7.4` render **parity golden
test** and the `toPolotno/fromPolotno` **round-trip golden test** (`docs/06 §3`) are green (they are the
render-spine prerequisite for every export-bearing AT).

### 0.5 Shared measurable assertions (`e2e/lib/assertions.ts`) — the reusable oracles

| Assertion helper | Signature | Definition (measurable) |
|---|---|---|
| `assertDimensions(buf, w, h)` | png/jpg buffer | decoded width===w && height===h (via `sharp().metadata()`) |
| `assertUnderBytes(buf, max)` | buffer, bytes | `buf.length <= max` (image 5·2²⁰; video 200·2²⁰ — CANON §8) |
| `assertColorspace(buf, 'srgb')` | buffer | `metadata().space === 'srgb'` (no ICC transform — `docs/06 §7.3`) |
| `assertContrastAtLeast(png, tree, ratio)` | render + tree | recompute WCAG 2.x contrast **sampled under each glyph run** (independent oracle, §AT-4) ≥ threshold |
| `assertOnPalette(tree, brandKit)` | tree | every `fill`/text color ∈ `brandKit.palette` (hard fields) |
| `assertFonts(tree, ['Playfair Display','Inter'])` | tree | every `text/cta/legal` layer `fontFamily` ∈ set |
| `assertNoBakedText(png, tree)` | render | OCR (`tesseract`) over the **background image layer bbox** finds **0** headline/CTA glyphs (§AT-1) |
| `assertLineageComplete(variantRow)` | db row | every CANON §5 lineage column non-null where required (§AT-1 table) |
| `assertBand(scored)` | `{value,band,confidence}` | `band[0] <= value <= band[1]` && `band[1] > band[0]` && `0<=confidence<=1` |
| `assertNoImageJob(sinceTs, variantId)` | db | `count(generation_job where variant_id AND created_at>sinceTs AND modality='image') === 0` (§AT-3) |
| `assertCharLimit(text, n)` | string | `[...text].length <= n` (headline 70; on-image 60; cta 24 — CANON §8) |

> **VERIFY before coding:** OCR (`tesseract.js`), pixel decode (`sharp`), and PDF parse (`pdf-lib`/`pdfjs`) are
> test-only deps; pin versions. The **contrast oracle in `e2e/lib/contrast.ts` is INDEPENDENT** of the product's
> `packages/shared/preflight.ts` implementation (so AT-4 catches a bug in the product's own contrast code, not
> just agree with it). Both must compute WCAG 2.x the same way per the spec, but from separate code.

---

## AT-1 — Brief → single image → on-brand 1200×1200 export ≤5 MB with lineage

**Proves:** the core promise (CANON §0) end-to-end: one-line brief → a rendered, on-brand, spec-valid,
lineage-complete single-image LinkedIn ad. Exercises `IntakeAgent → Strategist → (Copywriter ‖ ArtDirector →
ProviderBus.image) → CompositorPlanner → BrandGuardian → render → (Critic ‖ EngagementAnalyst) → board`
(`docs/05 §2.1`), then export (`docs/06 §8`).

### AT-1.1 Fixture (`e2e/fixtures/brief.legal-de.json`)

```json
{
  "workspaceId": "ws_brutal",
  "campaignId": "camp_seed",
  "briefText": "Legal AI that drafts German contracts in seconds — target law firm partners",
  "adType": "single_image",
  "aspect": "1:1",
  "variantCount": 4,
  "language": "en"
}
```

### AT-1.2 Steps

```gherkin
Scenario: AT-1 — brief to on-brand single-image export with lineage
  Given AT-0 preconditions hold
  When  POST /api/studio/brief-to-board  with brief.legal-de.json          # docs/05 §2.4 runBriefToBoard
  Then  the response returns a board of exactly 4 ranked Variants
  And   every Variant has status reaching 'ready' and a non-null layer_tree (single_image)  # docs/03 §variant
  When  I select the top-ranked Variant V and mark it human-approved
  And   POST /api/export { variantId: V, format: "jpg", ratios: ["1:1"], locale: "en" }     # docs/06 §8
  Then  a Render row is created (kind=jpg, ratio=1:1) and a downloadable asset URL is returned
```

### AT-1.3 Pass criteria (ALL must hold — measurable)

| # | Criterion | Oracle | Threshold |
|---|---|---|---|
| 1 | Board has **exactly `variantCount`** ranked Variants | count rows | `=== 4` |
| 2 | Export dimensions | `assertDimensions(buf, 1200, 1200)` | exact (CANON §8 default) |
| 3 | Export file size | `assertUnderBytes(buf, 5*2**20)` | **≤ 5 MB** |
| 4 | Colorspace sRGB | `assertColorspace(buf, 'srgb')` | exact |
| 5 | **On-brand palette** | `assertOnPalette(tree, brandKit)` | 0 off-palette hard-field colors |
| 6 | **On-brand fonts** | `assertFonts(tree, ['Playfair Display','Inter'])` | 0 other fonts |
| 7 | **No baked text** (imagery-only, CANON §2) | `assertNoBakedText(png, tree)` (OCR over background layer bbox) | 0 headline/CTA glyphs in the image layer |
| 8 | Headline exists as an **editable `text` layer** ≤70 chars | tree inspect + `assertCharLimit` | present, ≤70 |
| 9 | Pre-flight passes (server, authoritative) | `POST /api/preflight` → `report.ok===true` | no `error` findings (`docs/06 §6`) |
| 10 | **Human-approve gate enforced** | export before approve → `403`; after approve → `202` | both (CANON §7, `docs/06 §8`) |
| 11 | **Lineage complete** on the Variant | `assertLineageComplete(variantRow)` | see AT-1.4 |

### AT-1.4 Lineage completeness (CANON §5 verbatim field set — `docs/03 §variant`)

`assertLineageComplete` requires, on the exported Variant's row, ALL of:

| Column | Requirement |
|---|---|
| `brief_id` | = the fixture Brief's id |
| `brand_kit_version` | not null; = the BrandKit version pinned at generation (1) |
| `provider` | not null (e.g. `'bfl'` live; `'mock'` in CI) — an `ImageProvider.id` |
| `model` | not null (e.g. `'flux-2-pro'`) |
| `model_version` | not null (provider-reported string) |
| `seed` | present if the driver returned one (`GenResult.seed`) |
| `prompt` | not null; **imagery-only** (assert it contains **none** of the headline/CTA copy strings — CANON §2) |
| `negative_prompt` | not null; contains no-text tokens (`"no text"` / `"no words"` — `docs/05 §3.3`) |
| `parent_variant_id` | null for a root Variant (set only on fork/iterate/localize) |
| `created_by_kind` | `'agent'` for the generated Variant |
| `engagement` | JSONB object with at least `stoppingPower` (EngagementScores shape — AT-5) |

> **VERIFY before coding:** LinkedIn single-image spec — **1:1 = 1200×1200, ≤5 MB, headline ≤70 chars** — against
> the live 2026 ad-spec page (CANON §8; `docs/06 §5.2`). Encoder path: `encodeImageUnder5MB` (`docs/06 §8.1`)
> must land ≤5 MB; a 1200×1200 photographic JPG lands far under (test also asserts the size loop terminates and
> never throws `cannot_hit_5mb` for the golden fixture).

---

## AT-2 — Brief → 3-slide carousel (hook→reframe→close) → PDF document ad

**Proves:** the carousel/document-ad path: `CarouselArchitect` narrative (CANON §7, `docs/07 §4`) + ordered
`Slide[]` (CANON §5) + multi-page PDF export (`docs/06 §8.2`). Continuity + per-slide narrative roles must be
real, not cosmetic.

### AT-2.1 Fixture

Same `brief.legal-de.json` but `{ "adType": "carousel", "slideCount": 3, "aspect": "1:1" }`.

### AT-2.2 Steps

```gherkin
Scenario: AT-2 — 3-slide carousel to PDF document ad
  Given AT-0 preconditions hold
  When  POST /api/studio/brief-to-board with adType=carousel, slideCount=3
  Then  the top Variant is a carousel with an ordered slides[] of length 3    # docs/03 §variant (carousel)
  And   slide roles are exactly [hook, reframe, close] in order 0,1,2         # docs/05 §3.4; docs/07 §4
  When  I human-approve the Variant
  And   POST /api/export { variantId: V, format: "pdf" }                      # docs/06 §8.2 documentAd
  Then  a Render(kind=pdf) is produced
```

### AT-2.3 Pass criteria (ALL — measurable)

| # | Criterion | Oracle | Threshold |
|---|---|---|---|
| 1 | Exactly **3 slides**, `order` dense 0,1,2 | tree inspect | `=== [0,1,2]` |
| 2 | **Narrative roles** hook→reframe→close | `slides[i].role` | `['hook','reframe','close']` |
| 3 | Slide 0 is the hook and **carries no primary CTA**; slide 2 (`close`) carries the CTA + `legal` (if mandated) | tree inspect | per `docs/07 §4` |
| 4 | **Continuity**: a shared continuity layer (logo/frame/progress) appears on **every** slide | `continuityRefs` present on all slides | 3/3 (`docs/06 §9.3`) |
| 5 | Each slide canvas = **1080×1080** (doc-ad default) | tree inspect | exact (CANON §8; `docs/06 §5.2`) |
| 6 | Export is a **single multi-page PDF** with **3 pages** in slide order | `pdf-lib`: `getPageCount()===3`; render page N ≈ slide N thumbnail | 3 pages, order preserved |
| 7 | PDF page pixel size corresponds to 1080×1080 at pixelRatio 1 | pdf page mediaBox | matches |
| 8 | No baked text on any slide background | `assertNoBakedText` per slide | 0 glyphs each |
| 9 | On-brand palette+fonts on every slide | `assertOnPalette`/`assertFonts` per slide | 0 violations |
| 10 | Pre-flight passes **per-slide and deck-level** (page count ≤ ~10–12) | `POST /api/preflight` → `ok` + `byRatio` clean | no errors (`docs/06 §9.4`) |
| 11 | **Hook is the thumb-stopper** (engagement) | `perSlide[0].stoppingPower.value === max(perSlide[*].stoppingPower.value)` | slide 0 max (`docs/08 §5.3`; AT-5) |

> **VERIFY before coding:** LinkedIn **document-ad** delivery = **PDF**, page count (~10–12 max), and 1080×1080
> recommendation (CANON §8). `polotno-node` **native PDF** (`jsonToPDFBuffer`) vs the `pptxgenjs`/multi-PNG
> fallback (`docs/06 §8.4`) — if native PDF is used, assert fonts embed (Playfair/Inter) and no system-font
> substitution occurs (compare a rendered page against the slide PNG within the parity tolerance `docs/06 §7.4`).

---

## AT-3 — Chat-edit applies a `LayerPatch`, never a re-roll

**Proves:** the load-bearing anti-re-roll decision (CANON §2/§4): natural-language edits emit **typed
`LayerPatch` diffs**; text/style/transform edits cost **zero image credits** (`docs/05 §5.4`, §6; `docs/06 §4`).
Three sub-cases, each a real instruction from the prompt.

### AT-3.1 Setup

Start from the approved AT-1 Variant `V` (single_image). Record `t0 = now()` and the current
`Render`/asset SHA for `V`'s background image layer.

### AT-3.2 Sub-case A — "make the headline punchier"

```gherkin
Scenario: AT-3A — punchier headline is a set_text patch, not a re-roll
  When  POST /api/editor/patch { variantId: V, instruction: "make the headline punchier",
          selection: { layerIds: [<headline layer id>] } }                    # docs/06 §4.3
  Then  response.patch.ops contains a { op: "setText", layerId: <headline> } op   # docs/06 §4.1
  And   NO op with op ∈ { replaceAsset }                                        # not a re-roll
  And   response.preflight is attached and ok===true
```

**Pass:** patch is a `setText` on the headline layer; new headline `assertCharLimit(.., 70)`; the **background
image asset SHA is byte-identical** to before (`assertNoImageJob(t0, V)` returns 0 image `generation_job`s);
an `AgentRun(agent='EditorAgent', model='claude-sonnet-5')` row is written with `cost_usd > 0` and **no**
`generation_job` for imagery (`docs/05 §7`).

### AT-3.3 Sub-case B — "switch theme" (style/color)

```gherkin
Scenario: AT-3B — switch theme applies set_style/set_fill patches within BrandKit
  When  POST /api/editor/patch { variantId: V, instruction: "switch to the gold theme" }
  Then  response.patch.ops are set_style / set_fill ops on text/cta/shape layers  # docs/06 §4.1
  And   every resulting fill ∈ BrandKit palette (off-brand requests are SNAPPED, not honored)  # docs/05 §3.9
  And   NO replaceAsset op, NO image generation_job since t0
```

**Pass:** all changed colors ∈ `brandKit.palette` (assert via `assertOnPalette`); `assertNoImageJob(t0, V) === 0`;
if the model proposed an off-palette color, the applied fill is the nearest palette member and `patch.note`/
`summary` explains the snap (`docs/05 §3.9` guardrail 2).

### AT-3.4 Sub-case C — "move the logo (top-right)"

```gherkin
Scenario: AT-3C — move logo is a set_transform/move patch
  When  POST /api/editor/patch { variantId: V, instruction: "move the logo to the top-right corner" }
  Then  response.patch.ops contains a { op: "move" } (or set_transform) on the logo layer  # docs/06 §4.1
  And   NO replaceAsset op, NO image generation_job since t0
```

**Pass:** patch is a `move`/`set_transform` on the `logo` layer; the logo bbox after apply lies inside the
top-right safe box for 1:1 (`docs/06 §5.2`); `assertNoImageJob(t0, V) === 0`.

### AT-3.5 Cross-cutting pass criteria (ALL three sub-cases)

| # | Criterion | Oracle |
|---|---|---|
| 1 | **Zero image credits** across A+B+C | `assertNoImageJob(t0, V) === 0` (CANON §2; `docs/05 §5.4`) |
| 2 | Every edit is a typed op from the `LayerPatch` union | `LayerPatch` zod parse succeeds; op ∈ enum (`docs/05 §6.1`, `docs/06 §4.1`) |
| 3 | Edits route through `applyLayerPatch` on the **canonical tree**, then re-project to Polotno (single undo stack) | after each, `undo()` restores byte-identical prior tree; `redo()` re-applies (`docs/06 §11`) |
| 4 | Patched tree **re-passes `BrandGuardian`** before human-approve | `BrandVerdict.pass===true` post-apply (`docs/05 §6.3` guardrail 5) |
| 5 | A **real re-roll** (control) DOES create a job | `POST /api/editor/regenerate` on the bg layer → exactly 1 image `generation_job` since its own t0 (`docs/06 §4.4`) — proves the harness can tell the difference |
| 6 | Ambiguous instruction returns `clarify`, **no patches** | send "make it better" → `response.clarify` set, `patches:[]` (`docs/05 §3.9` guardrail 6) |

> **[ASSUMPTION]** In `mock` mode the `anthropic.mock.ts` returns a deterministic `LayerPatchSet` per instruction
> string so A/B/C are byte-deterministic. In `live` mode the assertions are structural (op kinds, zero image
> jobs, char limits, palette membership) — never exact string equality on model output.

---

## AT-4 — Pre-flight catches a low-contrast headline

**Proves:** the quality gate (`docs/06 §6`): WCAG contrast is **sampled under the actual rendered pixels beneath
each glyph run** (not fg-vs-solid-bg), and a failing contrast **blocks export** (hard error), with a proposed
scrim auto-fix. This is the exact prior-attempt pain (illegible text on busy AI imagery) turned into a gate.

### AT-4.1 Fixture (`e2e/fixtures/trees/single_image.low-contrast.json`)

A hand-authored canonical tree where a **gold `#cba65e` headline** sits over a **light-luminance region** of the
background (so measured contrast < 4.5:1). Determinism: the background is a **fixed fixture PNG** (checked in), so
the test does not depend on any generator. A sibling golden `single_image.on-brand.json` (dark scrim behind the
same headline) must PASS.

### AT-4.2 Steps

```gherkin
Scenario: AT-4 — low-contrast headline fails pre-flight and blocks export
  Given the low-contrast Variant V_bad and the on-brand Variant V_good are loaded
  When  POST /api/preflight { variantId: V_bad }                              # docs/06 §6.3, authoritative
  Then  report.ok === false
  And   report.findings contains a finding with rule='wcag.contrast', severity='error', layerId=<headline>
  And   finding.measured < 4.5 and finding.threshold >= 4.5                   # docs/06 §6.1 table
  When  POST /api/export { variantId: V_bad, format: "jpg", ratios: ["1:1"] }
  Then  the export is REFUSED with 422 and the PreflightReport (blocked)       # docs/06 §8 flow step 2
  When  POST /api/preflight { variantId: V_good }
  Then  report.ok === true  (no wcag.contrast error)                          # the on-brand control passes
```

### AT-4.3 Pass criteria (ALL — measurable)

| # | Criterion | Oracle | Threshold |
|---|---|---|---|
| 1 | Low-contrast tree **fails** with a `wcag.contrast` **error** on the headline layer | preflight report | `ok===false`, finding present |
| 2 | Measured ratio is **below threshold** | finding.measured vs finding.threshold | `< 4.5:1` normal text (≥3:1 large text applies for ≥24px bold / ≥28px regular — `docs/06 §6.1`) |
| 3 | **Independent oracle agrees** | `assertContrastAtLeast(png, tree, '1:1')` recomputes contrast **from separate code** (`e2e/lib/contrast.ts`) | matches product's finding (both < 4.5) |
| 4 | Contrast is **sampled under the glyph run**, not fg-vs-solid | perturb: add a dark scrim `shape` under the headline → re-run → now passes | proves per-glyph sampling (`docs/06 §6.2`) |
| 5 | **Export is hard-blocked** while the error stands | `POST /api/export` → `422` + report | never produces a Render (`docs/06 §8`) |
| 6 | **Auto-fix proposal** offered (not auto-applied) | preflight/edit response includes a proposed scrim `LayerPatch` (`add_layer` shape) | present, not applied without consent (`docs/06 §6.2`) |
| 7 | Applying the proposed scrim patch makes pre-flight pass | apply patch → `POST /api/preflight` → `ok===true` | passes; still **zero image credits** (a scrim is a `shape` layer, AT-3 invariant) |
| 8 | On-brand control passes | `V_good` preflight `ok===true` | no false positive |

> **VERIFY before coding:** WCAG 2.x contrast thresholds (**4.5:1** normal, **3:1** large) still current for the
> a11y bar (`docs/06 §14.8`). The product's contrast code (`packages/shared/preflight.ts §6.2`) rasterizes the
> slide at export resolution and samples mean luminance under each glyph-run box — the test's independent oracle
> must do the same to agree.

---

## AT-5 — Engagement score returns a band with per-slide breakdown

**Proves:** `EngagementPredictor` (CANON §6) returns **bands + confidence**, never a bare CTR (CANON §9;
`docs/08`); carousels return a per-slide breakdown with continuity flags; the commercial path is
`ENGAGEMENT_BACKEND=saliency` and **never** `tribe_research`.

### AT-5.1 Steps

```gherkin
Scenario: AT-5 — engagement returns bands + per-slide breakdown, saliency backend only
  Given the AT-2 carousel Variant V (3 slides, one PNG Render per slide)
  When  the EngagementAnalyst scores V via ProviderBus.predictor(job)          # docs/05 §3.8; docs/08 §10.3
        (POST ENGINE_URL/v1/score/carousel with slideRenderIds in order)       # docs/08 §10.3
  Then  the returned EngagementScores has backend='saliency'
  And   every top-level metric is a band, and perSlide[] has one entry per slide
```

### AT-5.2 Pass criteria (ALL — measurable)

| # | Criterion | Oracle | Threshold |
|---|---|---|---|
| 1 | `backend === 'saliency'` | scores.backend | never `'tribe_research'` (CANON §9) |
| 2 | `saliencySource` is a real driver id | e.g. `'saliency.transalnet'` (`docs/08 §6.1`) | non-empty |
| 3 | **Every top-level metric is a band** | `assertBand()` on `focalClarity, valuePropAttention, ctaAttention, clutter, stoppingPower` | `band[0]<=value<=band[1]`, `band[1]>band[0]`, `0<=confidence<=1` |
| 4 | **`predictedCtrBand` is a range**, never a point | `predictedCtrBand.low < predictedCtrBand.high`, has `confidence` | strict inequality (CANON §6; `docs/08 §9`) |
| 5 | **Per-slide breakdown** present for the carousel | `perSlide.length === 3`, each has `position` + `stoppingPower` + `ctaAttention` | 3 entries (`docs/08 §5.2`) |
| 6 | **Continuity flag** computed | each `perSlide[i].continuityFlag ∈ {ok, weak_hook, stopping_power_dip, weak_cta}` | present (`docs/08 §5.3`) |
| 7 | **Cold-start honesty:** thin tenant data → **wide band, low confidence** | with 0 `Result` rows, `confidence <= 0.4` and band width > a floor | wide+low (`docs/08 §9.3`) |
| 8 | Scores persisted to `Variant.engagement{}` via the **web callback** (web owns RLS) | `variant.engagement` JSONB matches EngagementScores shape | matches `docs/03 §8.3` |
| 9 | **No bare CTR number** anywhere in the UI/response | grep response for a scalar CTR outside `predictedCtrBand` | none (`docs/08 §9.6`) |
| 10 | **TRIBE is unreachable on this path** | force `preferDriver='research.tribe'` with `tenantFacing:true` → engine returns `LicenseGuardError` (4xx); web `score-callback` rejects any `backend==='tribe_research'` with 400 | hard-error (CANON §9; `docs/08 §6.3, §8.4`) |
| 11 | **Board ranks by `stoppingPower` band** | board order === sort by `engagement->'stoppingPower'->>'value'` desc | matches `variant_stopping_power_idx` (`docs/03`) |

> **[ASSUMPTION]** In CI, `engine.mock.ts` returns deterministic `EngagementScores` satisfying the band
> invariants so criteria 3–6 are exact. In `live` mode the assertions are structural (band ordering, backend id,
> per-slide count, TRIBE hard-error) — never exact numeric equality. **VERIFY before coding:** the engine's
> `/v1/score/carousel` request shape (`slideRenderIds` in order) and the `score-callback` contract (`docs/08 §10`).

---

## AT-6 — DE localization transcreates (not literal), TTS-safe numbers

**Proves:** localization is first-class (CANON §1/§7): `LocalizationAgent` **transcreates** DE⇄EN (native, not a
literal string swap), keeps **numerals on-screen** but **spells numbers out for the VO** ("zwölfhundert"), and
emits `set_text` `LayerPatch`es only — **no imagery re-roll** (`docs/05 §3.10`).

### AT-6.1 Steps

```gherkin
Scenario: AT-6 — localize an EN single-image ad to native German, TTS-safe VO numbers
  Given the approved AT-1 Variant V (English), whose copy includes the numeral "1200"
  And   record t0 = now()
  When  the LocalizationAgent runs { tree: V, fromLang:'en', toLang:'de', forVoiceover:true }  # docs/05 §3.10
  Then  it returns a LocalizationResult with set_text patches for text/cta/legal/smart layers only
  And   a voiceoverScript is present (because forVoiceover=true)
```

### AT-6.2 Pass criteria (ALL — measurable)

| # | Criterion | Oracle | Threshold |
|---|---|---|---|
| 1 | Result is **German, not English** | language-id (`franc`/cheap classifier) on `onScreenText` values | detected `de` |
| 2 | **Transcreation, not literal** | the DE headline is **not** a word-for-word map of the EN (edit-distance / token-overlap heuristic below threshold) **and** reads as native DE | not a literal 1:1 translation ([ASSUMPTION], see note) |
| 3 | **On-screen numerals kept** | the on-screen DE text still contains "1.200" / "1200" (numeral, not word) | numeral present (`docs/05 §3.10` output 1) |
| 4 | **VO numbers spelled out** | `voiceoverScript` contains the **word** form (e.g. "zwölfhundert" / "eintausendzweihundert"), **no raw numeral** in the VO string | 0 digits in `voiceoverScript`; `ttsNormalizations` records `{original:"1200", spelled:"…"}` |
| 5 | **Only `set_text` patches** (no imagery) | every patch op === `set_text` on `text/cta/legal/smart` | 0 `replace_image`/`replaceAsset`; `assertNoImageJob(t0, V) === 0` |
| 6 | **`legal` translated faithfully**, not creatively transcreated | the `legal` layer's DE text preserves the disclaimer's meaning (present + semantically equivalent) | present (`docs/05 §3.10` guardrail 3) |
| 7 | Char limits respected in DE (German runs longer) | `assertCharLimit(headline, 70)`, on-image 60, cta 24 | within limits; else pre-flight overflow flag (`docs/06 §5.3` locale-stable) |
| 8 | Localized Variant re-passes `BrandGuardian` (localization rule) | `BrandVerdict.pass===true` | passes (`docs/05 §3.10` guardrail 4) |
| 9 | Localized Variant is a **fork** with lineage `parent_variant_id = V` | db row | set (`docs/03 §variant`) |
| 10 | Re-layout after localization is **locale-stable** | 1:1→4:5 re-layout runs after localization; DE overflow surfaces as a pre-flight flag, not silent crop | `report.byRatio` per-locale (`docs/06 §5.3` guarantee 5) |

> **[ASSUMPTION]** "Not literal" is measured structurally: (a) the DE output passes a German language-id check;
> (b) the DE headline is **not** the output of a naive dictionary map of the EN (we assert token-overlap with a
> machine word-for-word baseline is below a threshold, i.e. the agent rephrased); (c) in CI the mock returns a
> known-native DE transcreation. We **do not** grade "nativeness" numerically in CI. **⚑ RECOMMENDATION:** for
> `live` mode, add a Sonnet-graded rubric check ("is this native, idiomatic German for law-firm partners, Sie-form,
> sober register?" → pass/fail) as a **non-blocking** signal, since LLM-graded nativeness is not deterministic.
> **VERIFY before coding:** ElevenLabs DE number pre-spelling is mandatory (do not rely on
> `apply_text_normalization` for DE) — on-screen and VO strings diverge by design (`docs/04 §6.3`; R2 §4.4).

---

## AT-7 — Provider fallback when the primary image API errors

**Proves:** providers sit behind the `ImageProvider`/`ProviderBus` interface (CANON §6), and a **primary-driver
failure falls through the ranked policy chain** to the next driver, transparently to the caller — never an empty
board (`docs/04 §3.2, §5.2, §5.5`).

### AT-7.1 Setup

Use `mocks/image-provider.flaky.ts`: the **rank-1** driver for `job.kind='hero'` (`bfl · flux-2-pro`,
`docs/04 §5.2`) throws `ProviderError('provider_failed', { retryable:false })` on `generate()`. The **rank-2 /
rank-3** drivers (`bfl · flux-2-max`, then `fal · seedream v4.5`) succeed and return a deterministic PNG.
(Live-mode variant: point rank-1 at an invalid base URL / revoked key so the real wrapper falls through.)

### AT-7.2 Steps

```gherkin
Scenario: AT-7 — hero image falls back from rank-1 to a working driver
  Given the rank-1 hero driver fails and rank-2/3 succeed
  When  POST /api/studio/brief-to-board with brief.legal-de.json (single_image)
  Then  every Variant still renders (no empty tiles)
  And   the failing driver's failure is logged, and the succeeding driver is recorded in lineage
```

### AT-7.3 Pass criteria (ALL — measurable)

| # | Criterion | Oracle | Threshold |
|---|---|---|---|
| 1 | **Board is non-empty** despite rank-1 failure | count Variants with a Render | `=== variantCount` (`docs/04 §3.2` "explain, not swallow"; never empty board) |
| 2 | **Fallback happened**: lineage records the **rank-2/3** driver, not rank-1 | `variant.provider`/`variant.model` = the succeeding driver (e.g. `bfl·flux-2-max` or `fal·seedream`) | matches a lower-ranked policy entry (`docs/04 §5.2`) |
| 3 | The **failed attempt is logged** | a `generation_job`/`AgentLog` row for the rank-1 driver with error `code='provider_failed'` and a `status` from the frozen `job_status` superset (terminal `'failed'`/`'dead'` — CANON §12 L3) | present; classified per `ProviderError` (`docs/04 §3.1`) |
| 4 | **Retryable vs non-retryable honored** | `provider_failed` retried **1×** on the same driver, then falls through (`docs/04 §3.2` table row) | 1 retry then fallback |
| 5 | **`rate_limit` (429)** path also falls back after backoff (separate case) | inject 429 on rank-1 → retries with backoff (honor `Retry-After`), then rank-2 | falls back (`docs/04 §2.2, §3.2`) |
| 6 | **`auth` (401/403) never falls to other keys** | inject `auth` on rank-1 → **no** fallback, generic "service misconfigured" surfaced, ops alert | no silent fallback (`docs/04 §3.2` — all-our-key errors) |
| 7 | **Exhaustion is explained, not swallowed** | make ALL ranked drivers fail → UI shows an explain state + manual-retry, **not** a blank tile | explicit error surface (`docs/04 §3.2` "all exhausted") |
| 8 | **Manual override still wins** | set `job.overrideDriverId` → the bus uses exactly that driver, no policy chain | override honored (CANON §6; `docs/04 §5.5`) |
| 9 | **Cost recorded for the driver that actually ran** | `generation_job.cost_usd` attributed to the succeeding driver | correct attribution |
| 10 | **`moderation` does NOT silently re-roll the same prompt** | inject `moderation` on rank-1 → surfaced to user with reason; fallback only if model-idiosyncratic, tagged `moderation_fallback` | per `docs/04 §3.2, §3.3` |

> **VERIFY before coding:** the concrete provider IDs/model slugs in the policy chain (`docs/04 §5.2`) —
> `bfl·flux-2-pro → bfl·flux-2-max → fal·seedream v4.5` for `hero` — and the `ProviderError` mapping from each
> provider's real status/body (BFL `status='Error'`, fal `nsfw`/`content_policy`, etc., `docs/04 §3.4`). The
> `makeFallbackImageProvider` wrapper (`docs/04 §5.5`) is the unit under test; assert it (a) checks cache first,
> (b) walks the chain per `§3.2`, (c) writes cache + cost on success.

---

## AT-8 — Spend cap blocks a runaway brief

**Proves:** hard per-brief and per-workspace `cost_usd` caps are enforced **pre-flight** — the orchestrator
**refuses** a job that would breach the cap and never silently overspends (CANON §4/§10; `docs/05 §5.4`;
`docs/03 §workspace`).

### AT-8.1 Fixtures

- **Per-brief cap case:** `brief.runaway.json` = `brief.legal-de.json` with `variantCount: 50` and the
  workspace's **`spend_cap_usd_per_brief` column set low** (e.g. `$0.50`, CANON §12 L8) so the projected spend of 50 variants exceeds it.
- **Per-workspace cap case:** set `workspace.spend_used_usd_monthly = 499.90` and
  `spend_cap_usd_monthly = 500.00` (headroom `$0.10`), then submit a normal 4-variant brief whose projected cost
  exceeds `$0.10`.

### AT-8.2 Steps

```gherkin
Scenario: AT-8a — per-brief cap refuses a runaway brief pre-flight
  Given the workspace.spend_cap_usd_per_brief = $0.50 and brief.runaway.json (variantCount 50)
  When  POST /api/studio/brief-to-board with brief.runaway.json
  Then  the orchestrator refuses BEFORE spending: no full run occurs
  And   the response/last AgentRun status is 'budget_exceeded' (the agent runner emits 'budget_exceeded' — CANON §12 L3) with remaining budget shown

Scenario: AT-8b — per-workspace monthly cap refuses a brief pre-flight
  Given workspace.spend_used_usd_monthly = 499.90, spend_cap_usd_monthly = 500.00
  When  POST /api/studio/brief-to-board with a normal 4-variant brief
  Then  the orchestrator refuses to start the brief (would breach monthly cap)
```

### AT-8.3 Pass criteria (ALL — measurable)

| # | Criterion | Oracle | Threshold |
|---|---|---|---|
| 1 | **Pre-flight refusal** (before the expensive work) | `budget.assertRoom` throws; run halts at the first agent/gen that would breach (`docs/05 §5.2, §5.4`) | refused before the 50-variant fan-out |
| 2 | Status surfaced as **`budget_exceeded`** (agent-runner emits it; `agent_run_status` enum value — CANON §12 L3) | last `AgentRun.status` / response | `'budget_exceeded'` (`docs/03` `agent_run_status`) |
| 3 | **Spend is bounded**: total `cost_usd` charged for the refused brief ≤ the cap | `sum(agent_run.cost_usd + generation_job.cost_usd) for brief` | `<= per_brief_cap` (never exceeds) |
| 4 | **No surprise charge**: `spend_used_usd_monthly` never crosses `spend_cap_usd_monthly` | workspace row after | `spend_used <= spend_cap` always |
| 5 | **Remaining budget shown**, not a raw error | response body includes remaining per-brief + per-workspace budget | present (`docs/05 §5.4`) |
| 6 | Per-workspace case (AT-8b) refuses to **start** | no Variants created; monthly `spend_used` unchanged | 0 new variants |
| 7 | A **within-budget** control brief succeeds | normal 4-variant brief under an ample cap → board of 4 | proves the cap doesn't false-positive |
| 8 | **Image edits stay free under the cap** (cross-check AT-3) | after hitting the cap, a `set_text` chat-edit on an existing Variant still works (0 image credits) | edits are pure diffs, uncapped by image spend (`docs/05 §5.4`) |
| 9 | Cap is enforced by the **orchestrator/agent-runner, not a prompt** | code path: `assertBudget` → `budget.assertRoom` (deterministic) | not model-decided (`docs/05 §2.4, §5.2`) |

> **[ASSUMPTION]** Per-brief cap default is **$2.00** and lives in workspace config (`docs/05 §5.4`); per-workspace
> monthly cap default is **$500.00** on `workspace.spend_cap_usd_monthly` (`docs/03 §workspace`). The test sets
> both explicitly rather than relying on defaults. Per CANON §12 L8 the per-brief cap is a **real column**
> `workspace.spend_cap_usd_per_brief` in `docs/03` (not only workspace-config JSON), so AT-8 asserts it in SQL.
> The `AgentRun.status` value is resolved by CANON §12 L3 to `'budget_exceeded'` (the `docs/05` agent runner emits it;
> it is the `agent_run_status` enum value in `docs/03`); AT-8 asserts `'budget_exceeded'` (see §3, X-1).

---

## 1. Cross-cutting invariants every AT re-checks (the "never" list)

These are asserted by shared teardown after **every** AT, so a regression anywhere trips a test:

| # | Invariant | Oracle | Source |
|---|---|---|---|
| I-1 | **No baked text**: no legible headline/CTA/logo text rendered *into* any generated image | OCR over image-layer bboxes = 0 target glyphs | CANON §2 |
| I-2 | **RLS holds**: no AT ever reads/writes across `workspace_id` | second-workspace probe sees 0 rows | CANON §4; `docs/03` |
| I-3 | **Every gen + agent call logged** with `cost_usd` | `generation_job` / `agent_run` rows exist for the run | CANON §4; `docs/05 §5` |
| I-4 | **Editor↔export parity**: any exported render matches the editor preview within tolerance | golden pixel-diff < 0.5% (`docs/06 §7.4`) | `docs/06 §7` |
| I-5 | **Bands, never point CTR** in any surfaced score | no scalar CTR outside `predictedCtrBand` | CANON §6/§9 |
| I-6 | **Nothing ships un-approved**: export requires the human-approve flag | export pre-approve → `403` | CANON §7 |
| I-7 | **TRIBE never on a tenant path** | any tenant-facing resolve to `research.tribe` → hard error | CANON §9; `docs/08 §6.3` |
| I-8 | **Model ids from config, not hardcoded** | grep source for a literal `'claude-opus-4-8'`/`'flux-2-pro'` outside config → 0 | `docs/05 §9`, `docs/04` |

---

## 2. Test harness, determinism & CI wiring

### 2.1 Determinism levers (so AT-1…AT-8 are stable)

| Non-determinism source | Control |
|---|---|
| Image/video generation | `mock` mode returns a **checked-in seeded PNG**; `live` mode asserts **structural** properties only (dims/size/palette/no-baked-text/lineage), never pixel equality |
| LLM agent output | `anthropic.mock.ts` returns canned, schema-valid tool outputs per agent; `live` mode asserts **structural** properties (op kinds, char limits, band ordering, backend id) |
| Engagement scores | `engine.mock.ts` returns fixed band-valid `EngagementScores`; `live` asserts band invariants only |
| Time | freeze `now()` per AT for `scoredAt`/lineage timestamps where compared |
| Font rendering | embed Playfair/Inter woff2 in `packages/render/assets/fonts`; no system fallback (`docs/06 §7.3`) |
| Contrast oracle | **independent** recompute in `e2e/lib/contrast.ts` (not the product's code) — AT-4 |

### 2.2 CI gate (`.github/workflows/e2e.yml` — skeleton)

```yaml
# runs on every PR; blocks merge. Live suite runs nightly + on release tags.
jobs:
  acceptance:
    steps:
      - run: pnpm -w install
      - run: pnpm -w typecheck && pnpm -w build
      - run: supabase db reset && psql < e2e/fixtures/workspace.seed.sql   # AT-0
      - run: pnpm -w test:render-parity        # docs/06 §7.4 + §3 round-trip (AT-0 prereq)
      - run: E2E_MODE=mock pnpm -w test:e2e     # AT-1 … AT-8 (deterministic, $0)
  acceptance-live:
    if: github.event_name == 'schedule' || startsWith(github.ref, 'refs/tags/')
    env: { E2E_MODE: live, E2E_PER_BRIEF_CAP_USD: "1.00" }   # AT-8 proves the cap holds in live
    steps:
      - run: pnpm -w test:e2e                    # same specs, real providers/LLM/engine
```

**Release gate:** a build is shippable **iff** `acceptance` (mock) AND `acceptance-live` are green AND the
`docs/06 §13` phase criteria are green. A single red AT blocks the release.

### 2.3 Traceability — every AT maps to a build phase (CANON/R7)

| AT | Depends on build phase(s) (`docs/06 §13`, R7) | First runnable at |
|---|---|---|
| AT-0 | migrations + render spine (P1) | P1 |
| AT-1 | P1 (render) + agents (P3) + board (P4) + export (P5) | P5 |
| AT-3, AT-4 | P4 editor + pre-flight | P4 |
| AT-2 | P7 carousel | P7 |
| AT-5 | engagement engine (P6/P8) | P8 |
| AT-6 | localization agent (P4/P8) | P8 |
| AT-7 | ProviderBus + fallback (P2/P3) | P3 |
| AT-8 | orchestrator + cost caps (P3) | P3 |
| video AT (see §4) | P9 video | P9 |

---

## 3. Cross-document inconsistencies this test doc surfaces (⚑ must reconcile before coding)

| # | Inconsistency | Docs | Reconciliation (AT asserts the reconciled value) |
|---|---|---|---|
| X-1 | Agent-run cap status string (an earlier `docs/05` draft used a non-canonical label) | `docs/05 §5.3` vs `docs/03` (`agent_run_status` enum) | **Resolved by CANON §12 L3:** `agent_run_status` includes `'budget_exceeded'` (NOT `capped`); the `docs/05` agent runner emits `'budget_exceeded'`. AT-8 asserts `'budget_exceeded'`. |
| X-2 | Model slug spelling `'flux-2-pro'` (`docs/03 §variant` comment) vs `'flux-2-pro'` (`docs/04 §5.2`) | `docs/03` vs `docs/04` | Store **exactly what the provider returns** (`docs/03 §5 VERIFY`); AT-1 lineage assert checks non-null + provider-reported, not a hardcoded spelling. |
| X-3 | Per-brief cap was workspace **config** (`docs/05`) but not a DB **column** (`docs/03`) | `docs/05 §5.4` vs `docs/03 §workspace` | **Resolved by CANON §12 L8:** `workspace.spend_cap_usd_per_brief` is a real **column** in `docs/03`; AT-8 asserts it in SQL. |
| X-4 | `ENGINE_SHARED_SECRET`, `WEBHOOK_SIGNING_SECRET`, `POLOTNO_API_KEY` used but absent from CANON §10 env list | `docs/08 §10`, `docs/06 A3` | **Resolved by CANON §12 L8:** `ENGINE_SHARED_SECRET` + `WEBHOOK_SIGNING_SECRET` are added (both required) to `docs/11` §6 `.env.example` + §3 matrix (with optional `RENDER_URL`); `POLOTNO_API_KEY` also lives in `.env.example`. AT-0 asserts `ENGINE_SHARED_SECRET` + `WEBHOOK_SIGNING_SECRET` presence. |

These are **flagged, not silently resolved** — the factory must reconcile them in the owning docs; the AT suite
then asserts the single reconciled value.

---

## 4. Fast-follow: video acceptance test (AT-V, P9 — CANON §0 "video first-class fast-follow")

Not in the required eight, but specified now so the video path has a gate the moment P9 lands (mirrors
`docs/06 §13 P9`).

```gherkin
Scenario: AT-V — brief → muted-first video ad with burned-in DE captions
  Given a video AdDocument (Kling i2v clip + ElevenLabs DE VO + brand overlay layers)   # docs/06 §10
  When  POST /api/export { variantId: V, format: "mp4" }
  Then  the MP4 is h264, plays MUTED (no audio needed to understand it)
```

**Pass:** ratio ∈ {1:1, 4:5, 16:9} (CANON §8); **≤200 MB** (`assertUnderBytes(buf, 200*2**20)`); **burned-in
captions present & legible** (WCAG contrast on sampled caption frames ≥ threshold, `docs/06 §10.4, §6.2`);
**first-3-seconds** `firstThreeSeconds` band returned by `video.heuristic` (`docs/08 §5.4`); VO uses
**pre-spelled DE numbers** (AT-6 rule); lineage complete per CANON §5 (per-clip provider/model/seed,
`docs/03 §video`). **VERIFY before coding:** Remotion `renderMedia` h264 + `@remotion/captions` burn-in;
ElevenLabs `with-timestamps` caption timing; LinkedIn video ≤200 MB (`docs/06 §14.5–14.7`).

---

## 5. Consolidated "VERIFY before coding" (this document)

1. **LinkedIn 2026 ad specs** — 1:1=1200×1200, ≤5 MB, headline ≤70; document-ad = PDF ~10–12 pages @1080×1080;
   video ≤200 MB (CANON §8; AT-1/AT-2/AT-V).
2. **WCAG 2.x** thresholds (4.5:1 / 3:1) still current (AT-4; `docs/06 §14.8`).
3. **Provider policy chain** IDs/slugs + `ProviderError` mapping per provider (AT-7; `docs/04 §5.2, §3.4`).
4. **Engine contract** — `/v1/score/carousel` request shape + `score-callback` (AT-5; `docs/08 §10`).
5. **ElevenLabs DE number pre-spelling** mandatory; on-screen vs VO strings diverge (AT-6; `docs/04 §6.3`).
6. **Anthropic** structured tool outputs + model ids from config (AT-3/AT-6; `docs/05 §9`).
7. **`AgentRun.status` cap value** — resolved to `'budget_exceeded'` per CANON §12 L3 (agent runner emits it; `agent_run_status` enum value); AT-8 asserts it (X-1).
8. Test-only deps (`sharp`, `tesseract.js`, `pdf-lib`, `franc`) — pin versions; the AT-4 contrast oracle stays
   **independent** of product code.

<!-- Conforms to CANON §0/§2/§4/§5/§6/§7/§8/§9/§10. Canonical names used verbatim: Workspace, BrandKit, Campaign,
     Brief, AdDocument, Variant, Slide, Layer; IntakeAgent, Strategist, Copywriter, ArtDirector, CarouselArchitect,
     CompositorPlanner, BrandGuardian, Critic, EngagementAnalyst, EditorAgent, LocalizationAgent; ImageProvider,
     VideoProvider, AudioProvider, LlmProvider, EngagementPredictor, ProviderBus; LayerPatch; EngagementScores;
     ENGAGEMENT_BACKEND (saliency|tribe_research), RESEARCH_MODE, ENGINE_URL. Endpoints/schemas taken from docs/03
     (data model), docs/04 (providers), docs/05 (agents/LayerPatch/cost caps), docs/06 (editor/preflight/export/
     render), docs/07 (playbook), docs/08 (engagement). Assumptions flagged [ASSUMPTION]; deviations ⚑ RECOMMENDATION;
     drift-prone facts VERIFY before coding. Cross-doc inconsistencies surfaced in §3, not silently resolved. -->


<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SOURCE: docs/14-appendix-history-and-decisions.md -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

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
