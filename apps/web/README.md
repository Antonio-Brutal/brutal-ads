# apps/web — Brutal Ads platform (Next.js 15)

Skeleton. The factory builds this out from the docs:
- `src/server/providers/` — the `ProviderBus` + image/video/audio drivers (**docs/04**).
- `src/server/studio/` — the Creative Studio agents + orchestrator (**docs/05**).
- `src/editor/` — the Polotno-based layered editor + chat-to-edit + pre-flight (**docs/06**).
- `src/app/api/` — route handlers (generation jobs, webhooks, export) (**docs/02/04/06**).

Shared types come from `@brutal/shared`; rendering from `@brutal/render`. Env vars: `../../.env.example`.
UX reference: `../../prototype/` (a working Vite+Polotno demo — reimplement its flows here, don't ship its mocks).
