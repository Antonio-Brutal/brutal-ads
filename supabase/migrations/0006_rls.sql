-- docs/03 §10 — Row-Level Security: multi-tenant isolation by workspace_id

-- ── 10.1 membership helpers (SECURITY DEFINER; avoids recursive RLS) ──────────
create or replace function public.current_workspace_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select workspace_id from workspace_member where user_id = auth.uid()
$$;

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

-- ── workspace: a user sees workspaces they are a member of ────────────────────
alter table workspace enable row level security;
create policy workspace_select on workspace
  for select using (id in (select public.current_workspace_ids()));
create policy workspace_update on workspace
  for update using (public.has_workspace_role(id, array['owner','admin']::member_role[]));

-- INSERT of a new workspace goes through this SECURITY DEFINER RPC, which also inserts
-- the creating user's owner membership atomically — never a raw client insert (docs/03 §10.2).
create or replace function public.create_workspace(p_name text, p_slug text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare ws_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into workspace (name, slug) values (p_name, p_slug) returning id into ws_id;
  insert into workspace_member (workspace_id, user_id, role) values (ws_id, auth.uid(), 'owner');
  return ws_id;
end $$;

-- ── workspace_member: see co-members of your workspaces; only owner/admin write ─
alter table workspace_member enable row level security;
create policy wm_select on workspace_member
  for select using (workspace_id in (select public.current_workspace_ids()));
create policy wm_write on workspace_member
  for all using (public.has_workspace_role(workspace_id, array['owner','admin']::member_role[]))
  with check   (public.has_workspace_role(workspace_id, array['owner','admin']::member_role[]));

-- ── GENERIC TENANT PATTERN (docs/03 §10.2) applied to every tenant table ──────
-- SELECT: member of the row's workspace. INSERT/UPDATE/DELETE: owner/admin/editor.
-- audit_log is handled separately below (SELECT-only for clients).
do $$
declare t text;
begin
  foreach t in array array[
    'brand_kit','campaign','brief','ad_document','variant','slide','asset','render',
    'generation_job','agent_run','experiment','experiment_arm','result'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format($f$create policy %I_select on %I
      for select using (workspace_id in (select public.current_workspace_ids()))$f$, t, t);
    execute format($f$create policy %I_insert on %I
      for insert with check (public.has_workspace_role(workspace_id, array['owner','admin','editor']::member_role[]))$f$, t, t);
    execute format($f$create policy %I_update on %I
      for update using  (public.has_workspace_role(workspace_id, array['owner','admin','editor']::member_role[]))
                 with check (public.has_workspace_role(workspace_id, array['owner','admin','editor']::member_role[]))$f$, t, t);
    execute format($f$create policy %I_delete on %I
      for delete using  (public.has_workspace_role(workspace_id, array['owner','admin','editor']::member_role[]))$f$, t, t);
  end loop;
end $$;

-- ── audit_log: read-only to clients; writes only via service role (bypasses RLS) ─
alter table audit_log enable row level security;
create policy audit_log_select on audit_log
  for select using (workspace_id in (select public.current_workspace_ids()));
-- (no insert/update/delete policy → clients cannot write)

-- ── grants (rows remain protected by RLS; these are table-level privileges) ───
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated, service_role;
