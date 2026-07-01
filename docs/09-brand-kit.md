# 09 — Brand Kit: the versioned on-brand contract

> **Read CANON.md first.** This document expands the canonical `BrandKit` object (CANON §5), the mechanical
> gate `BrandGuardian` runs against it (CANON §7), the seed Brutal AI kit (CANON §0/§1), and the env vars
> (CANON §10). It is the single source of truth for **how "on-brand" is made deterministic, versioned, and
> auditable**. Every render, every agent, and every `Variant` lineage record pins to a specific
> `brand_kit.version` (CANON §5). "On-brand" is never a vibe — it is a diff against this object.
>
> **Canonical names used verbatim** (never rename): `Workspace`, `BrandKit`, `Campaign`, `Brief`,
> `AdDocument`, `Variant`, `Slide`, `Layer`, `Asset`, `AgentRun`, `AuditLog`; agents `Strategist`,
> `Copywriter`, `ArtDirector`, `CarouselArchitect`, `CompositorPlanner`, `BrandGuardian`, `Critic`,
> `EngagementAnalyst`, `EditorAgent`, `LocalizationAgent` (+ `IntakeAgent`, added in R7 ⚑R-A1 and the
> data-model doc's `agent_name` enum). Env: `ANTHROPIC_API_KEY`, `RECRAFT_API_KEY`, `SUPABASE_URL`,
> `SUPABASE_SERVICE_ROLE_KEY`, `APP_BASE_URL`, etc. (CANON §10).
>
> **This doc is authoritative for the `brand_kit` table and `BrandKitData` JSONB shape. It MUST stay
> byte-identical with `docs/03-data-model.md §3` (DDL) and `§7` (shape + seed).** Where this doc adds fields
> beyond what `03-data-model.md §7.1` shows, those additions are marked **`[+extends 03 §7.1]`**. Per
> **CANON §12 L7**, this doc's superset `BrandKitData` (the `[+extends]` fields: `iconography`,
> `messaging.approvedClaims`, `proofPoints` with per-locale `spoken`, `requiredDisclaimers`,
> `disclosures.aiContent`, plus governance metadata) **is the single authoritative shape and is back-ported
> into `03-data-model.md §7.1` + the zod in §12 in this same build** — this is a settled reconciliation, not a
> deferred task. `BrandGuardian` and both zod modules validate the identical shape. Every external API /
> drift-prone fact carries a **`VERIFY current docs before coding`** flag. Every assumption is **⚑ flagged**.

---

## 0. Why this object exists (the load-bearing rationale)

CANON §2's core lesson: baked-text PNGs were "hard to edit" AND "off-brand." Splitting imagery (AI) from
legible/on-brand elements (composited vector/text layers) dissolves *editability*. The **`BrandKit` dissolves
*brand drift***: instead of re-prompting until an image "feels Brutal," `BrandGuardian` runs a **mechanical
check** — is every color in `palette.allowed`? is every font in `typography`? does the copy contain a
`voice.bannedTerms` entry? is the mandatory `legal` layer present for this vertical? — and hard-gates the
`Variant` before it reaches the board (CANON §7; R7 §1.5).

Three properties are non-negotiable:

| Property | What it buys | Mechanism |
|---|---|---|
| **Versioned & immutable** | "Was this ad built on brand v3 or v4?" answerable forever; reproducible renders | New version = new row; old rows never mutate (§4). Every `Variant.brand_kit_version` pins one (CANON §5). |
| **Mechanically gatable** | "On-brand" is deterministic, not a judgment call | `BrandGuardian` runs `checkVariant()` against the pinned version (§6). |
| **Tenant data, not product logic** | Brutal is the seed tenant; every other workspace gets its own kit | Seed is one row in `supabase/seed.sql` (§9). No hex/font is hardcoded in app logic (CANON §1). |

**⚑ ASSUMPTION A-09-1 (cross-doc):** The `brand_kit` table DDL and the `BrandKitData` JSONB base shape are
**owned by `docs/03-data-model.md`** (it is the migrations/zod home). This doc **restates them verbatim** and
**extends** the JSONB with the additional sub-objects the CANON brief for this document demands
(`imagery.style` detail, `iconography`, verbal `approvedClaims`/`proofPoints`/`valueProps`/`productNames`,
`readingLevel`, `requiredDisclaimers` roles, richer `localization`, plus governance metadata). All `[+extends
03 §7.1]` additions are **backward-compatible** (all optional) so the existing seed row and zod schema keep
validating. **The build MUST reconcile `03 §7.1`, the zod `BrandKitData` schema, and this doc's §3 in one
pass** — this doc's §3 is the superset and, per **CANON §12 L7**, is the authoritative shape back-ported into
`03 §7.1` + the §12 zod in this same build (a settled reconciliation — do not defer it).

---

## 1. Object identity, lifecycle & ownership

```
Workspace ──1:N──► BrandKit (versioned; exactly one is_active per workspace)
                      │
                      └── data: BrandKitData (JSONB) ── §3
```

- A `BrandKit` **row = one immutable version** of a workspace's brand contract.
- `version` is `1,2,3…` monotonic **per workspace** (`unique (workspace_id, version)`).
- Exactly **one** row per workspace has `is_active = true` (`brand_kit_one_active_per_ws` partial unique idx).
- A `Brief` may pin a specific `brand_kit_id` (`brief.brand_kit_id`); if null, resolution uses the active
  version at brief-creation time (§5.2).
- Every `Variant` stores `brand_kit_version` (integer) in lineage — the **version number**, resolved to the
  row via `(workspace_id, version)`. **⚑ ASSUMPTION A-09-2:** lineage pins the *version integer*, not the
  `brand_kit_id` UUID, matching `03-data-model.md §4` (`variant.brand_kit_version integer not null`). Both
  uniquely identify the row given `workspace_id`; the integer is the canonical lineage key.

---

## 2. DDL — `brand_kit` (verbatim from `03-data-model.md §3`; do not diverge)

`supabase/migrations/0003_brand_campaign_brief.sql` (this table is created there; restated here for
self-containment).

```sql
-- brand_kit (VERSIONED — CANON §5). One workspace has many versions; exactly one is_active per workspace.
create table brand_kit (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references workspace(id) on delete cascade,
  version         integer not null,                 -- 1,2,3… monotonically per workspace
  name            text not null default 'Brand Kit',
  is_active       boolean not null default false,   -- exactly one true per workspace (partial unique idx)
  data            jsonb not null,                   -- BrandKitData shape — §3
  created_by      uuid references auth.users(id),
  created_by_kind actor_kind not null default 'human',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (workspace_id, version),
  constraint brand_kit_data_is_object check (jsonb_typeof(data) = 'object')
);
create unique index brand_kit_one_active_per_ws on brand_kit (workspace_id) where (is_active is true);
create index brand_kit_ws_version_idx on brand_kit (workspace_id, version desc);
```

> **`VERIFY current docs before coding`** — `actor_kind` and the `auth.users` FK are defined in
> `0001_enums.sql` / `0002_tenancy.sql` (`03-data-model.md §0–2`). Confirm those exist before this migration.

### 2.1 Governance sidecar tables `[+extends 03]`

Versioning bookkeeping and drift signals do NOT belong in the immutable `data` blob. Add two tables in the
same migration file. **⚑ These are new relative to `03-data-model.md` and MUST be back-ported into it.**

```sql
-- brand_kit_diff — human-readable + machine changelog between two versions (populated on publish, §4.2)
create table brand_kit_diff (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references workspace(id) on delete cascade,
  from_version     integer,                          -- null for v1 (creation)
  to_version       integer not null,
  summary          text not null,                    -- LLM- or diff-generated, one paragraph
  changes          jsonb not null default '[]'::jsonb, -- BrandKitChange[] — §4.2
  created_by       uuid references auth.users(id),
  created_by_kind  actor_kind not null default 'human',
  created_at       timestamptz not null default now(),
  unique (workspace_id, to_version)
);

-- brand_drift_event — a rendered/published Variant flagged as off-contract post-hoc (§8)
create table brand_drift_event (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspace(id) on delete cascade,
  variant_id        uuid not null references variant(id) on delete cascade,
  brand_kit_version integer not null,                -- version the Variant was checked against
  kind              text not null,                   -- BrandGuardianViolation.code — §6.3
  severity          text not null default 'error',   -- 'error' | 'warn'
  detail            jsonb not null default '{}'::jsonb,
  detected_at       timestamptz not null default now(),
  resolved_at       timestamptz,                     -- null while open
  resolution        text                             -- 'refixed' | 'kit_updated' | 'waived' | null
);
create index brand_drift_open_idx on brand_drift_event (workspace_id) where resolved_at is null;
```

