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
