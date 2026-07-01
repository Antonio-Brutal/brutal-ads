# 12 — SECURITY, COST & OPS

> **Scope.** This is the enforceable operations contract for **Brutal Ads**: multi-tenant isolation (Supabase
> RLS + Storage), secret handling, content-moderation surfacing on generation failure, the **PII stance (ads
> only — no member/audience data)**, provider rate limiting, retries/backoff, idempotency + caching keys,
> **hard per-brief and per-workspace SPEND CAPS with pre-flight enforcement + rollup**, cost/token/latency
> **observability** (`agent_run`, `generation_job`), the append-only **audit log**, and a concrete **cost model
> (est. $/ad by path)**. Everything here is meant to be *built as written* — DDL, code skeletons, exact
> policies, and thresholds, not prose.
>
> **Conforms to `CANON.md`.** Object-model names (`Workspace`, `Brief`, `Variant`, `AgentRun`,
> `GenerationJob`, `AuditLog`, `WorkspaceMember`, …), provider contracts (`GenSpec`/`GenResult`/`ProviderBus`),
> agent names (§7), env-var names (§10), repo shape (§4), and locked decisions are canonical and are **not**
> re-decided here. Where I extend a sibling doc I say so; where I diverge I flag **`⚑ RECOMMENDATION`**.
>
> **Grounding:** `research/R7-blank-slate-arch.md` (`ProviderBus`, caching, cost caps, moderation surface,
> license containment, model tiering ⚑R-LLM1), `research/R1-image-models.md` + `research/R2-video-audio.md`
> (per-call prices that feed the cost model), and the sibling build docs **`docs/03-data-model.md`** (schema +
> RLS pattern — the single source of DDL truth for the object model) and **`docs/04-provider-integrations.md`**
> (the `httpJson` retry helper, `ProviderError` taxonomy, `provider_pricing`, `assertBudget`, cost formulas).
> **This doc owns the parts those two leave open:** the *deepened* RLS/Storage hardening checklist, the
> secret-handling matrix, the PII stance, the **rate-limit governor**, the **idempotency table**, the **spend
> rollup + reservation ledger**, the **observability/alerting surface**, and the **$/ad cost model**.
>
> **⚠️ Drift warning.** Every external price / limit / endpoint below is tagged **`VERIFY current docs before
> coding`**. Pricing is the single most drift-prone field in the whole package (R1/R2). Store all prices as
> **data** (`provider_pricing`, §7), never as code constants.

---

## 0. TL;DR — the ten enforceable controls (read first)

| # | Control | Enforced where | Fail-closed? |
|---|---|---|---|
| 1 | **Tenant isolation** — RLS on *every* tenant table + Storage; `apps/web` uses anon key + user JWT | Postgres RLS (`docs/03 §10`) + Storage policies (§2) | ✅ (default deny) |
| 2 | **Service-role key never ships to the client** — server-only (route handlers, workers, webhooks) | Build gate + CI grep (§3.4) | ✅ |
| 3 | **PII stance: ads only, no member/audience data** — no LinkedIn member PII ever ingested (§4) | Schema (no PII columns) + IntakeAgent redaction + CI schema-lint | ✅ |
| 4 | **Moderation surface on every gen failure** — refused images explained, never swallowed | `generation_job.moderation` + `ModerationEvent` (§5) | ✅ (surfaced) |
| 5 | **Pre-flight spend cap** — orchestrator refuses any job that would breach per-brief/per-workspace caps | `assertBudget` + reservation ledger (§8) | ✅ |
| 6 | **Rate-limit governor** — per-provider concurrency + token buckets, workspace-fair | `provider_rate_limit` + governor (§6) | ✅ (queues) |
| 7 | **Idempotency** — every mutating job/webhook carries an idempotency key; replays are no-ops | `idempotency_key` table (§7.4) | ✅ |
| 8 | **Caching** — `sha256(provider,model,version,prompt,seed,params)`; cache hit ⇒ `cost_usd=0` | `asset.cache_key` unique-per-ws (§7) | — |
| 9 | **Full cost/token/latency observability** — every `agent_run` + `generation_job` logs cost | schema + rollup views (§9) | — |
| 10 | **License containment** — TRIBE (CC-BY-NC) unreachable on commercial path; every run stamped | CI gate + `audit_log.commercial_use` (§11) | ✅ |

**Cost headline (VERIFY):** a default static single-image ad (Sonnet-5 agent loop + 1× FLUX.2 [pro] hero,
1:1) lands at **≈ $0.11–0.18 all-in**; a 6-variant board **≈ $0.55–0.95**; a carousel doc-ad (6 slides)
**≈ $0.45–0.80**; a 15 s video (Kling i2v + ElevenLabs VO + Remotion) **≈ $3.00–5.50**. Full model in §12.

---

## 1. Trust boundaries & data-flow (what runs where, who holds what key)

```
                 ┌──────────────────────────── BROWSER (untrusted) ────────────────────────────┐
                 │  apps/web client bundle                                                      │
                 │  • Supabase JS: SUPABASE_URL + SUPABASE_ANON_KEY  (+ user JWT after login)    │
                 │  • RLS ENFORCED on every query. NO service-role key. NO provider keys.        │
                 └───────────────┬──────────────────────────────────────────────────────────────┘
                                 │  HTTPS (user JWT)
                 ┌───────────────▼──────────────────────── apps/web SERVER (trusted) ───────────┐
                 │  Next.js route handlers / server actions / job workers / webhook receivers    │
                 │  • Holds ALL provider secrets (ANTHROPIC/BFL/FAL/GEMINI/KLING_*/ELEVENLABS/…)  │
                 │  • Holds SUPABASE_SERVICE_ROLE_KEY (bypasses RLS) — server-only                │
                 │  • Enforces: spend caps, rate governor, idempotency, moderation surface        │
                 │  • Enqueues GenerationJob (pgmq) ; logs agent_run/generation_job/audit_log      │
                 └───────┬───────────────────────┬───────────────────────────┬───────────────────┘
                         │ pgmq (Supabase Queues) │ HTTPS + provider auth     │ HTTPS (ENGINE_URL)
                 ┌───────▼──────┐        ┌────────▼─────────┐        ┌─────────▼───────────┐
                 │ Supabase     │        │ External gen APIs │        │ services/engine      │
                 │ Postgres+RLS │        │ BFL/fal/Gemini/…  │        │ (FastAPI, saliency)  │
                 │ Auth/Storage │        │ Kling/ElevenLabs  │        │ TRIBE = flag-gated   │
                 └──────────────┘        └───────────────────┘        └─────────────────────┘
```

**Invariants (all fail-closed):**
- **The browser never holds a secret beyond the anon key + the user's own JWT.** Every provider key and the
  service-role key live only in server env (Vercel encrypted env vars; `services/engine` env). (CANON §10; R7 §7.)
- **Every DB read/write from the client is RLS-scoped.** The service-role key (RLS-bypassing) is used *only* by
  trusted server code (workers, webhooks, RPCs) — `docs/03 §0.2`.
- **Every arrow to an external gen API is an async `GenerationJob`** (pgmq default, Inngest adapter — R7
  ⚑R-INFRA1) with a fallback chain and a moderation surface — no synchronous provider call from a request handler.
- **`services/engine` is called only server→server** over `ENGINE_URL` with a shared secret (§3.2); it is not
  publicly routable and never receives a user JWT.

---

## 2. Supabase RLS / tenant isolation (deepens `docs/03 §10`)

`docs/03 §10` is the **source of truth** for the RLS DDL (the `current_workspace_ids()` /
`has_workspace_role()` helpers and the generic per-table `select/insert/update/delete` policies). Do **not**
re-author those policies here. This section adds the **hardening + Storage isolation** that `docs/03` flags but
does not fully specify, and the **acceptance tests** the factory must pass.

### 2.1 The isolation model (recap — build to `docs/03 §10`, not to memory)

- Tenant boundary = `workspace`. Every tenant table carries `workspace_id uuid not null references
  workspace(id) on delete cascade` (`docs/03 §0.2`).
- The RLS pivot is `workspace_member`. Policies answer *"is `auth.uid()` a member of the row's `workspace_id`
  (with an editing role for writes)?"* via the two `SECURITY DEFINER` helpers.
