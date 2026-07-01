# CLAUDE.md — Brutal Ads

LinkedIn ad-generation platform: brief → agent studio → variant board → Polotno editor → export.
This repo is a **build package + scaffold**: the full spec is here, most implementation is not (yet).

## Read in this order (before writing code)
1. `BUILD.md` — the master build prompt (phases, gates, done-criteria).
2. `CANON.md` **§12 reconciliation ledger (L1–L12)** — the tie-breaker. Where any doc disagrees with
   the ledger, **the ledger wins**. Doc number→role map is in `README.md`.
3. `docs/10-build-plan.md` — the phase you're working on (P0–P10, strictly in order).
4. `docs/13-acceptance-tests.md` — the finish line (AT-1…AT-8, all release-blocking).

`docs/03` is the schema source of truth; `packages/shared` is its runtime spine — **import from
`@brutal/shared`, never redefine** the enums/layer-tree/LayerPatch/provider contracts.

## Non-negotiables
- **Composite, don't bake**: image models generate imagery only; headline/logo/CTA/legal are editable
  vector layers. AT-1 OCRs the background and asserts zero text glyphs.
- **TRIBE stays quarantined**: `tribe_research` backend is CC-BY-NC — never on the commercial path.
  The double-gate guardrail in `services/engine/app/main.py` must survive every refactor.
- **VERIFY ≠ stop**: where docs say "VERIFY current API docs", code the stated default now; adjust only
  on a live 4xx. Never block on a VERIFY note.
- **Gate discipline**: do not start phase N+1 until `pnpm gate:P<N>` exits 0. Gates assert built
  behavior, never stubs. A red gate on unfinished work is correct — fix the work, not the gate.
- Secrets live in `.env` (gitignored). `.env.example` is the canonical variable list (see `docs/11`).
  `SUPABASE_SERVICE_ROLE_KEY` and provider keys are server-only.

## Commands
```bash
pnpm install                 # monorepo (apps/* + packages/*)
pnpm typecheck | build | test
pnpm gate:P0 … gate:P10      # phase gates → scripts/gate.sh → scripts/gate-P<N>.sh
cd prototype && npm install && npm run dev   # UX reference (standalone Vite app, NOT a workspace pkg)
cd services/engine && uvicorn app.main:app --reload --port 8000   # engagement engine (Python)
```

## Verification norms (per phase)
- **UI phases (P4+)**: verify in the browser (preview/screenshot the board and editor), not just types.
  The `prototype/` app is the interaction reference — reimplement its flows, don't ship its mocks.
- **Provider phases (P2+)**: one real smoke call per driver (cheapest model, 1 image) before wiring the
  router; record cost in the job row.
- **Render phases (P1, P5, P7)**: golden-file pixel-diff tests per `docs/10` §3; exports must meet the
  LinkedIn specs in `docs/07` (1200×1200 ≤5 MB JPG; PDF document ads).
- After each phase: run the gate, then commit with the phase tag (e.g. `P2: provider bus + BFL driver`).

## Layout
```
apps/web            Next.js 15 platform (build per docs/01–07)
services/engine     FastAPI engagement engine (docs/08) — Python, not a JS workspace
packages/shared     canonical types + zod (docs/03 spine) — @brutal/shared
packages/render     renderDocument() facade (docs/06)
supabase/           migrations + RLS + seed (docs/03, docs/12)
prototype/          working Polotno demo — UX reference only
research/R1–R7      grounding research (advisory)
scripts/            gate dispatcher + per-phase gate scripts
```
