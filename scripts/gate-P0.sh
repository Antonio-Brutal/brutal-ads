#!/usr/bin/env bash
# Gate P0 — implements docs/10-build-plan.md §2.4 verbatim.
# PASS requires: monorepo compiles, @brutal/shared tests pass, migrations 0000–0007 apply clean,
# seed present, and the cross-tenant RLS denial proof. RED until P0 is genuinely done — that is correct.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[1/5] pnpm install"
pnpm install

echo "[2/5] pnpm typecheck"
pnpm typecheck

echo "[3/5] @brutal/shared tests"
pnpm --filter @brutal/shared test

echo "[4/5] supabase migrations (reset + push)"
if ! command -v supabase >/dev/null 2>&1; then
  echo "FAIL: supabase CLI not installed (P0 deliverable — see docs/10 §2)."
  exit 1
fi
if ! ls supabase/migrations/*.sql >/dev/null 2>&1; then
  echo "FAIL: no migrations in supabase/migrations/ (P0 deliverable: 0000–0007 per docs/03)."
  exit 1
fi
supabase db reset --linked=false
supabase db push

echo "[5/5] RLS proof (cross-tenant denial)"
: "${SUPABASE_DB_URL:?FAIL: SUPABASE_DB_URL not set — needed for the RLS check (docs/10 §2.4)}"
if [[ ! -f scripts/gate/p0_rls_check.sql ]]; then
  echo "FAIL: scripts/gate/p0_rls_check.sql missing (P0 deliverable — asserts seed counts and"
  echo "      that a query authed as workspace B returns 0 rows of workspace A's brand_kit)."
  exit 1
fi
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/gate/p0_rls_check.sql

echo "P0 checks complete. Also required for PASS: .github/workflows/ci.yml green (docs/10 §2.4)."