- `apps/web` client = **anon key + user JWT** ⇒ RLS enforced. Trusted server code = **service-role key** ⇒ RLS
  bypassed (and therefore MUST filter by `workspace_id` itself).

### 2.2 `SECURITY DEFINER` hardening (mandatory — a common RLS footgun)

Both helpers in `docs/03 §10.1` are `security definer`. Harden them exactly as follows, or a compromised
`search_path` becomes a privilege-escalation path:

```sql
-- Every SECURITY DEFINER function MUST pin search_path (already in docs/03; verify it is present)
-- and MUST be owned by a role the app cannot alter. Lock EXECUTE to authenticated only.
alter function public.current_workspace_ids() owner to postgres;
alter function public.has_workspace_role(uuid, member_role[]) owner to postgres;
revoke all on function public.current_workspace_ids() from public;
revoke all on function public.has_workspace_role(uuid, member_role[]) from public;
grant execute on function public.current_workspace_ids() to authenticated;
grant execute on function public.has_workspace_role(uuid, member_role[]) to authenticated;
```

> `VERIFY current docs before coding` — Supabase `SECURITY DEFINER` + `search_path` hardening and `auth.uid()`
> semantics at **supabase.com/docs/guides/database/postgres/row-level-security** and
> **/database/functions#security-definer-vs-invoker**. Run the Supabase **security advisor** (`get_advisors`,
> lint type `security`) after every migration — it flags tables missing RLS and mutable `search_path`.

### 2.3 Storage bucket isolation (the one place table-RLS does NOT cover — implements `docs/03 ⚑R-DM4`)

Assets live in Supabase Storage / R2 (CANON §4). A signed-URL leak or a mis-scoped path can cross tenants even
when table RLS is perfect. **Enforce path-scoping + Storage RLS that mirrors table RLS.**

- **Canonical object path:** `assets/{workspace_id}/{asset_id}.{ext}` (and `renders/{workspace_id}/…`,
  `exports/{workspace_id}/…`). `asset.storage_path` (`docs/03`) MUST begin `assets/{workspace_id}/`.
- **Bucket is private** (never public). All delivery is via **short-TTL signed URLs** minted server-side
  (§2.4).
- **Storage RLS policy** (Supabase stores objects in `storage.objects`; the tenant id is the first path
  segment):

```sql
-- supabase/migrations/0008_storage_rls.sql
-- Buckets are private. Reads/writes require workspace membership derived from the object path.
-- storage.foldername(name) returns the path segments; [1] is the workspace_id segment.
create policy storage_assets_select on storage.objects
  for select using (
    bucket_id = 'assets'
    and (storage.foldername(name))[1]::uuid in (select public.current_workspace_ids())
  );
create policy storage_assets_write on storage.objects
  for insert with check (
    bucket_id = 'assets'
    and (storage.foldername(name))[1]::uuid in (select public.current_workspace_ids())
    and public.has_workspace_role((storage.foldername(name))[1]::uuid,
                                  array['owner','admin','editor']::member_role[])
  );
-- Repeat for update/delete and for the 'renders' / 'exports' buckets (swap bucket_id).
```

> `VERIFY current docs before coding` — Storage access-control + `storage.foldername`/signed-URL semantics at
> **supabase.com/docs/guides/storage/security/access-control**. If assets are on **R2** instead (CANON §4
> allows Supabase/R2), the equivalent is a **Worker/edge proxy that checks membership before issuing a
> presigned R2 URL** — never a public R2 bucket.

### 2.4 Signed-URL policy (all asset delivery)

| Rule | Value | Why |
|---|---|---|
| Default TTL | **300 s (5 min)** for provider-source re-hosts; **3600 s (1 h)** for editor/preview | Provider URLs (BFL/Kling) already expire ~10 min (R1 §2/R2 §1.4); minimize leaked-URL window |
| Minting | **server-side only**, after an RLS-checked membership read | Signed URLs bypass RLS by design — the *decision* to mint must be RLS-gated |
| Downloads for export | one-time, TTL 60 s, logged to `audit_log` (`action='export.downloaded'`) | Auditable egress of the deliverable |
| Never | embed a long-lived/public URL in `AdDocument`/`Variant` JSON | JSON is copied into lineage/exports; a baked public URL is a permanent leak |

### 2.5 RLS acceptance tests (CI must pass — extends `docs/03 §10.3`)

Ship these as **pgTAP / SQL assertions** in `supabase/tests/rls.sql`, run in CI against a seeded 2-workspace DB
(`WS-A`, `WS-B`; users `alice@A`, `bob@B`, `viewer@A`):

| # | Assertion | Expected |
|---|---|---|
| T1 | `bob@B` `select * from variant where workspace_id = WS-A` | **0 rows** (not an error) |
| T2 | `bob@B` insert into `variant` with `workspace_id = WS-A` | **fails `with check`** |
| T3 | `viewer@A` insert/update/delete on `variant` | **fails** (viewer read-only) |
| T4 | `bob@B` `select` a WS-A object via Storage signed path | **denied** by storage policy |
| T5 | Anonymous (no JWT) `select` on any tenant table | **0 rows** |
| T6 | Every tenant table has `rowsecurity = true` in `pg_tables` | **all true** (query the catalog) |
| T7 | `audit_log` insert from an `authenticated` role (not service role) | **fails** (no insert policy) |
| T8 | Service-role key present in any file under `apps/web/**` that ends up in the client bundle | **CI grep = 0 hits** (§3.4) |

```sql
-- sketch of T6 (fail the migration if any tenant table has RLS off)
do $$
declare t text;
begin
  for t in select unnest(array['brand_kit','campaign','brief','ad_document','variant','slide','asset',
                               'render','generation_job','agent_run','experiment','experiment_arm',
                               'result','audit_log','workspace','workspace_member'])
  loop
    if not (select relrowsecurity from pg_class where relname = t) then
      raise exception 'RLS not enabled on %', t;
    end if;
  end loop;
end $$;
```

---

## 3. Secret handling

### 3.1 Secret inventory & placement (env-var names verbatim from CANON §10 — do not rename)

| Secret (env var) | Holder | Client-safe? | Rotation | Notes |
|---|---|---|---|---|
| `SUPABASE_ANON_KEY` | browser + server | **yes** (RLS-scoped) | on compromise | Publishable; safe by design |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (workers/webhooks/RPC) | **NO — never client** | 90d + on compromise | Bypasses RLS; §3.4 CI gate |
| `SUPABASE_URL`, `APP_BASE_URL`, `ENGINE_URL` | server (+ URL client) | url only | — | `ENGINE_URL` server-only |
| `ANTHROPIC_API_KEY` | server (all agents) | **NO** | 90d | Whole studio |
| `BFL_API_KEY` | server | **NO** | 90d | `x-key` header |
| `FAL_KEY` | server | **NO** | 90d | Aggregator |
| `IDEOGRAM_API_KEY`, `RECRAFT_API_KEY` | server | **NO** | 90d | Fallback-only (R7 ⚑R-PROV1) |
| `GEMINI_API_KEY`, `OPENAI_API_KEY` | server | **NO** | 90d | Edit / diversity |
| `SEEDREAM_API_KEY` | server | **NO** | 90d | Source-agnostic (R7 ⚑R-PROV2) |
| `KLING_ACCESS_KEY`, `KLING_SECRET_KEY` | server | **NO** | 90d | JWT HS256 minted per request (<30 min) |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_*` | server | **NO** (id can be config) | 90d | `xi-api-key` |
| `POLOTNO_API_KEY` | server (+ possibly client for editor) | ⚠️ see note | on compromise | R7 ⚑R-ENV1: add to canonical env list |
| `INNGEST_*` | server | **NO** | 90d | Reserved (pgmq default) |
| `ENGINE_SHARED_SECRET` | server ↔ engine | **NO** | 90d | §3.2 (⚑ add to env list) |
| `WEBHOOK_SIGNING_SECRET` | server | **NO** | 90d | §3.3 (⚑ add to env list) |

> `⚑ R-ENV2 (RECOMMENDATION)` — CANON §10 does not enumerate **`ENGINE_SHARED_SECRET`** (web↔engine auth) or
> **`WEBHOOK_SIGNING_SECRET`** (provider callback verification). Both are required for a secure build. Add them
> to the canonical env block in `docs/11`. This mirrors R7 ⚑R-ENV1 (which added `POLOTNO_API_KEY`); it is
> additive and renames nothing.

### 3.2 Web ↔ engine authentication

`services/engine` is **not publicly routable** (private network / IP allowlist) and additionally requires a
shared-secret header on every request:

```
POST {ENGINE_URL}/score
Authorization: Bearer {ENGINE_SHARED_SECRET}
X-Workspace-Id: {workspace_id}        # for engine-side logging/quotas only; never trusted for auth
```

The engine validates the bearer, rejects on mismatch (401), and **never** receives or trusts a user JWT. All
authorization decisions were already made server-side in `apps/web` before the call.

### 3.3 Inbound webhook verification (BFL / fal / Kling callbacks)

Provider callbacks (BFL `webhook_url`, fal `?fal_webhook=`, Kling `callback_url`) hit
`{APP_BASE_URL}/api/webhooks/{provider}`. **Never trust a webhook body until verified.**

- If the provider signs (HMAC over the raw body): verify with the provider's signing secret **before** parsing
  JSON. **`VERIFY current docs before coding`** the exact header/HMAC scheme for each (R1 §2.3 flags BFL
  `webhook_secret`; fal/Kling schemes vary).
- If the provider does **not** sign: treat the webhook as an *untrusted hint only* — do not act on its payload;
  instead use it as a signal to **re-poll the provider's task endpoint** (authenticated) for the authoritative
  result. Look the job up by `generation_job.provider_task_id`; ignore any webhook whose `provider_task_id` is
  unknown or already terminal (idempotency, §7.4).
- Bind webhooks to our own `WEBHOOK_SIGNING_SECRET` where a provider lets us set a shared secret; reject
  otherwise.

### 3.4 Client-bundle leak prevention (fail-closed CI gate)

The single highest-severity secret failure is shipping `SUPABASE_SERVICE_ROLE_KEY` (or any provider key) into
the client bundle. Enforce mechanically:

- **Naming discipline:** in `apps/web`, only vars prefixed `NEXT_PUBLIC_` are client-exposed. **No secret is
  ever `NEXT_PUBLIC_`.** `SUPABASE_ANON_KEY` may be `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the service-role key must
  never be.