RLS for both mirrors every tenant table (`03-data-model.md §10`): `workspace_id` must match a
`workspace_member` row for `auth.uid()`. Service-role bypasses RLS for server jobs.

---

## 3. `BrandKitData` — the full JSONB shape (superset of `03 §7.1`)

Order of keys is not significant. `[+extends 03 §7.1]` marks fields beyond what `03-data-model.md §7.1`
currently shows; all are **optional** so existing rows/zod stay valid. Types are given as inline comments;
the authoritative zod schema is §7.

```jsonc
{
  // ── SCHEMA / META ─────────────────────────────────────────────────────────
  "schemaVersion": 1,                    // [+extends] BrandKitData schema version (bump = migration)
  "kind": "brutal",                      // [+extends] machine key for the tenant/brand family; free string

  // ── VISUAL: PALETTE ───────────────────────────────────────────────────────
  "palette": {
    "background": "#0a0a0a",
    "surface":    "#141414",
    "text":       "#f5f5f0",
    "muted":      "#9a9a92",
    "accents":    { "gold": "#cba65e", "lime": "#b6e64a", "acidLime": "#c9ff2e" }, // CANON §1
    "allowed":    ["#0a0a0a","#141414","#f5f5f0","#9a9a92","#cba65e","#b6e64a","#c9ff2e"], // whitelist
    "sets":       { "pe": ["#cba65e","#b6e64a"] },     // named palette sets (PE angle — CANON §1)
    // [+extends] semantic ROLES so agents/compositor pick colors by intent, not by hex:
    "roles": {
      "pageBg":       "background",   // key OR hex; keys resolve against this object's leaves
      "cardBg":       "surface",
      "bodyText":     "text",
      "mutedText":    "muted",
      "primaryAccent":"accents.gold", // dotted path resolves within palette
      "ctaFill":      "accents.acidLime",
      "ctaText":      "background",
      "legalText":    "muted",
      "hairline":     "muted"
    },
    "toleranceDeltaE": 3.0             // [+extends] max CIEDE2000 distance to count as "an allowed color"
  },

  // ── VISUAL: TYPOGRAPHY ────────────────────────────────────────────────────
  "typography": {
    "display": { "family": "Playfair Display", "weights": [400,700,900], "source": "google",
                 "fallback": ["Georgia","serif"] },                                // [+extends] fallback
    "body":    { "family": "Inter",            "weights": [400,500,600,700], "source": "google",
                 "fallback": ["system-ui","Helvetica","Arial","sans-serif"] },
    // [+extends] optional self-hosted font assets (uploaded to Storage); when present, render uses these:
    "fontAssets": [
      { "family": "Playfair Display", "weight": 900, "style": "normal", "assetId": null, "format": "woff2" }
    ],
    "scale":   { "headline": 72, "subhead": 40, "body": 28, "legal": 18, "cta": 32 }, // px @ 1200-base
    // [+extends] role → {family, weight, tracking, case} so Copywriter/Compositor never guess:
    "roles": {
      "headline": { "use": "display", "weight": 900, "tracking": -0.01, "case": "none" },
      "subhead":  { "use": "display", "weight": 700, "tracking": -0.005, "case": "none" },
      "body":     { "use": "body",    "weight": 400, "tracking": 0,     "case": "none" },
      "cta":      { "use": "body",    "weight": 600, "tracking": 0.02,  "case": "none" },
      "legal":    { "use": "body",    "weight": 400, "tracking": 0,     "case": "none" },
      "kicker":   { "use": "body",    "weight": 600, "tracking": 0.08,  "case": "upper" }
    }
  },

  // ── VISUAL: LOGOS ─────────────────────────────────────────────────────────
  "logos": [
    { "id": "wordmark", "lockup": "wordmark", "assetId": "as_logo_wordmark", "minWidthPx": 160,
      "onDark": true, "onLight": false,                                            // [+extends] contrast use
      "clearSpaceRatio": 0.5,                                                       // [+extends] × logo height
      "tintable": false },                                                         // [+extends] recolor allowed?
    { "id": "symbol",   "lockup": "symbol",   "assetId": "as_logo_symbol",   "minWidthPx": 48,
      "onDark": true, "onLight": true, "clearSpaceRatio": 0.5, "tintable": true },
    { "id": "combined", "lockup": "combined", "assetId": null,               "minWidthPx": 180,
      "onDark": true, "onLight": false, "clearSpaceRatio": 0.5, "tintable": false } // [+extends] 3rd lockup
  ],

  // ── VISUAL: IMAGERY STYLE ─────────────────────────────────────────────────
  "imagery": {
    "mood": "muted-first, documentary, dark palette, high-contrast subject",       // CANON §1
    "negativePromptDefaults": "no text, no watermark, no logo, no captions, no lower-thirds", // CANON §2
    "aspectDefaults": { "single_image": "1:1", "carousel": "1:1", "video": "1:1" }, // CANON §8 base ratios
    // [+extends] structured style the ArtDirector prepends to every imagery-only prompt:
    "style": {
      "descriptors": ["editorial","documentary","sober","cinematic","desaturated","high-contrast"],
      "lighting": "low-key, single hard source, deep shadows",
      "grade": "cool shadows, warm gold highlights, low saturation",
      "composition": "negative space for text overlay; subject off-center; eye-level",
      "subjects": ["law-firm interiors","documents & contracts","hands at work","modern German offices"],
      "avoid": ["stock-photo smiles","neon gradients","3D-render clichés","emoji","clip-art","AI sheen"],
      "promptPrefix": "Editorial documentary photograph, sober and muted, dark palette, cinematic low-key lighting,",
      "referenceAssetIds": []                        // brand reference images for ref-conditioned models (R1)
    }
  },

  // ── VISUAL: ICONOGRAPHY ───────────────────────────────────────────────────
  "iconography": {                                                                  // [+extends] whole block
    "style": "line",                     // 'line' | 'solid' | 'duotone'
    "strokeWidth": 1.5,                  // for line icons, at 24px grid
    "cornerStyle": "sharp",              // 'sharp' | 'rounded'
    "gridPx": 24,
    "color": "muted",                    // palette role/key/hex
    "source": "lucide",                  // icon set the editor exposes; 'lucide' ships with shadcn/ui
    "generatedProvider": "recraft",      // vector-icon generation uses Recraft V3 vector (R7; RECRAFT_API_KEY)
    "allowedIcons": null                 // null = whole set allowed; or an array of icon names to restrict
  },

  // ── VERBAL: VOICE ─────────────────────────────────────────────────────────
  "voice": {
    "register": "sober, editorial, documentary — NOT hype AI",                     // CANON §1
    "person": "third",                                                             // 'first'|'second'|'third'
    "readingLevel": { "targetGrade": 9, "maxGrade": 11, "metric": "flesch_kincaid" }, // [+extends]
    "bannedTerms": ["revolutionary","game-changer","10x","AI-powered magic","disrupt","unleash","supercharge"],
    "bannedPatterns": [                                                             // [+extends] regex, case-insens
      "\\bworld[- ]?class\\b", "\\bnext[- ]?gen(eration)?\\b", "!{2,}", "🚀|✨|🔥"
    ],
    "preferSpecificityOverCleverness": true,                                        // CANON §7 Copywriter
    "punctuation": { "exclamationMax": 0, "emojiAllowed": false, "oxfordComma": true }, // [+extends]
    "tone": {                                                                       // [+extends] axes 0..1
      "formality": 0.75, "warmth": 0.35, "urgency": 0.25, "playfulness": 0.05, "confidence": 0.8
    },
    "doExamples": [                                                                 // [+extends] few-shot anchors
      "1.200 Kanzleien entwerfen Verträge 40 % schneller.",
      "Legal AI that drafts German contracts in seconds — reviewed by your team."
    ],
    "dontExamples": [
      "The revolutionary AI that will 10x your firm! 🚀",
      "Unleash game-changing productivity with our disruptive platform."
    ]
  },

  // ── VERBAL: MESSAGING (product names, claims, proof, value props) ─────────
  "messaging": {                                                                   // [+extends] whole block
    "productNames": [
      { "canonical": "Brutal AI", "aliases": ["Brutal","brutal.ai"], "casing": "as-written",
        "neverTranslate": true }                     // product name identical in DE & EN
    ],
    "valueProps": [
      { "id": "vp_speed",   "de": "Verträge in Sekunden statt Stunden.",
                            "en": "Contracts in seconds, not hours." },
      { "id": "vp_trust",   "de": "Von Ihrem Team geprüft — nie blind übernommen.",
                            "en": "Reviewed by your team — never taken on blind faith." },
      { "id": "vp_german",  "de": "Für deutschsprachige Kanzleien gebaut.",
                            "en": "Built for German-speaking law firms." }
    ],
    "approvedClaims": [                              // claims Copywriter MAY use verbatim; BrandGuardian gates
      { "id": "cl_firms", "de": "Über 1.200 Kanzleien nutzen Brutal AI.",
                          "en": "Over 1,200 firms use Brutal AI.",
        "proofId": "pf_firms", "requiresProof": true, "verticals": ["legal_ai_de"] },
      { "id": "cl_faster","de": "40 % schnelleres Entwerfen.",
                          "en": "40% faster drafting.",
        "proofId": "pf_faster", "requiresProof": true, "verticals": ["legal_ai_de"] }
    ],
    "proofPoints": [                                 // evidence backing claims (lineage for trust)
      { "id": "pf_firms",  "stat": "1.200", "unit": "firms", "asOf": "2026-06",
        "source": "internal-metrics", "spoken": { "de": "eintausendzweihundert", "en": "one thousand two hundred" } },
      { "id": "pf_faster", "stat": "40", "unit": "%", "asOf": "2026-Q2",
        "source": "customer-study-2026", "spoken": { "de": "vierzig Prozent", "en": "forty percent" } }
    ],
    "bannedClaims": [                               // claims that are legally/ethically off-limits
      { "de": "garantierter Prozesserfolg", "en": "guaranteed case success" },
      { "de": "ersetzt Ihren Anwalt", "en": "replaces your lawyer" }
    ]
  },

  // ── VERBAL: DISCLAIMERS (required legal, per vertical) ────────────────────
  "disclaimers": {
    "legal_ai_de": {
      "de": "Rechtlicher Hinweis: Ergebnisse ersetzen keine anwaltliche Beratung.",
      "en": "Legal notice: outputs do not constitute legal advice.",
      "required": true,
      "appliesToVerticals": ["legal_ai_de"],        // [+extends] when this disclaimer is mandatory
      "placement": "footer", "minFontPx": 18, "removable": false // [+extends] render/lint rules
    },
    "pe": {
      "de": "Kapitalanlagen bergen Risiken.",
      "en": "Investments carry risk.",
      "required": false,
      "appliesToVerticals": ["pe"], "placement": "footer", "minFontPx": 18, "removable": false
    }
  },

  // ── DISCLOSURES (AI-content transparency, per vertical) ───────────────────
  "disclosures": {                                                                 // [+extends] whole block (CANON §12 L10)
    "aiContent": {                       // AI-generated-content disclosure (EU legal/PE relevance)
      "de": "Mit KI erstellt.",
      "en": "Created with AI.",
      "enabled": true,                   // include the disclosure by default when a Variant uses AI imagery
      "placement": "footer",             // 'footer' | 'header' | 'overlay' | 'caption'
      "minFontPx": 18,
      // BrandGuardian severity by vertical: 'error' verticals hard-gate absence; else it warns (default).
      // Empty/absent errorVerticals ⇒ warn everywhere (CANON §12 L10).
      "errorVerticals": ["legal_ai_de","pe"]
    }
  },

  // ── LOCALIZATION (DE / EN first-class) ────────────────────────────────────
  "localization": {
    "locales": ["de","en"],
    "default": "de",                                // CANON §1 seed default is German
    "transcreate": true,                            // NOT literal translation (CANON §7 LocalizationAgent)
    "ttsNumberSpelling": true,                      // e.g. "zwölfhundert" (R2 §4.4)
    // [+extends] per-locale rules the LocalizationAgent & renderer obey:
    "byLocale": {
      "de": { "quotes": "„…“", "decimalSep": ",", "thousandSep": ".", "formality": "Sie",
              "dateFormat": "DD.MM.YYYY", "numberSpellOut": true },
      "en": { "quotes": "“…”", "decimalSep": ".", "thousandSep": ",", "formality": "neutral",
              "dateFormat": "MMM D, YYYY", "numberSpellOut": true }
    },
    "glossary": [                                   // terms that must render identically per locale
      { "term": "Brutal AI", "de": "Brutal AI", "en": "Brutal AI", "neverTranslate": true },
      { "term": "Kanzlei",   "de": "Kanzlei",   "en": "law firm",  "neverTranslate": false }
    ]
  },

  // ── SAFE ZONES (LinkedIn crop/overlap defaults; CANON §8) ─────────────────
  "safeZoneDefaults": {
    "profileOverlap": { "top": 0.12, "left": 0.0 },  // fraction of canvas covered by the profile avatar/name
    "seeMoreFold": 0.85                              // fraction below which text risks the "see more" fold
  }
}
```

