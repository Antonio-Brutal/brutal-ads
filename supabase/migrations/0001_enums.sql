-- docs/03 §0.3 — enum types (verbatim)
create type actor_kind        as enum ('human','agent','system');
create type member_role       as enum ('owner','admin','editor','viewer');
create type ad_document_type   as enum ('single_image','carousel','video');   -- CANON §5
create type ad_ratio          as enum ('1:1','1.91:1','4:5','16:9','9:16');   -- CANON §6 GenSpec.aspect
create type variant_status     as enum ('draft','generating','ready','failed','approved','archived');
create type generation_modality as enum ('image','video','audio');            -- CANON §6 Modality
create type job_status         as enum ('queued','dispatched','running','succeeded','failed','dead','cancelled','cached'); -- L3: frozen superset
create type render_kind        as enum ('png','jpg','pdf','svg'); -- L3: PPTX out of scope for v1 — document/carousel ads ship as PDF
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