- **CI grep gate** (blocks merge — RLS acceptance test T8):

```bash
# scripts/ci/secret-scan.sh  (exit 1 on any hit)
set -euo pipefail
# 1) no service-role / provider keys referenced from client-reachable code
if grep -RInE 'SERVICE_ROLE_KEY|BFL_API_KEY|FAL_KEY|ANTHROPIC_API_KEY|KLING_SECRET_KEY|ELEVENLABS_API_KEY' \
     apps/web/src 2>/dev/null \
     | grep -vE 'server-only|/server/|\.server\.'; then
  echo "SECRET referenced from potentially client-reachable code"; exit 1; fi
# 2) build the app, then scan the emitted client bundle for secret VALUES (from a test env)
pnpm --filter web build
if grep -RIl "$SUPABASE_SERVICE_ROLE_KEY" apps/web/.next/static 2>/dev/null; then
  echo "SERVICE ROLE KEY LEAKED INTO CLIENT BUNDLE"; exit 1; fi
```

- Import `server-only` in every module that touches a secret (Next.js will error if such a module is imported
  into a client component).
- Provider keys are read **once** in a server-only `env` module; never passed to a React prop, never logged.

### 3.5 Rotation & storage of secrets

- Secrets live in **Vercel encrypted environment variables** (web) and the engine host's secret store — never
  in the repo, never in `.env` committed to git. `.env.example` (CANON tree) contains **names only**, no values.
- Rotation cadence **90 days** for provider/service keys; **immediate** on any suspected leak.
- Log **key fingerprints** (`sha256(key)[:8]`), never the key, when you must record which credential a call used.

---

## 4. PII stance — **ads only, no member/audience data**

**This is a product-defining boundary, not a nice-to-have.** Brutal Ads generates *creative* (imagery + copy +
layout). It is **not** an audience/targeting/CRM tool. It therefore holds essentially **no personal data about
LinkedIn members or ad audiences** — which drastically shrinks the GDPR surface (relevant: the seed tenant
serves **German-speaking law firms** — CANON §1 — a high-sensitivity vertical).

### 4.1 What Brutal Ads holds vs never holds

