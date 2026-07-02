-- docs/03 §11 — triggers & housekeeping

-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- attach to every table that has updated_at
do $$
declare t text;
begin
  foreach t in array array[
    'workspace','workspace_member','brand_kit','campaign','brief','ad_document',
    'variant','slide','asset','render','experiment'
  ] loop
    execute format('create trigger trg_%s_touch before update on %I
      for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

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

-- carousel integrity (≥1 slide before 'ready') is validated in the app layer (docs/04 orchestration).
