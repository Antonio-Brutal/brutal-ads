# R6 — Editor + Compositor + Multi-Format + Export (research)

> **Scope.** Verified research (mid-2026) for `docs/06 editor-and-compositor`: the Polotno layered
> canvas (static/carousel) wrapped in `EditorAdapter`, Remotion for video, the shared render model
> (editor↔export parity), multi-format smart RE-LAYOUT, the carousel/DOCUMENT-ad builder UX, PDF export
> for LinkedIn document ads, ≤5 MB optimization, and the typed `LayerPatch` schema.
>
> **Conforms to CANON §12 ledger.** This doc is written to satisfy and be cited by:
> **L1** (doc 06 owns exporter mechanics; no standalone localization doc), **L2** (source paths
> `apps/web/src/editor/**`, `packages/render/src/**`), **L3** (`render_kind` = `png|jpg|pdf|svg`;
> **PPTX is NOT a native polotno-node output → out of scope v1; document/carousel ads ship as PDF**),
> **L5** (`renderDocument(spec)` facade → `renderStatic | renderPdf | renderVideoLocal | encodeImageUnder5MB`),
> **L6** (`LayerPatch` op union + envelope, `applyLayerPatch` in `packages/shared`),
> **L9** (Remotion Company License 4+ employees), **L10** (layout archetypes; carousel continuity
> default-propagate; `imagery.style.avoid` → negative prompt), **L12** (every VERIFY states the exact
> default to code now; VERIFY is never a stop condition).
>
> **Per L11:** cite this doc directly; delete any "reconcile when R6 lands / VERIFY against R6" hedge.

---

## 0. TL;DR recommendations (code these defaults now)

| Concern | Decision (code this) | Ledger |
|---|---|---|
| Static/carousel canvas | **Polotno SDK** (`polotno` npm), React, MobX store, wrapped behind `EditorAdapter` in `apps/web/src/editor/` | §4, L2 |
| Editor↔export parity | **One store JSON** (`store.toJSON()`) is the render model; browser preview and headless export run the **same Polotno engine** → pixel parity by construction | L5 |
| Headless export | **`polotno-node`** (Puppeteer + Chromium) → PNG/JPG (`jsonToImageBase64`), PDF (`jsonToPDFBase64`), SVG (via `instance.run` → `store.toSVG`) | L3, L5 |
| Video | **Remotion** project in `packages/render/` (`@remotion/bundler` + `@remotion/renderer`) → MP4 | §4, L9 |
| Document/carousel ad delivery | **PDF** — polotno-node `jsonToPDFBase64` for the flattened deck; **pdf-lib** only for post-assembly/merge/metadata when needed | §8, L3 |
| ≤5 MB static | **sharp** re-encode/quantize loop → `encodeImageUnder5MB` | §8, L5 |
| Multi-format | Own **smart re-layout** (safe-zones + layout archetypes), *not* Polotno "magic resize" as the source of truth | §8, L10 |
| Patch model | **`LayerPatch`** = doc06 op union wrapped in doc03 envelope; `applyLayerPatch` in `packages/shared` | L6 |

**Licensing reality (get sign-off before commercial launch — feeds `docs/12 §11` table, L9):**
Polotno **Self-serve $899/mo** flat commercial license (no per-seat, no per-render on self-hosted rendering);
Remotion **Company License required for for-profit orgs with >3 employees (4+)**. Both are load-bearing
line items. See §6.

---

## 1. Why Polotno (comparison table + recommendation)

CANON §4/§50 already locks **Polotno wrapped in an `EditorAdapter`**. R6 confirms this is the right call
for mid-2026 and documents *why*, so the builder does not "helpfully" swap it.