### 3.1 Field reference (roles, types, who consumes it)

| Path | Type | Required | Consumed by | Notes |
|---|---|---|---|---|
| `schemaVersion` | int | yes | migrations | bump ⇒ `BrandKitData` migration; distinct from `brand_kit.version` |
| `palette.allowed` | string[] hex | yes | `BrandGuardian` | whitelist; every layer fill/stroke must be within `toleranceDeltaE` of one |
| `palette.roles` | map | yes | `CompositorPlanner`, editor | agents pick by role → color, never raw hex |
| `palette.toleranceDeltaE` | number | no (def 3.0) | `BrandGuardian` | CIEDE2000 distance; 0 = exact match only |
| `typography.roles` | map | yes | `Copywriter`, `CompositorPlanner`, render | role → family/weight/tracking/case |
| `typography.fontAssets` | array | no | `packages/render` | self-hosted fonts; Google fonts fetched by `source` otherwise |
| `logos[].onDark/onLight` | bool | yes | `CompositorPlanner` | which logo variant on which background |
| `logos[].clearSpaceRatio` | number | yes | `BrandGuardian`, editor | min padding = ratio × logo height |
| `imagery.style.promptPrefix` | string | yes | `ArtDirector` | prepended to every imagery-only prompt (CANON §2) |
| `imagery.negativePromptDefaults` | string | yes | `ArtDirector` | ensures no baked text (CANON §2) |
| `iconography.*` | object | no | editor, `CompositorPlanner` | icon set + style; `recraft` for generated vector icons |
| `voice.bannedTerms` | string[] | yes | `BrandGuardian`, `Copywriter` | exact-token ban (case-insensitive, word-boundary) |
| `voice.bannedPatterns` | string[] regex | no | `BrandGuardian` | regex ban; compile once, cache |
| `voice.readingLevel` | object | no | `Copywriter`, `Critic` | Flesch-Kincaid target/max grade |
| `messaging.approvedClaims` | array | no | `Copywriter`, `BrandGuardian` | claims usable verbatim; `requiresProof` ties to a proof point |
| `messaging.proofPoints` | array | no | `Copywriter`, `LocalizationAgent` | evidence; `spoken` is TTS-safe per locale (R2 §4.4) |
| `messaging.bannedClaims` | array | no | `BrandGuardian` | hard-blocked claims (legal/ethical) |
| `disclaimers.<key>.required` | bool | yes | `BrandGuardian` | if true & vertical matches ⇒ mandatory `legal` layer |
| `disclaimers.<key>.appliesToVerticals` | string[] | no | `BrandGuardian` | scopes mandatory-ness to verticals |
| `disclosures.aiContent` | object | no | `BrandGuardian`, `CompositorPlanner` | AI-content disclosure text/placement; **warn by default, error when the Variant's vertical ∈ `errorVerticals`** (CANON §12 L10) |
| `disclosures.aiContent.errorVerticals` | string[] | no | `BrandGuardian` | verticals where absence hard-gates (e.g. `legal_ai_de`, `pe`); empty ⇒ warn-only everywhere |
| `localization.default` | locale | yes | `IntakeAgent`, `LocalizationAgent` | default target locale |
| `localization.byLocale.<l>` | object | no | render, `LocalizationAgent` | quotes/separators/formality per locale |
| `safeZoneDefaults` | object | yes | `CompositorPlanner`, exporter | seeds `LayerTree.safeZones` |

**Cross-reference — how `disclaimers` connects to the `legal` layer (from `03-data-model.md §6`):** a `legal`
layer carries `requiredBy: "brand_kit.disclaimers.legal_ai_de"` so `BrandGuardian` can verify presence by
provenance. `smart` layers (`03 §12.2` `SmartLayer`) bind to `messaging.proofPoints` via `binding` and use
`spoken`/`ttsTemplate` for TTS-safe numbers.

---

## 4. Governance, versioning & the publish flow

### 4.1 Immutability rules (enforced, not conventional)

1. **A published `BrandKit` row is immutable.** No `UPDATE` to `data` after creation, except the
   `is_active` boolean and `updated_at`. Enforce with a trigger:

```sql
-- 0007_triggers.sql — forbid mutating a published brand kit's data
create or replace function brand_kit_guard_immutable() returns trigger
language plpgsql as $$
begin
  if (old.data is distinct from new.data)
     or (old.version is distinct from new.version)
     or (old.workspace_id is distinct from new.workspace_id) then
    raise exception 'brand_kit % v% is immutable; publish a new version instead', old.id, old.version;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger brand_kit_immutable before update on brand_kit
  for each row execute function brand_kit_guard_immutable();
```

