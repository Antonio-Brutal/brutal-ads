-- docs/03 §0.2 — required extensions
create extension if not exists "pgcrypto";      -- gen_random_uuid(), digest()
create extension if not exists "uuid-ossp";     -- convenience (optional)
create extension if not exists "pg_trgm";       -- trigram search on names/prompts
create extension if not exists "btree_gin";     -- composite btree+gin indexes

-- Job queue (⚑ R-INFRA1): Supabase Queues (pgmq) is the default queue backend; pg_cron for
-- scheduled dispatch/recalibration. VERIFY note resolved per L12: attempt them, tolerate absence
-- locally (they exist on hosted Supabase; some local images lack them). Queue wiring is P2.
do $$ begin
  begin
    create extension if not exists "pgmq";
  exception when others then
    raise notice 'pgmq extension unavailable in this image — required before P2 queue wiring';
  end;
  begin
    create extension if not exists "pg_cron";
  exception when others then
    raise notice 'pg_cron extension unavailable in this image — required before P2 scheduled dispatch';
  end;
end $$;
