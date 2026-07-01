# 13 — Acceptance Tests (the factory's output MUST pass these)

> **Read `handoff/CANON.md` first.** This document is the **executable definition of "done."** It is the
> final gate an autonomous build factory runs against its own output before declaring Brutal Ads shippable.
> Each scenario is a concrete, end-to-end test with **fixtures, exact steps, exact endpoints, and measurable
> pass criteria**. If any AT below fails, the build is **not** done — no exceptions, no "mostly passing."
>
> **This document uses ONLY canonical names** from CANON §5/§6/§7/§8/§10 and the interfaces already specified in
> `docs/03` (data model), `docs/04` (providers/`ProviderBus`), `docs/05` (agents/orchestrator/`LayerPatch`),
> `docs/06` (editor/compositor/pre-flight/export/render), `docs/07` (LinkedIn playbook), `docs/08` (engagement).
> Object model: `Workspace → BrandKit → Campaign → Brief → AdDocument → Variant → (Slide) → Layer`; agents:
> `IntakeAgent, Strategist, Copywriter, ArtDirector, CarouselArchitect, CompositorPlanner, BrandGuardian, Critic,
> EngagementAnalyst, EditorAgent, LocalizationAgent`; interfaces: `ImageProvider, VideoProvider, AudioProvider,
> LlmProvider, EngagementPredictor, ProviderBus`. **Do not rename any of these.**
>
> Where a test relies on a drift-prone external fact, it carries **VERIFY before coding**. Every assumption is
> tagged **[ASSUMPTION]**. Any deviation from a naive reading is tagged **⚑ RECOMMENDATION** — never a silent
> divergence.

---

## 0. How to read & run this document

### 0.1 The eight required acceptance tests (CANON §0 north star, decomposed)

| AT | Name | Proves (CANON) | Blocking? |
|---|---|---|---|
| **AT-1** | Brief → single image, 1200×1200, on-brand, ≤5 MB, with lineage | brief→ad + export spec + lineage (§0, §8, §5) | **yes** |
| **AT-2** | Brief → 3-slide carousel (hook→reframe→close) → PDF document ad | carousel narrative + doc-ad export (§8, §2) | **yes** |
| **AT-3** | Chat-edit ("punchier headline / switch theme / move logo") emits `LayerPatch`, never a re-roll | editable-not-re-roll load-bearing decision (§2, §4) | **yes** |
| **AT-4** | Pre-flight catches a low-contrast headline | quality gate (§8 export, editor pre-flight) | **yes** |
| **AT-5** | Engagement score returns a band + per-slide breakdown | bands+confidence, not point CTR (§6, §9) | **yes** |
| **AT-6** | DE localization **transcreates**, not literal translation | localization is first-class (§1, §7) | **yes** |
| **AT-7** | Provider fallback when the primary image API errors | providers behind interfaces + fallback (§4, §6) | **yes** |
| **AT-8** | Spend cap blocks a runaway brief | hard per-brief/per-workspace caps (§4, §10) | **yes** |

**All eight are release-blocking.** The build is "done" **iff** `AT-1 … AT-8` are green **and** the phase-level
`docs/06 §13` acceptance criteria (P1 render spine, P4 editor, P5 export, P7 carousel, P9 video) are green.

### 0.2 Test taxonomy & where each AT lives in the repo

```
brutal-ads/
  e2e/                                  # ← THIS DOCUMENT'S HOME (playwright + node test runner)
    fixtures/
      workspace.seed.sql                # AT-0 fixture: Brutal seed tenant + BrandKit v1 (supabase/seed reuse)
      brief.legal-de.json               # canonical brief fixtures (AT-1, AT-2, AT-6)
      brief.runaway.json                # AT-8: variantCount huge / tiny cap
      trees/                            # hand-authored canonical Variant trees (AT-3, AT-4 determinism)
        single_image.on-brand.json      #   passes everything (golden)
        single_image.low-contrast.json  #   AT-4: gold headline on light scrim → must FAIL wcag.contrast
      mocks/
        image-provider.mock.ts          # deterministic fake ImageProvider (seeded PNG) — no live spend in CI
        image-provider.flaky.ts         # AT-7: rank-1 driver throws ProviderError('provider_failed')
        engine.mock.ts                  # deterministic EngagementScores (AT-5) — no GPU in CI
        anthropic.mock.ts               # canned structured tool outputs per agent (deterministic agents)
    at-1.single-image.spec.ts
    at-2.carousel-pdf.spec.ts
    at-3.chat-edit-patch.spec.ts
    at-4.preflight-contrast.spec.ts
    at-5.engagement-band.spec.ts
    at-6.localization-de.spec.ts
    at-7.provider-fallback.spec.ts
    at-8.spend-cap.spec.ts
    lib/
      assertions.ts                     # shared measurable assertions (§0.5)
      probe.ts                          # file-size / dimension / colorspace probes (sharp)
      contrast.ts                       # WCAG 2.x contrast recompute (independent oracle for AT-4)
```

### 0.3 Two run modes — both MUST pass

| Mode | Providers / LLM / engine | Purpose | Cost | Gate |
|---|---|---|---|---|
| **CI (default, `E2E_MODE=mock`)** | mocked (deterministic) via `mocks/` | fast, deterministic, zero external spend, runs on every PR | $0 | **hard — blocks merge** |
| **Live (`E2E_MODE=live`)** | real `ProviderBus`, real Anthropic, real `services/engine` | proves the wiring against reality; nightly + pre-release | metered (each run under a **$1 per-brief cap**, `AT-8` proves the cap) | **hard — blocks release** |

> **[ASSUMPTION]** CI uses mocks so the suite is deterministic and free; the **same specs** run in `live` mode
> against real APIs. Mocks implement the **canonical interfaces verbatim** (`ImageProvider`, `EngagementPredictor`,
> `LlmProvider`) so nothing under test knows it is mocked. The DI seam is the `Registry`/`ProviderBus`
> (`docs/04 §5.5`) and the `anthropic` client in the agent-runner (`docs/05 §5.2`). **⚑ RECOMMENDATION:** inject
> both via a single `makeTestContainer(env)` so `live` vs `mock` is one env flag.

### 0.4 Global preconditions (AT-0 — run once before every AT)