2. **Drafts live outside `brand_kit`.** In-progress edits are held in app state / a `draft` row keyed by
   `(workspace_id, base_version)` (see §4.3) and only *materialized* as a new `brand_kit` row on **Publish**.
   **⚑ ASSUMPTION A-09-3:** drafts are stored in a `brand_kit_draft` table (or Supabase Storage JSON) —
   **the build MAY choose either**; the contract is only that nothing enters `brand_kit` until Publish.

3. **Activation is atomic.** Publishing v(N+1) as active must, in one transaction: insert the new row with
   `is_active=true`, and set the prior active row's `is_active=false`. The partial unique index enforces the
   "exactly one active" invariant (a race that leaves two active rows fails the index).

```sql
-- server action (pseudo-SQL, run in a transaction with SUPABASE_SERVICE_ROLE_KEY)
begin;
  update brand_kit set is_active = false
   where workspace_id = $ws and is_active = true;
  insert into brand_kit (workspace_id, version, name, is_active, data, created_by, created_by_kind)
   values ($ws, (select coalesce(max(version),0)+1 from brand_kit where workspace_id=$ws),
           $name, true, $data::jsonb, $uid, 'human');
commit;
```

### 4.2 The version diff (`brand_kit_diff`)

On every Publish, compute a structured diff old→new and write a `brand_kit_diff` row. This powers the "what
changed between v3 and v4?" audit and lets `BrandGuardian` explain drift.

```ts
// packages/shared — BrandKitChange
type BrandKitChange = {
  path: string;                 // JSON pointer, e.g. "/palette/allowed/2"
  op: 'add' | 'remove' | 'replace';
  before?: unknown;
  after?: unknown;
  impact: 'breaking' | 'additive' | 'cosmetic'; // breaking = old Variants may now fail gate
};
```

- **`impact` classification (deterministic):** removing an `allowed` color / adding a `bannedTerm` /
  raising `required` on a disclaimer ⇒ **breaking** (previously-passing Variants may now be off-contract →
  seed §8 drift scan). Adding a color / claim / value prop ⇒ **additive**. Changing a `promptPrefix` or
  `tone` axis ⇒ **cosmetic**.
- The one-paragraph `summary` MAY be authored by an LLM call (`ANTHROPIC_API_KEY`; the `LocalizationAgent`
  or a lightweight prompt) but the `changes[]` array is a **pure structural diff** (deterministic; no LLM).

> **`VERIFY current docs before coding`** — use a maintained JSON-diff/JSON-Patch lib (RFC 6902 shape).
> Confirm the current API of whatever lib you pick (`fast-json-patch`, `microdiff`, etc.) before coding.

### 4.3 Version lifecycle state machine

```
(none) ──create/import──►  DRAFT ──validate(zod+BrandGuardian.validateKit)──► VALID_DRAFT
                                                                                  │ publish (atomic §4.1)
                                                                                  ▼
   ┌───────────────────────────────────────────────────────────►  ACTIVE (is_active=true)
   │                                                                    │ new version published
   │                                                                    ▼
   └──────────────────────────────────────────────────────────►  SUPERSEDED (is_active=false, immutable)
```

- You can **re-activate** a superseded version (roll back) — atomic flip of `is_active`; no data mutation.
- Every activation and publish writes an `AuditLog` row (`03-data-model.md` audit table) and, on publish,
  a `brand_kit_diff` row.

---

## 5. Resolution: which kit does a given render use?

### 5.1 Precedence (highest wins)

1. `brief.brand_kit_id` if non-null → that exact row (and thus its `version`).
2. Else the workspace's `is_active` row **at the time the `Brief` was created** (pin, don't float).
3. Else (no kit at all) → **guided bootstrap** (§10) seeded from the Brutal defaults for the seed tenant, or
   a minimal generated kit for a new tenant.

### 5.2 Pinning helper (server)

```ts
// apps/web — resolve + pin at brief creation; store on brief.brand_kit_id and copy version into every Variant
async function resolveBrandKit(sb: SupabaseClient, workspaceId: string, briefBrandKitId?: string) {
  if (briefBrandKitId) return getById(sb, briefBrandKitId);
  const { data } = await sb.from('brand_kit')
    .select('*').eq('workspace_id', workspaceId).eq('is_active', true).single();
  if (!data) throw new NeedsBootstrap(workspaceId);   // → §10 guided flow
  return data; // caller writes variant.brand_kit_version = data.version (lineage — CANON §5)
}
```

**Invariant:** once a `Variant` exists, its `brand_kit_version` never changes — even if the kit is later
updated. Re-brand = new Variants (or explicit re-gen), never silent mutation.

---

## 6. `BrandGuardian` — the mechanical gate

`BrandGuardian` (CANON §7) is a **hard gate**: a `Variant`/`Slide` that fails cannot reach the board; it
loops back to the author agent (`Copywriter`/`ArtDirector`/`CompositorPlanner`), bounded to **≤2 rounds**
(CANON §7; R7 §1.5). All runs are logged as `AgentRun` with `cost_usd`. It runs **two phases**:

- **`validateKit(data)`** — is the `BrandKit` itself well-formed? (zod §7 + semantic checks: every
  `roles.*` resolves, every `approvedClaims.proofId` exists, every `disclaimers` locale ⊇ `localization.locales`).
- **`checkVariant(variant, kit)`** — is this rendered Variant on-contract? Returns `BrandGuardianReport`.

### 6.1 `checkVariant` — the complete rule set

| # | Rule | Reads | Fail code | Severity |
|---|---|---|---|---|
| 1 | Every `text/cta/legal/logo tint/shape fill/stroke` color ∈ `palette.allowed` (within `toleranceDeltaE`) | `palette` | `COLOR_OFF_PALETTE` | error |
| 2 | Every text/cta/legal `fontFamily` ∈ `typography` families (display/body/fallback) | `typography` | `FONT_OFF_KIT` | error |
| 3 | Copy contains no `voice.bannedTerms` (case-insens, word-boundary) | `voice.bannedTerms` | `BANNED_TERM` | error |
| 4 | Copy matches no `voice.bannedPatterns` regex | `voice.bannedPatterns` | `BANNED_PATTERN` | error |
| 5 | Copy uses no `messaging.bannedClaims` | `messaging.bannedClaims` | `BANNED_CLAIM` | error |
| 6 | Every required disclaimer for the Variant's vertical is present as a `legal` layer (matched via `requiredBy`) | `disclaimers` | `MISSING_DISCLAIMER` | error |
| 7 | Any non-approved statistical claim must map to a `proofPoints` entry (heuristic: `\d+ *%|\d[\d.,]*\+? (firms|Kanzleien)`) | `messaging` | `UNPROVEN_CLAIM` | warn→error* |
| 8 | Reading level ≤ `voice.readingLevel.maxGrade` (per locale) | `voice.readingLevel` | `READING_LEVEL` | warn |
| 9 | Logo clear-space ≥ `logos[].clearSpaceRatio` × height; logo width ≥ `minWidthPx` | `logos` | `LOGO_VIOLATION` | error |
| 10 | Correct logo variant for background (`onDark`/`onLight`) | `logos`, canvas bg | `LOGO_CONTRAST` | warn |
| 11 | Localized Variant present for every `Brief.languages` (transcreated, not empty) | `localization` | `MISSING_LOCALE` | error |
| 12 | Text color vs background contrast ≥ WCAG AA (4.5:1 body / 3:1 large) | derived | `LOW_CONTRAST` | warn |
| 13 | Every `smart` layer `binding` resolves against `messaging.proofPoints`/brief data | `messaging` | `SMART_UNBOUND` | error |
| 14 | If `disclosures.aiContent.enabled` & the Variant uses AI-generated imagery, an AI-content disclosure `legal` layer is present | `disclosures.aiContent` | `MISSING_AI_DISCLOSURE` | warn→error† |

\* Rule 7 is **warn** in draft, **error** at publish/export when `requiresProof` claims are used without a
matching proof point.

† Rule 14 (CANON §12 L10) is **warn by default**, and **error** when the Variant's `vertical` ∈
`disclosures.aiContent.errorVerticals` (e.g. `legal_ai_de`, `pe` — EU legal/PE require it). Empty/absent
`errorVerticals` ⇒ warn everywhere. Fix hint returns the localized `disclosures.aiContent.<locale>` string and
its `placement` so `CompositorPlanner` can add the `legal` layer mechanically.

### 6.2 Signature & report shape

