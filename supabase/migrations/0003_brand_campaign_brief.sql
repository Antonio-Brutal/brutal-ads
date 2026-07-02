-- docs/03 §3 — BrandKit (versioned) & Campaign/Brief (verbatim)

-- ─────────────────────────────────────────────────────────────────────────────
-- brand_kit  (VERSIONED — CANON §5. Every Variant pins brand_kit_version in lineage.)
-- ─────────────────────────────────────────────────────────────────────────────
create table brand_kit (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  version       integer not null,                 -- 1,2,3… monotonically per workspace
  name          text not null default 'Brand Kit',
  is_active     boolean not null default false,   -- exactly one true per workspace
  data          jsonb not null,                   -- BrandKitData shape — §7
  created_by    uuid references auth.users(id),
  created_by_kind actor_kind not null default 'human',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, version),
  constraint brand_kit_data_is_object check (jsonb_typeof(data) = 'object')
);
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
  objective     text,
  status        text not null default 'active',
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
  raw_input     text not null,
  normalized    jsonb not null default '{}'::jsonb, -- BriefNormalized shape — §8.1
  strategy      jsonb not null default '{}'::jsonb, -- Strategy shape — §8.2
  target_locale locale_code not null default 'en',
  target_type   ad_document_type not null default 'single_image',
  brand_kit_id  uuid references brand_kit(id),
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