```gherkin
Scenario: AT-0 — seed the Brutal tenant and assert a clean slate
  Given a fresh Supabase project migrated from supabase/migrations (docs/03)
  And   e2e/fixtures/workspace.seed.sql is applied
  Then  a Workspace 'Brutal AI' exists with:
          - one BrandKit at version 1 (dark palette; Playfair Display + Inter;
            palette includes #cba65e and #b6e64a; banned-terms list non-empty; verticals ['legal-de','pe'])
          - workspace.spend_cap_usd_monthly = 500.00, spend_used_usd_monthly = 0.00   (docs/03 §workspace)
          - workspace.spend_cap_usd_per_brief = 2.00 USD (real column — CANON §12 L8)  (docs/03 §workspace)
  And   RLS is ON for every tenant table (docs/03) — a cross-workspace read returns 0 rows
  And   .env.example contains every CANON §10 env var + ENGINE_SHARED_SECRET + WEBHOOK_SIGNING_SECRET
        (both required — CANON §12 L8; docs/11 §6) + POLOTNO_API_KEY (docs/06 A3; docs/08 §10)  — assert presence, not values
```

**AT-0 pass criteria (all MUST hold):** migrations apply clean; the `job_status` enum in `docs/03` is exactly the
frozen superset `('queued','dispatched','running','succeeded','failed','dead','cancelled','cached')` (spelling
`cancelled`, two l's — CANON §12 L3) and `agent_run_status` includes `'budget_exceeded'`; seed inserts exactly one
`workspace`, one `brand_kit` (version 1); RLS denies cross-tenant reads (proven by a second workspace seeing 0 of
the first's rows); `pnpm -w typecheck` and `pnpm -w build` are green; the `docs/06 §7.4` render **parity golden
test** and the `toPolotno/fromPolotno` **round-trip golden test** (`docs/06 §3`) are green (they are the
render-spine prerequisite for every export-bearing AT).

### 0.5 Shared measurable assertions (`e2e/lib/assertions.ts`) — the reusable oracles

| Assertion helper | Signature | Definition (measurable) |
|---|---|---|
| `assertDimensions(buf, w, h)` | png/jpg buffer | decoded width===w && height===h (via `sharp().metadata()`) |
| `assertUnderBytes(buf, max)` | buffer, bytes | `buf.length <= max` (image 5·2²⁰; video 200·2²⁰ — CANON §8) |
| `assertColorspace(buf, 'srgb')` | buffer | `metadata().space === 'srgb'` (no ICC transform — `docs/06 §7.3`) |
| `assertContrastAtLeast(png, tree, ratio)` | render + tree | recompute WCAG 2.x contrast **sampled under each glyph run** (independent oracle, §AT-4) ≥ threshold |
| `assertOnPalette(tree, brandKit)` | tree | every `fill`/text color ∈ `brandKit.palette` (hard fields) |
| `assertFonts(tree, ['Playfair Display','Inter'])` | tree | every `text/cta/legal` layer `fontFamily` ∈ set |
| `assertNoBakedText(png, tree)` | render | OCR (`tesseract`) over the **background image layer bbox** finds **0** headline/CTA glyphs (§AT-1) |
| `assertLineageComplete(variantRow)` | db row | every CANON §5 lineage column non-null where required (§AT-1 table) |
| `assertBand(scored)` | `{value,band,confidence}` | `band[0] <= value <= band[1]` && `band[1] > band[0]` && `0<=confidence<=1` |
| `assertNoImageJob(sinceTs, variantId)` | db | `count(generation_job where variant_id AND created_at>sinceTs AND modality='image') === 0` (§AT-3) |
| `assertCharLimit(text, n)` | string | `[...text].length <= n` (headline 70; on-image 60; cta 24 — CANON §8) |

> **VERIFY before coding:** OCR (`tesseract.js`), pixel decode (`sharp`), and PDF parse (`pdf-lib`/`pdfjs`) are
> test-only deps; pin versions. The **contrast oracle in `e2e/lib/contrast.ts` is INDEPENDENT** of the product's
> `packages/shared/preflight.ts` implementation (so AT-4 catches a bug in the product's own contrast code, not
> just agree with it). Both must compute WCAG 2.x the same way per the spec, but from separate code.

---

## AT-1 — Brief → single image → on-brand 1200×1200 export ≤5 MB with lineage

**Proves:** the core promise (CANON §0) end-to-end: one-line brief → a rendered, on-brand, spec-valid,
lineage-complete single-image LinkedIn ad. Exercises `IntakeAgent → Strategist → (Copywriter ‖ ArtDirector →
ProviderBus.image) → CompositorPlanner → BrandGuardian → render → (Critic ‖ EngagementAnalyst) → board`
(`docs/05 §2.1`), then export (`docs/06 §8`).

### AT-1.1 Fixture (`e2e/fixtures/brief.legal-de.json`)

```json
{
  "workspaceId": "ws_brutal",
  "campaignId": "camp_seed",
  "briefText": "Legal AI that drafts German contracts in seconds — target law firm partners",
  "adType": "single_image",
  "aspect": "1:1",
  "variantCount": 4,
  "language": "en"
}
```

### AT-1.2 Steps

```gherkin
Scenario: AT-1 — brief to on-brand single-image export with lineage
  Given AT-0 preconditions hold
  When  POST /api/studio/brief-to-board  with brief.legal-de.json          # docs/05 §2.4 runBriefToBoard
  Then  the response returns a board of exactly 4 ranked Variants
  And   every Variant has status reaching 'ready' and a non-null layer_tree (single_image)  # docs/03 §variant
  When  I select the top-ranked Variant V and mark it human-approved
  And   POST /api/export { variantId: V, format: "jpg", ratios: ["1:1"], locale: "en" }     # docs/06 §8
  Then  a Render row is created (kind=jpg, ratio=1:1) and a downloadable asset URL is returned
```

### AT-1.3 Pass criteria (ALL must hold — measurable)

| # | Criterion | Oracle | Threshold |
|---|---|---|---|
| 1 | Board has **exactly `variantCount`** ranked Variants | count rows | `=== 4` |
| 2 | Export dimensions | `assertDimensions(buf, 1200, 1200)` | exact (CANON §8 default) |
| 3 | Export file size | `assertUnderBytes(buf, 5*2**20)` | **≤ 5 MB** |
| 4 | Colorspace sRGB | `assertColorspace(buf, 'srgb')` | exact |
| 5 | **On-brand palette** | `assertOnPalette(tree, brandKit)` | 0 off-palette hard-field colors |
| 6 | **On-brand fonts** | `assertFonts(tree, ['Playfair Display','Inter'])` | 0 other fonts |
| 7 | **No baked text** (imagery-only, CANON §2) | `assertNoBakedText(png, tree)` (OCR over background layer bbox) | 0 headline/CTA glyphs in the image layer |
| 8 | Headline exists as an **editable `text` layer** ≤70 chars | tree inspect + `assertCharLimit` | present, ≤70 |
| 9 | Pre-flight passes (server, authoritative) | `POST /api/preflight` → `report.ok===true` | no `error` findings (`docs/06 §6`) |
| 10 | **Human-approve gate enforced** | export before approve → `403`; after approve → `202` | both (CANON §7, `docs/06 §8`) |
| 11 | **Lineage complete** on the Variant | `assertLineageComplete(variantRow)` | see AT-1.4 |

### AT-1.4 Lineage completeness (CANON §5 verbatim field set — `docs/03 §variant`)

`assertLineageComplete` requires, on the exported Variant's row, ALL of:

| Column | Requirement |
|---|---|
| `brief_id` | = the fixture Brief's id |
| `brand_kit_version` | not null; = the BrandKit version pinned at generation (1) |
| `provider` | not null (e.g. `'bfl'` live; `'mock'` in CI) — an `ImageProvider.id` |
| `model` | not null (e.g. `'flux-2-pro'`) |
| `model_version` | not null (provider-reported string) |
| `seed` | present if the driver returned one (`GenResult.seed`) |
| `prompt` | not null; **imagery-only** (assert it contains **none** of the headline/CTA copy strings — CANON §2) |
| `negative_prompt` | not null; contains no-text tokens (`"no text"` / `"no words"` — `docs/05 §3.3`) |
| `parent_variant_id` | null for a root Variant (set only on fork/iterate/localize) |
| `created_by_kind` | `'agent'` for the generated Variant |
| `engagement` | JSONB object with at least `stoppingPower` (EngagementScores shape — AT-5) |

> **VERIFY before coding:** LinkedIn single-image spec — **1:1 = 1200×1200, ≤5 MB, headline ≤70 chars** — against
> the live 2026 ad-spec page (CANON §8; `docs/06 §5.2`). Encoder path: `encodeImageUnder5MB` (`docs/06 §8.1`)
> must land ≤5 MB; a 1200×1200 photographic JPG lands far under (test also asserts the size loop terminates and
> never throws `cannot_hit_5mb` for the golden fixture).

---

## AT-2 — Brief → 3-slide carousel (hook→reframe→close) → PDF document ad

**Proves:** the carousel/document-ad path: `CarouselArchitect` narrative (CANON §7, `docs/07 §4`) + ordered
`Slide[]` (CANON §5) + multi-page PDF export (`docs/06 §8.2`). Continuity + per-slide narrative roles must be
real, not cosmetic.

### AT-2.1 Fixture

Same `brief.legal-de.json` but `{ "adType": "carousel", "slideCount": 3, "aspect": "1:1" }`.

### AT-2.2 Steps

```gherkin
Scenario: AT-2 — 3-slide carousel to PDF document ad
  Given AT-0 preconditions hold
  When  POST /api/studio/brief-to-board with adType=carousel, slideCount=3
  Then  the top Variant is a carousel with an ordered slides[] of length 3    # docs/03 §variant (carousel)
  And   slide roles are exactly [hook, reframe, close] in order 0,1,2         # docs/05 §3.4; docs/07 §4
  When  I human-approve the Variant
  And   POST /api/export { variantId: V, format: "pdf" }                      # docs/06 §8.2 documentAd
  Then  a Render(kind=pdf) is produced
```

### AT-2.3 Pass criteria (ALL — measurable)

| # | Criterion | Oracle | Threshold |
|---|---|---|---|
| 1 | Exactly **3 slides**, `order` dense 0,1,2 | tree inspect | `=== [0,1,2]` |
| 2 | **Narrative roles** hook→reframe→close | `slides[i].role` | `['hook','reframe','close']` |
| 3 | Slide 0 is the hook and **carries no primary CTA**; slide 2 (`close`) carries the CTA + `legal` (if mandated) | tree inspect | per `docs/07 §4` |
| 4 | **Continuity**: a shared continuity layer (logo/frame/progress) appears on **every** slide | `continuityRefs` present on all slides | 3/3 (`docs/06 §9.3`) |
| 5 | Each slide canvas = **1080×1080** (doc-ad default) | tree inspect | exact (CANON §8; `docs/06 §5.2`) |
| 6 | Export is a **single multi-page PDF** with **3 pages** in slide order | `pdf-lib`: `getPageCount()===3`; render page N ≈ slide N thumbnail | 3 pages, order preserved |
| 7 | PDF page pixel size corresponds to 1080×1080 at pixelRatio 1 | pdf page mediaBox | matches |
| 8 | No baked text on any slide background | `assertNoBakedText` per slide | 0 glyphs each |
| 9 | On-brand palette+fonts on every slide | `assertOnPalette`/`assertFonts` per slide | 0 violations |
| 10 | Pre-flight passes **per-slide and deck-level** (page count ≤ ~10–12) | `POST /api/preflight` → `ok` + `byRatio` clean | no errors (`docs/06 §9.4`) |
| 11 | **Hook is the thumb-stopper** (engagement) | `perSlide[0].stoppingPower.value === max(perSlide[*].stoppingPower.value)` | slide 0 max (`docs/08 §5.3`; AT-5) |

> **VERIFY before coding:** LinkedIn **document-ad** delivery = **PDF**, page count (~10–12 max), and 1080×1080
> recommendation (CANON §8). `polotno-node` **native PDF** (`jsonToPDFBuffer`) vs the `pptxgenjs`/multi-PNG
> fallback (`docs/06 §8.4`) — if native PDF is used, assert fonts embed (Playfair/Inter) and no system-font
> substitution occurs (compare a rendered page against the slide PNG within the parity tolerance `docs/06 §7.4`).

---

## AT-3 — Chat-edit applies a `LayerPatch`, never a re-roll

**Proves:** the load-bearing anti-re-roll decision (CANON §2/§4): natural-language edits emit **typed
`LayerPatch` diffs**; text/style/transform edits cost **zero image credits** (`docs/05 §5.4`, §6; `docs/06 §4`).
Three sub-cases, each a real instruction from the prompt.

### AT-3.1 Setup

Start from the approved AT-1 Variant `V` (single_image). Record `t0 = now()` and the current
`Render`/asset SHA for `V`'s background image layer.

### AT-3.2 Sub-case A — "make the headline punchier"

```gherkin
Scenario: AT-3A — punchier headline is a set_text patch, not a re-roll
  When  POST /api/editor/patch { variantId: V, instruction: "make the headline punchier",
          selection: { layerIds: [<headline layer id>] } }                    # docs/06 §4.3
  Then  response.patch.ops contains a { op: "setText", layerId: <headline> } op   # docs/06 §4.1
  And   NO op with op ∈ { replaceAsset }                                        # not a re-roll
  And   response.preflight is attached and ok===true
```

**Pass:** patch is a `setText` on the headline layer; new headline `assertCharLimit(.., 70)`; the **background
image asset SHA is byte-identical** to before (`assertNoImageJob(t0, V)` returns 0 image `generation_job`s);
an `AgentRun(agent='EditorAgent', model='claude-sonnet-5')` row is written with `cost_usd > 0` and **no**
`generation_job` for imagery (`docs/05 §7`).

### AT-3.3 Sub-case B — "switch theme" (style/color)

```gherkin
Scenario: AT-3B — switch theme applies set_style/set_fill patches within BrandKit
  When  POST /api/editor/patch { variantId: V, instruction: "switch to the gold theme" }
  Then  response.patch.ops are set_style / set_fill ops on text/cta/shape layers  # docs/06 §4.1
  And   every resulting fill ∈ BrandKit palette (off-brand requests are SNAPPED, not honored)  # docs/05 §3.9
  And   NO replaceAsset op, NO image generation_job since t0
```

**Pass:** all changed colors ∈ `brandKit.palette` (assert via `assertOnPalette`); `assertNoImageJob(t0, V) === 0`;
if the model proposed an off-palette color, the applied fill is the nearest palette member and `patch.note`/
`summary` explains the snap (`docs/05 §3.9` guardrail 2).

### AT-3.4 Sub-case C — "move the logo (top-right)"

```gherkin
Scenario: AT-3C — move logo is a set_transform/move patch
  When  POST /api/editor/patch { variantId: V, instruction: "move the logo to the top-right corner" }
  Then  response.patch.ops contains a { op: "move" } (or set_transform) on the logo layer  # docs/06 §4.1
  And   NO replaceAsset op, NO image generation_job since t0
```

**Pass:** patch is a `move`/`set_transform` on the `logo` layer; the logo bbox after apply lies inside the
top-right safe box for 1:1 (`docs/06 §5.2`); `assertNoImageJob(t0, V) === 0`.

### AT-3.5 Cross-cutting pass criteria (ALL three sub-cases)

| # | Criterion | Oracle |
|---|---|---|
| 1 | **Zero image credits** across A+B+C | `assertNoImageJob(t0, V) === 0` (CANON §2; `docs/05 §5.4`) |
| 2 | Every edit is a typed op from the `LayerPatch` union | `LayerPatch` zod parse succeeds; op ∈ enum (`docs/05 §6.1`, `docs/06 §4.1`) |
| 3 | Edits route through `applyLayerPatch` on the **canonical tree**, then re-project to Polotno (single undo stack) | after each, `undo()` restores byte-identical prior tree; `redo()` re-applies (`docs/06 §11`) |
| 4 | Patched tree **re-passes `BrandGuardian`** before human-approve | `BrandVerdict.pass===true` post-apply (`docs/05 §6.3` guardrail 5) |
| 5 | A **real re-roll** (control) DOES create a job | `POST /api/editor/regenerate` on the bg layer → exactly 1 image `generation_job` since its own t0 (`docs/06 §4.4`) — proves the harness can tell the difference |
| 6 | Ambiguous instruction returns `clarify`, **no patches** | send "make it better" → `response.clarify` set, `patches:[]` (`docs/05 §3.9` guardrail 6) |

> **[ASSUMPTION]** In `mock` mode the `anthropic.mock.ts` returns a deterministic `LayerPatchSet` per instruction
> string so A/B/C are byte-deterministic. In `live` mode the assertions are structural (op kinds, zero image
> jobs, char limits, palette membership) — never exact string equality on model output.

---

## AT-4 — Pre-flight catches a low-contrast headline

**Proves:** the quality gate (`docs/06 §6`): WCAG contrast is **sampled under the actual rendered pixels beneath
each glyph run** (not fg-vs-solid-bg), and a failing contrast **blocks export** (hard error), with a proposed
scrim auto-fix. This is the exact prior-attempt pain (illegible text on busy AI imagery) turned into a gate.

### AT-4.1 Fixture (`e2e/fixtures/trees/single_image.low-contrast.json`)

A hand-authored canonical tree where a **gold `#cba65e` headline** sits over a **light-luminance region** of the
background (so measured contrast < 4.5:1). Determinism: the background is a **fixed fixture PNG** (checked in), so
the test does not depend on any generator. A sibling golden `single_image.on-brand.json` (dark scrim behind the
same headline) must PASS.

### AT-4.2 Steps

```gherkin
Scenario: AT-4 — low-contrast headline fails pre-flight and blocks export
  Given the low-contrast Variant V_bad and the on-brand Variant V_good are loaded
  When  POST /api/preflight { variantId: V_bad }                              # docs/06 §6.3, authoritative
  Then  report.ok === false
  And   report.findings contains a finding with rule='wcag.contrast', severity='error', layerId=<headline>
  And   finding.measured < 4.5 and finding.threshold >= 4.5                   # docs/06 §6.1 table
  When  POST /api/export { variantId: V_bad, format: "jpg", ratios: ["1:1"] }
  Then  the export is REFUSED with 422 and the PreflightReport (blocked)       # docs/06 §8 flow step 2
  When  POST /api/preflight { variantId: V_good }
  Then  report.ok === true  (no wcag.contrast error)                          # the on-brand control passes
```

### AT-4.3 Pass criteria (ALL — measurable)

| # | Criterion | Oracle | Threshold |
|---|---|---|---|
| 1 | Low-contrast tree **fails** with a `wcag.contrast` **error** on the headline layer | preflight report | `ok===false`, finding present |
| 2 | Measured ratio is **below threshold** | finding.measured vs finding.threshold | `< 4.5:1` normal text (≥3:1 large text applies for ≥24px bold / ≥28px regular — `docs/06 §6.1`) |
| 3 | **Independent oracle agrees** | `assertContrastAtLeast(png, tree, '1:1')` recomputes contrast **from separate code** (`e2e/lib/contrast.ts`) | matches product's finding (both < 4.5) |
| 4 | Contrast is **sampled under the glyph run**, not fg-vs-solid | perturb: add a dark scrim `shape` under the headline → re-run → now passes | proves per-glyph sampling (`docs/06 §6.2`) |
| 5 | **Export is hard-blocked** while the error stands | `POST /api/export` → `422` + report | never produces a Render (`docs/06 §8`) |
| 6 | **Auto-fix proposal** offered (not auto-applied) | preflight/edit response includes a proposed scrim `LayerPatch` (`add_layer` shape) | present, not applied without consent (`docs/06 §6.2`) |
| 7 | Applying the proposed scrim patch makes pre-flight pass | apply patch → `POST /api/preflight` → `ok===true` | passes; still **zero image credits** (a scrim is a `shape` layer, AT-3 invariant) |
| 8 | On-brand control passes | `V_good` preflight `ok===true` | no false positive |

> **VERIFY before coding:** WCAG 2.x contrast thresholds (**4.5:1** normal, **3:1** large) still current for the
> a11y bar (`docs/06 §14.8`). The product's contrast code (`packages/shared/preflight.ts §6.2`) rasterizes the
> slide at export resolution and samples mean luminance under each glyph-run box — the test's independent oracle
> must do the same to agree.

---

## AT-5 — Engagement score returns a band with per-slide breakdown

**Proves:** `EngagementPredictor` (CANON §6) returns **bands + confidence**, never a bare CTR (CANON §9;
`docs/08`); carousels return a per-slide breakdown with continuity flags; the commercial path is
`ENGAGEMENT_BACKEND=saliency` and **never** `tribe_research`.

### AT-5.1 Steps

```gherkin
Scenario: AT-5 — engagement returns bands + per-slide breakdown, saliency backend only
  Given the AT-2 carousel Variant V (3 slides, one PNG Render per slide)
  When  the EngagementAnalyst scores V via ProviderBus.predictor(job)          # docs/05 §3.8; docs/08 §10.3
        (POST ENGINE_URL/v1/score/carousel with slideRenderIds in order)       # docs/08 §10.3
  Then  the returned EngagementScores has backend='saliency'
  And   every top-level metric is a band, and perSlide[] has one entry per slide
```

### AT-5.2 Pass criteria (ALL — measurable)

| # | Criterion | Oracle | Threshold |
|---|---|---|---|
| 1 | `backend === 'saliency'` | scores.backend | never `'tribe_research'` (CANON §9) |
| 2 | `saliencySource` is a real driver id | e.g. `'saliency.transalnet'` (`docs/08 §6.1`) | non-empty |
| 3 | **Every top-level metric is a band** | `assertBand()` on `focalClarity, valuePropAttention, ctaAttention, clutter, stoppingPower` | `band[0]<=value<=band[1]`, `band[1]>band[0]`, `0<=confidence<=1` |
| 4 | **`predictedCtrBand` is a range**, never a point | `predictedCtrBand.low < predictedCtrBand.high`, has `confidence` | strict inequality (CANON §6; `docs/08 §9`) |
| 5 | **Per-slide breakdown** present for the carousel | `perSlide.length === 3`, each has `position` + `stoppingPower` + `ctaAttention` | 3 entries (`docs/08 §5.2`) |
| 6 | **Continuity flag** computed | each `perSlide[i].continuityFlag ∈ {ok, weak_hook, stopping_power_dip, weak_cta}` | present (`docs/08 §5.3`) |
| 7 | **Cold-start honesty:** thin tenant data → **wide band, low confidence** | with 0 `Result` rows, `confidence <= 0.4` and band width > a floor | wide+low (`docs/08 §9.3`) |
| 8 | Scores persisted to `Variant.engagement{}` via the **web callback** (web owns RLS) | `variant.engagement` JSONB matches EngagementScores shape | matches `docs/03 §8.3` |
| 9 | **No bare CTR number** anywhere in the UI/response | grep response for a scalar CTR outside `predictedCtrBand` | none (`docs/08 §9.6`) |
| 10 | **TRIBE is unreachable on this path** | force `preferDriver='research.tribe'` with `tenantFacing:true` → engine returns `LicenseGuardError` (4xx); web `score-callback` rejects any `backend==='tribe_research'` with 400 | hard-error (CANON §9; `docs/08 §6.3, §8.4`) |
| 11 | **Board ranks by `stoppingPower` band** | board order === sort by `engagement->'stoppingPower'->>'value'` desc | matches `variant_stopping_power_idx` (`docs/03`) |

> **[ASSUMPTION]** In CI, `engine.mock.ts` returns deterministic `EngagementScores` satisfying the band
> invariants so criteria 3–6 are exact. In `live` mode the assertions are structural (band ordering, backend id,
> per-slide count, TRIBE hard-error) — never exact numeric equality. **VERIFY before coding:** the engine's
> `/v1/score/carousel` request shape (`slideRenderIds` in order) and the `score-callback` contract (`docs/08 §10`).

---

## AT-6 — DE localization transcreates (not literal), TTS-safe numbers

**Proves:** localization is first-class (CANON §1/§7): `LocalizationAgent` **transcreates** DE⇄EN (native, not a
literal string swap), keeps **numerals on-screen** but **spells numbers out for the VO** ("zwölfhundert"), and
emits `set_text` `LayerPatch`es only — **no imagery re-roll** (`docs/05 §3.10`).

### AT-6.1 Steps

```gherkin
Scenario: AT-6 — localize an EN single-image ad to native German, TTS-safe VO numbers
  Given the approved AT-1 Variant V (English), whose copy includes the numeral "1200"
  And   record t0 = now()
  When  the LocalizationAgent runs { tree: V, fromLang:'en', toLang:'de', forVoiceover:true }  # docs/05 §3.10
  Then  it returns a LocalizationResult with set_text patches for text/cta/legal/smart layers only
  And   a voiceoverScript is present (because forVoiceover=true)
```

### AT-6.2 Pass criteria (ALL — measurable)

| # | Criterion | Oracle | Threshold |
|---|---|---|---|
| 1 | Result is **German, not English** | language-id (`franc`/cheap classifier) on `onScreenText` values | detected `de` |
| 2 | **Transcreation, not literal** | the DE headline is **not** a word-for-word map of the EN (edit-distance / token-overlap heuristic below threshold) **and** reads as native DE | not a literal 1:1 translation ([ASSUMPTION], see note) |
| 3 | **On-screen numerals kept** | the on-screen DE text still contains "1.200" / "1200" (numeral, not word) | numeral present (`docs/05 §3.10` output 1) |
| 4 | **VO numbers spelled out** | `voiceoverScript` contains the **word** form (e.g. "zwölfhundert" / "eintausendzweihundert"), **no raw numeral** in the VO string | 0 digits in `voiceoverScript`; `ttsNormalizations` records `{original:"1200", spelled:"…"}` |
| 5 | **Only `set_text` patches** (no imagery) | every patch op === `set_text` on `text/cta/legal/smart` | 0 `replace_image`/`replaceAsset`; `assertNoImageJob(t0, V) === 0` |
| 6 | **`legal` translated faithfully**, not creatively transcreated | the `legal` layer's DE text preserves the disclaimer's meaning (present + semantically equivalent) | present (`docs/05 §3.10` guardrail 3) |
| 7 | Char limits respected in DE (German runs longer) | `assertCharLimit(headline, 70)`, on-image 60, cta 24 | within limits; else pre-flight overflow flag (`docs/06 §5.3` locale-stable) |
| 8 | Localized Variant re-passes `BrandGuardian` (localization rule) | `BrandVerdict.pass===true` | passes (`docs/05 §3.10` guardrail 4) |
| 9 | Localized Variant is a **fork** with lineage `parent_variant_id = V` | db row | set (`docs/03 §variant`) |
| 10 | Re-layout after localization is **locale-stable** | 1:1→4:5 re-layout runs after localization; DE overflow surfaces as a pre-flight flag, not silent crop | `report.byRatio` per-locale (`docs/06 §5.3` guarantee 5) |

> **[ASSUMPTION]** "Not literal" is measured structurally: (a) the DE output passes a German language-id check;
> (b) the DE headline is **not** the output of a naive dictionary map of the EN (we assert token-overlap with a
> machine word-for-word baseline is below a threshold, i.e. the agent rephrased); (c) in CI the mock returns a
> known-native DE transcreation. We **do not** grade "nativeness" numerically in CI. **⚑ RECOMMENDATION:** for
> `live` mode, add a Sonnet-graded rubric check ("is this native, idiomatic German for law-firm partners, Sie-form,
> sober register?" → pass/fail) as a **non-blocking** signal, since LLM-graded nativeness is not deterministic.
> **VERIFY before coding:** ElevenLabs DE number pre-spelling is mandatory (do not rely on
> `apply_text_normalization` for DE) — on-screen and VO strings diverge by design (`docs/04 §6.3`; R2 §4.4).

---

## AT-7 — Provider fallback when the primary image API errors

**Proves:** providers sit behind the `ImageProvider`/`ProviderBus` interface (CANON §6), and a **primary-driver
failure falls through the ranked policy chain** to the next driver, transparently to the caller — never an empty
board (`docs/04 §3.2, §5.2, §5.5`).

### AT-7.1 Setup

Use `mocks/image-provider.flaky.ts`: the **rank-1** driver for `job.kind='hero'` (`bfl · flux-2-pro`,
`docs/04 §5.2`) throws `ProviderError('provider_failed', { retryable:false })` on `generate()`. The **rank-2 /
rank-3** drivers (`bfl · flux-2-max`, then `fal · seedream v4.5`) succeed and return a deterministic PNG.
(Live-mode variant: point rank-1 at an invalid base URL / revoked key so the real wrapper falls through.)

### AT-7.2 Steps

```gherkin
Scenario: AT-7 — hero image falls back from rank-1 to a working driver
  Given the rank-1 hero driver fails and rank-2/3 succeed
  When  POST /api/studio/brief-to-board with brief.legal-de.json (single_image)
  Then  every Variant still renders (no empty tiles)
  And   the failing driver's failure is logged, and the succeeding driver is recorded in lineage
```

### AT-7.3 Pass criteria (ALL — measurable)

| # | Criterion | Oracle | Threshold |
|---|---|---|---|
| 1 | **Board is non-empty** despite rank-1 failure | count Variants with a Render | `=== variantCount` (`docs/04 §3.2` "explain, not swallow"; never empty board) |
| 2 | **Fallback happened**: lineage records the **rank-2/3** driver, not rank-1 | `variant.provider`/`variant.model` = the succeeding driver (e.g. `bfl·flux-2-max` or `fal·seedream`) | matches a lower-ranked policy entry (`docs/04 §5.2`) |
| 3 | The **failed attempt is logged** | a `generation_job`/`AgentLog` row for the rank-1 driver with error `code='provider_failed'` and a `status` from the frozen `job_status` superset (terminal `'failed'`/`'dead'` — CANON §12 L3) | present; classified per `ProviderError` (`docs/04 §3.1`) |
| 4 | **Retryable vs non-retryable honored** | `provider_failed` retried **1×** on the same driver, then falls through (`docs/04 §3.2` table row) | 1 retry then fallback |
| 5 | **`rate_limit` (429)** path also falls back after backoff (separate case) | inject 429 on rank-1 → retries with backoff (honor `Retry-After`), then rank-2 | falls back (`docs/04 §2.2, §3.2`) |
| 6 | **`auth` (401/403) never falls to other keys** | inject `auth` on rank-1 → **no** fallback, generic "service misconfigured" surfaced, ops alert | no silent fallback (`docs/04 §3.2` — all-our-key errors) |
| 7 | **Exhaustion is explained, not swallowed** | make ALL ranked drivers fail → UI shows an explain state + manual-retry, **not** a blank tile | explicit error surface (`docs/04 §3.2` "all exhausted") |
| 8 | **Manual override still wins** | set `job.overrideDriverId` → the bus uses exactly that driver, no policy chain | override honored (CANON §6; `docs/04 §5.5`) |
| 9 | **Cost recorded for the driver that actually ran** | `generation_job.cost_usd` attributed to the succeeding driver | correct attribution |
| 10 | **`moderation` does NOT silently re-roll the same prompt** | inject `moderation` on rank-1 → surfaced to user with reason; fallback only if model-idiosyncratic, tagged `moderation_fallback` | per `docs/04 §3.2, §3.3` |

> **VERIFY before coding:** the concrete provider IDs/model slugs in the policy chain (`docs/04 §5.2`) —
> `bfl·flux-2-pro → bfl·flux-2-max → fal·seedream v4.5` for `hero` — and the `ProviderError` mapping from each
> provider's real status/body (BFL `status='Error'`, fal `nsfw`/`content_policy`, etc., `docs/04 §3.4`). The
> `makeFallbackImageProvider` wrapper (`docs/04 §5.5`) is the unit under test; assert it (a) checks cache first,
> (b) walks the chain per `§3.2`, (c) writes cache + cost on success.

---

## AT-8 — Spend cap blocks a runaway brief

**Proves:** hard per-brief and per-workspace `cost_usd` caps are enforced **pre-flight** — the orchestrator
**refuses** a job that would breach the cap and never silently overspends (CANON §4/§10; `docs/05 §5.4`;
`docs/03 §workspace`).

### AT-8.1 Fixtures

- **Per-brief cap case:** `brief.runaway.json` = `brief.legal-de.json` with `variantCount: 50` and the
  workspace's **`spend_cap_usd_per_brief` column set low** (e.g. `$0.50`, CANON §12 L8) so the projected spend of 50 variants exceeds it.
- **Per-workspace cap case:** set `workspace.spend_used_usd_monthly = 499.90` and
  `spend_cap_usd_monthly = 500.00` (headroom `$0.10`), then submit a normal 4-variant brief whose projected cost
  exceeds `$0.10`.

### AT-8.2 Steps

```gherkin
Scenario: AT-8a — per-brief cap refuses a runaway brief pre-flight
  Given the workspace.spend_cap_usd_per_brief = $0.50 and brief.runaway.json (variantCount 50)
  When  POST /api/studio/brief-to-board with brief.runaway.json
  Then  the orchestrator refuses BEFORE spending: no full run occurs
  And   the response/last AgentRun status is 'budget_exceeded' (the agent runner emits 'budget_exceeded' — CANON §12 L3) with remaining budget shown

Scenario: AT-8b — per-workspace monthly cap refuses a brief pre-flight
  Given workspace.spend_used_usd_monthly = 499.90, spend_cap_usd_monthly = 500.00
  When  POST /api/studio/brief-to-board with a normal 4-variant brief
  Then  the orchestrator refuses to start the brief (would breach monthly cap)
```

### AT-8.3 Pass criteria (ALL — measurable)

| # | Criterion | Oracle | Threshold |
|---|---|---|---|
| 1 | **Pre-flight refusal** (before the expensive work) | `budget.assertRoom` throws; run halts at the first agent/gen that would breach (`docs/05 §5.2, §5.4`) | refused before the 50-variant fan-out |
| 2 | Status surfaced as **`budget_exceeded`** (agent-runner emits it; `agent_run_status` enum value — CANON §12 L3) | last `AgentRun.status` / response | `'budget_exceeded'` (`docs/03` `agent_run_status`) |
| 3 | **Spend is bounded**: total `cost_usd` charged for the refused brief ≤ the cap | `sum(agent_run.cost_usd + generation_job.cost_usd) for brief` | `<= per_brief_cap` (never exceeds) |
| 4 | **No surprise charge**: `spend_used_usd_monthly` never crosses `spend_cap_usd_monthly` | workspace row after | `spend_used <= spend_cap` always |
| 5 | **Remaining budget shown**, not a raw error | response body includes remaining per-brief + per-workspace budget | present (`docs/05 §5.4`) |
| 6 | Per-workspace case (AT-8b) refuses to **start** | no Variants created; monthly `spend_used` unchanged | 0 new variants |
| 7 | A **within-budget** control brief succeeds | normal 4-variant brief under an ample cap → board of 4 | proves the cap doesn't false-positive |
| 8 | **Image edits stay free under the cap** (cross-check AT-3) | after hitting the cap, a `set_text` chat-edit on an existing Variant still works (0 image credits) | edits are pure diffs, uncapped by image spend (`docs/05 §5.4`) |
| 9 | Cap is enforced by the **orchestrator/agent-runner, not a prompt** | code path: `assertBudget` → `budget.assertRoom` (deterministic) | not model-decided (`docs/05 §2.4, §5.2`) |

> **[ASSUMPTION]** Per-brief cap default is **$2.00** and lives in workspace config (`docs/05 §5.4`); per-workspace
> monthly cap default is **$500.00** on `workspace.spend_cap_usd_monthly` (`docs/03 §workspace`). The test sets
> both explicitly rather than relying on defaults. Per CANON §12 L8 the per-brief cap is a **real column**
> `workspace.spend_cap_usd_per_brief` in `docs/03` (not only workspace-config JSON), so AT-8 asserts it in SQL.
> The `AgentRun.status` value is resolved by CANON §12 L3 to `'budget_exceeded'` (the `docs/05` agent runner emits it;
> it is the `agent_run_status` enum value in `docs/03`); AT-8 asserts `'budget_exceeded'` (see §3, X-1).

---

## 1. Cross-cutting invariants every AT re-checks (the "never" list)

These are asserted by shared teardown after **every** AT, so a regression anywhere trips a test:

| # | Invariant | Oracle | Source |
|---|---|---|---|
| I-1 | **No baked text**: no legible headline/CTA/logo text rendered *into* any generated image | OCR over image-layer bboxes = 0 target glyphs | CANON §2 |
| I-2 | **RLS holds**: no AT ever reads/writes across `workspace_id` | second-workspace probe sees 0 rows | CANON §4; `docs/03` |
| I-3 | **Every gen + agent call logged** with `cost_usd` | `generation_job` / `agent_run` rows exist for the run | CANON §4; `docs/05 §5` |
| I-4 | **Editor↔export parity**: any exported render matches the editor preview within tolerance | golden pixel-diff < 0.5% (`docs/06 §7.4`) | `docs/06 §7` |
| I-5 | **Bands, never point CTR** in any surfaced score | no scalar CTR outside `predictedCtrBand` | CANON §6/§9 |
| I-6 | **Nothing ships un-approved**: export requires the human-approve flag | export pre-approve → `403` | CANON §7 |
| I-7 | **TRIBE never on a tenant path** | any tenant-facing resolve to `research.tribe` → hard error | CANON §9; `docs/08 §6.3` |
| I-8 | **Model ids from config, not hardcoded** | grep source for a literal `'claude-opus-4-8'`/`'flux-2-pro'` outside config → 0 | `docs/05 §9`, `docs/04` |

---

## 2. Test harness, determinism & CI wiring

### 2.1 Determinism levers (so AT-1…AT-8 are stable)

| Non-determinism source | Control |
|---|---|
| Image/video generation | `mock` mode returns a **checked-in seeded PNG**; `live` mode asserts **structural** properties only (dims/size/palette/no-baked-text/lineage), never pixel equality |
| LLM agent output | `anthropic.mock.ts` returns canned, schema-valid tool outputs per agent; `live` mode asserts **structural** properties (op kinds, char limits, band ordering, backend id) |
| Engagement scores | `engine.mock.ts` returns fixed band-valid `EngagementScores`; `live` asserts band invariants only |
| Time | freeze `now()` per AT for `scoredAt`/lineage timestamps where compared |
| Font rendering | embed Playfair/Inter woff2 in `packages/render/assets/fonts`; no system fallback (`docs/06 §7.3`) |
| Contrast oracle | **independent** recompute in `e2e/lib/contrast.ts` (not the product's code) — AT-4 |

### 2.2 CI gate (`.github/workflows/e2e.yml` — skeleton)

```yaml
# runs on every PR; blocks merge. Live suite runs nightly + on release tags.
jobs:
  acceptance:
    steps:
      - run: pnpm -w install
      - run: pnpm -w typecheck && pnpm -w build
      - run: supabase db reset && psql < e2e/fixtures/workspace.seed.sql   # AT-0
      - run: pnpm -w test:render-parity        # docs/06 §7.4 + §3 round-trip (AT-0 prereq)
      - run: E2E_MODE=mock pnpm -w test:e2e     # AT-1 … AT-8 (deterministic, $0)
  acceptance-live:
    if: github.event_name == 'schedule' || startsWith(github.ref, 'refs/tags/')
    env: { E2E_MODE: live, E2E_PER_BRIEF_CAP_USD: "1.00" }   # AT-8 proves the cap holds in live
    steps:
      - run: pnpm -w test:e2e                    # same specs, real providers/LLM/engine
```

**Release gate:** a build is shippable **iff** `acceptance` (mock) AND `acceptance-live` are green AND the
`docs/06 §13` phase criteria are green. A single red AT blocks the release.

### 2.3 Traceability — every AT maps to a build phase (CANON/R7)

| AT | Depends on build phase(s) (`docs/06 §13`, R7) | First runnable at |
|---|---|---|
| AT-0 | migrations + render spine (P1) | P1 |
| AT-1 | P1 (render) + agents (P3) + board (P4) + export (P5) | P5 |
| AT-3, AT-4 | P4 editor + pre-flight | P4 |
| AT-2 | P7 carousel | P7 |
| AT-5 | engagement engine (P6/P8) | P8 |
| AT-6 | localization agent (P4/P8) | P8 |
| AT-7 | ProviderBus + fallback (P2/P3) | P3 |
| AT-8 | orchestrator + cost caps (P3) | P3 |
| video AT (see §4) | P9 video | P9 |

---

## 3. Cross-document inconsistencies this test doc surfaces (⚑ must reconcile before coding)

| # | Inconsistency | Docs | Reconciliation (AT asserts the reconciled value) |
|---|---|---|---|
| X-1 | Agent-run cap status string (an earlier `docs/05` draft used a non-canonical label) | `docs/05 §5.3` vs `docs/03` (`agent_run_status` enum) | **Resolved by CANON §12 L3:** `agent_run_status` includes `'budget_exceeded'` (NOT `capped`); the `docs/05` agent runner emits `'budget_exceeded'`. AT-8 asserts `'budget_exceeded'`. |
| X-2 | Model slug spelling `'flux-2-pro'` (`docs/03 §variant` comment) vs `'flux-2-pro'` (`docs/04 §5.2`) | `docs/03` vs `docs/04` | Store **exactly what the provider returns** (`docs/03 §5 VERIFY`); AT-1 lineage assert checks non-null + provider-reported, not a hardcoded spelling. |
| X-3 | Per-brief cap was workspace **config** (`docs/05`) but not a DB **column** (`docs/03`) | `docs/05 §5.4` vs `docs/03 §workspace` | **Resolved by CANON §12 L8:** `workspace.spend_cap_usd_per_brief` is a real **column** in `docs/03`; AT-8 asserts it in SQL. |
| X-4 | `ENGINE_SHARED_SECRET`, `WEBHOOK_SIGNING_SECRET`, `POLOTNO_API_KEY` used but absent from CANON §10 env list | `docs/08 §10`, `docs/06 A3` | **Resolved by CANON §12 L8:** `ENGINE_SHARED_SECRET` + `WEBHOOK_SIGNING_SECRET` are added (both required) to `docs/11` §6 `.env.example` + §3 matrix (with optional `RENDER_URL`); `POLOTNO_API_KEY` also lives in `.env.example`. AT-0 asserts `ENGINE_SHARED_SECRET` + `WEBHOOK_SIGNING_SECRET` presence. |

These are **flagged, not silently resolved** — the factory must reconcile them in the owning docs; the AT suite
then asserts the single reconciled value.

---

## 4. Fast-follow: video acceptance test (AT-V, P9 — CANON §0 "video first-class fast-follow")

Not in the required eight, but specified now so the video path has a gate the moment P9 lands (mirrors
`docs/06 §13 P9`).

```gherkin
Scenario: AT-V — brief → muted-first video ad with burned-in DE captions
  Given a video AdDocument (Kling i2v clip + ElevenLabs DE VO + brand overlay layers)   # docs/06 §10
  When  POST /api/export { variantId: V, format: "mp4" }
  Then  the MP4 is h264, plays MUTED (no audio needed to understand it)
```

**Pass:** ratio ∈ {1:1, 4:5, 16:9} (CANON §8); **≤200 MB** (`assertUnderBytes(buf, 200*2**20)`); **burned-in
captions present & legible** (WCAG contrast on sampled caption frames ≥ threshold, `docs/06 §10.4, §6.2`);
**first-3-seconds** `firstThreeSeconds` band returned by `video.heuristic` (`docs/08 §5.4`); VO uses
**pre-spelled DE numbers** (AT-6 rule); lineage complete per CANON §5 (per-clip provider/model/seed,
`docs/03 §video`). **VERIFY before coding:** Remotion `renderMedia` h264 + `@remotion/captions` burn-in;
ElevenLabs `with-timestamps` caption timing; LinkedIn video ≤200 MB (`docs/06 §14.5–14.7`).

---

## 5. Consolidated "VERIFY before coding" (this document)

1. **LinkedIn 2026 ad specs** — 1:1=1200×1200, ≤5 MB, headline ≤70; document-ad = PDF ~10–12 pages @1080×1080;
   video ≤200 MB (CANON §8; AT-1/AT-2/AT-V).
2. **WCAG 2.x** thresholds (4.5:1 / 3:1) still current (AT-4; `docs/06 §14.8`).
3. **Provider policy chain** IDs/slugs + `ProviderError` mapping per provider (AT-7; `docs/04 §5.2, §3.4`).
4. **Engine contract** — `/v1/score/carousel` request shape + `score-callback` (AT-5; `docs/08 §10`).
5. **ElevenLabs DE number pre-spelling** mandatory; on-screen vs VO strings diverge (AT-6; `docs/04 §6.3`).
6. **Anthropic** structured tool outputs + model ids from config (AT-3/AT-6; `docs/05 §9`).
7. **`AgentRun.status` cap value** — resolved to `'budget_exceeded'` per CANON §12 L3 (agent runner emits it; `agent_run_status` enum value); AT-8 asserts it (X-1).
8. Test-only deps (`sharp`, `tesseract.js`, `pdf-lib`, `franc`) — pin versions; the AT-4 contrast oracle stays
   **independent** of product code.

<!-- Conforms to CANON §0/§2/§4/§5/§6/§7/§8/§9/§10. Canonical names used verbatim: Workspace, BrandKit, Campaign,
     Brief, AdDocument, Variant, Slide, Layer; IntakeAgent, Strategist, Copywriter, ArtDirector, CarouselArchitect,
     CompositorPlanner, BrandGuardian, Critic, EngagementAnalyst, EditorAgent, LocalizationAgent; ImageProvider,
     VideoProvider, AudioProvider, LlmProvider, EngagementPredictor, ProviderBus; LayerPatch; EngagementScores;
     ENGAGEMENT_BACKEND (saliency|tribe_research), RESEARCH_MODE, ENGINE_URL. Endpoints/schemas taken from docs/03
     (data model), docs/04 (providers), docs/05 (agents/LayerPatch/cost caps), docs/06 (editor/preflight/export/
     render), docs/07 (playbook), docs/08 (engagement). Assumptions flagged [ASSUMPTION]; deviations ⚑ RECOMMENDATION;
     drift-prone facts VERIFY before coding. Cross-doc inconsistencies surfaced in §3, not silently resolved. -->