```ts
// packages/shared — BrandGuardian contracts
interface BrandGuardian {
  validateKit(data: BrandKitData): KitValidation;
  checkVariant(input: {
    layerTree?: LayerTreeT; videoComposition?: VideoCompositionT;
    copy: { locale: LocaleCode; text: string }[]; vertical: string; canvasBg: string;
  }, kit: BrandKitData): BrandGuardianReport;
}
type BrandGuardianViolation = {
  code: 'COLOR_OFF_PALETTE'|'FONT_OFF_KIT'|'BANNED_TERM'|'BANNED_PATTERN'|'BANNED_CLAIM'|
        'MISSING_DISCLAIMER'|'UNPROVEN_CLAIM'|'READING_LEVEL'|'LOGO_VIOLATION'|'LOGO_CONTRAST'|
        'MISSING_LOCALE'|'LOW_CONTRAST'|'SMART_UNBOUND'|'MISSING_AI_DISCLOSURE';
  severity: 'error'|'warn';
  layerId?: string; slideIndex?: number; locale?: LocaleCode;
  message: string;               // human-readable, localized to the operator's UI locale
  found?: unknown; expected?: unknown;
  fixHint?: string;              // machine hint the author agent can act on (e.g. nearest allowed color)
};
type BrandGuardianReport = { pass: boolean; violations: BrandGuardianViolation[]; checkedVersion: number; };
```

`pass = violations.every(v => v.severity !== 'error')`. On `!pass`, the orchestrator loops back to the
authoring agent with `violations` (each `fixHint` makes the fix mechanical — e.g. `COLOR_OFF_PALETTE` returns
the nearest `palette.allowed` hex; `BANNED_TERM` returns the offending token so `Copywriter` rewrites).

### 6.3 Reference implementations (deterministic; no LLM in the hot path)

```ts
// nearest-allowed-color check (rule 1) — deltaE via CIEDE2000
import { differenceCiede2000, converter } from 'culori'; // VERIFY current API before coding
const toLab = converter('lab');
function nearestAllowed(hex: string, allowed: string[], tol: number) {
  const de = differenceCiede2000();
  let best = { hex: allowed[0], d: Infinity };
  for (const a of allowed) { const d = de(toLab(hex), toLab(a)); if (d < best.d) best = { hex: a, d }; }
  return { ok: best.d <= tol, nearest: best.hex, delta: best.d };
}

// banned-term check (rule 3) — word-boundary, case-insensitive, diacritic-aware
function findBannedTerms(text: string, banned: string[]): string[] {
  const norm = (s: string) => s.normalize('NFKC').toLowerCase();
  const t = norm(text);
  return banned.filter(b => new RegExp(`\\b${escapeRegExp(norm(b))}\\b`, 'iu').test(t));
}

// reading level (rule 8) — Flesch-Kincaid grade; use a maintained lib per locale
// VERIFY: `text-readability`/`flesch-kincaid` support DE syllable counting; DE needs a German syllable model.
```

> **`VERIFY current docs before coding`** — (a) `culori` `differenceCiede2000`/`converter` signatures;
> (b) a Flesch-Kincaid implementation with **German** syllabification (English-only libs mis-score DE — use a
> DE-aware syllable counter or Amstad/Toni-Amstad DE readability variant). **⚑ ASSUMPTION A-09-4:** if no
> reliable DE reading-level lib exists at build time, rule 8 ships **warn-only** for `de` and the target grade
> is advisory until calibrated.

---

## 7. `packages/shared` zod schema (`brand-kit.ts`) — authoritative

Mirrors §3 exactly. This is the reconciliation target for `03-data-model.md §12` (`brand-kit.ts`
`BrandKitData`). All `[+extends]` fields are `.optional()` so the existing seed validates.

```ts
import { z } from 'zod';
import { LocaleCode } from './enums';

const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected #rrggbb');
const PaletteRoleVal = z.string();            // hex OR dotted key resolved at use (e.g. "accents.gold")

export const FontSpec = z.object({
  family: z.string(), weights: z.array(z.number().int()).default([400]),
  source: z.enum(['google','self','system']).default('google'),
  fallback: z.array(z.string()).default([]),
});
export const FontRole = z.object({
  use: z.enum(['display','body']), weight: z.number().int(),
  tracking: z.number().default(0), case: z.enum(['none','upper','lower','title']).default('none'),
});
export const LogoSpec = z.object({
  id: z.string(), lockup: z.enum(['wordmark','symbol','combined']),
  assetId: z.string().nullable(), minWidthPx: z.number().int(),
  onDark: z.boolean().default(true), onLight: z.boolean().default(false),
  clearSpaceRatio: z.number().default(0.5), tintable: z.boolean().default(false),
});
export const LocalizedText = z.object({ de: z.string(), en: z.string() });

export const ClaimSpec = z.object({
  id: z.string(), de: z.string(), en: z.string(),
  proofId: z.string().optional(), requiresProof: z.boolean().default(false),
  verticals: z.array(z.string()).default([]),
});
export const ProofPoint = z.object({
  id: z.string(), stat: z.string(), unit: z.string().optional(), asOf: z.string().optional(),
  source: z.string().optional(),
  spoken: z.record(z.string(), z.string()).optional(),   // per-locale TTS-safe (R2 §4.4)
});
export const DisclaimerSpec = z.object({
  de: z.string(), en: z.string(), required: z.boolean().default(false),
  appliesToVerticals: z.array(z.string()).optional(),
  placement: z.enum(['footer','header','overlay']).default('footer'),
  minFontPx: z.number().int().default(18), removable: z.boolean().default(false),
});
// [+extends] AI-content disclosure (CANON §12 L10). warn-by-default; error when vertical ∈ errorVerticals.
export const AiContentDisclosure = z.object({
  de: z.string(), en: z.string(),
  enabled: z.boolean().default(true),
  placement: z.enum(['footer','header','overlay','caption']).default('footer'),
  minFontPx: z.number().int().default(18),
  errorVerticals: z.array(z.string()).default([]),
});
export const Disclosures = z.object({ aiContent: AiContentDisclosure.optional() });

export const BrandKitData = z.object({
  schemaVersion: z.literal(1).default(1),
  kind: z.string().optional(),

  palette: z.object({
    background: Hex, surface: Hex, text: Hex, muted: Hex,
    accents: z.record(z.string(), Hex),
    allowed: z.array(Hex).min(1),
    sets: z.record(z.string(), z.array(Hex)).optional(),
    roles: z.record(z.string(), PaletteRoleVal).optional(),
    toleranceDeltaE: z.number().default(3.0),
  }),

  typography: z.object({
    display: FontSpec, body: FontSpec,
    fontAssets: z.array(z.object({ family: z.string(), weight: z.number().int(),
      style: z.string().default('normal'), assetId: z.string().nullable(),
      format: z.string().default('woff2') })).optional(),
    scale: z.record(z.string(), z.number()),
    roles: z.record(z.string(), FontRole).optional(),
  }),

  logos: z.array(LogoSpec),

  imagery: z.object({
    mood: z.string(), negativePromptDefaults: z.string(),
    aspectDefaults: z.record(z.string(), z.string()),
    style: z.object({
      descriptors: z.array(z.string()).default([]),
      lighting: z.string().optional(), grade: z.string().optional(),
      composition: z.string().optional(),
      subjects: z.array(z.string()).default([]), avoid: z.array(z.string()).default([]),
      promptPrefix: z.string().default(''),
      referenceAssetIds: z.array(z.string()).default([]),
    }).optional(),
  }),

  iconography: z.object({
    style: z.enum(['line','solid','duotone']).default('line'),
    strokeWidth: z.number().default(1.5), cornerStyle: z.enum(['sharp','rounded']).default('sharp'),
    gridPx: z.number().int().default(24), color: z.string().default('muted'),
    source: z.string().default('lucide'), generatedProvider: z.string().default('recraft'),
    allowedIcons: z.array(z.string()).nullable().default(null),
  }).optional(),

  voice: z.object({
    register: z.string(), person: z.enum(['first','second','third']).default('third'),
    readingLevel: z.object({ targetGrade: z.number(), maxGrade: z.number(),
      metric: z.string().default('flesch_kincaid') }).optional(),
    bannedTerms: z.array(z.string()).default([]),
    bannedPatterns: z.array(z.string()).default([]),
    preferSpecificityOverCleverness: z.boolean().default(true),
    punctuation: z.object({ exclamationMax: z.number().int().default(0),
      emojiAllowed: z.boolean().default(false), oxfordComma: z.boolean().default(true) }).optional(),
    tone: z.record(z.string(), z.number()).optional(),
    doExamples: z.array(z.string()).default([]), dontExamples: z.array(z.string()).default([]),
  }),

  messaging: z.object({
    productNames: z.array(z.object({ canonical: z.string(), aliases: z.array(z.string()).default([]),
      casing: z.string().default('as-written'), neverTranslate: z.boolean().default(true) })).default([]),
    valueProps: z.array(LocalizedText.extend({ id: z.string() })).default([]),
    approvedClaims: z.array(ClaimSpec).default([]),
    proofPoints: z.array(ProofPoint).default([]),
    bannedClaims: z.array(LocalizedText).default([]),
  }).optional(),

  disclaimers: z.record(z.string(), DisclaimerSpec),

  disclosures: Disclosures.optional(),   // [+extends] AI-content disclosure (CANON §12 L10)

  localization: z.object({
    locales: z.array(LocaleCode).min(1), default: LocaleCode,
    transcreate: z.boolean().default(true), ttsNumberSpelling: z.boolean().default(true),
    byLocale: z.record(z.string(), z.object({
      quotes: z.string().optional(), decimalSep: z.string().optional(), thousandSep: z.string().optional(),
      formality: z.string().optional(), dateFormat: z.string().optional(),
      numberSpellOut: z.boolean().optional(),
    })).optional(),
    glossary: z.array(z.object({ term: z.string(), de: z.string(), en: z.string(),
      neverTranslate: z.boolean().default(false) })).default([]),
  }),

  safeZoneDefaults: z.object({
    profileOverlap: z.object({ top: z.number(), left: z.number() }),
    seeMoreFold: z.number(),
  }),
});
export type BrandKitDataT = z.infer<typeof BrandKitData>;
```

