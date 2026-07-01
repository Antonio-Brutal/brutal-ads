# 06 — Editor & Compositor

> ⚠️ **CROSS-REFERENCE NOTE — read first (authoritative, per CANON §12 L1).** Some inline `docs/NN` / `doc NN` pointers in this file predate the frozen document map and may cite the wrong number. **Resolve every cross-reference by ROLE using this map, not by the integer written inline:** `01` product · `02` architecture · `03` data-model (all DDL/zod/schemas) · `04` providers · `05` agent-studio · `06` editor + `packages/render` + export · `07` creative-playbook · `08` engagement · `09` brand-kit · `10` build-plan · `11` env · `12` security/ops · `13` acceptance · `14` appendix. There is **no localization doc** (localization lives in `05` LocalizationAgent + `09` brand-kit `localization` + `07`) and **no "exporter" doc** (export lives in `06`). Source paths are `apps/web/src/**` (never `apps/web/lib/**`). Where anything here disagrees with CANON §12, **the ledger wins.**

> **Scope.** The editing surface and the render/export engine of Brutal Ads: the **Polotno-based layered
> editor** wrapped behind `EditorAdapter`; **direct manipulation** (drag/resize/type) + **chat-to-edit**
> (`EditorAgent` → typed `LayerPatch`); **regenerate-single-layer**; the **carousel / document builder**
> (ordered `Slide[]`, continuity, reorder, per-slide edit); the **Remotion video editor**; the **SHARED
> HEADLESS RENDER MODEL** that guarantees editor↔export pixel parity; the **multi-format smart re-layout**
> algorithm with safe-zones; **live pre-flight** (WCAG contrast sampled under text, legibility, spec, brand,
> safe-zones); and **export** to JPG/PNG ≤5 MB, **PDF** document ads (the sole v1 document-ad format), and MP4.
> **PPTX is out of scope for v1** (CANON §12 L3): it is NOT a native `polotno-node` output; LinkedIn
> document/carousel ads ship as **PDF**. (LinkedIn *accepts* PPT/PPTX uploads, but our render does not
> produce PPTX in v1; any post-v1 PPTX is a flagged `pptxgenjs` post-render step only — §8.4, never via `polotno-node`.)
>
> **Conforms to `CANON.md`** — object model (`AdDocument → Variant → Slide → Layer`), layer types, provider
> contracts, agent names (`EditorAgent`, `LocalizationAgent`, `BrandGuardian`, `Critic`), env vars, repo
> shape (`apps/web`, `packages/shared`, `packages/render`), and the load-bearing rule: **AI generates imagery
> only; every legible/on-brand element is a composited editable vector/text layer on a JSON layer tree.**
>
> **This document lives in the build order at CANON/R7 phases P1 (render spine), P4 (board + editor), P5
> (export), P7 (carousel), P9 (video).** Cross-refs: `docs/03` (object model & layer-tree schema),
> `docs/05` (agents), `docs/04` (providers/ProviderBus), `docs/08` (engagement), `docs/11` (env vars).

---

## 0. ASSUMPTIONS & FLAGS (read first)

