import type { LayerTreeT } from '@brutal/shared';
import { brandFonts } from '../fonts';

// ─────────────────────────────────────────────────────────────────────────────
// docs/06 §3 — canonical LayerTree → Polotno store JSON (lossless projection).
// The canonical tree is the source of truth (A1); Polotno JSON is DERIVED. Every
// element stashes its full canonical layer in `custom.brutal` so fromPolotno()
// can reconstruct exactly (golden round-trip, §3.2), while live editor edits to
// geometry/text/colors flow back through the merge in fromPolotno().
// `smart` layers emit their RESOLVED display string; the binding survives in
// custom (load-bearing rule, §3.1).
// ─────────────────────────────────────────────────────────────────────────────

export interface PolotnoStoreJSON {
  width: number;
  height: number;
  fonts: ReturnType<typeof brandFonts>;
  pages: Array<{ id: string; background: string; children: PolotnoElement[] }>;
  custom: Record<string, unknown>;
}

export type PolotnoElement = Record<string, unknown> & { id: string; type: string };

type AnyLayer = Record<string, any> & { id: string; type: string };

function resolveSmartText(layer: AnyLayer, smartData: Record<string, any> | undefined, locale: string): string {
  const template: string = layer.template ?? '';
  const resolved = template.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    const entry = smartData?.[key];
    if (!entry) return '';
    const d = entry.display;
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object') return d[locale] ?? Object.values(d)[0] ?? String(entry.value);
    return String(entry.value);
  });
  return resolved.includes('{{') || resolved.trim() === '' ? (layer.fallback ?? resolved) : resolved;
}

const base = (l: AnyLayer) => ({
  id: l.id,
  name: l.name ?? '',
  x: l.x, y: l.y, width: l.width, height: l.height,
  rotation: l.rotation ?? 0,
  opacity: l.opacity ?? 1,
  visible: l.visible ?? true,
  // stash the FULL canonical layer for lossless reconstruction (docs/06 §3.2)
  custom: { ...(l.custom ?? {}), brutal: structuredClone(l) },
});

function toPolotnoElement(l: AnyLayer, smartData: Record<string, any> | undefined, locale: string): PolotnoElement {
  switch (l.type) {
    case 'image':
      return { ...base(l), type: 'image', src: l.src ?? '', cropX: l.crop?.x ?? 0, cropY: l.crop?.y ?? 0,
        cropWidth: l.crop?.width ?? 1, cropHeight: l.crop?.height ?? 1, flipX: l.flipX ?? false, flipY: l.flipY ?? false };
    case 'logo':
      return { ...base(l), type: 'image', src: l.src ?? '',
        custom: { ...base(l).custom, kind: 'logo' } };
    case 'text':
      return { ...base(l), type: 'text', text: l.text, fontFamily: l.fontFamily, fontSize: l.fontSize,
        fontWeight: String(l.fontWeight ?? 400), fontStyle: l.fontStyle ?? 'normal', fill: l.color,
        align: l.align ?? 'left', lineHeight: l.lineHeight ?? 1.1, letterSpacing: l.letterSpacing ?? 0,
        verticalAlign: l.verticalAlign ?? 'top' };
    case 'legal':
      return { ...base(l), type: 'text', text: l.text, fontFamily: l.fontFamily, fontSize: l.fontSize,
        fill: l.color, align: l.align ?? 'left', fontWeight: '400',
        custom: { ...base(l).custom, kind: 'legal', requiredBy: l.requiredBy } };
    case 'smart': {
      const resolved = resolveSmartText(l, smartData, locale);
      return { ...base(l), type: 'text', text: resolved, fontFamily: l.fontFamily ?? 'Inter',
        fontSize: l.fontSize ?? 32, fill: l.color ?? '#ffffff', fontWeight: '400',
        custom: { ...base(l).custom, kind: 'smart', binding: l.binding, template: l.template, fallback: l.fallback } };
    }
    case 'shape':
      return { ...base(l), type: 'figure', subType: l.shape === 'ellipse' ? 'circle' : 'rect',
        fill: l.fill ?? 'transparent', stroke: l.stroke ?? '', strokeWidth: l.strokeWidth ?? 0,
        cornerRadius: l.cornerRadius ?? 0 };
    case 'frame':
      return { ...base(l), type: 'figure', subType: 'rect', fill: l.fill ?? 'transparent',
        stroke: l.stroke ?? '', strokeWidth: l.strokeWidth ?? 0, cornerRadius: l.cornerRadius ?? 0,
        custom: { ...base(l).custom, kind: 'frame' } };
    case 'cta': {
      // cta → group(figure + text) per §3.1 — button-like, first-class for ctaAttention scoring
      const pad = { x: l.paddingX ?? 28, y: l.paddingY ?? 16 };
      return { ...base(l), type: 'group', custom: { ...base(l).custom, kind: 'cta' },
        children: [
          { id: `${l.id}__bg`, type: 'figure', subType: 'rect', x: l.x, y: l.y, width: l.width, height: l.height,
            fill: l.style === 'solid' ? l.fill : 'transparent',
            stroke: l.style === 'outline' ? l.fill : '', strokeWidth: l.style === 'outline' ? 2 : 0,
            cornerRadius: l.cornerRadius ?? 8 },
          { id: `${l.id}__label`, type: 'text', x: l.x + pad.x, y: l.y + pad.y,
            width: Math.max(10, l.width - 2 * pad.x), height: Math.max(10, l.height - 2 * pad.y),
            text: l.text, fontFamily: l.fontFamily, fontSize: l.fontSize,
            fontWeight: String(l.fontWeight ?? 600), fill: l.textColor, align: 'center', verticalAlign: 'middle' },
        ] };
    }
    case 'group':
      return { ...base(l), type: 'group',
        children: (l.children ?? []).map((c: AnyLayer) => toPolotnoElement(c, smartData, locale)) };
    default:
      throw new Error(`toPolotno: unknown layer type '${l.type}'`);
  }
}

export function toPolotno(tree: LayerTreeT, opts?: { locale?: string; brandKitVersion?: number; pageId?: string }): PolotnoStoreJSON {
  const locale = opts?.locale ?? 'de';
  const t = tree as LayerTreeT & { layers: AnyLayer[]; smartData?: Record<string, any> };
  return {
    width: t.canvas.width,
    height: t.canvas.height,
    fonts: brandFonts(),
    pages: [{
      id: opts?.pageId ?? 'page_1',
      background: t.canvas.background ?? 'transparent',
      children: t.layers.map((l) => toPolotnoElement(l, t.smartData, locale)),
    }],
    // doc-level metadata survives round-trip (docs/06 §3.2)
    custom: {
      brandKitVersion: opts?.brandKitVersion ?? null,
      locale,
      renderHintsVersion: 1,
      schemaVersion: t.schemaVersion,
      ratio: t.ratio,
      unit: t.canvas.unit ?? 'px',
      safeZones: t.safeZones,
      smartData: t.smartData ?? null,
    },
  };
}
