-- docs/03 §4 — AdDocument / Variant / Slide (verbatim)

create table ad_document (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  brief_id      uuid not null references brief(id) on delete cascade,
  type          ad_document_type not null,
  title         text not null default 'Untitled ad',
  base_ratio    ad_ratio not null default '1:1',
  created_by    uuid references auth.users(id),
  created_by_kind actor_kind not null default 'human',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index ad_document_brief_idx on ad_document (brief_id) where deleted_at is null;
create index ad_document_ws_idx    on ad_document (workspace_id) where deleted_at is null;

create table variant (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspace(id) on delete cascade,
  ad_document_id    uuid not null references ad_document(id) on delete cascade,

  layer_tree        jsonb,                         -- LayerTree — §6. Null iff ad_document.type='carousel'.
  video_composition jsonb,                         -- VideoComposition — §9. Null for single_image/carousel.

  status            variant_status not null default 'draft',
  locale            locale_code not null default 'en',
  ratio             ad_ratio not null default '1:1',

  -- ── LINEAGE (CANON §5 — verbatim field set) ────────────────────────────────
  brief_id          uuid not null references brief(id) on delete cascade,
  brand_kit_version integer not null,
  provider          text,
  model             text,
  model_version     text,
  seed              bigint,
  prompt            text,                          -- IMAGERY-ONLY prompt (no legible text — CANON §2)
  negative_prompt   text,
  parent_variant_id uuid references variant(id) on delete set null,
  created_by        uuid references auth.users(id),
  created_by_kind   actor_kind not null default 'agent',
  created_by_agent  agent_name,

  engagement        jsonb not null default '{}'::jsonb, -- EngagementScores — §8.3

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,

  constraint variant_tree_shape check (
    (layer_tree is null      and video_composition is null)
    or (layer_tree is not null and video_composition is null)
    or (layer_tree is not null and video_composition is not null)
  ),
  constraint variant_layer_tree_is_object  check (layer_tree is null or jsonb_typeof(layer_tree) = 'object'),
  constraint variant_engagement_is_object  check (jsonb_typeof(engagement) = 'object'),
  constraint variant_video_comp_is_object  check (video_composition is null or jsonb_typeof(video_composition) = 'object')
);
create index variant_ad_document_idx on variant (ad_document_id) where deleted_at is null;
create index variant_ws_idx          on variant (workspace_id) where deleted_at is null;
create index variant_parent_idx      on variant (parent_variant_id);
create index variant_brief_idx       on variant (brief_id);
create index variant_stopping_power_idx
  on variant (((engagement->'stoppingPower'->>'value')::numeric) desc);
create index variant_lineage_idx     on variant (provider, model, seed);

create table slide (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspace(id) on delete cascade,
  variant_id    uuid not null references variant(id) on delete cascade,
  position      integer not null,
  role          text,                              -- 'hook'|'reframe'|'close'|'body'
  layer_tree    jsonb not null,                    -- LayerTree — §6 (per-slide)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (variant_id, position),
  constraint slide_layer_tree_is_object check (jsonb_typeof(layer_tree) = 'object')
);
create index slide_variant_idx on slide (variant_id, position);