> **`VERIFY current docs before coding`** — confirm the installed **zod** major version's `z.record(keyType,
> valueType)` two-arg form and `.default()` semantics (zod v3 vs v4 differ). Keep this file and
> `03-data-model.md §12` byte-identical; a CI check should `deepEqual` the two schema modules or import one
> from the other (prefer a single source: `packages/shared/schemas/brand-kit.ts`, re-exported by both docs).

---

## 8. Drift detection

Two flavors: **pre-ship** (the `BrandGuardian` gate, §6 — blocks) and **post-hoc** (this section — flags
already-shipped Variants when the kit changes or a manual edit slips through).

### 8.1 Triggers that run a post-hoc scan

| Trigger | Scope scanned | Why |
|---|---|---|
| New `brand_kit` version published with a **breaking** `impact` change (§4.2) | all active/exported Variants pinned to older versions | a removed color / new banned term retroactively invalidates old ads |
| Manual editor save (`LayerPatch` applied outside the gen loop) | the edited Variant | drag-editing can introduce off-palette colors |
| Nightly `Cron`/`Inngest` job | Variants exported in the last N days | catch anything the gate missed |
| Pre-export | the exact Variant being exported | last line of defense before a file leaves the platform |

### 8.2 Scan implementation

```ts
// apps/web/server or an Inngest function — reuses BrandGuardian.checkVariant (§6)
async function scanForDrift(sb, workspaceId: string, opts: { since?: string; onlyExported?: boolean }) {
  const kit = await getActiveKitData(sb, workspaceId);
  const variants = await loadVariants(sb, workspaceId, opts);   // RLS-scoped
  for (const v of variants) {
    const report = brandGuardian.checkVariant(toCheckInput(v), kit);
    for (const viol of report.violations.filter(x => x.severity === 'error')) {
      await sb.from('brand_drift_event').insert({
        workspace_id: workspaceId, variant_id: v.id, brand_kit_version: v.brand_kit_version,
        kind: viol.code, severity: viol.severity, detail: viol,
      });
    }
  }
}
```

- Open `brand_drift_event` rows surface in the UI as a **"Brand drift" queue**. Each row offers three
  resolutions: **Re-fix** (auto-iterate the Variant against the current kit → `resolution='refixed'`),
  **Update kit** (the intended color/term was a deliberate change → `resolution='kit_updated'`), or
  **Waive** (accepted exception; requires a note → `AuditLog`).
- **Never** silently mutate a shipped Variant — drift resolution always creates a new Variant or a new kit
  version, preserving lineage (CANON §5).

### 8.3 Semantic voice drift (LLM, advisory only)

Mechanical checks catch tokens/colors/fonts. **Register drift** ("this reads like hype even without a banned
word") is caught by an **advisory** LLM pass (`ANTHROPIC_API_KEY`; reuse the `brand-voice-enforcement`
skill's validator or a `Critic` sub-call) that scores copy against `voice.tone`/`doExamples`/`dontExamples`.
It **never hard-gates** (non-deterministic); it raises a `warn` and a suggested rewrite for human review.

---

## 9. SEED — the Brutal AI Brand Kit (v1)

Canonical seed from CANON §0/§1. This restates `03-data-model.md §7.2` and **adds** the `[+extends]` blocks
from §3. It seeds the first tenant so a fresh install can generate an on-brand ad with zero setup.

`supabase/seed.sql` (append to the workspace insert already in `03 §7.2`):

```sql
-- Seed the first/seed tenant (Brutal AI — CANON §0/§1) and its v1 brand kit.
insert into workspace (id, name, slug, default_locale)
values ('00000000-0000-0000-0000-000000000001','Brutal AI','brutal','de')
on conflict (id) do nothing;

