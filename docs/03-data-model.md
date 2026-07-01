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
