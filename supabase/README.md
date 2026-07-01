# supabase — data, auth, storage, queue

Skeleton. The factory builds this from **docs/03** (full DDL, RLS policies, JSONB layer-tree/brand-kit
schemas, zod mirrors, seed) and **docs/12** (RLS/tenant isolation, spend caps, audit log).

- `migrations/` — timestamped SQL migrations (generated per docs/03; multi-tenant via `workspace_id` + RLS).
- `seed.sql` — the Brutal AI seed brand kit + demo workspace (docs/09).
- Queue: `pgmq` (Supabase Queues) is the default job queue (docs/02); Inngest is an optional adapter.

Provisioning (project creation, keys, billing) is done by the factory/operator — not wired here.