insert into brand_kit (workspace_id, version, name, is_active, created_by_kind, data)
values (
  '00000000-0000-0000-0000-000000000001', 1, 'Brutal Seed Kit', true, 'system',
  $${
    "schemaVersion": 1,
    "kind": "brutal",
    "palette": {
      "background": "#0a0a0a", "surface": "#141414", "text": "#f5f5f0", "muted": "#9a9a92",
      "accents": { "gold": "#cba65e", "lime": "#b6e64a", "acidLime": "#c9ff2e" },
      "allowed": ["#0a0a0a","#141414","#f5f5f0","#9a9a92","#cba65e","#b6e64a","#c9ff2e"],
      "sets": { "pe": ["#cba65e","#b6e64a"] },
      "roles": {
        "pageBg": "background", "cardBg": "surface", "bodyText": "text", "mutedText": "muted",
        "primaryAccent": "accents.gold", "ctaFill": "accents.acidLime", "ctaText": "background",
        "legalText": "muted", "hairline": "muted"
      },
      "toleranceDeltaE": 3.0
    },
    "typography": {
      "display": { "family": "Playfair Display", "weights": [400,700,900], "source": "google",
                   "fallback": ["Georgia","serif"] },
      "body":    { "family": "Inter", "weights": [400,500,600,700], "source": "google",
                   "fallback": ["system-ui","Helvetica","Arial","sans-serif"] },
      "scale":   { "headline": 72, "subhead": 40, "body": 28, "legal": 18, "cta": 32 },
      "roles": {
        "headline": { "use": "display", "weight": 900, "tracking": -0.01, "case": "none" },
        "subhead":  { "use": "display", "weight": 700, "tracking": -0.005, "case": "none" },
        "body":     { "use": "body",    "weight": 400, "tracking": 0,     "case": "none" },
        "cta":      { "use": "body",    "weight": 600, "tracking": 0.02,  "case": "none" },
        "legal":    { "use": "body",    "weight": 400, "tracking": 0,     "case": "none" },
        "kicker":   { "use": "body",    "weight": 600, "tracking": 0.08,  "case": "upper" }
      }
    },
    "logos": [
      { "id": "wordmark", "lockup": "wordmark", "assetId": null, "minWidthPx": 160,
        "onDark": true, "onLight": false, "clearSpaceRatio": 0.5, "tintable": false },
      { "id": "symbol",   "lockup": "symbol",   "assetId": null, "minWidthPx": 48,
        "onDark": true, "onLight": true,  "clearSpaceRatio": 0.5, "tintable": true }
    ],
    "imagery": {
      "mood": "muted-first, documentary, dark palette, high-contrast subject",
      "negativePromptDefaults": "no text, no watermark, no logo, no captions, no lower-thirds",
      "aspectDefaults": { "single_image": "1:1", "carousel": "1:1", "video": "1:1" },
      "style": {
        "descriptors": ["editorial","documentary","sober","cinematic","desaturated","high-contrast"],
        "lighting": "low-key, single hard source, deep shadows",
        "grade": "cool shadows, warm gold highlights, low saturation",
        "composition": "negative space for text overlay; subject off-center; eye-level",
        "subjects": ["law-firm interiors","documents & contracts","hands at work","modern German offices"],
        "avoid": ["stock-photo smiles","neon gradients","3D-render clichés","emoji","clip-art","AI sheen"],
        "promptPrefix": "Editorial documentary photograph, sober and muted, dark palette, cinematic low-key lighting,",
        "referenceAssetIds": []
      }
    },
    "iconography": {
      "style": "line", "strokeWidth": 1.5, "cornerStyle": "sharp", "gridPx": 24,
      "color": "muted", "source": "lucide", "generatedProvider": "recraft", "allowedIcons": null
    },
    "voice": {
      "register": "sober, editorial, documentary — NOT hype AI",
      "person": "third",
      "readingLevel": { "targetGrade": 9, "maxGrade": 11, "metric": "flesch_kincaid" },
      "bannedTerms": ["revolutionary","game-changer","10x","AI-powered magic","disrupt","unleash","supercharge"],
      "bannedPatterns": ["\\bworld[- ]?class\\b","\\bnext[- ]?gen(eration)?\\b","!{2,}","🚀|✨|🔥"],
      "preferSpecificityOverCleverness": true,
      "punctuation": { "exclamationMax": 0, "emojiAllowed": false, "oxfordComma": true },
      "tone": { "formality": 0.75, "warmth": 0.35, "urgency": 0.25, "playfulness": 0.05, "confidence": 0.8 },
      "doExamples": [
        "1.200 Kanzleien entwerfen Verträge 40 % schneller.",
        "Legal AI that drafts German contracts in seconds — reviewed by your team."
      ],
      "dontExamples": [
        "The revolutionary AI that will 10x your firm! 🚀",
        "Unleash game-changing productivity with our disruptive platform."
      ]
    },
    "messaging": {
      "productNames": [
        { "canonical": "Brutal AI", "aliases": ["Brutal","brutal.ai"], "casing": "as-written", "neverTranslate": true }
      ],
      "valueProps": [
        { "id": "vp_speed",  "de": "Verträge in Sekunden statt Stunden.", "en": "Contracts in seconds, not hours." },
        { "id": "vp_trust",  "de": "Von Ihrem Team geprüft — nie blind übernommen.", "en": "Reviewed by your team — never taken on blind faith." },
        { "id": "vp_german", "de": "Für deutschsprachige Kanzleien gebaut.", "en": "Built for German-speaking law firms." }
      ],
      "approvedClaims": [
        { "id": "cl_firms",  "de": "Über 1.200 Kanzleien nutzen Brutal AI.", "en": "Over 1,200 firms use Brutal AI.",
          "proofId": "pf_firms", "requiresProof": true, "verticals": ["legal_ai_de"] },
        { "id": "cl_faster", "de": "40 % schnelleres Entwerfen.", "en": "40% faster drafting.",
          "proofId": "pf_faster", "requiresProof": true, "verticals": ["legal_ai_de"] }
      ],
      "proofPoints": [
        { "id": "pf_firms",  "stat": "1.200", "unit": "firms", "asOf": "2026-06", "source": "internal-metrics",
          "spoken": { "de": "eintausendzweihundert", "en": "one thousand two hundred" } },
        { "id": "pf_faster", "stat": "40", "unit": "%", "asOf": "2026-Q2", "source": "customer-study-2026",
          "spoken": { "de": "vierzig Prozent", "en": "forty percent" } }
      ],
      "bannedClaims": [
        { "de": "garantierter Prozesserfolg", "en": "guaranteed case success" },
        { "de": "ersetzt Ihren Anwalt", "en": "replaces your lawyer" }
      ]
    },
    "disclaimers": {
      "legal_ai_de": { "de": "Rechtlicher Hinweis: Ergebnisse ersetzen keine anwaltliche Beratung.",
                       "en": "Legal notice: outputs do not constitute legal advice.",
                       "required": true, "appliesToVerticals": ["legal_ai_de"],
                       "placement": "footer", "minFontPx": 18, "removable": false },
      "pe":          { "de": "Kapitalanlagen bergen Risiken.", "en": "Investments carry risk.",
                       "required": false, "appliesToVerticals": ["pe"],
                       "placement": "footer", "minFontPx": 18, "removable": false }
    },
    "disclosures": {
      "aiContent": { "de": "Mit KI erstellt.", "en": "Created with AI.",
                     "enabled": true, "placement": "footer", "minFontPx": 18,
                     "errorVerticals": ["legal_ai_de","pe"] }
    },
    "localization": {
      "locales": ["de","en"], "default": "de", "transcreate": true, "ttsNumberSpelling": true,
      "byLocale": {
        "de": { "quotes": "„…“", "decimalSep": ",", "thousandSep": ".", "formality": "Sie",
                "dateFormat": "DD.MM.YYYY", "numberSpellOut": true },
        "en": { "quotes": "“…”", "decimalSep": ".", "thousandSep": ",", "formality": "neutral",
                "dateFormat": "MMM D, YYYY", "numberSpellOut": true }
      },
      "glossary": [
        { "term": "Brutal AI", "de": "Brutal AI", "en": "Brutal AI", "neverTranslate": true },
        { "term": "Kanzlei",   "de": "Kanzlei",   "en": "law firm",  "neverTranslate": false }
      ]
    },
    "safeZoneDefaults": { "profileOverlap": { "top": 0.12, "left": 0.0 }, "seeMoreFold": 0.85 }
  }$$::jsonb
)
on conflict (workspace_id, version) do nothing;

-- v1 creation diff (from_version null)
insert into brand_kit_diff (workspace_id, from_version, to_version, summary, created_by_kind)
values ('00000000-0000-0000-0000-000000000001', null, 1, 'Initial Brutal AI seed kit (v1).', 'system')
on conflict (workspace_id, to_version) do nothing;
```

> **⚑ ASSUMPTION A-09-5 (carried from `03 §7.2`, unchanged):** the exact **acid-lime chrome hex `#c9ff2e`**
> is a placeholder — CANON §1 names "acid-lime for the app chrome" without a hex. **VERIFY with Antonio.**
> Per **CANON §12 L10, `#c9ff2e` is NOT gate-load-bearing: brand-gate tests MUST NOT hard-assert this exact
> hex.** It stays a valid `allowed`/`accents.acidLime` entry the seed ships, but the gate treats it as a
> swappable placeholder (assert palette-role resolution / membership, never the literal `#c9ff2e` constant).
> Logo `assetId`s are `null` until real logo files are uploaded to Storage and back-filled (a
> `brand_kit` version bump when they land — logos are `data`, and `data` is immutable, so back-filling
> assetIds = publishing v2). **⚑ Proof-point stats (1.200 firms / 40% faster) and their `asOf`/`source` are
> illustrative — VERIFY the real, current numbers with Antonio before any ad using them ships.**

---

## 10. Bootstrapping a new tenant's Brand Kit

A new (non-seed) `Workspace` has no kit. Three ingestion paths converge on a **draft `BrandKitData`** that the
operator reviews/edits, then **Publishes** as `version 1` (§4). All three MAY be assisted by Claude
(`ANTHROPIC_API_KEY`) but the output is always **validated by `BrandGuardian.validateKit` (zod §7 + semantics)
before publish**.

### 10.1 Path A — URL scrape (60-second import)

```
POST /api/brand-kit/bootstrap/url   { workspaceId, url }         (apps/web route handler)
  1. Fetch the page(s) server-side (WebFetch/headless). VERIFY robots.txt / ToS; respect rate limits.
  2. Extract signals:
     - colors: parse inline styles + linked CSS custom properties; cluster; rank by area-weighted frequency
       → propose palette.background/surface/text/accents + allowed[].
     - fonts: @font-face / font-family in computed styles → propose typography.display/body (+source).
     - logo: <img> in header/nav, favicon, og:image, apple-touch-icon → upload to Storage → logos[].assetId.
     - copy: og:title/description, <h1>, hero, meta → seed voice examples + candidate valueProps/claims.
  3. Claude (structured output, BrandKitData zod schema) maps signals → draft BrandKitData; low-confidence
     fields flagged for the operator.
```

> **`VERIFY current docs before coding`** — legal/robots posture of scraping the target URL; the exact
> WebFetch/headless tool available in the runtime; color-extraction lib (e.g. `node-vibrant`, or CSS parse).
> **⚑ Palette extraction is heuristic** — always route through operator review; never auto-publish.

### 10.2 Path B — PDF brand-guideline ingest

```
POST /api/brand-kit/bootstrap/pdf   multipart: { workspaceId, file }
  1. Store the PDF in Supabase Storage (RLS-scoped bucket).
  2. Extract: text (pdf parse) + embedded images (candidate logos) + named colors (hex/Pantone/CMYK strings).
     Prefer a vision-capable Claude pass over rendered pages for layout-heavy guideline decks.
  3. Claude (structured output → BrandKitData) fills palette (with roles), typography, voice register,
     banned terms, disclaimers, do/don't examples from the guideline prose.
  4. Map Pantone/CMYK → sRGB hex (VERIFY conversion table/lib); flag any color it could not resolve.
```

> **`VERIFY current docs before coding`** — PDF text/image extraction lib; whether the Anthropic model in use
> accepts PDF/document input directly vs page-image rendering (see `docs/claude-api` reference / model card).

