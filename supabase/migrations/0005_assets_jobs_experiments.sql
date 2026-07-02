-- docs/03 §5 — Asset / Render / GenerationJob / AgentRun / Experiment / Result / AuditLog (verbatim)

create table asset (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  kind          asset_kind not null,
  storage_bucket text not null default 'assets',
  storage_path  text not null,
  mime_type     text not null,
  width         integer,
  height        integer,
  duration_ms   integer,
  bytes         bigint,
  cache_key     text,          -- sha256 of (provider, model, version, prompt, seed, params)
  provider      text,
  model         text,
  meta          jsonb not null default '{}'::jsonb,
  created_by    uuid references auth.users(id),
  created_by_kind actor_kind not null default 'agent',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint asset_meta_is_object check (jsonb_typeof(meta) = 'object')
);
create index asset_ws_idx        on asset (workspace_id) where deleted_at is null;
create unique index asset_cache_key_uniq on asset (workspace_id, cache_key) where cache_key is not null;

create table render (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  variant_id    uuid not null references variant(id) on delete cascade,
  kind          render_kind not null,               -- png|jpg|pdf|svg (L3)
  ratio         ad_ratio not null,
  status        render_status not null default 'queued',
  asset_id      uuid references asset(id),
  width         integer,
  height        integer,
  bytes         bigint,                              -- LinkedIn ≤5MB / ≤200MB spec gate (CANON §8)
  render_hash   text,
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index render_variant_idx on render (variant_id);
create index render_ws_idx      on render (workspace_id);
create unique index render_dedupe on render (variant_id, kind, ratio, render_hash) where render_hash is not null;

create table generation_job (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  variant_id    uuid references variant(id) on delete cascade,
  brief_id      uuid references brief(id) on delete cascade,
  modality      generation_modality not null,
  job_kind      text not null,
  status        job_status not null default 'queued',
  provider      text,
  model         text,
  model_version text,
  spec          jsonb not null,                       -- GenSpec / VideoGenSpec / TtsSpec — §8.4
  result        jsonb,                                -- GenResult — §8.5
  cache_key     text,
  cache_hit     boolean not null default false,
  asset_id      uuid references asset(id),
  progress      numeric(5,2) not null default 0,
  attempts      integer not null default 0,
  provider_task_id text,
  cost_usd      numeric(12,6) not null default 0,
  error         text,
  moderation    jsonb,
  queued_at     timestamptz not null default now(),
  started_at    timestamptz,
  finished_at   timestamptz,
  constraint generation_job_spec_is_object check (jsonb_typeof(spec) = 'object')
);
create index generation_job_variant_idx on generation_job (variant_id);
create index generation_job_ws_status_idx on generation_job (workspace_id, status);
create unique index generation_job_cache_idx on generation_job (workspace_id, cache_key) where cache_key is not null;

create table agent_run (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  brief_id      uuid references brief(id) on delete cascade,
  variant_id    uuid references variant(id) on delete cascade,
  agent         agent_name not null,
  status        agent_run_status not null default 'running',
  model         text not null,
  input         jsonb not null default '{}'::jsonb,
  output        jsonb,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  latency_ms    integer,
  cost_usd      numeric(12,6) not null default 0,
  iterate_round integer not null default 0,            -- bounded auto-iterate ≤2 (CANON §7)
  parent_run_id uuid references agent_run(id),
  error         text,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz,
  constraint agent_run_input_is_object  check (jsonb_typeof(input)  = 'object'),
  constraint agent_run_output_is_object check (output is null or jsonb_typeof(output) = 'object')
);
create index agent_run_ws_idx     on agent_run (workspace_id, created_at desc);
create index agent_run_brief_idx  on agent_run (brief_id);
create index agent_run_variant_idx on agent_run (variant_id);

create table experiment (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  campaign_id   uuid references campaign(id) on delete cascade,
  name          text not null,
  hypothesis    text,
  status        experiment_status not null default 'draft',
  primary_metric text not null default 'ctr',
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
  label         text not null,
  linkedin_creative_urn text,
  created_at    timestamptz not null default now(),
  unique (experiment_id, variant_id)
);
create index experiment_arm_experiment_idx on experiment_arm (experiment_id);
create index experiment_arm_variant_idx     on experiment_arm (variant_id);

create table result (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references workspace(id) on delete cascade,
  experiment_arm_id uuid not null references experiment_arm(id) on delete cascade,
  measured_at      timestamptz not null default now(),
  impressions      bigint not null default 0,
  clicks           bigint not null default 0,
  ctr              numeric(8,5),
  spend_usd        numeric(12,4),
  cpc_usd          numeric(12,4),
  conversions      bigint,
  cvr              numeric(8,5),
  source           text not null default 'manual',
  raw              jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  constraint result_raw_is_object check (jsonb_typeof(raw) = 'object')
);
create index result_arm_time_idx on result (experiment_arm_id, measured_at desc);
create index result_ws_idx        on result (workspace_id);

create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  actor_id      uuid references auth.users(id),
  actor_kind    actor_kind not null default 'human',
  action        text not null,
  target_table  text,
  target_id     uuid,
  commercial_use boolean not null default true,       -- R4 §6: TRIBE artifacts stamped false
  cost_usd      numeric(12,6) not null default 0,
  detail        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  constraint audit_log_detail_is_object check (jsonb_typeof(detail) = 'object')
);
create index audit_log_ws_time_idx on audit_log (workspace_id, created_at desc);
create index audit_log_target_idx  on audit_log (target_table, target_id);

-- docs/03 §6.6 — optional generated side-index (query-only, never source of truth — ⚑R-DM3)
create or replace view variant_layer_flat as
select v.id as variant_id, v.workspace_id,
       (l->>'id')   as layer_id,
       (l->>'type') as layer_type,
       (l->>'name') as layer_name
from variant v,
     lateral jsonb_array_elements(coalesce(v.layer_tree->'layers','[]'::jsonb)) as l
where v.layer_tree is not null;
