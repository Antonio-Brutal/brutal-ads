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