### 10.3 Path C — the brand-voice skills (verbal kit)

For the **verbal** half (voice/tone/banned terms/claims/do-don't), reuse the installed **`brand-voice`**
skills rather than reinventing:

| Skill (name) | Role in bootstrapping |
|---|---|
| `brand-voice:discover-brand` (`discover-brand`) | Autonomously search connected platforms (Notion/Drive/Slack/Figma/…) for existing brand materials; produce a discovery report. |
| `brand-voice:generate-guidelines` (`guideline-generation`) | Turn a discovery report / uploaded docs / call transcripts into structured, LLM-ready guidelines (writes `.claude/brand-voice-guidelines.md`). |
| `brand-voice:enforce-voice` (`brand-voice-enforcement`) | Runtime voice validation — reused by §8.3 semantic drift and by `Copywriter`/`BrandGuardian` for advisory register checks. |

**Adapter:** a `guidelinesToBrandKit()` mapper converts `.claude/brand-voice-guidelines.md` (voice constants,
tone flexes, banned words, do/don't) into the `voice` + `messaging` sub-objects of `BrandKitData`. The
visual half (palette/typography/logos/imagery/iconography) comes from Path A/B or manual entry.

> **⚑ ASSUMPTION A-09-6:** these skills produce a Markdown guideline doc, not a `BrandKitData` JSON. The
> `guidelinesToBrandKit()` mapper is the bridge and is **owned by this platform** (not the skill). Field
> coverage is partial (verbal only) — visual fields still need Path A/B/manual. Skill availability at runtime
> is not guaranteed for every deploy target; the mapper degrades to "operator fills the form" if absent.

### 10.4 Path D — manual / minimal (always available fallback)

The guided 60-second form (R7 §"empty states"): **logo + 2 colors + 2 fonts**, pre-filled with the Brutal seed
for the seed tenant. Produces a minimal valid `BrandKitData` (all required §7 fields; empty optional blocks),
publishable as v1 immediately.

### 10.5 Bootstrap endpoints (summary)

| Method + path | Body | Returns |
|---|---|---|
| `POST /api/brand-kit/bootstrap/url` | `{ workspaceId, url }` | `{ draft: BrandKitData, confidence: Record<path,number>, warnings[] }` |
| `POST /api/brand-kit/bootstrap/pdf` | multipart `{ workspaceId, file }` | same as above |
| `POST /api/brand-kit/bootstrap/guidelines` | `{ workspaceId, guidelinesMarkdown }` | `{ draft: BrandKitData(partial), warnings[] }` |
| `POST /api/brand-kit/validate` | `{ data: BrandKitData }` | `KitValidation` (§6) |
| `POST /api/brand-kit/publish` | `{ workspaceId, data, name }` | `{ id, version, is_active:true }` (atomic §4.1) |
| `POST /api/brand-kit/:id/activate` | `{}` | flips `is_active` (rollback/reactivate) |
| `GET  /api/brand-kit/active?workspaceId=` | — | active `BrandKit` row |
| `GET  /api/brand-kit/diff?workspaceId=&from=&to=` | — | `brand_kit_diff` row |

All routes are **server-side**, service-role only for writes, RLS-scoped for reads (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`; never ship the service-role key to the client — CANON §4).

---

## 11. Consumers — who reads the Brand Kit and how

| Consumer | Reads | Uses it to |
|---|---|---|
| `IntakeAgent` (⚑R-A1) | `localization.default`, `messaging`, `disclaimers` | fill unstated brief fields; pick language; attach mandatory legal |
| `Strategist` | `messaging.valueProps`, `voice`, `imagery.mood` | ground positioning/angle in real value props |
| `Copywriter` | `voice.*`, `messaging.approvedClaims/proofPoints/bannedClaims`, `typography.roles` | write hooks/CTAs; specificity > cleverness; never a banned term |
| `ArtDirector` | `imagery.style` (`promptPrefix`, `negativePromptDefaults`, `avoid`), `palette` | build imagery-**only** prompts (no legible text — CANON §2) |
| `CarouselArchitect` | `imagery.style`, `messaging`, `voice` | keep hook→reframe→close continuity on-brand across slides |
| `CompositorPlanner` | `palette.roles`, `typography.roles`, `logos`, `safeZoneDefaults`, `iconography` | pick colors/fonts/logo by role; seed `LayerTree.safeZones` |
| `BrandGuardian` | **all of it** | mechanical gate (§6) + `validateKit` |
| `Critic` | `voice.tone/doExamples`, LinkedIn playbook | score vs brand + playbook (advisory) |
| `LocalizationAgent` | `localization.*`, `messaging.proofPoints.spoken`, `glossary` | DE⇄EN transcreation; TTS-safe numbers (R2 §4.4) |
| `EditorAgent` | `palette.roles`, `typography.roles` | resolve NL edits ("make the CTA gold") to allowed values |
| `packages/render` | `typography.fontAssets`/`source`, `logos[].assetId`, `palette` | load fonts, place logos, apply colors |

---

## 12. Self-consistency checklist (the factory MUST hold)

| Invariant | Enforced by |
|---|---|
| `brand_kit` DDL identical to `03-data-model.md §3` | copy-paste; CI diff of migration files |
| `BrandKitData` zod (§7) ⊇ `03-data-model.md §12` shape; all `[+extends]` optional | single source `packages/shared/schemas/brand-kit.ts`; CI `deepEqual` |
| Every `Variant.brand_kit_version` references an existing `(workspace_id, version)` | FK-by-convention + `scanForDrift` |
| Exactly one `is_active` per workspace | `brand_kit_one_active_per_ws` partial unique index |
| Published kit rows immutable | `brand_kit_immutable` trigger (§4.1) |
| Every required disclaimer → a `legal` layer with matching `requiredBy` | `BrandGuardian` rule 6 (§6.1) |
| AI-imagery Variants carry an AI-content disclosure (error in `disclosures.aiContent.errorVerticals`) | `BrandGuardian` rule 14 (§6.1; CANON §12 L10) |
| Seed kit validates against §7 zod | CI: `BrandKitData.parse(seed.data)` in a test |
| `disclaimers`/`messaging`/`localization` cover all `localization.locales` | `validateKit` semantic check |
| No hex/font hardcoded in app logic (all from `BrandKit`) | code review; grep guard in CI |
| Service-role key server-only | CANON §4; env lint |

---

## 13. Assumptions & recommendations (consolidated)

- **⚑ A-09-1** — `brand_kit` DDL + base `BrandKitData` are owned by `03-data-model.md`; this doc is the
  **superset** and, per **CANON §12 L7**, its §3/§7 shape (incl. `disclosures.aiContent`) is the authoritative
  `BrandKitData` and **is back-ported into `03 §7.1` + the §12 zod in this same build** — a settled
  reconciliation, not a deferred one. All additions are optional/back-compatible.
- **⚑ A-09-2** — lineage pins the `version` **integer** (per `03 §4`), not the row UUID.
- **⚑ A-09-3** — draft storage (pre-publish) is unspecified in CANON; build may use a `brand_kit_draft` table
  or Storage JSON. Contract: nothing enters `brand_kit` until Publish.
- **⚑ A-09-4** — DE reading-level scoring may lack a reliable lib; rule 8 ships warn-only for `de` until a
  DE-aware syllable counter is confirmed.
- **⚑ A-09-5** — acid-lime `#c9ff2e`, logo `assetId`s (null), and proof-point stats are placeholders — VERIFY
  with Antonio before shipping ads that use them. Per **CANON §12 L10**, `#c9ff2e` is **not gate-load-bearing**:
  brand-gate tests must not hard-assert this exact hex (assert role resolution / `allowed` membership instead).
- **⚑ A-09-6** — the `brand-voice` skills emit Markdown guidelines, not JSON; `guidelinesToBrandKit()` is a
  platform-owned mapper covering the **verbal** half only.
- **⚑ RECOMMENDATION R-09-1** — add the two governance tables (`brand_kit_diff`, `brand_drift_event`) and the
  `brand_kit_immutable` trigger to `03-data-model.md`'s migration set and `agent_name`-adjacent enums. They
  are the mechanism behind CANON §5's "versioned" and CANON §7's "hard gate" promises; without them
  "versioned + auditable" is aspirational.
- **⚑ RECOMMENDATION R-09-2** — expose `palette.roles`/`typography.roles` in the editor and agents so
  "on-brand" is expressed as **intent** (ctaFill) not **hex**, making re-brands a one-row change.
- **⚑ RECOMMENDATION R-09-3** — calibrate `voice.readingLevel` and `voice.tone` targets against the tenant's
  **real LinkedIn results** over time (mirrors the engagement-scoring calibration stance, CANON §9).

---

**End of `docs/09-brand-kit.md`.**
