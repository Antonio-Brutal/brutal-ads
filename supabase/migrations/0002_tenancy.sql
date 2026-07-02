-- docs/03 §2 — tenancy & identity (verbatim)

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
  -- L8: per-brief hard cap as a REAL column (so AT-8 can assert it in SQL).
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
