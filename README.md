# Brutal Ads

A platform that turns a one-line brief into high-converting, easy-to-edit **LinkedIn ads** (static
single-image + carousel/document ads first, video as a fast-follow). AI generates the imagery; the
headline, logo, CTA, and every carousel-slide word are **editable vector layers** — never baked into pixels.

> **This repo is a build package + starter scaffold.** It contains the complete, adversarially-reviewed
> specification and a monorepo skeleton with **no infrastructure wired up** (no keys, no Supabase/Vercel/Modal
> accounts, no deploys). An autonomous build factory (or a developer) completes the implementation from the
> docs and provisions infra.

## ▶ For the build factory — start here
1. **Read [`BUILD.md`](BUILD.md)** — the master build prompt (what to read, the repo to create, the phase
   plan, the acceptance gates). It is the executable instruction.
2. **Read [`CANON.md`](CANON.md)** — context + locked decisions + interfaces + the **§12 reconciliation
   ledger** (the tie-breaker for any ambiguity).
3. Build phase-by-phase per [`docs/10-build-plan.md`](docs/10-build-plan.md); pass every test in
   [`docs/13-acceptance-tests.md`](docs/13-acceptance-tests.md).

## Repository layout
```
BUILD.md            ← master build prompt (entrypoint)
CANON.md            ← law: locked decisions + §12 ledger
SPEC-FULL.md        ← single-file concat of BUILD.md + CANON.md + docs/01–14 (convenience read/import)
docs/01–14          ← the exhaustive spec (product → arch → data → providers → agents → editor →
                      playbook → engagement → brand → build-plan → env → security → acceptance → appendix)
research/R1–R7      ← verified 2026 model/API/competitor/testing research (advisory)
prototype/          ← a WORKING Vite+React+Polotno demo = the UX reference (runs standalone)
apps/web/           ← Next.js 15 platform (skeleton — factory builds per docs 01–07)
services/engine/    ← FastAPI engagement engine (skeleton — factory builds per docs 08)
packages/shared/    ← shared types + zod schemas (spine started; canonical schema in docs/03)
packages/render/    ← headless render facade (skeleton — factory builds per docs 06)
supabase/           ← migrations + RLS + seed (skeleton — factory builds per docs 03/12)
```

## The load-bearing decisions (see CANON + docs)
- **Composite, don't bake** — imagery-only generation; text/logo/CTA are editable layers (fixes the old
  prompt-and-re-roll pain).
- **Provider bus** — image via **BFL-direct (primary FLUX)** + **Fal (aggregator/fallback: Seedream, Seedance,
  Recraft, Ideogram)**; video via Kling/Seedance/Veo/Runway; audio via ElevenLabs; all behind one router.
- **Agent studio** — Strategist → Copywriter → ArtDirector → CarouselArchitect → CompositorPlanner →
  BrandGuardian → Critic → EngagementAnalyst → EditorAgent → LocalizationAgent (DE/EN).
- **Engagement testing** — commercially-clean saliency in production; TRIBE v2 flag-gated R&D only
  (non-commercial license) — never on the revenue path.
- **Stack** — Next.js 15 · Supabase (Postgres+RLS+Auth+Storage) · Anthropic Claude · Polotno editor ·
  Remotion video · FastAPI engine.

## Run the prototype (the UX reference)
```bash
cd prototype && npm install && npm run dev   # → http://localhost:5173
```
Brief → agent pipeline → variant board (live LinkedIn feed preview) → Polotno editor (drag + chat-to-edit +
pre-flight + safe-zones) → real 1200×1200 JPG export. Reimplement its flows against the real backend in
`apps/web`; don't ship its mocks.

## Status
🟢 Spec complete & reconciled (CANON §12, verified L1–L12). 🟡 Implementation: skeleton only — the factory
builds `apps/web`, `services/engine`, `packages/*`, and `supabase/` from the docs and provisions infra.