| # | Assumption / flag | Why | Action for builder |
|---|---|---|---|
| **A0** | **Research file `R6-editor-compositor.md` was NOT present** at authoring time (only R1, R2, R4, R7 existed). This spec is derived from **R7 §1.1, §3, §6 (editor/render/`renderHints`/safe-zones/Polotno/`polotno-node`)**, **R2 §5 (Remotion)**, **R1 (export ratios/formats)**, and **CANON §4/§5/§8**. | Transparency. | If an R6 later appears, reconcile; R6 wins on editor/compositor specifics **only where it does not contradict CANON**. |
| **A1** | The **canonical layer tree** (`packages/shared`) is the source of truth; **Polotno store JSON is a derived, lossless projection** produced/merged only at the `EditorAdapter` boundary (R7 §1.1). Polotno is never the canonical store. | Keeps editor swappable (CANON §4); preserves `smart`/`legal`/localization semantics Polotno can't model. | Implement `toPolotno()` / `fromPolotno()` as pure, round-trippable functions with a golden-file test. |
| **A2** | Per-layer **`renderHints`** (R7 `⚑R-LT1`: `{safeZone, maxLines, autoFit, minFontPx}`, extended in §5.1 below) is an **additive** field on `Layer`, not a rename. | Deterministic multi-ratio re-layout (CANON §8). | Add to the `Layer` zod schema in `packages/shared` (coordinate with `docs/03`). |
| **A3** | **Polotno SDK is commercially licensed**; **`polotno-node`** renders headless (store JSON → PNG/JPG/PDF/SVG) with **no per-render fee** (R7 §6). Env key **`POLOTNO_API_KEY`** (R7 `⚑R-ENV1` — CANON §10 omitted it). **PPTX is NOT a native `polotno-node` output and is out of scope for v1** (CANON §12 L3) — LinkedIn document/carousel ads ship as **PDF**. | Legal/runtime blocker if unlicensed (watermark/limits). | Budget license; add `POLOTNO_API_KEY` to `docs/11` env block. |
| **A4** | **Remotion needs a Company License** for 4+ employees (R2 §5, R7 §6). Not a runtime key. | Legal. | Budget it; not an env var. |
| **A5** | The **same headless render code path** (`packages/render`) backs *both* the in-editor preview thumbnail generation *and* final export. The live-editing canvas is Polotno's WebGL/2D DOM renderer; **parity is enforced by a golden-image diff test**, not by assuming two renderers agree. | "editor↔export parity" is the load-bearing correctness property; two independent renderers WILL drift. | Ship the parity test in P1 (§7.4). |
| **A6** | `⚑ RECOMMENDATION (R-ED1)`: **`LayerPatch` is applied to the canonical tree, then re-projected to Polotno** — never applied directly to Polotno's store. This keeps chat-edit and drag-edit converging on one model and one undo stack. | Single source of truth for undo/redo, collab, lineage. | Route ALL edits (drag, chat, regenerate) through `applyLayerPatch(tree, patch)`. |
| **A7** | LinkedIn format numbers (ratios, ≤5 MB, ≤200 MB, char limits) are taken from **CANON §8** verbatim; re-confirm at ship time (R7 checklist #11). | Specs drift. | `VERIFY current docs before coding` at export cutover. |

---

## 1. COMPONENT MAP & FILE LAYOUT

```
apps/web/
  src/editor/
    EditorAdapter.ts            # interface (swappable editor boundary)
    adapters/
      PolotnoAdapter.tsx        # concrete: Polotno SDK <-> canonical tree
      RemotionAdapter.tsx       # concrete: video editor (Remotion Player + timeline)
    canvas/
      StaticCanvas.tsx          # single_image + per-slide carousel canvas (Polotno)
      CarouselBuilder.tsx       # ordered Slide[] strip: reorder, add, dup, per-slide edit
      VideoTimeline.tsx         # Remotion Player + tracks (clips/VO/subs/brand)
    chat/
      ChatToEdit.tsx            # NL box -> EditorAgent -> LayerPatch preview/apply
    preflight/
      PreflightPanel.tsx        # live pre-flight badge list (WCAG/spec/brand/safe-zone)
    regenerate/
      RegenerateLayer.tsx       # "regenerate this layer" (image/text) UI
    state/
      useDocStore.ts            # canonical tree store + undo/redo + patch bus
      layerPatch.ts             # applyLayerPatch(tree, patch) (SHARED impl re-exported)
  src/app/api/
    editor/patch/route.ts       # POST typed LayerPatch (chat-edit)
    editor/regenerate/route.ts  # POST regenerate single layer -> GenerationJob
    export/route.ts             # POST export request -> Render job (delegates to packages/render)
    preflight/route.ts          # POST tree -> PreflightReport (server authoritative)

packages/shared/
  src/
    layerTree.ts                # canonical Layer/Slide/AdDocument types (docs/03 owns)
    layerPatch.ts               # LayerPatch type + applyLayerPatch() (pure, isomorphic)
    renderHints.ts              # RenderHints type + defaults
    relayout.ts                 # smartRelayout(tree, targetRatio) (pure, isomorphic)
    preflight.ts                # PreflightRule[], PreflightReport, runPreflight() (pure)
    schemas/*.zod.ts            # zod for all of the above

packages/render/
  src/
    index.ts                    # renderDocument(spec) facade — ONLY public export (CANON L5); re-exports named internals renderStatic/renderPdf/renderVideoLocal/encodeImageUnder5MB
    polotno/
      toPolotno.ts              # canonical tree -> Polotno store JSON
      fromPolotno.ts            # Polotno store JSON -> canonical tree
      renderStatic.ts           # polotno-node: store JSON -> PNG/JPG/PDF/SVG
    remotion/
      Root.tsx                  # <Composition id="BrutalAd" .../>
      BrutalAd.tsx              # video composition (clips+VO+subs+brand)
      renderVideo.ts            # renderMedia (local) / renderMediaOnLambda (scale)
    export/
      encodeImage.ts            # size-target loop (<=5MB) JPG/PNG
      documentAd.ts             # multi-page PDF assembly (sole v1 document-ad format; PPTX out of scope v1)
      probeSize.ts              # file-size probe + re-encode
    parity/
      goldenDiff.test.ts        # editor-preview vs export pixel-diff gate (A5)
```

**Ownership boundary:** `packages/shared` holds **pure, isomorphic** logic (patch apply, re-layout,
pre-flight rules) so the **exact same code** runs in the browser editor (instant feedback) and on the server
(authoritative gate) and in the headless renderer. `packages/render` holds anything that touches Chromium /
Remotion / encoders. `apps/web/src/editor` holds React/UI only.

---

## 2. `EditorAdapter` — the swappable editor boundary (CANON §4)

The editor is wrapped so Polotno (or a future replacement) is swappable. The adapter speaks **canonical tree
in, canonical tree out** and never leaks Polotno types across the boundary.

```ts
// apps/web/src/editor/EditorAdapter.ts
import type { AdDocument, Variant, Slide, Layer, LayerPatch, RenderHints } from '@brutal/shared';

export type EditorSelection = { slideId?: string; layerIds: string[] };

export interface EditorAdapter {
  /** Mount the editor onto a container for a given Variant (single_image | carousel | video). */
  mount(container: HTMLElement, variant: Variant, opts: EditorMountOpts): Promise<EditorHandle>;
}

export interface EditorMountOpts {
  brandKit: BrandKitResolved;         // fonts, palette, banned terms, safe-zone policy (docs/09)
  locale: 'de' | 'en';
  readOnly?: boolean;
  onChange: (tree: Variant, cause: EditCause) => void;   // canonical tree after every mutation
  onSelect: (sel: EditorSelection) => void;
  onPreflight: (report: PreflightReport) => void;         // live pre-flight stream (§6)
}

export type EditCause =
  | { kind: 'drag' }                    // direct manipulation (move/resize/rotate/type)
  | { kind: 'patch'; patch: LayerPatch }// chat-to-edit or programmatic
  | { kind: 'regenerate'; layerId: string; assetId: string }
  | { kind: 'relayout'; ratio: AspectRatio }
  | { kind: 'reorder'; slideId: string; toIndex: number }
  | { kind: 'undo' } | { kind: 'redo' };

export interface EditorHandle {
  applyPatch(patch: LayerPatch): Promise<Variant>;   // isomorphic applyLayerPatch under the hood
  getTree(): Variant;                                 // canonical tree (NOT polotno json)
  select(sel: EditorSelection): void;
  setLocale(locale: 'de' | 'en'): void;               // triggers text-layer swap (no re-render)
  relayout(ratio: AspectRatio): Promise<Variant>;     // smart re-layout (§5)
  regenerateLayer(layerId: string, override?: GenOverride): Promise<GenerationJob>;
  exportPreviewDataUrl(opts?: { scale?: number }): Promise<string>;  // fast thumbnail
  undo(): void; redo(): void;
  destroy(): void;
}

export type AspectRatio = '1:1' | '1.91:1' | '4:5' | '16:9' | '9:16';   // CANON §6 GenSpec.aspect
```

**Adapter contract rules (MUST):**
1. The adapter **never** exposes a Polotno `store` object across the boundary. Only canonical `Variant`
   trees, `LayerPatch`, and `EditorSelection` cross it.
2. Every user gesture inside Polotno is intercepted, converted to a canonical mutation (ideally a
   `LayerPatch`), applied via `applyLayerPatch`, then re-projected to Polotno (A6). This gives ONE undo
   stack and makes drag-edits and chat-edits identical downstream.
3. `getTree()` is always **losslessly** convertible to Polotno JSON and back (`toPolotno`/`fromPolotno`
   round-trip golden test, A1).

> `VERIFY current docs before coding` — **Polotno SDK**: mounting API (`createStore`, `<PolotnoContainer>`
> / `<Workspace>`), event hooks for element change, custom-element registration (for `smart`/`legal`/`cta`
> layer types), font loading (`store.addFont`), and the commercial license activation flow with
> `POLOTNO_API_KEY`. Confirm `store.toJSON()` / `store.loadJSON()` shape hasn't changed.
> Docs: https://polotno.com/docs · license: https://polotno.com/sdk/pricing

---

## 3. CANONICAL TREE ↔ POLOTNO PROJECTION

### 3.1 Layer-type mapping

CANON layer types: `image | text | logo | shape | cta | frame | legal | group | smart`. Polotno natively
models `image`, `text`, `svg`, `group`. The rest are **canonical semantics** projected onto Polotno
primitives + `custom` metadata so they survive round-trips.

| Canonical `Layer.type` | Polotno element | Projection notes |
|---|---|---|
| `image` | `type:'image'` | background/hero; `src` = Asset URL; `renderHints.role='background'` may pin z=0 + full-bleed. |
| `text` | `type:'text'` | font pinned to BrandKit; `autoFit`/`maxLines` enforced by re-layout, not Polotno auto-grow. |
| `logo` | `type:'image'` or `svg` | `custom.kind='logo'`; locked aspect; safe-zone = brand-mandated clear space. |
| `shape` | `type:'figure'`/`svg` | rectangles, dividers, scrims (see §6 scrim rule). |
| `cta` | `group` (`figure` + `text`) | `custom.kind='cta'`; button-like; contrast rule stricter (§6). |
| `frame` | `svg`/`figure` border | decorative border/frame; excluded from safe-zone occlusion checks. |
| `legal` | `type:'text'` | `custom.kind='legal'`; **never** auto-shrunk below `minFontPx` legal floor; always on top; mandatory-disclaimer source (BrandGuardian). |
| `group` | `group` | preserves parent/child transforms. |
| `smart` | `type:'text'` + `custom.binding` | data-bound (`{{customer_count}}+ firms`); **rendered value baked at render time**, binding preserved in tree. Locale-aware. |

**`smart` layer rule (load-bearing):** the tree stores the **binding expression** (`custom.binding`) AND a
resolved **display string** (`text`). The editor shows the resolved string; export re-resolves against the
current data + locale. `toPolotno()` emits the resolved string; `fromPolotno()` restores the binding from
`custom.binding` (never overwrites the expression with the resolved text). This is what keeps ads
programmatic and localizable without touching pixels (R7 §1.1).

### 3.2 Projection skeletons

```ts
// packages/render/src/polotno/toPolotno.ts
export function toPolotno(variant: Variant, slideId?: string): PolotnoStoreJSON {
  const slide = pickSlide(variant, slideId);           // single_image -> the one implicit slide
  return {
    width: slide.canvas.width, height: slide.canvas.height,
    fonts: brandFonts(variant.brandKit),               // Playfair Display, Inter (embedded)
    pages: [{
      id: slide.id, background: slide.canvas.background ?? 'transparent',
      children: slide.layers.map(toPolotnoElement),     // per §3.1 mapping; carries custom.* metadata
    }],
    // custom doc-level metadata survives round-trip:
    custom: { brandKitVersion: variant.brandKitVersion, locale: variant.locale, renderHintsVersion: 1 },
  };
}

// packages/render/src/polotno/fromPolotno.ts
export function fromPolotno(json: PolotnoStoreJSON, base: Variant): Variant {
  // Merge geometry/text edits back into the CANONICAL tree; restore bindings + renderHints from custom.*
  // MUST be the exact inverse of toPolotno for the golden round-trip test.
}
```

> **Golden test (P1, blocking):** `fromPolotno(toPolotno(v)) ≡ v` for a fixture set covering every layer
> type incl. `smart`, `legal`, nested `group`, and non-ASCII/German text. Any lossy field fails CI.

---

## 4. EDITING — direct manipulation + chat-to-edit + regenerate-layer

### 4.1 `LayerPatch` — the universal edit primitive (CANON §4/§7)

Chat-to-edit emits **typed `LayerPatch` diffs, never full re-rolls** (CANON §4). Per A6, drag and
regenerate also normalize into patches so there is one code path, one undo stack, one lineage trail.

> **Frozen shape (CANON §12 L6).** There is **one** `LayerPatch` schema, defined **once** in
> `packages/shared` via `docs/03` §12.2. It is doc 06's **richer op union** (below) **wrapped in** doc 03's
> **envelope** `{ id, variantId, slideId?, origin, createdBy, note?, ops: LayerPatchOp[] }`. The op union is
> **exactly** these 12 members — `setText | resize | rotate | reorderZ | setFont | setFill | addLayer |
> removeLayer | replaceAsset | setBinding | setSlideOrder | setVisible`. (The earlier generic `set`/`move`
> ops are **removed**: geometry moves are expressed via `resize`/re-anchor + `reorderZ`, and property edits
> go through the specific typed ops — `setText`/`setFont`/`setFill`/`setBinding`/`setVisible`.)
> `LayerPatchSet` is an **alias for `LayerPatch[]`**. The schema is defined ONCE in `docs/03` §12.2
> (`@brutal/shared`); this doc and `docs/05` **import** it — no redefinition (CANON §12 L6).

```ts
// LayerPatch/LayerPatchOp/LayerPatchSet + applyLayerPatch are defined ONCE (CANON §12 L6) in
// packages/shared (canonical zod: docs/03 §12.2). Import them here — do NOT redefine.
import { LayerPatch, LayerPatchOp, LayerPatchSet, applyLayerPatch } from '@brutal/shared';
export { LayerPatch, LayerPatchOp, LayerPatchSet, applyLayerPatch };

// Canonical op union (docs/03 §12.2) — EXACT field names the editor emits:
//   setText{layerId,text}            resize{layerId,x?,y?,width,height}    rotate{layerId,rotation}
//   reorderZ{layerId,toIndex}        setFont{layerId,fontFamily?,fontSize?,fontWeight?,fontStyle?}
//   setFill{layerId,fill}            addLayer{afterLayerId,layer}          removeLayer{layerId}
//   replaceAsset{layerId,assetId}    setBinding{layerId,binding,template?,fallback?}
//   setSlideOrder{order:string[]}    setVisible{layerId,visible}
// Envelope: { id, variantId, slideId?, origin:'chat'|'canvas'|'agent'|'system',
//             createdBy:'human'|'agent'|'system', note?, ops:LayerPatchOp[] } — applied atomically, in order.
// applyLayerPatch(tree, patch) is pure/isomorphic (browser optimistic + server authoritative + renderer).
// Editor edit-sources map onto the canonical `origin`: drag→'canvas'; regenerate/relayout/localize→'agent'.
```

**Atomicity & idempotency (MUST):** `ops` apply all-or-nothing; re-applying the same `patch.id` is a no-op
(dedupe by id). Server re-validates every field against the zod schema and BrandKit before persisting
(client patches are advisory; server is authoritative — mirrors the RLS trust boundary).

### 4.2 Direct manipulation (drag / resize / rotate / type)

| Gesture | Produces | Live pre-flight | Notes |
|---|---|---|---|
| Drag move | `{op:'resize'}` (x/y only) | re-run safe-zone + occlusion on drop (debounced) | position folded into `resize` per L6 (no `move` op); snap to safe-zone guides + other layers (Polotno guides). |
| Resize handle | `{op:'resize'}` (w/h ± x/y) | re-run legibility (font px vs `minFontPx`) | text layers respect `autoFit`/`maxLines`. |
| Rotate | `{op:'rotate'}` | — | disabled for `legal` (must stay upright/legible). |
| Inline text edit | `{op:'setText'}` | WCAG contrast + char-limit (headline ≤70, CANON §8) | typing streams; patch committed on blur. |
| Color swatch | `{op:'setFill'}` | palette-membership (BrandGuardian) + contrast | swatches limited to BrandKit palette by default; "custom" is a warn. |
| Font picker | `{op:'setFont'}` | legibility | fonts limited to BrandKit families (Playfair/Inter). |
| Z-reorder | `{op:'reorderZ'}` | occlusion recheck | `legal` clamped to top; `image` background clamped to bottom. |

All gestures debounce into patches (default 120 ms), apply optimistically to the local canonical tree, and
POST to `/api/editor/patch` for authoritative persist + server pre-flight.

### 4.3 Chat-to-edit (`EditorAgent` → typed `LayerPatch`)

The `EditorAgent` (CANON §7) turns a natural-language instruction + the current tree + current selection
into a **typed `LayerPatch`** (never free text, never a re-roll). Model: **Sonnet 5 default** (R7 `⚑R-LLM1`;
`docs/04` owns routing). Structured output via tool/JSON schema bound to the `LayerPatch` zod schema.

```
POST /api/editor/patch            # apps/web/src/app/api/editor/patch/route.ts
Auth: session (workspace via RLS)
Body:
{
  "variantId": "var_...",
  "slideId": "slide_...",          // optional; required for carousel per-slide
  "instruction": "make the headline shorter and gold, move the CTA up a bit",
  "selection": { "layerIds": ["lyr_headline","lyr_cta"] }   // optional focus
}
Flow:
  1. load canonical tree (RLS-scoped)
  2. EditorAgent.structured(LayerPatchSchema, { tree, selection, instruction, brandKit, locale })
  3. applyLayerPatch(tree, patch)            # server-side, authoritative
  4. runPreflight(next, brandKit)            # §6 — attach report
  5. BrandGuardian quick-check on changed layers (hard fields: palette/banned/legal)
  6. persist Variant + append AgentRun (tokens/cost) + LayerPatch to history
Response 200:
{ "patch": LayerPatch, "variant": Variant, "preflight": PreflightReport, "agentRun": {...cost} }
```

**UX:** the returned patch is shown as a **preview diff** (highlight changed layers + a one-line summary)
with **Apply / Discard**. Applying pushes onto the same undo stack as drag edits. Rejecting logs nothing to
the tree but keeps the `AgentRun` for cost accounting.

**Guardrails:**
- `EditorAgent` **cannot** invent new asset pixels — it may only reference existing `Asset`s, request a
  `regenerate` op (§4.4), or emit layer/geometry/text/style ops. Image *content* changes route to §4.4.
- If the instruction would breach BrandGuardian hard rules (banned term, off-palette on a hard field,
  removing a mandatory `legal` layer), the agent returns the closest compliant patch **plus** a `note`
  explaining the refusal; the UI surfaces it (never silently drops legal/disclaimer).
- Character limits are enforced post-generation (headline ≤70; intro visible ~150) — over-limit text is
  flagged by pre-flight, not truncated.

> `VERIFY current docs before coding` — **Anthropic** structured outputs (tool/JSON schema), model id
> `claude-sonnet-5`, escalation `claude-opus-4-8`. Bind the tool schema to `LayerPatchSchema`.
> Docs: https://platform.claude.com/docs/en/about-claude/models/overview (see `docs/04`).

### 4.4 Regenerate-single-layer (image or text) — no full re-roll

The core anti-re-roll affordance: regenerate **one** layer while every other layer stays byte-identical.

**Image layer regenerate** (`image`/`logo` backing pixels):

```
POST /api/editor/regenerate       # apps/web/src/app/api/editor/regenerate/route.ts
Body:
{
  "variantId": "var_...", "slideId": "slide_...", "layerId": "lyr_bg",
  "instruction": "same scene, warmer light, no people",   // optional imagery-only refinement
  "override": { "provider": "flux.2", "seed": 4211 }       // optional manual override (CANON §6)
}
Flow:
  1. Build GenSpec from the layer's existing lineage (prompt/negPrompt/aspect/seed) + instruction delta.
     - IMAGERY ONLY. Text is never in the prompt (the layer's text stays a vector layer).
     - aspect = slide.canvas ratio; refs = current asset (for edit/consistency, e.g. Gemini/FLUX Kontext).
  2. ProviderBus.image(job).generate|edit(spec)  -> GenerationJob (async, cached by
     (provider,model,version,prompt,seed,params) — CANON §4). Progress streamed to UI.
  3. On completion: new Asset -> emit LayerPatch {op:'replaceAsset', layerId, assetId}
  4. applyLayerPatch + re-run pre-flight (contrast under text may have changed!) + persist.
     Update Variant lineage node for this layer (provider/model/seed/prompt).
Response: { "jobId": "...", "status": "queued" }   # UI subscribes to job stream
```

**Text layer regenerate** = `Copywriter` re-draft of a single string (hook/headline/CTA/legal-safe copy),
respecting char limits + BrandKit voice, emitted as `{op:'setText'}`. Zero image credits.

**Rules:**
- Only the target layer changes; all others are frozen. This is the structural guarantee against the
  re-roll spiral (R7 §0/§1.2): identical requests hit cache and cost nothing.
- Regenerate always shows **before/after** with keep/replace; replacing pushes a `replaceAsset` patch onto
  the undo stack (fully reversible).
- Every regenerate updates the **per-layer lineage** on the Variant (CANON §5): `provider, model,
  model_version, seed, prompt, negative_prompt, parent_variant_id`, `created_by`.

---

## 5. MULTI-FORMAT SMART RE-LAYOUT (safe-zone aware) — CANON §8

**Requirement (CANON §8):** derive all LinkedIn ratios from **one base** via **smart re-layout, not naive
cropping**, respecting safe-zones (feed crop, profile overlap, "see more" fold). R7 `⚑R-LT1` supplies the
mechanism: **per-layer `renderHints`**.

### 5.1 `RenderHints` (per layer)

```ts
// packages/shared/src/renderHints.ts
export interface RenderHints {
  role?: 'background' | 'hero' | 'headline' | 'subhead' | 'cta' | 'logo' | 'legal' | 'decor' | 'body';
  anchor: Anchor;                 // where this layer 'belongs' relative to the safe box
  safeZone: boolean;              // MUST stay inside the active safe box for the target ratio
  autoFit: boolean;              // text: shrink-to-fit within box down to minFontPx
  maxLines?: number;             // text wrap cap
  minFontPx: number;             // legibility floor (never render below; legal has a hard floor)
  scaleWithCanvas?: boolean;      // images: cover/contain behavior on re-layout
  pin?: Partial<Record<'top'|'right'|'bottom'|'left'|'centerX'|'centerY', number>>; // px/%, ratio-relative
  keepAspect?: boolean;          // logos/CTAs: never distort
}

export type Anchor =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export const DEFAULT_HINTS: Record<NonNullable<RenderHints['role']>, Partial<RenderHints>> = {
  background: { anchor: 'center', safeZone: false, scaleWithCanvas: true, autoFit: false, minFontPx: 0 },
  hero:       { anchor: 'center', safeZone: false, scaleWithCanvas: true, keepAspect: true, autoFit: false, minFontPx: 0 },
  headline:   { anchor: 'top-left', safeZone: true, autoFit: true, maxLines: 3, minFontPx: 28 },
  subhead:    { anchor: 'top-left', safeZone: true, autoFit: true, maxLines: 2, minFontPx: 20 },
  body:       { anchor: 'center-left', safeZone: true, autoFit: true, maxLines: 4, minFontPx: 18 },
  cta:        { anchor: 'bottom-left', safeZone: true, autoFit: true, maxLines: 1, minFontPx: 18, keepAspect: true },
  logo:       { anchor: 'top-right', safeZone: true, keepAspect: true, autoFit: false, minFontPx: 0 },
  legal:      { anchor: 'bottom-center', safeZone: true, autoFit: false, maxLines: 3, minFontPx: 12 },
  decor:      { anchor: 'center', safeZone: false, autoFit: false, minFontPx: 0 },
};
```

### 5.2 Canonical ratios, canvases & safe boxes

| Ratio | Canvas (px) | LinkedIn use (CANON §8) | Safe-box insets (% of W×H) — `VERIFY` | Rationale |
|---|---|---|---|---|
| `1:1` | **1200×1200** | single image (default, best mobile feed) | top 6, bottom 12, left 6, right 6 | bottom inset clears "see more" fold + like/comment overlay. |
| `1.91:1` | **1200×627** | single image (landscape) | top 6, bottom 14, left 5, right 5 | short height ⇒ larger bottom fold reserve. |
| `4:5` | **960×1200** | single image (mobile-only) | top 5, bottom 14, left 6, right 6 | tall; more vertical fold overlap. |
| `1080×1080` | **1080×1080** | **carousel/document slide** (recommended) | top 8, bottom 8, left 8, right 8 | symmetric; PDF page, no feed fold on swipe pages. |
| `16:9` | **1920×1080** | video landscape | top 8, bottom 12, left 5, right 5 | captions safe zone bottom. |
| `9:16` | **1080×1920** | video vertical | top 10, bottom 16, left 6, right 6 | large caption/UI reserve. |

> `VERIFY current docs before coding` — LinkedIn's live ad-spec page for **exact px dimensions, max file
> sizes, char limits, and current feed-overlay geometry** (R7 checklist #11). Encode the safe-box insets in
> a single config table; do not scatter constants. Insets above are engineering defaults to be re-confirmed.

### 5.3 `smartRelayout()` algorithm (pure, isomorphic)

```ts
// packages/shared/src/relayout.ts
export function smartRelayout(slide: Slide, target: AspectRatio): Slide {
  const src = CANVAS[slide.canvas.ratio];         // e.g. 1:1 1200x1200
  const dst = CANVAS[target];                     // e.g. 4:5 960x1200
  const safe = SAFE_BOX[target];                  // §5.2 insets -> px rect
  const out = cloneWithCanvas(slide, dst);

  for (const layer of out.layers) {
    const h = resolveHints(layer);                // layer.renderHints ∪ DEFAULT_HINTS[role]
    if (h.role === 'background' || h.scaleWithCanvas) {
      // 1) BACKGROUND: cover-fit to full canvas, re-center focal point (never letterbox an ad bg).
      coverFit(layer, dst, focalPoint(layer));    // focal from ArtDirector or center; smart, not crop-from-topleft
      continue;
    }
    // 2) FOREGROUND: re-anchor within the target SAFE box (not the raw canvas).
    const box = h.safeZone ? safe : fullRect(dst);
    reAnchor(layer, box, h.anchor, h.pin);        // place by anchor + optional pins
    if (isText(layer)) {
      fitText(layer, box, { maxLines: h.maxLines, minFontPx: h.minFontPx, autoFit: h.autoFit });
      // if text cannot fit at minFontPx within box -> mark overflow (pre-flight fails, not silent crop)
    }
    if (h.keepAspect) preserveAspect(layer);      // logos, CTAs never distort
    clampInside(layer, box);                       // guarantee inside safe box for safeZone layers
  }
  return normalizeZ(out);                          // legal on top, background on bottom
}
```

**Guarantees (MUST):**
1. **No naive crop.** Backgrounds are **cover-fit around a focal point**; foregrounds are **re-anchored**,
   never sliced off. The word "crop" appears nowhere as a re-layout strategy for foreground layers.
2. **Safe-zone respected.** Every `safeZone:true` layer ends fully inside the target safe box. Text that
   cannot fit at `minFontPx` triggers a **pre-flight failure** (§6), not silent overflow or shrink below
   floor.
3. **`legal` floor is hard.** `legal` never renders below its `minFontPx` (12 default) regardless of box;
   if it can't fit, re-layout fails and the board shows the ratio as "needs manual adjust."
4. **Deterministic & reversible.** Re-layout is a pure function of `(slide, target)`; it produces a new
   sibling `Variant`/render, never mutates the base. The base 1:1 tree is the source of all ratios.
5. **Locale-stable.** Re-layout runs *after* localization; German strings (longer) may trigger `autoFit`
   or overflow flags that English didn't — surfaced per-locale in pre-flight.

**Focal point:** `ArtDirector`/`CompositorPlanner` may set `layer.custom.focal = {x,y}` on hero/background
(0..1 normalized). Absent, default to center. `coverFit` keeps the focal point in-frame across ratios.

### 5.4 Layout archetypes (CANON §12 L10 — the layout-diversity axis)

A `Slide`/`Variant` carries a named **`layoutArchetype`** chosen by `CompositorPlanner` (CANON §7). It is
the **4th axis of the variant matrix** (alongside angle, imagery concept, copy) so a board doesn't render
four near-identical compositions. The archetype is a preset that seeds each layer's `RenderHints`
(anchor/role/safe-zone) before `smartRelayout` runs — it is **not** a new layer type, just a starting
arrangement that the re-layout engine then adapts per ratio.

```ts
// packages/shared/src/renderHints.ts (co-located with hints; CompositorPlanner picks one per variant)
export type LayoutArchetype =
  | 'full-bleed-hero-lower-third'   // edge-to-edge image; headline/subhead/CTA banded in the lower third
  | 'split-panel'                   // image on one half, solid brand panel with copy on the other
  | 'editorial-kicker-top'          // small kicker + headline anchored top-left, image/quote below (documentary register)
  | 'quote-card';                   // large pull-quote centered on a scrim/solid, minimal imagery

export const ARCHETYPE_HINTS: Record<LayoutArchetype, Partial<Record<NonNullable<RenderHints['role']>, Partial<RenderHints>>>;
// each archetype maps roles -> anchor/safeZone overrides folded into DEFAULT_HINTS before smartRelayout.
```

- **`CompositorPlanner`** assigns one archetype per variant when it turns a concept into a layer tree, and
  should **spread archetypes across the board** for diversity.
- **`Critic`** (CANON §7) carries a `layout_homogeneity` anti-pattern: it **flags a board where ≥3 variants
  share the same archetype**, surfaced alongside the other Critic scores (see `docs/05`/`docs/07`).
- Archetypes compose with §5.1 `RenderHints` and §5.3 `smartRelayout` — the archetype sets the initial
  anchors; re-layout still enforces safe-zones, `autoFit`, and the `legal` floor per ratio.

---

## 6. LIVE PRE-FLIGHT (WCAG contrast under text, legibility, spec, brand, safe-zones)

Pre-flight runs **live in the editor** (client, optimistic, on every debounced change) and
**authoritatively on the server** (`/api/preflight`, and inside the export gate). Same pure code
(`runPreflight`) both places (A5). It is a **hard gate on export** and a **badge list in the editor**.

### 6.1 Rule set

```ts
// packages/shared/src/preflight.ts
export type Severity = 'error' | 'warn' | 'info';
export interface PreflightFinding {
  rule: PreflightRuleId; severity: Severity; layerId?: string; slideId?: string;
  message: string; measured?: number; threshold?: number; fixHint?: string;
}
export interface PreflightReport {
  ok: boolean;                     // false if any 'error'
  findings: PreflightFinding[];
  byRatio?: Record<AspectRatio, { ok: boolean; findings: PreflightFinding[] }>;
}
export type PreflightRuleId =
  | 'wcag.contrast' | 'legibility.minFont' | 'legibility.lineLength'
  | 'safezone.inside' | 'safezone.occlusion'
  | 'spec.charLimit' | 'spec.ratio' | 'spec.fileSize'
  | 'brand.palette' | 'brand.font' | 'brand.bannedTerm' | 'brand.disclaimer' | 'brand.logoClearspace'
  | 'continuity.divergence'          // deck-level: a continuity layer opted out / drifted from baseline (CANON L10)
  | 'a11y.altText';
```

| Rule | Check | Threshold | Severity |
|---|---|---|---|
| `wcag.contrast` | **Sample the actual rendered pixels under each text glyph run** (see §6.2) and compute WCAG 2.x contrast ratio of text color vs the sampled background luminance. | ≥ **4.5:1** normal text; ≥ **3:1** large text (≥24 px bold / ≥28 px regular); CTA text ≥ 4.5:1 | error < min, warn within 10% |
| `legibility.minFont` | rendered font px ≥ `renderHints.minFontPx` after autoFit | role floors (§5.1); legal ≥ 12 | error |
| `legibility.lineLength` | chars/line + line count vs `maxLines` | maxLines per role | warn |
| `safezone.inside` | every `safeZone:true` layer's bbox ⊆ safe box (per ratio) | 0 px overflow | error |
| `safezone.occlusion` | text/CTA/logo not overlapped by decor/frame; text not on busy bg without scrim | — | warn/error |
| `spec.charLimit` | headline ≤ 70; intro visible ~150 (600 max) — CANON §8 | per CANON §8 | error (>hard max), warn (>visible) |
| `spec.ratio` | canvas ∈ allowed set for `AdDocument.type` | CANON §8 | error |
| `spec.fileSize` | encoded export ≤ **5 MB** (image), ≤ **200 MB** (video) | CANON §8 | error (export-time) |
| `brand.palette` | fills/strokes ∈ BrandKit palette (hard fields) | palette set | error (hard field) / warn |
| `brand.font` | font ∈ BrandKit families (Playfair/Inter) | families | warn |
| `brand.bannedTerm` | text ∌ banned terms (BrandGuardian) | banned list | error |
| `brand.disclaimer` | mandatory `legal` disclaimer present per vertical | present | error |
| `brand.logoClearspace` | logo clear-space respected | brand rule | warn |
| `continuity.divergence` | **deck-level (carousel):** each slide's continuity layers match the deck baseline; flags "this slide only" opt-outs / drift (§9.3, CANON L10) | baseline match | warn |
| `a11y.altText` | image layers have alt text (LinkedIn accessibility) | present | info |

### 6.2 WCAG contrast **sampled under text** (not naive fg-vs-solid-bg)

The critical subtlety: text usually sits over a **generated image**, not a solid color. A single fg-vs-bg
comparison is wrong. Algorithm:

```ts
// runs against the SAME render used for export (A5): rasterize slide to an offscreen bitmap at export res
function contrastUnderText(bitmap: ImageData, textLayer: Layer): { min: number; findings: [] } {
  const boxes = glyphRunBoxes(textLayer);          // per-line rects (from layout metrics)
  let worst = Infinity;
  for (const box of boxes) {
    const bgLum = sampleMeanLuminance(bitmap, box, { grid: 8, trimAlpha: true }); // sample UNDER the text
    const fgLum = relativeLuminance(textLayer.style.fill);
    worst = Math.min(worst, contrastRatio(fgLum, bgLum));
  }
  // If a scrim/shape sits between text and image, it is already in the bitmap -> correctly measured.
  return { min: worst, findings: worst < threshold(textLayer) ? [/* error */] : [] };
}
```

**Auto-fix suggestion (never auto-applied without consent):** if `wcag.contrast` fails, pre-flight proposes
a fix patch — the canonical remedy is **insert/enlarge a `shape` scrim** (semi-opaque BrandKit-dark panel or
gradient) behind the text, or bump the text weight/size — offered as an `EditorAgent`-style `LayerPatch`
preview. This keeps text legible on busy AI imagery without re-rolling the image (the exact prior-attempt
pain).

### 6.3 Live wiring

- **Editor (client):** `runPreflight` on the local tree after each debounced patch; badges update in
  `PreflightPanel`; contrast uses a **fast preview rasterization** (`exportPreviewDataUrl`) at reduced
  resolution for interactivity, then the **server** re-checks at full export resolution (authoritative).
- **Multi-ratio:** pre-flight runs per **target ratio** (via `smartRelayout` on the fly) so a 1:1 that
  passes but whose 4:5 re-layout overflows is caught **before** export (`report.byRatio`).
- **Export gate:** `POST /api/export` refuses (`ok:false` errors) until pre-flight passes, mirroring the
  BrandGuardian hard gate + human-approve gate (CANON §7). Warns don't block; errors do.

---

## 7. SHARED HEADLESS RENDER MODEL (editor ↔ export parity)

**The load-bearing correctness property:** *what the user sees in the editor is byte-for-byte what exports.*
Because the live canvas (Polotno DOM/WebGL) and the export renderer (`polotno-node` headless Chromium) are
two engines, parity is **enforced by test**, not assumed (A5).

### 7.1 One store, two renderers, one truth

```
                       canonical Variant tree (packages/shared)  ── SINGLE SOURCE OF TRUTH
                                 │ toPolotno()
                    ┌────────────┴─────────────┐
                    ▼                           ▼
        Polotno live canvas            polotno-node headless render
        (apps/web, interactive)        (packages/render, authoritative export)
        exportPreviewDataUrl()         renderStatic() -> PNG/JPG/PDF/SVG
                    │                           │
                    └──────── GOLDEN PIXEL-DIFF PARITY TEST (7.4) ───────┘
```

Both consume **the same `toPolotno()` output** with **the same embedded fonts** (Playfair Display, Inter)
and the **same BrandKit version**. Divergence sources to eliminate: font loading/subsetting, DPR/scale,
color profile, text shaping, image scaling filter. Pin all of them (§7.3).

### 7.2 `renderStatic` skeleton (`polotno-node`)

```ts
// packages/render/src/polotno/renderStatic.ts
import { createInstance } from 'polotno-node';   // VERIFY current import/init surface

export async function renderStatic(spec: {
  // format is the `render_kind` enum (docs/03): 'png'|'jpg'|'pdf'|'svg'. PPTX is NOT a native
  // polotno-node output and is out of scope for v1 (CANON §12 L3) — LinkedIn doc/carousel ads ship as PDF.
  storeJson: PolotnoStoreJSON; format: 'png'|'jpg'|'pdf'|'svg';
  pixelRatio?: number;                            // 1 for 1200px canvases at target size
  ignoreBackground?: boolean;
}): Promise<Buffer> {
  const instance = await createInstance({ key: process.env.POLOTNO_API_KEY! });  // license key
  try {
    switch (spec.format) {
      case 'png':
      case 'jpg': return await instance.jsonToImageBase64(spec.storeJson,
                      { mimeType: spec.format === 'jpg' ? 'image/jpeg' : 'image/png',
                        pixelRatio: spec.pixelRatio ?? 1 }).then(b64ToBuffer);
      case 'pdf':  return await instance.jsonToPDFBuffer(spec.storeJson, { pixelRatio: spec.pixelRatio ?? 1 });
      case 'svg':  return await instance.jsonToSVG(spec.storeJson).then(strToBuffer);
    }
  } finally { await instance.close(); }
}
```

> `VERIFY current docs before coding` — **`polotno-node`** exact factory/method names
> (`createInstance` / `jsonToImageBase64` / `jsonToPDFBuffer` / `jsonToSVG`), Chromium bundling, concurrency
> limits, and license-key activation. **PPTX is NOT a native `polotno-node` output and is out of scope for
> v1** (CANON §12 L3): do NOT wire a PPTX case here; any post-v1 PPTX is the flagged `pptxgenjs` post-render
> step only (§8.4), never via `polotno-node`.
> Docs: https://polotno.com/docs/nodejs · https://github.com/polotno-project/polotno-node

### 7.3 Determinism pins (MUST, both renderers)

| Concern | Pin |
|---|---|
| Fonts | Embed Playfair Display + Inter as woff2 in `packages/render/assets/fonts`; register in Polotno store (`store.addFont`) AND in headless Chromium; **subset must match**. No system-font fallback. |
| Scale / DPR | `pixelRatio` derived so `canvas.width === render.width` exactly (1:1 default). |
| Color | sRGB everywhere; no ICC transforms; JPG at quality set by size loop (§8). |
| Text shaping | same layout engine (Polotno's); autoFit computed in `packages/shared` and baked into the store before render (do not rely on renderer auto-grow). |
| Image scaling | high-quality resample; pre-scale assets to canvas to avoid renderer-specific filters. |
| Locale | render the resolved `smart`/localized strings; never a binding token in pixels. |

### 7.4 Parity test (P1, blocking CI)

```ts
// packages/render/src/parity/goldenDiff.test.ts
test.each(FIXTURE_TREES)('editor preview == headless export (%s)', async (name, variant) => {
  const store = toPolotno(variant);
  const previewPng = await renderPreviewViaHeadlessChromePolotno(store);  // mimics client canvas path
  const exportPng  = await renderStatic({ storeJson: store, format: 'png' });
  const diff = pixelmatch(previewPng, exportPng, { threshold: 0.02 });     // ≤2% AA tolerance
  expect(diff.mismatchRatio).toBeLessThan(0.005);                          // <0.5% pixels differ
});
```

Fixtures MUST include: German text (umlauts/long words), a `legal` disclaimer, a `smart` bound value, a CTA
group, a scrim-under-text contrast case, and all six ratios.

---

## 8. EXPORT

Single facade; format-specific encoders; every export re-runs pre-flight (server, authoritative) and the
human-approve gate before producing a downloadable `Render` (CANON §7).

### 8.0 `packages/render/src/index.ts` — the public facade (frozen, CANON §12 L5)

`packages/render` exposes **exactly one** public entry point — `renderDocument(spec)` — plus its
result/spec types. Everything else (`renderStatic`, `renderPdf`, `renderVideoLocal`,
`encodeImageUnder5MB`, `toPolotno`/`fromPolotno`, `smartRelayout`) is an **internal** of the package and
is dispatched to *from inside* `renderDocument`. The orchestrator (`docs/02`) and the agent studio
(`docs/05`) call `renderDocument(...)` and **never** `renderStatic`/`renderTree` directly. This is the
single seam other packages depend on; internal signatures are owned by this doc (§7.2, §8.1, §8.2, §10.4).

```ts
// packages/render/src/index.ts  — THE ONLY public surface of packages/render (CANON §12 L5)

// ---- public facade (the one entry the orchestrator calls) ----
export async function renderDocument(spec: RenderSpec): Promise<RenderResult>;

// ---- public types the facade traffics in ----
export type RenderSpec = {
  variant: Variant;                              // canonical tree (source of truth)
  // static formats = `render_kind` (docs/03) 'png'|'jpg'|'pdf'|'svg' + video 'mp4'.
  // PPTX is out of scope for v1 (CANON §12 L3) — deliberately absent; doc/carousel ads ship as PDF.
  format: 'png' | 'jpg' | 'pdf' | 'svg' | 'mp4';
  ratios?: AspectRatio[];                        // static: which ratios to emit (re-layout each from base)
  locale?: 'de' | 'en';                          // default = variant.locale
  pixelRatio?: number;                           // default derived so canvas.width === render.width (1:1)
};
export type RenderResult = {
  renders: Array<{
    ratio: AspectRatio; format: RenderSpec['format'];
    buffer: Buffer; bytes: number; width: number; height: number; sha256: string;
  }>;
};

// ---- NAMED INTERNALS (exported for tests/other render code ONLY; not part of the app contract) ----
// renderDocument dispatches to these by format; callers outside packages/render must not import them.
export { renderStatic } from './polotno/renderStatic';         // png/jpg/pdf/svg via polotno-node (§7.2)
export { renderPdf } from './export/documentAd';               // multi-page document-ad PDF (§8.2)
export { renderVideoLocal } from './remotion/renderVideo';     // Remotion MP4 path (§10.4)
export { encodeImageUnder5MB } from './export/encodeImage';    // ≤5 MB image size-target loop (§8.1)
```

> **Dispatch (inside `renderDocument`):** `png|jpg` → `smartRelayout` per ratio → `encodeImageUnder5MB`
> (which calls `renderStatic`); `pdf` (carousel/document ad) → `renderPdf`; `svg` → `renderStatic svg`;
> `mp4` → `renderVideoLocal`. There is **no `pptx` dispatch** — PPTX is out of scope for v1 (CANON §12 L3);
> doc/carousel ads ship as PDF. `renderPdf` is the canonical name for the document-ad PDF entry
> (`exportDocumentPdf` in `documentAd.ts` is re-exported under this name). `docs/02`/`docs/05` must match
> this facade name exactly.

```
POST /api/export                  # apps/web/src/app/api/export/route.ts
Body:
{
  "variantId": "var_...",
  "format": "jpg" | "png" | "pdf" | "svg" | "mp4",   // PPTX out of scope v1 (CANON §12 L3) — doc ads ship as PDF
  "ratios": ["1:1","1.91:1","4:5"],   // static: which ratios (re-layout each from base)
  "locale": "de"                       // optional; default variant locale
}
Flow:
  1. load Variant (RLS) -> for each ratio: smartRelayout(base, ratio)
  2. runPreflight(each) -> if any error: 422 with PreflightReport (blocked)
  3. require human-approve flag on Variant (CANON §7) else 403
  4. dispatch Render job(s) (pgmq default — R7 ⚑R-INFRA1) -> packages/render
  5. persist Render rows (url, bytes, ratio, format, sha) + lineage
Response 202: { "renders": [{ "ratio":"1:1","status":"queued","jobId":"..." }, ...] }
```

### 8.1 JPG / PNG ≤ 5 MB (CANON §8)

```ts
// packages/render/src/export/encodeImage.ts
export async function encodeImageUnder5MB(store: PolotnoStoreJSON, fmt: 'jpg'|'png'): Promise<Buffer> {
  const MAX = 5 * 1024 * 1024;
  if (fmt === 'png') {
    let buf = await renderStatic({ storeJson: store, format: 'png' });
    if (buf.length <= MAX) return buf;
    buf = await pngquant(buf, { quality: [0.7, 0.95] });        // lossy-palette compress, keep PNG
    if (buf.length <= MAX) return buf;
    return encodeImageUnder5MB(store, 'jpg');                    // fall back to JPG for photographic ads
  }
  // JPG: binary-search quality to land just under 5MB
  let lo = 60, hi = 95, best: Buffer | null = null;
  for (let i = 0; i < 6; i++) {
    const q = (lo + hi) >> 1;
    const buf = await renderStatic({ storeJson: store, format: 'jpg', /* quality:q via mozjpeg */ });
    if (buf.length <= MAX) { best = buf; lo = q + 1; } else { hi = q - 1; }
  }
  if (!best) throw new ExportError('cannot_hit_5mb');            // surfaced gracefully (never raw)
  return best;                                                   // probeSize() double-checks (§8.5)
}
```

- **Default format policy:** PNG for flat/vector-heavy ads (crisp text edges); **JPG (mozjpeg)** for
  photographic backgrounds (hits ≤5 MB far easier). 1200×1200 photographic JPG ≈ well under 5 MB.
- 1:1 → 1200×1200; 1.91:1 → 1200×627; 4:5 → 960×1200 (CANON §8).

> `VERIFY current docs before coding` — encoder choice: `sharp`/`mozjpeg`/`pngquant` availability inside
> the `polotno-node` runtime; whether `polotno-node` exposes JPEG quality directly (if so, skip the extra
> re-encode). Confirm LinkedIn's current 5 MB cap and any GIF path.

### 8.2 PDF document ads (carousel) — CANON §8

Carousel/document ads are **multi-page PDFs** (up to ~10–12 slides), 1080×1080 recommended, hook→reframe→
close narrative preserved slide order.

```ts
// packages/render/src/export/documentAd.ts
export async function exportDocumentPdf(variant: Variant): Promise<Buffer> {
  assert(variant.type === 'carousel');
  const pages = variant.slides                                 // ORDERED (§9)
    .map(s => toPolotno(variant, s.id));                        // one Polotno page per slide
  // polotno-node: multi-page store -> single PDF (native), preserving order + fonts
  return renderStatic({ storeJson: mergePages(pages), format: 'pdf', pixelRatio: 1 });
}
```

- Each slide re-laid to **1080×1080** via `smartRelayout` if authored at another ratio.
- Page order = `Slide.order` (§9). Continuity assets (recurring logo/frame/progress dots) render on every
  page.
- PDF is the LinkedIn document-ad delivery format; file-size and page-count checked in pre-flight.

### 8.3 PPTX — OUT OF SCOPE for v1 (CANON §12 L3)

**PDF is the SOLE v1 document-ad format.** PPTX is **NOT** a native `polotno-node` output and is **out of
scope for v1** (CANON §12 L3): LinkedIn document/carousel ads ship as **PDF** (§8.2). There is **no**
`exportDocumentPptx` function and **no** `pptx` render path in v1 — the render pipeline never produces PPTX
via `polotno-node`.

> Note: LinkedIn *accepts* PPT/PPTX uploads as document-ad source files — that is a true fact about the
> platform. It does **not** mean our render must emit PPTX. In v1 we export PDF (LinkedIn's document-ad
> delivery format) and stop there.

### 8.4 PPTX post-v1 fallback (flagged; never via `polotno-node`)

> `⚑ RECOMMENDATION (R-EXP1) — OUT OF SCOPE v1.` PPTX export is **not** shipped in v1. **If** it is ever
> resurrected post-v1, it is built **only** as a `pptxgenjs` **POST-render** step — **never** via
> `polotno-node` (which does not natively emit PPTX): render each slide to a full-bleed PNG
> (`renderStatic png`) and place it as a background-filling image on a 1080×1080 slide, OR reconstruct
> native text boxes from the layer tree for editability. Prefer the PNG-per-slide route for pixel parity;
> offer native-text reconstruction as a "make editable" option. This entire path is gated behind an
> explicit post-v1 decision and is out of scope for the v1 build.

### 8.5 Size probe (all formats)

```ts
// packages/render/src/export/probeSize.ts — final gate before marking Render complete
export function assertUnderLimit(buf: Buffer, kind: 'image'|'video'): void {
  const MAX = kind === 'image' ? 5 * 2**20 : 200 * 2**20;       // CANON §8
  if (buf.length > MAX) throw new ExportError(`over_limit_${kind}`);   // triggers re-encode/higher crf
}
```

### 8.6 MP4 (video) — delegates to the Remotion path (§10)

Video export is the Remotion `renderMedia` / `renderMediaOnLambda` path (§10), then `assertUnderLimit(buf,
'video')` (≤200 MB, CANON §8) with a crf/preset re-encode loop on overflow (R2 §6).

---

## 9. CAROUSEL / DOCUMENT BUILDER (ordered slides, continuity, reorder, per-slide edit)

CANON §5: carousel `AdDocument` = ordered `Slide[]`, **each slide has its own layer tree**. The builder is
the same static Polotno canvas (§4) plus a **slide strip** for order/continuity, driven by
`CarouselArchitect` (CANON §7: hook→reframe→close narrative, continuity across slides).

### 9.1 Data shape (canonical — coordinate with `docs/03`)

```ts
interface Slide {
  id: string;
  order: number;                 // 0-based, dense, unique within variant
  canvas: { ratio: '1:1'; width: 1080; height: 1080; background?: string };  // doc-ad default
  layers: Layer[];               // own layer tree
  role?: 'hook' | 'reframe' | 'close' | 'body';   // narrative role (CarouselArchitect)
  layoutArchetype?: LayoutArchetype;              // named composition preset (§5.4; CompositorPlanner, CANON L10)
  continuityRefs?: string[];     // ids of shared/continuity layers (logo, progress dots, frame)
}
// Variant.slides: Slide[] (present only when AdDocument.type === 'carousel')
```

### 9.2 Builder operations

| Op | Endpoint / patch | Behavior |
|---|---|---|
| **Add slide** | `{op:'addLayer'}`-style at slide level; new `Slide` appended | inherits continuity layers (logo/frame/progress) + BrandKit; role defaults to `body`. |
| **Duplicate slide** | clone `Slide` (new ids), `order+1` | fast variant of a working slide. |
| **Reorder** | `{op:'setSlideOrder', order:[ids]}` | drag in slide strip; re-densifies `order`; progress dots/continuity recompute. |
| **Delete slide** | remove `Slide` | blocked if it's the only slide; re-densify order. |
| **Per-slide edit** | full §4 editor scoped to `slideId` | select a slide → same canvas, drag/chat/regenerate on that slide's tree only. |
| **Regenerate slide imagery** | §4.4 scoped to slide | one slide's background/hero, others frozen. |
| **Edit continuity layer** | patch fan-out over `continuityRefs` | **defaults to PROPAGATE across all slides** (CANON §12 L10) — edit the logo/frame/progress once → applied to every slide; a **"this slide only"** toggle opts out and scopes the patch to the current `slideId`. |

### 9.3 Continuity (the prior-pain fix)

The prior attempt art-directed every slide independently → visual drift. Continuity mechanisms:

1. **Continuity layers** (`continuityRefs`): logo, frame, brand color band, progress indicator — authored
   once, rendered on every slide. **Editing a continuity layer defaults to PROPAGATE across every slide**
   (CANON §12 L10): the patch fans out over `continuityRefs` on all slides in one undo step. A **"this
   slide only"** opt-out toggle in the edit affordance scopes the patch to the current `slideId` instead,
   after which that slide's copy of the layer is tracked as **diverged** from the deck baseline.
2. **Palette + type locked** to the BrandKit version pinned on the Variant (BrandGuardian gate per slide).
3. **`CarouselArchitect` narrative continuity**: hook→reframe→close copy coherence + visual motif
   consistency (recurring focal treatment, consistent scrim style for text). Continuity is scored by
   `Critic` (CANON §7) and surfaced in pre-flight as a `warn` when a slide breaks the motif.
4. **Cross-slide re-layout**: `smartRelayout` applied uniformly so all slides share the same safe box and
   anchor grid → the deck reads as one document, not 10 posters.
5. **Deck-level divergence warn** (CANON §12 L10): a **deck-level pre-flight** pass compares each slide's
   continuity layers against the deck baseline and emits a `warn` (`continuity.divergence`) listing any
   slide whose continuity layer was opted out / drifted — so a "this slide only" edit that unintentionally
   breaks the through-line is surfaced before export, never silent.

### 9.4 Per-slide pre-flight + export

Pre-flight (§6) runs per slide **and** deck-level (page count ≤ ~10–12, total PDF size, continuity warns).
Export → §8.2 multi-page **PDF** (the sole v1 document-ad format; PPTX out of scope v1 — §8.3), page order = `Slide.order`.

---

## 10. REMOTION VIDEO EDITOR (`AdDocument.type = 'video'`) — CANON §5, R2 §5

Video is a **first-class fast-follow** (CANON §0; R7 phase P9). The canonical video payload is a **Remotion
composition spec + layer/subtitle/audio tracks** (CANON §5). Same load-bearing rule: **brand text is a
composited React/HTML layer, never baked into the model clip** (R2 §5.1).

### 10.1 Canonical video document → Remotion inputProps

```ts
interface VideoDocument {              // Variant when AdDocument.type==='video'
  fps: 30; durationInFrames: number; width: number; height: number;  // ratio-derived (§5.2)
  tracks: {
    clips: Array<{ assetId: string; from: number; durationInFrames: number; fit: 'cover'|'contain'; focal?: XY }>;
    audio: Array<{ assetId: string; kind: 'vo'|'music'|'sfx'; from: number; volume: number }>;
    subtitles: Caption[];              // @remotion/captions Caption[] (word-level; §10.3)
    brandLayers: Layer[];              // canonical layers (cta/logo/legal/text/shape) as overlays
  };
  composition: 'BrutalAd';             // Remotion <Composition id>
}
```

### 10.2 Composition skeleton

```tsx
// packages/render/src/remotion/BrutalAd.tsx
import { AbsoluteFill, Sequence, OffthreadVideo, Audio, useVideoConfig } from 'remotion';
import { createTikTokStyleCaptions } from '@remotion/captions';  // VERIFY current API

export const BrutalAd: React.FC<{ doc: VideoDocument; brandKit: BrandKitResolved }> = ({ doc, brandKit }) => (
  <AbsoluteFill style={{ background: '#0a0a0a' }}>
    {doc.tracks.clips.map((c, i) => (
      <Sequence key={i} from={c.from} durationInFrames={c.durationInFrames}>
        <OffthreadVideo src={assetUrl(c.assetId)} style={coverStyle(c)} />   {/* generated Kling/Veo clip */}
      </Sequence>
    ))}
    {doc.tracks.audio.map((a, i) => (
      <Audio key={i} src={assetUrl(a.assetId)} startFrom={a.from} volume={a.volume} />
    ))}
    {/* brand text layers = SAME canonical Layer components as static (cta/logo/legal/text) */}
    <BrandOverlay layers={doc.tracks.brandLayers} brandKit={brandKit} safeBox={safeBox(doc)} />
    {/* burned-in captions (muted-first) — always-on, high-contrast, safe-zone aware */}
    <BurnedCaptions pages={createTikTokStyleCaptions({ captions: doc.tracks.subtitles,
      combineTokensWithinMilliseconds: 1200 })} brandKit={brandKit} safeBox={safeBox(doc)} />
  </AbsoluteFill>
);
```

### 10.3 Timeline editor UI

- **`VideoTimeline.tsx`**: Remotion `<Player>` (scrub/preview) + a tracks panel (clips, VO, music, SFX,
  subtitles, brand overlays). Direct manipulation = trim/move clips, adjust audio volume, drag brand
  overlays (same §4 patch system on `brandLayers`), edit caption timing/text.
- **Chat-to-edit** applies to `brandLayers` and caption text via the same `EditorAgent`/`LayerPatch` path.
- **Subtitles are the story-carrier (muted-first):** best timing source = **ElevenLabs `with-timestamps`**
  word-level output → `Caption[]` directly (no Whisper needed); fallback `@remotion/install-whisper-cpp`
  (R2 §5.1). Captions are **burned in** because LinkedIn autoplays muted.
- **Localization:** `LocalizationAgent` emits TTS-safe VO strings (German numbers pre-spelled, R2 §4.4)
  **and** on-screen caption strings (numerals kept for legibility) — two representations, one timeline.

### 10.4 Video render (delegates, then size-gate)

```ts
// packages/render/src/remotion/renderVideo.ts  (R2 §5.2)
import { renderMedia, selectComposition } from '@remotion/renderer';
export async function renderVideoLocal(doc: VideoDocument): Promise<Buffer> {
  const comp = await selectComposition({ serveUrl, id: 'BrutalAd', inputProps: { doc } });
  await renderMedia({ composition: comp, serveUrl, codec: 'h264',
    outputLocation: out, inputProps: { doc }, crf: 23 });        // ↑crf ⇒ smaller; tune to ≤200MB
  const buf = readOut(out);
  return ensureUnder200MB(buf, doc);                              // re-encode higher crf if over (§8.5)
}
// Scale path: renderMediaOnLambda + getRenderProgress (R2 §5.2)
```

**Video pre-flight (export gate, CANON §8 + R2 §6):** ratio ∈ {1:1, 4:5, 16:9}; ≤200 MB; burned-in subs
present & legible in safe zones; **muted-first** (plays without audio); first-3-seconds stopping power;
BrandGuardian pass. WCAG contrast (§6.2) sampled on caption/brand-overlay frames over the underlying video
(sample representative frames, not every frame).

> `VERIFY current docs before coding` — **Remotion**: `@remotion/captions` (`createTikTokStyleCaptions`,
> native subs since v4.0.216), `renderMedia`/`renderMediaOnLambda` signatures, `OffthreadVideo` caching,
> Lambda region/memory/IAM, and the **Company License** (4+ employees, R2 §5.3). Docs:
> https://www.remotion.dev/docs — captions: /docs/captions/api — render: /docs/renderer/render-media

---

## 11. STATE, UNDO/REDO, PERSISTENCE, COLLAB

- **`useDocStore`** holds the canonical `Variant` tree + an **undo/redo stack of `LayerPatch`es** (every
  edit — drag/chat/regenerate/relayout — is a patch, A6). Undo = inverse patch; redo = re-apply.
- **Optimistic + authoritative:** client applies patch immediately; POST to `/api/editor/patch` persists +
  server-validates; on server rejection (BrandGuardian/RLS/schema) the client rolls back that patch.
- **Persistence:** the canonical tree is the stored artifact (Supabase; `Variant.layer_tree` JSON, RLS by
  `workspace_id`). Polotno JSON is **never** persisted as source of truth — regenerated on demand via
  `toPolotno()`.
- **Autosave:** debounced patch stream; `Render`s are immutable outputs with their own rows + lineage.
- **Lineage on every mutation** (CANON §5): patches carry `createdBy` (`human|agent`), regenerate updates
  per-layer provider/model/seed/prompt; the Variant's `parent_variant_id` set on fork.
- `⚑ RECOMMENDATION (R-ED2)`: model collab/versioning as an **append-only patch log** per Variant (event
  sourcing). Enables real-time multi-user later, precise "who changed what," and trivially correct
  undo/redo. Not required for MLP; the patch-first architecture makes it a non-breaking add.

---

## 12. END-TO-END EDIT FLOW (sequence)

```
User drags headline / types "make CTA gold, move logo top-right"
      │
      ├─ DRAG  ─► Polotno gesture ─► intercept ─► LayerPatch{move|resize|setText}
      │                                   │
      └─ CHAT  ─► POST /api/editor/patch ─► EditorAgent.structured(LayerPatchSchema) ─► LayerPatch
                                          │
                          applyLayerPatch(canonicalTree, patch)   (packages/shared, isomorphic)
                                          │
                          runPreflight(tree, brandKit) per ratio  (WCAG-under-text, safe-zone, spec, brand)
                                          │
                 ┌────────────────────────┼────────────────────────┐
                 ▼                        ▼                         ▼
         PreflightPanel badges     toPolotno() re-project    persist Variant + patch-log + AgentRun cost
                 │                  (live canvas updates)     (Supabase, RLS)
                 ▼
         (errors block export; warns advise)
                 │  human clicks Export
                 ▼
         POST /api/export ─► smartRelayout(base, ratio)×N ─► runPreflight (authoritative) ─► human-approve gate
                 │
                 ▼
         packages/render: renderStatic()/encodeImageUnder5MB()/documentAd()/renderVideo()
                 │
                 ▼
         Render rows (url, bytes≤5MB img / ≤200MB video, ratio, format, sha, lineage) ─► download / ship
```

---

## 13. ACCEPTANCE CRITERIA (per build phase)

| Phase | Must pass |
|---|---|
| **P1 render spine** | Hand-authored canonical tree → `toPolotno` → `renderStatic png` produces a **pixel-correct 1200×1200** ad with embedded Playfair/Inter; `fromPolotno(toPolotno(v))≡v` golden test green; **parity test** (§7.4) < 0.5% diff. |
| **P4 editor** | Drag move/resize/type any layer; **chat** "make headline shorter and gold" → `LayerPatch` preview → apply, **no image credits spent**; undo/redo across drag+chat; regenerate one image layer leaves all others byte-identical. |
| **P5 export** | One base → spec-valid **1:1 / 1.91:1 / 4:5** via smart re-layout (no crop, safe-zones honored); every export **≤5 MB**; pre-flight blocks a contrast-failing ad until fixed. |
| **P7 carousel** | Build ordered `Slide[]`, reorder in strip, per-slide edit, continuity logo apply-to-all; export **multi-page PDF** in slide order 1080×1080. |
| **P9 video** | Kling clip + ElevenLabs VO + burned-in DE captions + brand overlay → **MP4 h264 ≤200 MB**, muted-first, first-3-s stopping power; WCAG contrast on caption frames passes. |

---

## 14. CONSOLIDATED "VERIFY BEFORE CODING"

1. **Polotno SDK** mount/store/event/custom-element/font APIs + `POLOTNO_API_KEY` license activation.
2. **`polotno-node`** factory + `jsonToImageBase64`/`jsonToPDFBuffer`/`jsonToSVG`, Chromium bundling,
   concurrency. (**No PPTX** — out of scope v1 per CANON §12 L3; doc/carousel ads ship as PDF.)
3. **Image encoders** (`sharp`/`mozjpeg`/`pngquant`) inside the render runtime; whether `polotno-node`
   exposes JPEG quality directly (skip re-encode if so).
4. **Anthropic** structured outputs bound to `LayerPatchSchema`; `claude-sonnet-5` default / `claude-opus-4-8`
   escalation (`docs/04`).
5. **Remotion**: `@remotion/captions` (`createTikTokStyleCaptions`, native subs ≥ v4.0.216),
   `renderMedia`/`renderMediaOnLambda`, `OffthreadVideo` cache, Lambda IAM, **Company License** (4+ emp.).
6. **ElevenLabs** `with-timestamps` word-level output shape (for caption timing); DE number pre-spelling
   (R2 §4.4).
7. **LinkedIn 2026 ad specs** — exact px, ≤5 MB / ≤200 MB, char limits (≤70 headline), safe-zone/fold
   geometry, document-ad page count — re-confirm CANON §8 at ship time (R7 checklist #11).
8. **WCAG** 2.x thresholds (4.5:1 / 3:1) still current for the a11y bar you commit to.

---

## 15. RECOMMENDATIONS SUMMARY (all additive / flagged — nothing silently diverges)

| # | Recommendation | Impact | Conflicts with CANON? |
|---|---|---|---|
| ⚑R-ED1 | Route ALL edits (drag/chat/regenerate/relayout) through `applyLayerPatch` on the canonical tree, then re-project to Polotno | One undo stack, one source of truth, clean lineage | No — implements CANON §4 LayerPatch + §4 EditorAdapter swappability |
| ⚑R-ED2 | Model versioning/collab as an append-only patch log (event sourcing) per Variant | Real-time collab later, exact audit, correct undo | No — additive, MLP-optional |
| ⚑R-EXP1 | **OUT OF SCOPE v1** (CANON §12 L3): PDF is the sole v1 document-ad format. If PPTX is ever resurrected post-v1, it is a `pptxgenjs` **post-render** step only (PNG-per-slide or native text) — never via `polotno-node` | Post-v1 only; no PPTX in v1 | No — v1 ships PDF; PPTX deferred/flagged |
| ⚑R-ENV1 (echo R7) | Add `POLOTNO_API_KEY` to canonical env list (`docs/11`) | Avoids runtime/legal blocker | Minor — fills CANON §10 omission |
| ⚑R-LT1 (echo R7) | Per-layer `renderHints` for deterministic multi-ratio re-layout | Fulfills CANON §8 "smart re-layout, not crop" | No — additive field |
```
