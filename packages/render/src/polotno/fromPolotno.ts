import { LayerTree, type LayerTreeT } from '@brutal/shared';
import type { PolotnoElement, PolotnoStoreJSON } from './toPolotno';

// ─────────────────────────────────────────────────────────────────────────────
// docs/06 §3.2 — Polotno store JSON → canonical LayerTree (exact inverse of
// toPolotno for the golden round-trip test). Reconstruction strategy: start from
// the stashed `custom.brutal` canonical layer, then MERGE back the properties
// the editor may have changed (geometry, visibility, text, fonts, colors).
// Bindings/renderHints are restored from custom.* — a smart layer's resolved
// display text NEVER overwrites its binding/template (load-bearing rule, §3.1).
// ─────────────────────────────────────────────────────────────────────────────

type AnyLayer = Record<string, any> & { id: string; type: string };

function fromPolotnoElement(el: PolotnoElement): AnyLayer {
  const stashed = (el.custom as Record<string, any> | undefined)?.brutal as AnyLayer | undefined;
  if (!stashed) throw new Error(`fromPolotno: element '${el.id}' has no custom.brutal canonical stash`);
  const l: AnyLayer = structuredClone(stashed);

  // merge editor-mutable geometry back
  for (const k of ['x', 'y', 'width', 'height', 'rotation', 'opacity', 'visible'] as const) {
    if (el[k] !== undefined) l[k] = el[k];
  }
  if (typeof el.name === 'string' && el.name) l.name = el.name;

  // merge per-type editable props
  switch (l.type) {
    case 'text':
    case 'legal':
      if (typeof el.text === 'string') l.text = el.text;
      if (typeof el.fontFamily === 'string') l.fontFamily = el.fontFamily;
      if (el.fontSize !== undefined) l.fontSize = el.fontSize;
      if (el.fontWeight !== undefined) l.fontWeight = Number(el.fontWeight) || l.fontWeight;
      if (typeof el.fill === 'string') l.color = el.fill;
      if (typeof el.align === 'string') l.align = el.align;
      break;
    case 'smart':
      // resolved text is NOT merged back into template/binding (rule §3.1);
      // style edits are.
      if (typeof el.fontFamily === 'string') l.fontFamily = el.fontFamily;
      if (el.fontSize !== undefined) l.fontSize = el.fontSize;
      if (typeof el.fill === 'string') l.color = el.fill;
      break;
    case 'image':
    case 'logo':
      if (typeof el.src === 'string' && el.src) l.src = el.src;
      break;
    case 'shape':
    case 'frame':
      if (typeof el.fill === 'string') l.fill = el.fill === 'transparent' ? l.fill : el.fill;
      if (el.strokeWidth !== undefined) l.strokeWidth = el.strokeWidth;
      if (el.cornerRadius !== undefined) l.cornerRadius = el.cornerRadius;
      break;
    case 'cta': {
      // cta was projected as group(figure+text); pull label/colors back from children
      const children = (el.children ?? []) as PolotnoElement[];
      const label = children.find((c) => c.id === `${l.id}__label`);
      const bg = children.find((c) => c.id === `${l.id}__bg`);
      if (label && typeof label.text === 'string') l.text = label.text;
      if (label && typeof label.fill === 'string') l.textColor = label.fill;
      if (bg && typeof bg.fill === 'string' && bg.fill !== 'transparent') l.fill = bg.fill;
      break;
    }
    case 'group':
      l.children = ((el.children ?? []) as PolotnoElement[]).map(fromPolotnoElement);
      break;
  }
  return l;
}

export function fromPolotno(json: PolotnoStoreJSON): LayerTreeT {
  const page = json.pages[0];
  if (!page) throw new Error('fromPolotno: store has no pages');
  const meta = json.custom ?? {};
  const tree = {
    schemaVersion: (meta.schemaVersion as 1) ?? 1,
    ratio: (meta.ratio as string) ?? '1:1',
    canvas: {
      width: json.width, height: json.height,
      unit: (meta.unit as 'px') ?? 'px',
      background: page.background,
    },
    safeZones: (meta.safeZones as Record<string, unknown>) ?? {},
    layers: page.children.map(fromPolotnoElement),
    ...(meta.smartData ? { smartData: meta.smartData } : {}),
  };
  return LayerTree.parse(tree);   // re-validate at the boundary (server is authoritative)
}