| Option | Layered JSON model | React canvas | Headless server export | PDF export | Multi-page (carousel) | License model | Verdict |
|---|---|---|---|---|---|---|---|
| **Polotno SDK** | ✅ open JSON schema (`@polotno/schema`), MobX store | ✅ full component kit | ✅ `polotno-node` (Puppeteer) — **same engine** → parity | ✅ `jsonToPDFBase64` | ✅ `pages[]` native | $899/mo flat, self-host render | **CHOSEN** |
| Fabric.js (raw) | ✅ JSON but hand-rolled | canvas only, no editor UI | ⚠️ node-canvas, no text-layout parity | ✗ build yourself | ✗ build yourself | MIT | Too much to build; parity risk |
| Konva (raw) | ✅ JSON | ✅ react-konva primitives | ⚠️ node-canvas | ✗ | ✗ | MIT | Same as Fabric; Polotno is Konva-based anyway |
| tldraw | ✅ | ✅ | ⚠️ needs browser | ✗ | partial | watermark/commercial | Whiteboard-shaped, not ad-composition |
| Excalidraw | ✅ | ✅ | ⚠️ | ✗ | ✗ | MIT | Sketch tool, wrong shape |
| Canva Connect API | proprietary | ❌ (no embeddable canvas) | server-only | ✅ | ✅ | usage-based, external | Loses local JSON control + parity |
| Motion Canvas | code-based | ✗ | node | ✗ | ✗ | MIT | Animation-code, not a WYSIWYG editor |

**Recommendation: keep Polotno.** It is the only option that gives us (a) an **open, serializable layer
tree** we can map to CANON's `Layer` model, (b) a **drop-in React editor** so we spend effort on ad-specific
UX not canvas plumbing, and (c) **`polotno-node` running the identical rendering engine headless** — which
is *the* mechanism that guarantees editor↔export parity (L5). The `EditorAdapter` wrapper (L2) keeps it
swappable if licensing terms change.

> **VERIFY before coding (code the default now, only adjust on a live 4xx/error):**
> - Polotno current major on npm and that `createStore`/component import paths below are unchanged.
> - `@polotno/schema` package is published and exports JSON-Schema (draft 2020-12) + TS types — use it to
>   cross-check our zod (§4). Default: assume present; if absent, derive zod from the store JSON shape in §2/§3.

