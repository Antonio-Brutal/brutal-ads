import { createHash } from 'node:crypto';
import type { AdRatio, LayerTreeT, RenderKind } from '@brutal/shared';
import { encodeImageUnder5MB } from './export/encodeImage';
import { renderStatic } from './polotno/renderStatic';
import { toPolotno } from './polotno/toPolotno';

// ─────────────────────────────────────────────────────────────────────────────
// @brutal/render — renderDocument(spec) is THE ONLY public entry (CANON §12 L5,
// docs/06 §8.0). Everything else is a named internal (exported for tests only).
// P1 scope: png/jpg at the tree's base ratio (+ ≤5MB gate). Multi-ratio smart
// re-layout lands in P5; pdf (document ads) in P7; mp4 (Remotion) in P9.
// PPTX is deliberately absent (CANON §12 L3).
// ─────────────────────────────────────────────────────────────────────────────

export interface RenderSpec {
  variant: {                                 // canonical-tree carrier (docs/06: the Variant)
    layerTree: LayerTreeT;
    slides?: LayerTreeT[];                   // carousel (docs/03: slides carry their own trees) — pdf renders one page per slide
    locale?: 'de' | 'en';
    brandKitVersion?: number;
  };
  format: RenderKind | 'mp4';                // 'png'|'jpg'|'pdf'|'svg'|'mp4'
  ratios?: AdRatio[];                        // P5: re-layout per ratio; P1 renders the base ratio only
  pixelRatio?: number;
  maxBytes?: number;                         // default 5 MB for jpg/png (LinkedIn single image)
}

export interface RenderResult {
  renders: Array<{
    ratio: AdRatio;
    format: RenderSpec['format'];
    buffer: Buffer;
    bytes: number;
    width: number;
    height: number;
    sha256: string;
  }>;
}

export async function renderDocument(spec: RenderSpec): Promise<RenderResult> {
  const tree = spec.variant.layerTree;
  switch (spec.format) {
    case 'png':
    case 'jpg': {
      if (spec.ratios && spec.ratios.some((r) => r !== tree.ratio)) {
        throw new Error('renderDocument: multi-ratio re-layout lands in P5 (smartRelayout) — pass the base ratio only for now');
      }
      const storeJson = toPolotno(tree, { locale: spec.variant.locale, brandKitVersion: spec.variant.brandKitVersion });
      const raw = await renderStatic({ storeJson, format: spec.format, pixelRatio: spec.pixelRatio });
      const out = spec.format === 'jpg'
        ? await encodeImageUnder5MB(raw, { maxBytes: spec.maxBytes })
        : { buffer: raw, bytes: raw.byteLength, width: tree.canvas.width, height: tree.canvas.height };
      return {
        renders: [{
          ratio: tree.ratio as AdRatio,
          format: spec.format,
          buffer: out.buffer,
          bytes: out.bytes,
          width: out.width ?? tree.canvas.width,
          height: out.height ?? tree.canvas.height,
          sha256: createHash('sha256').update(out.buffer).digest('hex'),
        }],
      };
    }
    case 'pdf': {
      // docs/06 §8.2 — document/carousel ads: ONE PDF page per slide tree (single tree → 1 page).
      const trees = spec.variant.slides?.length ? spec.variant.slides : [tree];
      const opts = { locale: spec.variant.locale, brandKitVersion: spec.variant.brandKitVersion };
      const base = toPolotno(trees[0]!, { ...opts, pageId: 'page_1' });
      const pages = trees.map((t, i) => {
        if (i === 0) return base.pages[0]!;
        const page = toPolotno(t, { ...opts, pageId: `page_${i + 1}` }).pages[0]!;
        // element ids repeat across slides (ly_headline…) — suffix so store.loadJSON stays unambiguous
        return { ...page, children: page.children.map((c) => ({ ...c, id: `${c.id}__p${i + 1}` })) };
      });
      const buffer = await renderStatic({ storeJson: { ...base, pages }, format: 'pdf' });
      return {
        renders: [{
          ratio: trees[0]!.ratio as AdRatio,
          format: 'pdf',
          buffer,
          bytes: buffer.byteLength,
          width: trees[0]!.canvas.width,
          height: trees[0]!.canvas.height,
          sha256: createHash('sha256').update(buffer).digest('hex'),
        }],
      };
    }
    case 'svg':
      throw new Error('renderDocument: svg lands in P7 — docs/06 §7.2 VERIFY');
    case 'mp4':
      throw new Error('renderDocument: mp4 (Remotion) lands in P9 — docs/06 §10.4');
  }
}

// ---- NAMED INTERNALS (tests / other render code ONLY — not part of the app contract) ----
export { renderStatic, closeRenderInstance } from './polotno/renderStatic';
export { toPolotno, type PolotnoStoreJSON, type PolotnoElement } from './polotno/toPolotno';
export { fromPolotno } from './polotno/fromPolotno';
export { encodeImageUnder5MB, LINKEDIN_IMAGE_MAX_BYTES } from './export/encodeImage';
export { brandFonts } from './fonts';
