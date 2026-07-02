-- Gate P0 — docs/10 §2.4: seed assertions + the cross-tenant RLS denial proof.
-- Run with: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/gate/p0_rls_check.sql
-- Any raised exception fails the gate.

-- ── 1. Seed present (as superuser/service — RLS bypassed) ─────────────────────
do $$ begin
  if (select count(*) from workspace) <> 1 then
    raise exception 'GATE P0 FAIL: workspace count = %, expected 1', (select count(*) from workspace);
  end if;
  if (select count(*) from brand_kit where version = 1) <> 1 then
    raise exception 'GATE P0 FAIL: brand_kit v1 count <> 1 (Brutal seed missing)';
  end if;
  if (select count(*) from workspace_member) <> 1 then
    raise exception 'GATE P0 FAIL: workspace_member count <> 1 (antonio@brutal.ai membership missing)';
  end if;
end $$;

-- ── 2. RLS proof: positive control (member sees own rows) + cross-tenant denial ─
begin;

-- create throwaway tenant B + user B (rolled back at the end)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b2',
        'authenticated', 'authenticated', 'rls-test-b@example.com',
        crypt('x', gen_salt('bf')), now(), '{}', '{}', now(), now(), '', '', '', '');
insert into workspace (id, name, slug) values
  ('00000000-0000-0000-0000-000000000002', 'RLS Test B', 'rls-test-b');
insert into workspace_member (workspace_id, user_id, role) values
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b2', 'owner');

-- POSITIVE control: authed as user A (workspace member) → sees the Brutal brand kit (1 row).
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1"}';
do $$ begin
  if (select count(*) from brand_kit) <> 1 then
    raise exception 'GATE P0 FAIL: member of workspace A sees % brand_kit rows, expected 1 (RLS over-blocking)',
      (select count(*) from brand_kit);
  end if;
end $$;

-- NEGATIVE control: authed as user B (different workspace) → 0 rows of tenant A data, NOT an error.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2"}';
do $$ begin
  if (select count(*) from brand_kit) <> 0 then
    raise exception 'GATE P0 FAIL: RLS LEAK — tenant B sees % brand_kit rows of tenant A', (select count(*) from brand_kit);
  end if;
  if (select count(*) from workspace) <> 1 then
    raise exception 'GATE P0 FAIL: tenant B sees % workspaces, expected exactly its own 1', (select count(*) from workspace);
  end if;
end $$;

rollback;

\echo 'GATE P0 RLS CHECK: PASS (seed present; member sees own rows; cross-tenant read returns 0 rows)'