Sources: [Polotno overview](https://polotno.com/docs/overview), [Store](https://polotno.com/docs/store),
[JSON Schema](https://polotno.com/docs/schema).

---

## 2. Polotno store JSON model (the render model)

The Polotno **Store** is the root data object: it holds canvas metadata + `pages[]`, drives undo/redo
(MobX), and is the thing you serialize. `store.toJSON()` → plain object; `store.loadJSON(json, keepHistory?)`
→ hydrate. This JSON **is** our shared render model (§5).

### 2.1 Top-level (Design Format)
```jsonc
{
  "width": 1080, "height": 1080,   // base document size (px)
  "dpi": 72,
  "fonts": [ { "fontFamily": "Playfair Display", "url": "https://.../playfair.woff2", "styles": [] } ],
  "pages": [ /* Page[] — one per carousel slide */ ],
  "unit": "px",
  "custom": { /* free-form: WE stash brutal-ads metadata here (variantId, archetype, safeZone) */ }
}
```

### 2.2 Page (== one carousel Slide)
```jsonc
{
  "id": "page_1",
  "children": [ /* Element[] (layers, z-order = array order) */ ],
  "width": "auto",   // "auto" inherits store width; can override per page
  "height": "auto",
  "background": "#0d0d0d",
  "bleed": 0,
  "custom": { "slideRole": "hook" | "reframe" | "close" }   // WE add narrative role here
}
```

### 2.3 Element (Layer) — universal attrs (all types)
`id, type, name, x, y, width, height, rotation, opacity, visible, locked, blurEnabled, blurRadius,
shadowEnabled, shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY, shadowOpacity, draggable, selectable,
alwaysOnTop, showInExport, custom`.

**Element types (9, per `@polotno/schema`):** `text | image | svg | line | figure | gif | video | table | group`.

- **text:** `text, fontSize, fontFamily, fontStyle, fontWeight, textAlign, align, verticalAlign, fill,
  lineHeight, letterSpacing, strokeColor, strokeWidth, backgroundColor, backgroundEnabled, backgroundOpacity,
  placeholder`.
- **image:** `src, cropX, cropY, cropWidth, cropHeight, clipSrc (mask), flipX, flipY, borderColor,
  borderSize, cornerRadius`.
- **svg / figure:** `src`/`subType`, `colorsReplace` (recolor map), `keepRatio`.
- **group:** `children[]` (nested).

> **Mapping to CANON `Layer` types** (`image|text|logo|shape|cta|frame|legal|group|smart`, §5): Polotno has
> no `logo/cta/legal/smart/frame` primitive — these are **our semantic subtypes** carried in
> `element.custom.brutalType` + `element.name`. `logo`→image; `cta`→group(figure+text); `legal`→text;
> `frame`→figure/svg; `smart`→text with `custom.binding` (data-bound, resolved before render). The
> `EditorAdapter` owns this translation both directions. **This keeps CANON's Layer taxonomy authoritative
> while riding Polotno's 9 native types.**

Sources: [Store](https://polotno.com/docs/store), [JSON Schema](https://polotno.com/docs/schema),
[Page](https://polotno.com/docs/page).

---

## 3. React editor components + `EditorAdapter` skeleton

Polotno ships a component kit; you pass one `store` instance to all of them.

```tsx
// apps/web/src/editor/PolotnoCanvas.tsx  (L2: editor UI lives here)
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Workspace } from 'polotno/canvas/workspace';
import { SidePanel } from 'polotno/side-panel';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { PagesTimeline } from 'polotno/pages-timeline';   // carousel slide strip
import { createStore } from 'polotno/model/store';
import 'polotno/ui.css';

export function PolotnoCanvas({ store }: { store: ReturnType<typeof createStore> }) {
  return (
    <PolotnoContainer>
      <SidePanelWrap><SidePanel store={store} /></SidePanelWrap>
      <WorkspaceWrap>
        <Toolbar store={store} />
        <Workspace store={store} />
        <ZoomButtons store={store} />
        <PagesTimeline store={store} />   {/* reorder/add/remove slides */}
      </WorkspaceWrap>
    </PolotnoContainer>
  );
}
```

```ts
// apps/web/src/editor/store.ts
import { createStore } from 'polotno/model/store';
export const store = createStore({
  key: process.env.NEXT_PUBLIC_POLOTNO_API_KEY!,  // client key; see §6 on POLOTNO_API_KEY
  showCredit: false,                               // requires paid license; watermark off
});
```

### 3.1 `EditorAdapter` (the swappable seam — CANON §4/§50)
```ts
// apps/web/src/editor/EditorAdapter.ts
export interface EditorAdapter {
  load(doc: AdDocumentJSON): void;                 // AdDocument/Variant layer tree -> store.loadJSON
  toRenderSpec(): RenderSpec;                       // store.toJSON() -> shared render model (§5)
  applyPatch(patch: LayerPatch): void;             // typed diff, never full re-roll (L6)
  onChange(cb: () => void): () => void;            // store.on('change', ...) — debounced autosave
  addSlide(afterId?: string): string;
  reorderSlides(order: string[]): void;            // setSlideOrder op (L6)
  setSlideRole(slideId: string, role: SlideRole): void;
}
// Impl uses: store.addPage, store.selectPage, store.getElementById, store.history.transaction, etc.
```

> **Why an adapter (L2):** all app code speaks `RenderSpec` + `LayerPatch`; only `PolotnoEditorAdapter`
> knows Polotno's element attribute names and MobX quirks. Swap = one class.

Sources: [Overview](https://polotno.com/docs/overview),
[Store observer/reactions](https://polotno.com/docs/store-observer-and-reactions).

---

## 4. `LayerPatch` typed schema (L6 — frozen)

Chat-to-edit + the `EditorAgent` emit **typed diffs**, never full re-rolls (CANON §50). Per **L6**, ONE
schema = doc06's op union **wrapped in** doc03's envelope; `LayerPatchSet = LayerPatch[]`; `applyLayerPatch`
lives in `packages/shared`.

```ts
// packages/shared/src/patch.ts   (L2: shared types live here; defined once, everything imports)
export type LayerPatchOp =
  | { op: 'setText';      layerId: string; text: string }
  | { op: 'resize';       layerId: string; width: number; height: number }
  | { op: 'rotate';       layerId: string; rotation: number }
  | { op: 'reorderZ';     layerId: string; toIndex: number }
  | { op: 'setFont';      layerId: string; fontFamily?: string; fontSize?: number; fontWeight?: string; fontStyle?: string }
  | { op: 'setFill';      layerId: string; fill: string }
  | { op: 'addLayer';     layer: LayerInit; atIndex?: number }
  | { op: 'removeLayer';  layerId: string }
  | { op: 'replaceAsset'; layerId: string; assetId: string; src: string }
  | { op: 'setBinding';   layerId: string; binding: string }              // smart layer, e.g. "{{customer_count}}"
  | { op: 'setSlideOrder'; order: string[] }                              // carousel reorder
  | { op: 'setVisible';   layerId: string; visible: boolean };

export interface LayerPatch {                 // doc03 envelope
  id: string;
  variantId: string;
  slideId?: string;                           // omit => document-level (e.g. setSlideOrder)
  origin: 'chat' | 'drag' | 'agent' | 'propagate';
  createdBy: 'human' | 'agent';
  note?: string;
  ops: LayerPatchOp[];
}
export type LayerPatchSet = LayerPatch[];

export function applyLayerPatch(doc: AdDocumentJSON, patch: LayerPatch): AdDocumentJSON { /* pure, immutable */ }
```

**Invariants the builder must honor:**
- `applyLayerPatch` is **pure + reversible** (produce an inverse patch for undo/redo and audit).
- `EditorAdapter.applyPatch` translates each op to Polotno store calls **inside one
  `store.history.transaction()`** so undo is atomic.
- `origin:'propagate'` is emitted by carousel continuity (L10, §7); it fans a single edit to sibling slides.

---

## 5. Shared render model & editor↔export parity (L5)

**The parity guarantee is architectural, not best-effort:** the browser preview and the headless exporter
run **the same Polotno rendering engine** over the **same `store.toJSON()`**. `polotno-node` literally boots
a headless Chromium, loads the Polotno client, `loadJSON`s the spec, and captures the canvas — so what the
editor shows is what exports. Do not build a second "server renderer" that reimplements layout; that is the
classic parity-drift bug this design avoids.

### 5.1 `packages/render` public facade (L5 — frozen)
```ts
// packages/render/src/index.ts   (L2)
export interface RenderSpec {
  documentType: 'single_image' | 'carousel' | 'video';
  storeJSON: PolotnoJSON;            // for static/carousel
  remotion?: RemotionSpec;           // for video
  format: RenderKind;                // 'png' | 'jpg' | 'pdf' | 'svg'   (L3 — NO pptx)
  target: LinkedInTarget;            // ratio + safe-zone profile (§8)
  maxBytes?: number;                 // e.g. 5_000_000 for static (§8)
  pixelRatio?: number;
}
export interface RenderResult { kind: RenderKind; bytes: Buffer; width: number; height: number; sizeBytes: number; assetId?: string; }

// SINGLE PUBLIC ENTRY (orchestrator calls ONLY this — not renderStatic/renderTree directly):
export async function renderDocument(spec: RenderSpec): Promise<RenderResult> {
  switch (spec.documentType) {
    case 'single_image': {
      const raw = await renderStatic(spec);              // -> PNG/JPG/SVG via polotno-node
      return spec.maxBytes ? encodeImageUnder5MB(raw, spec.maxBytes) : raw;
    }
    case 'carousel':      return renderPdf(spec);        // -> PDF document ad
    case 'video':         return renderVideoLocal(spec); // -> MP4 via Remotion
  }
}
// internal (docs/06 owns exact signatures; docs 02/05 MUST match):
//   renderStatic(spec), renderPdf(spec), renderVideoLocal(spec), encodeImageUnder5MB(raw, maxBytes)
```

> **L5 note for docs 02/05:** orchestrator + agents call `renderDocument(...)`. `renderTree`/`renderStatic`
> are **internal**. Any doc that calls them directly is wrong per the ledger.

---

## 6. Licensing + `POLOTNO_API_KEY` (feeds `docs/11` env + `docs/12 §11` sign-off table, L9)

### 6.1 Polotno
- **Self-serve license: $899/month, flat** — no per-seat fees, **no per-render fees on self-hosted
  rendering**, single domain within one product/brand family. Enterprise = custom quote (+ optional
  source-code escrow). **Free trial: 60 days on a private dev server**, no card; must upgrade before
  production/live. A **Grassroots (discounted)** program exists for <50-employee/bootstrapped teams — worth
  requesting for Brutal.
- **API key is required** both in-browser (`createStore({ key })`) and server-side
  (`createInstance({ key })`). Without a paid key / with `showCredit`, Polotno renders a **credit/watermark**;
  the paid license lets us set `showCredit:false`.
- **Env var name:** CANON does not yet list a Polotno key. **Add `POLOTNO_API_KEY`** to §10 + `docs/11`
  (`.env.example` + matrix). Client needs it too → also expose `NEXT_PUBLIC_POLOTNO_API_KEY` (Next.js public
  env). Server render uses the non-public `POLOTNO_API_KEY`.

```
# add to docs/11 §6 .env.example
POLOTNO_API_KEY=            # server-side polotno-node (createInstance)
NEXT_PUBLIC_POLOTNO_API_KEY=# in-browser editor (createStore)
```

### 6.2 Remotion (L9)
- **Free** for individuals and **for-profit orgs with ≤3 employees**. A **Company License is required once
  the company has more than 3 employees (i.e. 4+)** — this is the exact trigger CANON L9 references. Pricing
  is set at remotion.pro (Creators ~per-seat/mo; Automators ~per-render with a monthly minimum; Enterprise
  custom) — **VERIFY live pricing at remotion.pro before signing; default assumption for planning: Company
  License needed the moment Brutal exceeds 3 employees.**
- **Telemetry:** from Remotion 5.0, render telemetry is **mandatory** on render-based (Automators)
  licensing; pass `licenseKey` to `renderMedia()`/`renderStill()` and use `@remotion/licensing`
  (usage API) for spend controls. Add `REMOTION_LICENSE_KEY` to env.

```
REMOTION_LICENSE_KEY=       # passed to renderMedia()/renderStill(); telemetry mandatory on Automators (>=5.0)
```

> **VERIFY (code the default now):** exact Polotno price/tier and Remotion per-seat/per-render numbers drift
> — default to "Polotno Self-serve $899/mo, Remotion Company License at 4+ employees" for the `docs/12 §11`
> table; adjust only if remotion.pro / polotno.com/sdk/pricing show different figures at sign-off.

Sources: [Polotno pricing](https://polotno.com/sdk/pricing), [Polotno license](https://polotno.com/legal/license),
[Remotion license](https://www.remotion.dev/docs/license), [Remotion licensing pkg](https://www.remotion.dev/docs/licensing),
[Remotion company license pricing](https://www.remotion.dev/blog/company-licenses).

---

## 7. Carousel / DOCUMENT-ad builder UX (L10)

LinkedIn **document ads** = a multi-page PDF (up to ~10–12 slides, 1080×1080 recommended; CANON §8).
Carousel builder maps 1 `Slide` = 1 Polotno **page**.

**UX requirements (fold in, L10):**
- **Ordered slides** with a `PagesTimeline` strip; drag to **reorder** → emits `{op:'setSlideOrder'}`.
- **Add/remove/duplicate** slide; each slide carries `custom.slideRole ∈ hook|reframe|close`
  (`CarouselArchitect` sets these; CANON §7).
- **Continuity default-propagate (L10):** editing a **continuity layer** (logo, footer, brand bar,
  progress dots, background frame — flagged `custom.continuity:true`) **defaults to propagate across all
  slides**, with a per-edit **"this slide only"** opt-out toggle. Implementation: the edit produces a
  base `LayerPatch` plus N sibling patches with `origin:'propagate'` for slides sharing that continuity
  layer key/role.
- **Deck-level pre-flight** warns on divergence (e.g. logo moved on 1 of 6 slides, font mismatch,
  off-brand color) before export.

```ts
// apps/web/src/editor/continuity.ts
export function propagateEdit(doc: AdDocumentJSON, edit: LayerPatch, scope: 'all'|'this'): LayerPatch[] {
  if (scope === 'this') return [edit];
  const layer = findLayer(doc, edit.slideId!, edit.ops[0].layerId!);
  if (!layer?.custom?.continuity) return [edit];         // only continuity layers fan out
  const siblings = slidesSharing(doc, layer.custom.continuityKey);  // by role/key, not raw id
  return [edit, ...siblings.map(s => ({ ...edit, id: uuid(), slideId: s.id, origin: 'propagate' as const }))];
}
```

---

## 8. Multi-format smart RE-LAYOUT + export + ≤5 MB (L10, L3, L5)

CANON §8: derive **all** ratios from **one base** via **smart re-layout, not naive cropping**, respecting
**safe-zones** (feed crop, profile overlap, "see more" fold). Polotno's `store.setSize(w, h, true)`
("magic resize") auto-repositions elements — **use it as a starting transform only, not the source of
truth.** Our re-layout adds safe-zones + named archetypes.

### 8.1 LinkedIn targets (from CANON §8 — exporter enforces)
| Type | Ratios (px) | Format | Cap |
|---|---|---|---|
| single_image | **1:1 1200×1200 (default)**, 1.91:1 1200×627, 4:5 960×1200 | JPG/PNG | **≤5 MB** |
| carousel/document | 1080×1080 ×(up to ~10–12) | **PDF** (L3) | LinkedIn doc-ad limit |
| video | 1:1 / 4:5 / 16:9 | MP4 | ≤200 MB (client-proven) |

### 8.2 Layout archetypes (L10 — 4th variant-matrix axis)
Named archetypes chosen by `CompositorPlanner` (CANON §7): **`full-bleed-hero-lower-third`, `split-panel`,
`editorial-kicker-top`, `quote-card`**. Each archetype is a **relative layout template** (anchors +
% positions + safe-zone constraints) so re-layout to a new ratio is deterministic, not a crop.
`Critic` anti-pattern **`layout_homogeneity`** flags a board where ≥3 variants share an archetype.
Wire `brandKit.imagery.style.avoid` tokens into the negative prompt automatically (L10).

```ts
// packages/render/src/relayout.ts
export interface Archetype {
  id: 'full-bleed-hero-lower-third'|'split-panel'|'editorial-kicker-top'|'quote-card';
  slots: Slot[];   // each: role, anchor (e.g. 'lower-third'|'top-left'), sizePct, maxLinesText
}
export function relayout(base: PolotnoJSON, target: LinkedInTarget, archetype: Archetype): PolotnoJSON {
  // 1. store.setSize(target.w, target.h) as scaffold  2. re-anchor slots per archetype
  // 3. clamp every slot inside target.safeZone  4. reflow text (textOverflow:'change-font-size')
}
```

**Safe-zones:** encode per target (e.g. feed 4:5 mobile crop, right-edge profile-pic overlap on 1.91:1,
bottom "see more" fold). No headline/CTA/logo/legal may enter a safe-zone → validated at pre-flight and
re-layout.

### 8.3 Headless static/carousel export (polotno-node)
```ts
// packages/render/src/polotnoNode.ts
import { createInstance } from 'polotno-node';
let instance: Awaited<ReturnType<typeof createInstance>> | null = null;
async function getInstance() {                       // reuse one instance; Puppeteer boot is expensive
  return (instance ??= await createInstance({ key: process.env.POLOTNO_API_KEY!, useParallelPages: true }));
}

export async function renderStatic(spec: RenderSpec): Promise<RenderResult> {
  const inst = await getInstance();
  const b64 = await inst.jsonToImageBase64(spec.storeJSON, {
    mimeType: spec.format === 'jpg' ? 'image/jpeg' : 'image/png',
    pixelRatio: spec.pixelRatio ?? 1,
    // pageId omitted => first page; for carousel we loop pages
    textOverflow: 'change-font-size', assetLoadTimeout: 30000, fontLoadTimeout: 6000,
  });
  const bytes = Buffer.from(b64, 'base64');
  return { kind: spec.format, bytes, sizeBytes: bytes.length, width: spec.storeJSON.width, height: spec.storeJSON.height };
}

export async function renderPdf(spec: RenderSpec): Promise<RenderResult> {
  const inst = await getInstance();
  const b64 = await inst.jsonToPDFBase64(spec.storeJSON, { pixelRatio: spec.pixelRatio ?? 2 }); // all pages
  const bytes = Buffer.from(b64, 'base64');
  return { kind: 'pdf', bytes, sizeBytes: bytes.length, width: spec.storeJSON.width, height: spec.storeJSON.height };
}
```
**polotno-node facts (verified):** `createInstance({ key, useParallelPages:true, useFontCache:true, browser?,
browserArgs?, requestInterceptor? })`; exports `jsonToImageBase64`, `jsonToDataURL`, `jsonToPDFBase64`,
`jsonToPDFDataURL`, `jsonToGIFBase64`, `jsonToVideoBase64` (+ DataURL variants). **No `jsonToPPTX` exists
(L3).** Common attrs: `mimeType`, `pixelRatio`, `pageId`, `assetLoadTimeout` (30000), `fontLoadTimeout`
(6000), `skipFontError`, `skipImageError`, `textOverflow` ('change-font-size'|'resize'|'ellipsis'),
`textSplitAllowed`, `legacyRichTextEnabled`. `instance.run(asyncFn, json)` executes store API in-browser
(use for SVG: `store.toSVG(...)`). Always `instance.close()` on shutdown. Ships browser args via exported
`args` for Linux/Docker/Lambda; increase Lambda memory/timeout/ephemeral storage for big decks.

### 8.4 SVG export (L3 `render_kind` includes `svg`)
No dedicated `jsonToSVG` in polotno-node → use `instance.run`:
```ts
export async function renderSvg(spec: RenderSpec): Promise<RenderResult> {
  const inst = await getInstance();
  const svg = await inst.run(async (json) => {
    store.loadJSON(json); await store.waitLoading();
    return await store.toSVG({ fontEmbedding: true });   // SVG export is beta in Polotno
  }, spec.storeJSON);
  const bytes = Buffer.from(svg, 'utf8');
  return { kind:'svg', bytes, sizeBytes: bytes.length, width: spec.storeJSON.width, height: spec.storeJSON.height };
}
```
> **VERIFY (code default now):** `store.toSVG` is marked **beta**. Default: attempt it for `svg` render_kind;
> if it errors at runtime, fall back to rasterized PNG and log — do not block the build.

### 8.5 ≤5 MB optimization — `encodeImageUnder5MB` (sharp)
```ts
// packages/render/src/encode.ts   — sharp 0.35.x (libvips)
import sharp from 'sharp';
export async function encodeImageUnder5MB(raw: RenderResult, maxBytes = 5_000_000): Promise<RenderResult> {
  if (raw.sizeBytes <= maxBytes) return raw;
  // 1) prefer JPEG for photographic ad imagery; step quality down
  for (const q of [90, 85, 80, 75, 70, 65, 60]) {
    const out = await sharp(raw.bytes).jpeg({ quality: q, mozjpeg: true }).toBuffer();
    if (out.length <= maxBytes) return { ...raw, kind:'jpg', bytes: out, sizeBytes: out.length };
  }
  // 2) if still over, downscale longest edge then retry (rare at LinkedIn dims)
  const meta = await sharp(raw.bytes).metadata();
  const scale = Math.sqrt(maxBytes / raw.sizeBytes) * 0.95;
  const out = await sharp(raw.bytes).resize(Math.round((meta.width!) * scale)).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
  return { ...raw, kind:'jpg', bytes: out, sizeBytes: out.length };
}
```
**sharp facts (verified):** current **0.35.2** (libvips; fastest resize for JPEG/PNG/WebP/AVIF/GIF/TIFF);
`.jpeg({quality, mozjpeg})`, `.png({compressionLevel, palette})`, `.resize()`, `.toBuffer()`. Native binary
→ ensure the deployment target matches (Vercel/Lambda arch); Next.js already recommends sharp for image opt.

### 8.6 pdf-lib — role (secondary, not the primary PDF path)
Primary document-ad PDF comes from **polotno-node `jsonToPDFBase64`** (keeps parity). Use **pdf-lib** only
for post-assembly: merge externally-generated pages, stamp metadata/title, set page boxes, or splice a
cover — pure-JS, no native deps, browser+node. (`PDFDocument.create/load`, `embedPng`, `embedJpg`,
`page.drawImage`, `addPage`, `doc.save`.)
> **VERIFY:** pdf-lib's npm shows an old "last published" date (stable/low-churn, not abandoned) — it works
> fine; if a maintained fork (e.g. `@cantoo/pdf-lib`) is needed for a specific fix, that's a swap, default
> to `pdf-lib`.

Sources: [polotno-node README](https://github.com/polotno-project/polotno-node/blob/master/README.md),
[Server-side generation](https://polotno.com/docs/server-side-image-generation-with-node-js),
[Text overflow](https://polotno.com/docs/text-overflow), [Import/export](https://polotno.com/docs/import-and-export),
[Store setSize/magic resize](https://polotno.com/docs/store),
[sharp](https://www.npmjs.com/package/sharp), [pdf-lib](https://www.npmjs.com/package/pdf-lib).

---

## 9. Video path — Remotion (packages/render)

Video is a first-class fast-follow (CANON §0). `packages/render/` holds the Remotion project; the video
`AdDocument` = a Remotion composition spec + layer/subtitle/audio tracks (CANON §5). Muted-first,
burned-in subtitles, first-3-seconds stopping power (CANON §8).

```ts
// packages/render/src/renderVideoLocal.ts
import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia } from '@remotion/renderer';
import fs from 'node:fs/promises';

export async function renderVideoLocal(spec: RenderSpec): Promise<RenderResult> {
  const serveUrl = await bundle({ entryPoint: require.resolve('./remotion/index.ts') });
  const composition = await selectComposition({ serveUrl, id: spec.remotion!.compositionId, inputProps: spec.remotion!.props });
  const out = `/tmp/${spec.remotion!.compositionId}.mp4`;
  await renderMedia({
    composition, serveUrl, codec: 'h264', outputLocation: out,
    inputProps: spec.remotion!.props,
    licenseKey: process.env.REMOTION_LICENSE_KEY,   // L9 telemetry (mandatory on Automators >=5.0)
    onProgress: ({ progress }) => spec.remotion!.onProgress?.(progress),
  });
  const bytes = await fs.readFile(out);
  return { kind: 'png' /*container is mp4; RenderKind has no 'mp4' — carry via assetId/mime*/, bytes, sizeBytes: bytes.length, width: composition.width, height: composition.height };
}
```
> **VERIFY (code default now):** `renderMedia` signature (`composition, serveUrl, codec, outputLocation,
> inputProps, onProgress, licenseKey`) — default `codec:'h264'` (LinkedIn MP4). Adjust only on live error.
> GPU-optional per CANON §4 (Modal/Replicate) if local render is too slow. NOTE: `RenderKind` (L3) is
> `png|jpg|pdf|svg` and has no `mp4` member — video output rides on `Asset`/`Render` with its own mime,
> not `render_kind`; do not add `mp4` to the `render_kind` enum.

Sources: [@remotion/renderer](https://www.remotion.dev/docs/renderer),
[Remotion licensing](https://www.remotion.dev/docs/licensing).

---

## 10. Assumptions & open flags (all resolved to a codeable default per L12)

1. **Polotno import paths** (`polotno/model/store`, `polotno/canvas/workspace`, …) — code as shown;
   adjust only if a live import fails.
2. **`@polotno/schema`** — assume published; use for zod cross-check. If absent, derive zod from §2/§3.
3. **`store.toSVG` beta** — attempt for `svg`; fall back to PNG on error (§8.4).
4. **PPTX** — explicitly **not built** (L3). If ever needed post-v1, it's a separate step after PDF,
   flagged VERIFY — not a polotno-node call.
5. **Polotno "magic resize"** — scaffold only; our archetype+safe-zone re-layout is authoritative (§8.2).
6. **Licensing numbers** — default Polotno $899/mo self-serve, Remotion Company License at 4+ employees;
   confirm live at sign-off for `docs/12 §11`.
7. **Env additions** — `POLOTNO_API_KEY`, `NEXT_PUBLIC_POLOTNO_API_KEY`, `REMOTION_LICENSE_KEY` → add to
   CANON §10 + `docs/11`.

**No hedges remain that a one-shot builder cannot resolve (L11/L12): every VERIFY above states the exact
default to code now.**

---

### Sources (consolidated)
- Polotno Store: https://polotno.com/docs/store
- Polotno Overview / React: https://polotno.com/docs/overview
- Polotno JSON Schema: https://polotno.com/docs/schema
- Polotno Page: https://polotno.com/docs/page
- Polotno Text Overflow: https://polotno.com/docs/text-overflow
- Polotno Import/Export: https://polotno.com/docs/import-and-export
- Polotno Server-side (Node): https://polotno.com/docs/server-side-image-generation-with-node-js
- polotno-node README: https://github.com/polotno-project/polotno-node/blob/master/README.md
- Polotno pricing: https://polotno.com/sdk/pricing
- Polotno license: https://polotno.com/legal/license
- Remotion license (3-employee rule): https://www.remotion.dev/docs/license
- Remotion licensing pkg / telemetry: https://www.remotion.dev/docs/licensing
- Remotion company license pricing: https://www.remotion.dev/blog/company-licenses
- @remotion/renderer: https://www.remotion.dev/docs/renderer
- pdf-lib: https://www.npmjs.com/package/pdf-lib
- sharp: https://www.npmjs.com/package/sharp