| Category | Held? | Where / retention |
|---|---|---|
| Ad **creative** (layer trees, prompts, generated imagery, copy, exports) | **yes** | tenant tables + Storage; soft-delete (`docs/03`) |
| **Brief** text (the one-line brief + normalized fields) | **yes** | `brief` (may contain *tenant's own* offer/proof — treat as tenant-confidential, not member PII) |
| **Workspace member** identity (login email, role) | **yes, minimal** | `auth.users` + `workspace_member`; auth only |
| **Aggregate** ad results (impressions, clicks, CTR, spend) | **yes** | `result` — **counts/rates only, no per-person data** |
| LinkedIn **member** PII (names, profiles, emails of the audience) | **NEVER** | not ingested; no column exists for it |
| **Targeting/audience** definitions, lookalikes, contact lists | **NEVER** | out of scope; no table exists |
| End-user behavioral/tracking data | **NEVER** | — |
| Payment card data | **NEVER** (billing via a PCI-compliant processor, tokens only) | processor holds it |

### 4.2 Enforcement (mechanical)

- **Schema is the guardrail.** There is no table/column for member PII, audiences, or contact lists (`docs/03`
  has none). Adding one is a schema-review red flag — CI schema-lint (§4.4) fails the build if a column name
  matches a PII blocklist.
- **`result` is aggregate-only.** `impressions/clicks/ctr/spend_usd/cpc_usd/conversions/cvr` are counts and
  rates. `result.raw` stores the *untouched source payload* — a CI check + a runtime allowlist strip any
  member-level fields from a LinkedIn API pull before persisting (only aggregate metrics are retained).
- **IntakeAgent redaction.** If a user pastes a brief/URL that contains obvious personal data (a person's
  contact details, a client roster), `IntakeAgent` (R7 ⚑R-A1) redacts it from the normalized `Brief` and logs
  `audit_log(action='pii.redacted')`. The *raw* pasted text is not persisted beyond the normalization step.
- **Prompts to providers carry imagery-only, non-personal content.** Because text is composited (never baked —
  CANON §2), image prompts describe *scenes*, not people-by-name. Reference images uploaded by the tenant are
  the tenant's own brand assets.

### 4.3 GDPR posture (for the DE tenant)

- **Data residency:** prefer the **EU BFL host `api.eu.bfl.ai`** for image gen for EU tenants (R1 §2). **`VERIFY
  current docs before coding`** data-residency terms for fal / Gemini / Kling / ElevenLabs; if EU residency is
  contractually required, route through EU endpoints or gate those providers off for the tenant.
- **Right to erasure:** a workspace delete **hard-cascades** all tenant rows (`on delete cascade`, `docs/03`)
  and a worker purges Storage objects under `assets/{workspace_id}/…`. Provide a `DELETE workspace` RPC that
  does both atomically and writes a final `audit_log(action='workspace.erased')`.
- **DPA/subprocessors:** the provider list (CANON §4) are subprocessors — maintain a subprocessor list; this is
  a legal/ops artifact, not code, but the audit log makes *which provider touched which artifact* answerable.

### 4.4 PII CI schema-lint

```bash
# scripts/ci/pii-schema-lint.sh — fail if a new column looks like member/audience PII
BLOCK='(email|phone|first_name|last_name|full_name|address|dob|birth|ssn|passport|audience|lookalike|contact_list|member_id|profile_url)'
# scan the current schema (generated types) for tenant tables (exclude auth.users, workspace_member roles)
if grep -RInE "\"($BLOCK)\"" packages/shared/src/db-types.ts \
   | grep -vE 'workspace_member|auth\.'; then
  echo "Possible member/audience PII column introduced — review PII stance (docs/12 §4)"; exit 1; fi
```

---

## 5. Content-moderation surfacing on generation failure (CANON §4)

`docs/04 §3` defines the shared `ProviderError` taxonomy and the `code='moderation'` handling — **build to it**;
this section defines the **surfaced artifact + UX contract + audit** so a refused generation is *explained*,
never swallowed (R7 §4: "never a raw model failure in the UI").

### 5.1 Where moderation is recorded

`generation_job.moderation jsonb` already exists (`docs/03`). On any `code='moderation'` outcome, the worker
writes a `ModerationEvent` there and an `audit_log` row:

```jsonc
// generation_job.moderation  (ModerationEvent — extends docs/04 §3.3)
{
  "code": "moderation",
  "provider": "bfl",
  "model": "flux-2-pro",
  "provider_reason": "Request Moderated",          // raw provider signal (VERIFY per-provider strings, docs/04 §3.4)
  "category": "safety_generic",                     // our normalized bucket (below)
  "action": "surfaced_to_user",                     // surfaced_to_user | moderation_fallback | auto_revise
  "user_message": "We couldn't generate imagery for this variant because the provider flagged the request. Try rephrasing the scene, or edit the brief.",
  "safe_to_retry_same_prompt": false,
  "occurred_at": "2026-07-01T09:20:00Z"
}
```

### 5.2 Moderation decision policy (extends `docs/04 §3.2`, the canonical retry matrix)

| Situation | Retry same driver? | Fallback driver? | Surface to user | Audit |
|---|---|---|---|---|
| `moderation` (prompt/refs likely the cause) | **❌ never** (same prompt re-blocks) | ⚠️ **only** if the block is model-idiosyncratic → try next driver **once**, tag `moderation_fallback` | if unresolved → **✅ explain** | `audit_log(action='gen.moderated')` |
| `moderation` after fallback still blocked | ❌ | ❌ | **✅ explain + offer "edit brief / rephrase"** | ✅ |
| Non-moderation failure (rate_limit/timeout/network) | ✅ backoff | ✅ after retries | silent unless exhausted | warn if sustained |
| All drivers exhausted | — | — | **✅ explain + manual retry** | ✅ + ops alert |

- **Do not silently re-roll a moderated prompt** — that reintroduces the re-roll spiral CANON §2 exists to kill.
- **Optional `auto_revise`:** the orchestrator MAY ask `ArtDirector` to produce **one** softened imagery-only
  prompt (imagery only, still no baked text) and try again, tagged `auto_revise`, counted against the ≤2
  auto-iterate bound (CANON §7). Never more than once.

### 5.3 UX contract (the "it just works" promise — R7 §4)

- The board card for the failed variant shows a **calm explanatory state** ("We couldn't generate imagery for
  variant 3 — retry / edit brief"), **never a stack trace or a raw provider string**.
- The `user_message` is drawn from `moderation.user_message` (already localized DE/EN via `LocalizationAgent`
  where the workspace locale is DE).
- The event is visible to the tenant in a per-variant "why did this fail" affordance, sourced from
  `generation_job.moderation` (RLS-scoped).

---

## 6. Rate limiting, retries & backoff

### 6.1 Retries/backoff — build to `docs/04 §2.2`

`docs/04 §2.2` defines the canonical `httpJson` helper: **4 retries, exponential backoff `0.5s → 1s → 2s → 4s`
with full jitter, honoring `Retry-After`, retry on `429`/`5xx`, never retry classified `4xx`** (except
`rate_limit`). Do not re-implement — import it. Retry semantics per error code are the matrix in `docs/04 §3.2`.

Additional retry rules this doc pins:

| Concern | Rule |
|---|---|
| **Poll caps** | Cap provider polling: image ~**8 min**, video ~**15 min** (`docs/04 §2.3`'s `maxMs`); on cap → `timeout` → fallback then surface |
| **Failed-task cost** | **Kling failed tasks are free** (R2 §1.4) — retry cheaply; still count attempts to bound loops |
| **Idempotent retries** | Every retry reuses the same `idempotency_key` (§7.4) so a provider-side dup is a no-op |
| **Max attempts** | `generation_job.attempts` hard-capped (default **5**); beyond → terminal `failed` + surface + ops alert |

### 6.2 The **rate-limit governor** (this doc owns it)

External providers impose concurrency/RPM caps (e.g. BFL **24 concurrent active tasks**, `flux-kontext-max`
**6** — R1 §2; fal prepaid credits; Anthropic org RPM/TPM; ElevenLabs concurrency). A naive worker pool will
trip 429s and, worse, let one workspace starve another. Enforce a **workspace-fair token-bucket + concurrency
governor** in front of the `ProviderBus`.

**Config table (data, not code — VERIFY every limit before coding):**

```sql
-- supabase/migrations/0009_rate_limits.sql
create table provider_rate_limit (
  provider        text primary key,        -- 'bfl','fal','gemini','openai','kling','elevenlabs','anthropic'
  max_concurrent  integer not null,        -- active in-flight tasks (VERIFY per provider)
  rpm             integer,                 -- requests/min (null = unmetered here)
  tpm             integer,                 -- tokens/min (Anthropic)
  notes           text
);
insert into provider_rate_limit (provider, max_concurrent, rpm, notes) values
  ('bfl',        24, null, 'flux-kontext-max sub-limit 6 — enforce per-model (VERIFY R1 §2)'),
  ('fal',        16, null, 'aggregator; prepaid credits — also gate on balance'),
  ('gemini',      8, null, 'VERIFY quota tier'),
  ('openai',      8, null, 'VERIFY quota tier'),
  ('kling',       6, null, 'task-based; failed tasks free (VERIFY R2 §1)'),
  ('elevenlabs',  4, null, 'concurrency + 3k-char/request chunking (VERIFY R2 §4)'),
  ('anthropic',  20, null, 'org RPM/TPM — VERIFY tier; use Batch API for fan-out (50% off)');
-- per-model sub-limits (e.g. flux-kontext-max=6) live in a JSON column or a companion table.
```

**Governor behavior (server-side, before dispatch):**

```ts
// _shared/governor.ts  (pseudocode — sits between the pgmq consumer and ProviderBus)
// 1) Concurrency: a per-(provider[,model]) semaphore backed by an atomic counter
//    (Postgres advisory lock or a small `provider_inflight` table with SELECT ... FOR UPDATE).
// 2) Fairness: round-robin dispatch across workspaces with queued jobs so no single
//    workspace consumes all slots for a provider (weighted by remaining budget).
// 3) Token bucket for RPM/TPM where the provider meters it (Anthropic TPM especially).
// 4) On saturation: DO NOT drop — leave the job in pgmq (visibility timeout) and re-poll;
//    surface "queued (N ahead)" progress to the UI. Fail-closed = queue, never 429 the user.
async function acquireSlot(provider: string, model?: string, workspaceId?: string): Promise<Lease>;
```

- **Per-model sub-limits** (e.g. `flux-kontext-max = 6`) are enforced in addition to the provider-level
  concurrency (R1 §2).
- **Fan-out uses Anthropic Batch API** (50% off, R7 §5.2) for the 6-variant copy generation rather than 6 live
  RPM-consuming calls — both a cost and a rate-limit win.
- **The governor is workspace-fair**: dispatch is round-robin across workspaces with pending jobs, weighted by
  remaining budget, so a burst in WS-A cannot starve WS-B (multi-tenant fairness).

> `VERIFY current docs before coding` — every concurrency/RPM/TPM number above: BFL (24 / kontext-max 6),
> Anthropic org rate limits + Batch API, fal prepaid-credit throttling, ElevenLabs concurrency + 3k-char
> chunking, Kling task caps. These drift; store them in `provider_rate_limit`, not in code.

---

## 7. Idempotency & caching keys

### 7.1 Caching (build to `docs/04 §2.4/§2.5`)

The cache key is canonical (CANON §4): **`cache_key = sha256(canonicalJson({provider, model, version, prompt,
seed, params}))`**. `docs/04 §2.4` defines the helper; `docs/03` stores it on `asset.cache_key` (unique per
workspace) and `generation_job.cache_key`.

| Rule | Value |
|---|---|
| Key inputs | `provider, model, version, prompt, seed, params` — **exactly** (CANON §4) |
| `version` | the resolved provider **model version** string → a model upgrade **busts** the cache automatically (`docs/04 §2.5`) |
| Cache hit | `cost_usd = 0`, `generation_job.cache_hit = true`, `result.raw.cached = true`; return existing `Asset`, **no provider call** |
| Scope | **per workspace** (`asset_cache_key_uniq on asset (workspace_id, cache_key)`, `docs/03`) — no cross-tenant asset reuse (isolation > dedup savings) |
| Why it kills re-rolls | text is never in the prompt (composited), so prompts are **stable across copy edits** → identical requests are free (R7 §1.2) |

**⚑ Isolation-over-dedup note:** caching is deliberately **per-tenant**. Two workspaces issuing an identical
prompt do **not** share an asset — that would leak the existence/content of one tenant's generation to another.
Accept the small duplicate-spend cost for hard isolation.

### 7.2 Deterministic ratio re-layout is *not* a regeneration

Re-sizing 1:1 → 1.91:1 / 4:5 is a **re-layout of the same layer tree** (renderHints + safe zones — R7 ⚑R-LT1),
producing a new **`render`** row (`render_hash` dedup, `docs/03`), **not** a new `generation_job`. It costs
**render compute only** (≈ $0), never image credits. Copy edits and localizations are `LayerPatch` diffs →
re-render affected layers only → **zero image credits** (CANON §2 load-bearing).

### 7.3 Cost-model implication

Because of caching + re-layout-is-free + copy-edits-are-free, the **marginal cost of an edit or a locale swap
or an extra ratio is ~$0**. Only *new imagery/video/audio generation* costs money. The §12 cost model prices
the **first** render of each path; iterations are near-free.

### 7.4 Idempotency (this doc owns it)

Every **mutating** external action (enqueueing a gen job, dispatching to a provider, processing a webhook,
recording spend) MUST be idempotent so retries, at-least-once pgmq delivery, and duplicate webhooks never
double-spend or double-write.

```sql
-- supabase/migrations/0010_idempotency.sql
create table idempotency_key (
  key           text primary key,            -- see derivation below
  workspace_id  uuid not null references workspace(id) on delete cascade,
  scope         text not null,               -- 'gen_dispatch' | 'webhook' | 'spend_apply' | 'export'
  status        text not null default 'in_progress',  -- in_progress | done | failed
  result_ref    jsonb,                        -- e.g. { generation_job_id, asset_id }
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '7 days')
);
create index idempotency_expiry_idx on idempotency_key (expires_at);
```

**Key derivation:**

| Scope | `key` = |
|---|---|
| `gen_dispatch` | `sha256(generation_job_id + ':' + attempt_provider)` — one dispatch per (job, provider attempt) |
| `webhook` | `provider + ':' + provider_task_id` — one processing per provider task, whatever the webhook fires |
| `spend_apply` | `generation_job_id + ':spend'` — spend for a job is applied **exactly once** (§8) |
| `export` | `variant_id + ':' + ratio + ':' + render_hash` |

**Protocol:** `insert ... on conflict (key) do nothing`. If the insert wins → do the work, then set
`status='done'` + `result_ref`. If it conflicts and the existing row is `done` → **return the stored
`result_ref` (no-op)**. If `in_progress` → the work is already running elsewhere; back off and re-check.
Webhooks whose `provider_task_id` maps to a job already `succeeded`/`failed` are dropped (§3.3).

---

## 8. Spend caps — per-brief & per-workspace, with enforcement (CANON §4/§10)

`docs/04 §9.3` defines `assertBudget` (pre-flight refuse) and the `provider_pricing`-backed cost formulas —
**build to it.** This section makes the enforcement **complete and race-safe**: the *reservation ledger* (so
concurrent jobs can't collectively overshoot a cap), the *rollup* (so `workspace.spend_used_usd_monthly` is
accurate), and the *cap sources*.

### 8.1 Where caps live

| Cap | Column / config | Default (VERIFY / tenant-tunable) |
|---|---|---|
| **Per-workspace, monthly** | `workspace.spend_cap_usd_monthly` (`docs/03`) | **$500.00/mo** (`docs/03` default) |
| Running monthly spend | `workspace.spend_used_usd_monthly` (`docs/03`) | rolled up (§8.4) |
| **Per-brief** | `caps.perBriefUsd` config (`docs/04 §9.3`) | ⚑ default **$5.00/brief** (see below) |

> `⚑ R-COST1 (RECOMMENDATION)` — CANON §4 mandates a **per-brief** cap but neither CANON nor `docs/03` gives it
> a column; `docs/04 §9.3` reads it from `caps` config. **Add `brief.spend_cap_usd numeric(12,2) not null
> default 5.00`** so a per-brief cap is a first-class, tenant-tunable, auditable value (mirrors the per-workspace
> column) rather than a global constant. Additive; consistent with `docs/03`'s `workspace.spend_cap_usd_monthly`
> pattern. Rationale: a 6-variant board of static ads costs **~$0.55–0.95** (§12), so $5/brief comfortably
> covers auto-iteration + a few video attempts while still catching a runaway loop. A video-heavy brief may
> raise its own cap explicitly.

### 8.2 The reservation ledger (race-safe enforcement)

`assertBudget` alone is not enough under concurrency: N jobs each individually under the cap can *collectively*
breach it if they all check-then-spend in parallel. Fix with a **reserve → confirm/release** ledger.

```sql
-- supabase/migrations/0011_spend_ledger.sql
create type spend_ledger_state as enum ('reserved','confirmed','released');
create table spend_ledger (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspace(id) on delete cascade,
  brief_id       uuid references brief(id) on delete cascade,
  generation_job_id uuid references generation_job(id) on delete cascade,
  agent_run_id   uuid references agent_run(id) on delete cascade,
  estimated_usd  numeric(12,6) not null,       -- reserved amount (pre-flight)
  actual_usd     numeric(12,6),                -- filled on confirm (GenResult.costUsd)
  state          spend_ledger_state not null default 'reserved',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index spend_ledger_ws_state_idx    on spend_ledger (workspace_id, state);
create index spend_ledger_brief_state_idx on spend_ledger (brief_id, state);
```

Enforce atomically inside a single transaction (advisory lock per workspace so the check + reserve is serial):

```sql
-- supabase/migrations/0011_spend_ledger.sql (cont.)
create or replace function public.reserve_spend(
  p_workspace_id uuid, p_brief_id uuid, p_estimate numeric,
  p_gen_job uuid default null, p_agent_run uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_ws_cap numeric; v_brief_cap numeric;
  v_ws_committed numeric; v_brief_committed numeric;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_workspace_id::text));  -- serialize per workspace
  select spend_cap_usd_monthly into v_ws_cap from workspace where id = p_workspace_id;
  select coalesce(spend_cap_usd, 5.00) into v_brief_cap from brief where id = p_brief_id;  -- ⚑R-COST1
  -- committed = confirmed spend + still-outstanding reservations (current calendar month)
  select coalesce(sum(coalesce(actual_usd, estimated_usd)),0) into v_ws_committed
    from spend_ledger
   where workspace_id = p_workspace_id and state in ('reserved','confirmed')
     and created_at >= date_trunc('month', now());
  select coalesce(sum(coalesce(actual_usd, estimated_usd)),0) into v_brief_committed
    from spend_ledger where brief_id = p_brief_id and state in ('reserved','confirmed');
  if v_ws_committed + p_estimate > v_ws_cap then
    raise exception 'WORKSPACE_CAP_EXCEEDED: % + % > %', v_ws_committed, p_estimate, v_ws_cap
      using errcode = 'P0001';
  end if;
  if v_brief_committed + p_estimate > v_brief_cap then
    raise exception 'BRIEF_CAP_EXCEEDED: % + % > %', v_brief_committed, p_estimate, v_brief_cap
      using errcode = 'P0001';
  end if;
  insert into spend_ledger (workspace_id, brief_id, generation_job_id, agent_run_id, estimated_usd)
    values (p_workspace_id, p_brief_id, p_gen_job, p_agent_run, p_estimate)
    returning id into v_id;
  return v_id;
end $$;
```

**Confirm/release:**

```sql
-- on provider success: record the real cost (idempotent via idempotency_key 'spend_apply', §7.4)
create or replace function public.confirm_spend(p_ledger_id uuid, p_actual numeric)
returns void language sql security definer set search_path = public as $$
  update spend_ledger set state='confirmed', actual_usd=p_actual, updated_at=now()
   where id = p_ledger_id and state='reserved';
$$;
-- on failure / cache-hit(0) / cancel: release the reservation so it stops counting
create or replace function public.release_spend(p_ledger_id uuid)
returns void language sql security definer set search_path = public as $$
  update spend_ledger set state='released', updated_at=now()
   where id = p_ledger_id and state='reserved';
$$;
```

### 8.3 Enforcement lifecycle (per job / per agent call)

```
estimate cost  ── (image: model+resolution via provider_pricing; video: perSecond*duration;
   │              agent: est. tokens*rate; cache-hit lookup first → est=0)
   ▼
reserve_spend(ws, brief, estimate)  ──►  raises CAP_EXCEEDED  ──►  refuse job (status stays 'queued'→'cancelled',
   │  (advisory-locked, race-safe)                                 agent_run.status='budget_exceeded'),
   │                                                               surface "remaining budget $X" in UI (R7 §4)
   ▼ ok (ledger row 'reserved')
dispatch to ProviderBus (governor slot, §6)  ──►  success ─► confirm_spend(actual = GenResult.costUsd)
   │                                            └─ failure/cache-hit0/cancel ─► release_spend
   ▼
increment counters BEFORE marking generation_job.succeeded (docs/04 §2.6)
```

- **Refuse, don't truncate:** a job that would breach the cap is **refused pre-flight** with a clear
  remaining-budget message — never partially run. `agent_run.status='budget_exceeded'` is a first-class enum
  value (`docs/03 §0.3`).
- **Auto-iterate (≤2) and caching are themselves caps** (R7 §4): they bound how much a single brief can spend.
- **Down-tiering under pressure:** if a brief is near its cap, the router MAY down-tier the model (e.g.
  FLUX.2 [pro] → Seedream 4.5 or FLUX.2 [klein]; Opus 4.8 → Sonnet 5) and **flag** it, rather than refuse
  outright (`docs/04 §8`; R7 ⚑R-LLM1). Never *silently* exceed a hard cap.

### 8.4 Rollup — keeping `workspace.spend_used_usd_monthly` truthful

`workspace.spend_used_usd_monthly` (`docs/03`) is the human-facing monthly figure. Roll it up from confirmed
ledger spend so the UI and cap checks agree:

```sql
-- pg_cron (Supabase) — hourly rollup of confirmed spend into the workspace mirror
select cron.schedule('spend_rollup_hourly', '0 * * * *', $$
  update workspace w set spend_used_usd_monthly = coalesce(s.total, 0)
  from (
    select workspace_id, sum(actual_usd) total
      from spend_ledger
     where state='confirmed' and created_at >= date_trunc('month', now())
     group by workspace_id
  ) s
  where s.workspace_id = w.id;
$$);
-- monthly reset is implicit: the date_trunc('month', now()) window resets the sum on the 1st.
```

> `VERIFY current docs before coding` — Supabase **pg_cron** + **pgmq** semantics (Edge Function timeout ~150s
> for the dispatch/poll step; visibility-window semantics) at **supabase.com/docs/guides/cron** and
> **/guides/queues** (R7 ⚑R-INFRA1). Advisory-lock + `security definer` hardening per §2.2.

### 8.5 Cap alerting

Emit an ops signal at **80% / 100%** of either cap (§10): a `workspace` at 80% monthly warns the owner in-app;
at 100% new gen jobs are refused (edits/re-layouts/exports of *existing* assets still work — they cost ~$0).

---

## 9. Observability — cost / token / latency (`agent_run`, `generation_job`)

Every Claude agent call is an `agent_run`; every provider gen is a `generation_job`. Both carry
`cost_usd`, and `agent_run` additionally carries `input_tokens/output_tokens/latency_ms` (`docs/03`). This doc
adds the **rollup views + metrics + traces** so cost/latency are queryable and alertable — not just stored.

### 9.1 What each row must always capture (already in `docs/03` — verify present)

| Signal | `agent_run` | `generation_job` |
|---|---|---|
| Cost | `cost_usd` | `cost_usd` (0 on cache hit) |
| Tokens | `input_tokens`, `output_tokens` | n/a |
| Latency | `latency_ms` | `queued_at`→`started_at`→`finished_at` (derive queue + run latency) |
| Model | `model` (`claude-sonnet-5`/`opus-4-8`/`haiku-4-5`) | `provider`, `model`, `model_version` |
| Lineage | `brief_id`, `variant_id`, `agent`, `iterate_round`, `parent_run_id` | `variant_id`, `brief_id`, `job_kind`, `cache_hit`, `attempts`, `provider_task_id` |
| Outcome | `status` (incl. `refused`, `budget_exceeded`) | `status`, `error`, `moderation` |

### 9.2 Rollup views (build these — the console + alerts read them)

```sql
-- supabase/migrations/0012_observability_views.sql

-- cost per brief (agents + generation), the number a user sees on the board
create or replace view v_brief_cost as
select b.id as brief_id, b.workspace_id,
       coalesce(a.agent_cost,0)  as agent_cost_usd,
       coalesce(g.gen_cost,0)    as gen_cost_usd,
       coalesce(a.agent_cost,0)+coalesce(g.gen_cost,0) as total_cost_usd,
       coalesce(a.in_tok,0) as input_tokens, coalesce(a.out_tok,0) as output_tokens
from brief b
left join (select brief_id, sum(cost_usd) agent_cost,
                  sum(input_tokens) in_tok, sum(output_tokens) out_tok
             from agent_run group by brief_id) a on a.brief_id = b.id
left join (select brief_id, sum(cost_usd) gen_cost
             from generation_job group by brief_id) g on g.brief_id = b.id;

-- per-workspace daily spend + model mix (ops dashboard)
create or replace view v_workspace_spend_daily as
select workspace_id, date_trunc('day', created_at) as day,
       sum(cost_usd) as cost_usd
from (
  select workspace_id, created_at, cost_usd from agent_run
  union all
  select workspace_id, queued_at as created_at, cost_usd from generation_job
) x group by workspace_id, date_trunc('day', created_at);

-- latency percentiles per agent + per job_kind (perf regressions)
create or replace view v_agent_latency as
select agent, model, count(*) n,
       percentile_cont(0.5)  within group (order by latency_ms) p50_ms,
       percentile_cont(0.95) within group (order by latency_ms) p95_ms
from agent_run where latency_ms is not null group by agent, model;

create or replace view v_gen_latency as
select job_kind, provider, model, count(*) n,
       percentile_cont(0.5)  within group (order by extract(epoch from finished_at - started_at)*1000) p50_ms,
       percentile_cont(0.95) within group (order by extract(epoch from finished_at - started_at)*1000) p95_ms
from generation_job where finished_at is not null and started_at is not null
group by job_kind, provider, model;

-- cache effectiveness (savings)
create or replace view v_cache_effectiveness as
select workspace_id,
       count(*) filter (where cache_hit) as hits,
       count(*)                          as total,
       round(100.0*count(*) filter (where cache_hit)/greatest(count(*),1),1) as hit_pct
from generation_job group by workspace_id;
```

### 9.3 Metrics, tracing & log hygiene

- **Trace correlation:** stamp a `trace_id` (or reuse `brief_id`) across every `agent_run` + `generation_job`
  of one brief so a whole "brief → board" run is reconstructable end-to-end. `parent_run_id` already threads the
  agent pipeline (`docs/03`).
- **Structured logs:** every worker log line = JSON `{ trace_id, workspace_id, brief_id, entity, entity_id,
  event, cost_usd, latency_ms }`. **Never log secrets, full prompts with tenant-confidential content, or
  signed URLs.** Log prompt *hashes* + token counts, not prompt bodies, in prod.
- **Provider dashboards:** rely on provider-side spend dashboards (BFL credits, fal balance, Anthropic usage)
  as a **cross-check** against our `provider_pricing`-derived `cost_usd` — a > **10%** drift between our
  computed spend and the provider invoice means a stale `provider_pricing` row (alert, §10).
- **Metrics sink:** expose the views above to whatever dashboard the tenant uses; the minimum viable surface is
  an in-app **"cost & usage"** panel reading `v_brief_cost` + `v_workspace_spend_daily`.

---

## 10. Alerting & ops runbook (the on-call surface)

| Alert | Condition | Severity | Action |
|---|---|---|---|
| **Workspace 80% cap** | `spend_used_usd_monthly ≥ 0.8 * spend_cap_usd_monthly` | warn | notify owner in-app |
| **Workspace 100% cap** | ≥ cap | high | refuse new gen jobs; owner must raise cap |
| **Brief cap hit** | brief committed ≥ `brief.spend_cap_usd` | info→warn | surface remaining budget; offer raise |
| **Sustained 429s** | one provider `rate_limit` > N/min | warn | governor should absorb; if not, lower `max_concurrent` |
| **Provider outage** | all ranked drivers for a `job_kind` failing | high | fallback exhausted → surface graceful error; page ops |
| **Cost drift** | our `cost_usd` sum vs provider invoice differ > 10% | high | a `provider_pricing` row is stale — update (data, not deploy) |
| **Model retired** | startup Models-API check finds a pinned model gone | high (fail-fast) | swap the config slug (R7 §7 model-drift resilience) |
| **RLS regression** | `get_advisors` (security) flags a table w/o RLS | **critical** | block deploy |
| **TRIBE on commercial path** | CI license gate hits TRIBE import with commercial flag | **critical (legal)** | block build (§11) |
| **Service-role leak** | secret-scan finds key in client bundle | **critical** | block build (§3.4) |

**Model-drift resilience (R7 §7):** model ids live in config, never hardcoded. A startup check hits the
Anthropic Models API and BFL/Gemini reachability and **fails fast** with a clear message if a pinned model was
retired (e.g. Gemini preview slug shutdown 2026-06-25; `gpt-image-1` deprecating 2026-10-23 — R1 §1).

---

## 11. License containment (highest-severity — legal, not technical)

**Commercial launch is gated on the sign-offs below.** Every third-party model/library/service that touches the
commercial path carries a licensing obligation; a single un-cleared gate blocks launch. These were previously
scattered across R7/CANON — they are **consolidated here as the one authoritative licensing-gate table** (per
CANON §12 L9). Each gate must be **signed off before commercial launch**; the mechanical containment (CI gate,
runtime stamp) below enforces the highest-severity one (TRIBE).

### 11.1 Commercial-licensing gate table (the single source — sign off ALL before launch)

| # | Component | License / tier | Obligation → what must be true at launch | Owner / gate |
|---|---|---|---|---|
| L-1 | **TRIBE v2** (`facebook/tribev2`) | **CC-BY-NC-4.0 (non-commercial)** | **R&D-only, double-gated** (`ENGAGEMENT_BACKEND=tribe_research` **AND** `RESEARCH_MODE`); **unreachable on the commercial path**. The shipped **v1 saliency + calibrator MUST use only TranSalNet (MIT) + real `Result` rows — ZERO TRIBE input**. Any **TRIBE-informed coefficient is hard-blocked, legal-review-gated, post-v1**. Grid-salience **weights re-derived by the calibration loop** (clean-room), **never** the reference repo's literal constants. | Legal + Eng — **CI gate + runtime stamp (§11.2), fail-closed** |
| L-2 | **ElevenLabs Music** | ElevenLabs commercial terms | Confirm **ElevenLabs Music** commercial-use terms cover generated music beds shipped in tenant ads (distinct from TTS/VO terms). | Legal sign-off before enabling music-bed generation |
| L-3 | **Bria** | Bria commercial / indemnity | If Bria is used (source-imagery / background), confirm **commercial license + indemnity** covers tenant ad output. | Legal sign-off before enabling Bria on any path |
| L-4 | **Remotion** | **Remotion Company License (4+ seats)** | Video assembly (`packages/render` Remotion project) requires a **Remotion Company License** once the org is at **4+ seats**. | Purchase/confirm before video ships commercially |
| L-5 | **BFL / FLUX.2** | BFL commercial output-license tier + **EU host** | Use the **BFL commercial output-license tier**; for the DE/EU tenant route image gen through the **EU host `api.eu.bfl.ai`** (GDPR data residency — §4.3). | Legal + Eng before commercial image gen |

> These five gates are **launch-blocking**. Track them to explicit sign-off; do not ship commercially with any
> row unresolved. R7/CANON references that mention these obligations individually **repoint here** — this table
> is authoritative (CANON §12 L9).

### 11.2 TRIBE containment (mechanical enforcement of gate L-1)

TRIBE v2 (`facebook/tribev2`) is **CC-BY-NC-4.0 (non-commercial)** (CANON §9; R7 §1.4). It must be
**unreachable on the commercial path.** The production predictor is the commercially-clean **`saliency`**
backend built on **TranSalNet (MIT)**; TRIBE is R&D behind **both** `ENGAGEMENT_BACKEND=tribe_research` **and**
`RESEARCH_MODE` (CANON §10). The shipped **v1 calibrator consumes only TranSalNet output + real `Result` rows —
ZERO TRIBE input**; any TRIBE-informed coefficient is a **hard-blocked, legal-review-gated, post-v1** item.

- **Clean-room weights:** the grid-salience **weights are re-derived by the calibration loop** against the
  tenant's real `Result` rows — **never** shipped as the reference repo's literal constants.
- **CI gate (build-time, fail-closed):** when the commercial build flag is set, a check ensures no code path
  imports/loads TRIBE weights or the `facebook/tribev2` model. Any hit **fails the build** (§10 critical).

```bash
# scripts/ci/license-guard.sh  (exit 1 on any hit when COMMERCIAL_BUILD=1)
set -euo pipefail
if [ "${COMMERCIAL_BUILD:-0}" = "1" ]; then
  if grep -RInE 'facebook/tribev2|tribev2|tribe_research' services/engine apps/web/src \
       | grep -vE 'RESEARCH_MODE|flag|guard|comment'; then
    echo "TRIBE (CC-BY-NC) reachable on COMMERCIAL build — blocked (docs/12 §11)"; exit 1; fi
fi
```

- **Runtime stamp:** every engagement run writes `audit_log.commercial_use` (`docs/03`): `saliency` runs stamp
  `true`; any `tribe_research` run stamps **`false`** with `action='tribe.research_run'`. This makes "was any
  non-commercial artifact ever used commercially?" answerable forever.
- **Always report scores as bands + confidence**, calibrated against the tenant's real `result` rows (CANON §9)
  — a property of the clean path (TranSalNet + real Results), independent of TRIBE.

> `VERIFY current docs before coding` — re-confirm `facebook/tribev2` is still CC-BY-NC-4.0 (HF model card) and
> no commercially-licensed successor exists (R7 §1.4); confirm the ElevenLabs Music, Bria, Remotion Company
> License (4+ seats), and BFL commercial-tier + EU-host terms above. The `saliency`/TranSalNet path does not
> depend on TRIBE.

---

## 12. Cost model — estimated $/ad by path

**All figures are DERIVED from `provider_pricing` seed rows in `docs/04 §9.2` (which are themselves from R1/R2)
and the model-tiering pricing in R7 ⚑R-LLM1. VERIFY every number against live pricing before coding — pricing
is data (`provider_pricing`), not code.** Ranges reflect Sonnet-5-default vs Opus-4.8-escalation (agents) and
model choice (imagery/video).

### 12.1 Agent-loop cost (Claude — R7 ⚑R-LLM1)

Pricing (VERIFY): **Sonnet 5** `$3/$15` per MTok (intro `$2/$10` through 2026-08-31); **Opus 4.8** `$5/$25`;
**Haiku 4.5** `$1/$5`. Prompt caching (90% off) + Batch API (50% off) apply to the fan-out steps.

| Agent (per brief) | Model (default) | Est. in/out tokens | Est. cost |
|---|---|---|---|
| IntakeAgent | Haiku 4.5 | 1k / 0.4k | ~$0.003 |
| Strategist | Sonnet 5 | 3k / 1.5k | ~$0.03 |
| Copywriter (6 variants, Batch) | Sonnet 5 (Batch 50%) | 4k / 3k | ~$0.03 |
| ArtDirector | **Opus 4.8** (escalation) | 3k / 1.5k | ~$0.05 |
| CompositorPlanner | Sonnet 5 | 4k / 2k | ~$0.04 |
| BrandGuardian | Sonnet 5 (Opus on hard calls) | 2k / 0.5k | ~$0.015 |
| Critic + EngagementAnalyst | Opus 4.8 / Sonnet 5 | 3k / 1.5k | ~$0.04 |
| **Agent-loop subtotal (per brief, board of ~6)** | | | **~$0.20–0.35** |

Per-variant editing (EditorAgent, LayerPatch) ≈ **$0.005–0.02** each; localization (LocalizationAgent, DE⇄EN)
≈ **$0.02** per language — both near-free vs generation.

### 12.2 Generation cost by asset (VERIFY — from `docs/04 §9.2`)

| Asset | Provider/model | Unit basis | Est. cost |
|---|---|---|---|
| Static hero, 1:1 (1200×1200 ≈ 1.44 MP) | FLUX.2 [pro] (MP-metered) | `0.03 + max(0,ceil(1.44)-1)*0.03` = 2 MP | **~$0.06** |
| Static hero, cost-optimized | Seedream 4.5 | per-image | **~$0.04** |
| Draft thumbnail | Luma Photon Flash | per-image | **~$0.002** |
| Brand-consistent edit / product-in-scene | Gemini 3 Pro Image (1K/2K) | per-image | **~$0.13** |
| In-ecosystem edit | FLUX.1 Kontext [pro] | per-image | **~$0.04** |
| Carousel slide bg (×6, seed+Kontext continuity) | FLUX.2 [pro] | per-image | **~$0.06 × 6 ≈ $0.36** |
| Video clip, 15 s i2v | Kling v2.5-turbo pro (~$0.14/s) | per-second | **~$2.10** |
| Video VO, ~60 s DE (~450 chars) | ElevenLabs multilingual_v2 ($0.10/1k) | per-char | **~$0.05** |
| Video SFX/music bed (optional) | ElevenLabs sound/music | per-gen | **~$0.05–0.15** |
| Render (static/carousel PDF) | polotno-node (self-host) | compute | **~$0.00** |
| Render (video, Remotion local/Lambda) | Remotion | compute | **~$0.02** |

### 12.3 End-to-end $/ad by path (headline table)

| Path | Agents | Generation | Render | **All-in (VERIFY)** |
|---|---|---|---|---|
| **Static single-image, 1 variant** (Sonnet default, FLUX.2 [pro] 1:1) | ~$0.05* | ~$0.06 | ~$0 | **~$0.11–0.18** |
| **Static board, 6 variants** | ~$0.20–0.35 | 6×~$0.04–0.06 = ~$0.24–0.36 | ~$0 | **~$0.55–0.95** |
| **Static board, cost-optimized** (Seedream/klein, all Sonnet) | ~$0.20 | 6×~$0.02–0.04 | ~$0 | **~$0.35–0.55** |
| **Carousel doc-ad, 6 slides** | ~$0.15–0.25 | ~$0.36 (6 slide bgs) | ~$0 (PDF) | **~$0.45–0.80** |
| **Video ad, 15 s** (Kling i2v + VO + Remotion) | ~$0.20 | ~$2.10 clip + ~$0.05 VO (+opt $0.10 SFX) | ~$0.02 | **~$3.00–5.50** |
| **Edit / re-layout / locale swap** (any of the above) | ~$0.005–0.02 | **$0** (cached/re-layout) | ~$0 | **~$0.01–0.05** |

\* per-variant amortized share of the shared agent loop.

### 12.4 Cost levers (all already in the architecture — ranked by impact)

| Lever | Mechanism | Savings |
|---|---|---|
| **Caching** (CANON §4) | identical `(provider,model,version,prompt,seed,params)` ⇒ $0 | up to 100% on repeats |
| **Edits are LayerPatch, re-layout is free** (CANON §2) | copy/ratio/locale changes cost **$0** image credits | ~all iteration cost |
| **Model tiering** (R7 ⚑R-LLM1) | Sonnet-5 default, Opus only on escalation | ~40% of LLM cost |
| **Batch API** (50% off) for 6-variant fan-out | Copywriter/variant gen | ~50% of that step |
| **Prompt caching** (90% off) | shared brand/system context across agents | large on repeated context |
| **Down-tier under cap pressure** (`docs/04 §8`) | FLUX.2 [pro]→Seedream/klein; Opus→Sonnet | path-dependent |
| **Bounded auto-iterate ≤2** (CANON §7) | caps worst-case spend per brief | bounds tail |
| **Kling failed tasks are free** (R2 §1.4) | cheap video retries | retry cost → $0 |

### 12.5 Cap sizing sanity-check

With the ⚑R-COST1 default of **$5/brief**: a static 6-variant board (~$0.55–0.95) leaves ample room for
auto-iteration; a single 15 s video (~$3–5.50) may approach/exceed it → a video brief should **raise its own
`brief.spend_cap_usd`** explicitly (surfaced in the UI before generation), consistent with "never surprise your
card" (R7 §4). The **$500/workspace/month** default (`docs/03`) covers ~500–900 static boards or ~90–160 videos
per month — tenant-tunable.

---

## 13. Consolidated "VERIFY before coding" checklist (this doc)

1. **Supabase RLS + `SECURITY DEFINER`/`search_path` hardening** + `auth.uid()` semantics; run `get_advisors`
   (security lint) after every migration — supabase.com/docs/guides/database/postgres/row-level-security. (§2)
2. **Supabase Storage access-control** (`storage.foldername`, private buckets, signed-URL TTL) — or the R2
   presigned-URL-via-membership-check equivalent. (§2.3/§2.4)
3. **Provider webhook signing schemes** (BFL `webhook_secret`/HMAC; fal `?fal_webhook=`; Kling `callback_url`)
   — verify each before trusting a payload; else re-poll authoritatively. (§3.3)
4. **Per-provider rate limits** — BFL 24 concurrent / kontext-max 6; Anthropic org RPM/TPM + Batch API; fal
   prepaid-credit throttling; ElevenLabs concurrency + 3k-char chunking; Kling task caps. Store in
   `provider_rate_limit`. (§6)
5. **Supabase pgmq + pg_cron** semantics (visibility window, Edge Function ~150s timeout) for
   dispatch/poll/rollup (R7 ⚑R-INFRA1). (§8.4)
6. **All prices** in §12 / `provider_pricing` (`docs/04 §9.2`) — FLUX.2 MP metering, Gemini/Ideogram/Recraft
   tiers, Kling per-second, ElevenLabs per-char, Claude Sonnet-5/Opus-4.8/Haiku-4.5 (+ Sonnet-5 intro window
   ending 2026-08-31). Pricing is the most drift-prone field. (§12)
7. **`facebook/tribev2` still CC-BY-NC-4.0** (HF model card) — confirms the commercial-path exclusion. (§11)
8. **EU data-residency** terms for BFL (`api.eu.bfl.ai`), fal, Gemini, Kling, ElevenLabs for the DE tenant. (§4.3)
9. **LinkedIn results API** (if used for `result` ingest) returns **aggregate** metrics only — strip any
   member-level fields before persisting (§4.2).

---

## 14. Assumptions flagged (cross-document)

1. **`brief.spend_cap_usd` column (⚑R-COST1).** CANON §4 mandates a per-brief cap; `docs/03` has a per-workspace
   cap column but no per-brief column, and `docs/04 §9.3` reads the per-brief cap from `caps` config. I assume a
   **`brief.spend_cap_usd numeric(12,2) not null default 5.00`** column is added (mirrors
   `workspace.spend_cap_usd_monthly`). If the factory keeps the per-brief cap as global config instead, replace
   the `select … from brief` in `reserve_spend` (§8.2) with the config value; nothing else changes.
2. **New env vars `ENGINE_SHARED_SECRET` + `WEBHOOK_SIGNING_SECRET` (⚑R-ENV2).** Required for web↔engine auth and
   webhook verification but absent from CANON §10. I assume `docs/11` adds them to the canonical env block
   (alongside R7's `POLOTNO_API_KEY` ⚑R-ENV1). If the build uses a different mechanism (e.g. mTLS for the
   engine), the secret rows in §3.1 map to that mechanism.
3. **New migrations `0008`–`0012`.** I assume the migration numbering in `docs/03` ends at `0007_triggers.sql`,
   so this doc's tables/views are `0008_storage_rls` … `0012_observability_views`. If `docs/03` already claims
   higher numbers, shift these accordingly — the file *contents* are what matter, not the ordinal.
4. **`services/engine` is privately networked.** I assume the engine is not publicly routable (IP allowlist /
   private network) and additionally shared-secret-gated. If it must be public, the bearer check in §3.2 is the
   minimum and should be paired with an allowlist.
5. **Per-tenant caching (no cross-tenant asset dedup).** I assume `asset.cache_key`'s per-workspace uniqueness
   (`docs/03`) is intentional isolation-over-dedup; the cost model prices generation per tenant accordingly.
