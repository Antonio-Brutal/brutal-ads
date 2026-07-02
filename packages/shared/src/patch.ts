import type { LayerPatchOpT, LayerPatchT, LayerTreeT } from './layer-tree';

// ─────────────────────────────────────────────────────────────────────────────
// applyLayerPatch — docs/03 §6.5 / docs/06 §4: the ONE implementation of the
// canonical LayerPatch op union. Pure + immutable (same fn in browser optimistic,
// server authoritative, and renderer). Atomic: ops apply all-or-nothing — any
// failure throws LayerPatchError and the input tree is untouched.
// `setSlideOrder` is a DECK-level op (carousel slide reordering); it does not
// mutate a single tree — callers split it out and use applySlideOrder().
// ─────────────────────────────────────────────────────────────────────────────

export class LayerPatchError extends Error {
  constructor(message: string, readonly op?: LayerPatchOpT) {
    super(message);
    this.name = 'LayerPatchError';
  }
}

type AnyLayer = Record<string, unknown> & { id: string; type: string; children?: AnyLayer[] };

function findLayer(layers: AnyLayer[], id: string): AnyLayer | null {
  for (const l of layers) {
    if (l.id === id) return l;
    if (l.type === 'group' && Array.isArray(l.children)) {
      const hit = findLayer(l.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

/** Returns the array that directly contains layer `id` (root layers or a group's children). */
function findParentArray(layers: AnyLayer[], id: string): AnyLayer[] | null {
  if (layers.some((l) => l.id === id)) return layers;
  for (const l of layers) {
    if (l.type === 'group' && Array.isArray(l.children)) {
      const hit = findParentArray(l.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

function mustFind(layers: AnyLayer[], id: string, op: LayerPatchOpT): AnyLayer {
  const layer = findLayer(layers, id);
  if (!layer) throw new LayerPatchError(`layer '${id}' not found`, op);
  return layer;
}

const TEXT_BEARING = new Set(['text', 'cta', 'legal']);

function applyOp(layers: AnyLayer[], op: LayerPatchOpT): void {
  switch (op.op) {
    case 'setText': {
      const l = mustFind(layers, op.layerId, op);
      if (TEXT_BEARING.has(l.type)) l.text = op.text;
      else if (l.type === 'smart') l.template = op.text; // smart layers render their template
      else throw new LayerPatchError(`setText not applicable to layer type '${l.type}'`, op);
      break;
    }
    case 'resize': {
      const l = mustFind(layers, op.layerId, op);
      if (op.x !== undefined) l.x = op.x;
      if (op.y !== undefined) l.y = op.y;
      l.width = op.width;
      l.height = op.height;
      break;
    }
    case 'rotate':
      mustFind(layers, op.layerId, op).rotation = op.rotation;
      break;
    case 'reorderZ': {
      const parent = findParentArray(layers, op.layerId);
      if (!parent) throw new LayerPatchError(`layer '${op.layerId}' not found`, op);
      const from = parent.findIndex((l) => l.id === op.layerId);
      const [moved] = parent.splice(from, 1);
      const to = Math.max(0, Math.min(op.toIndex, parent.length));
      parent.splice(to, 0, moved!);
      break;
    }
    case 'setFont': {
      const l = mustFind(layers, op.layerId, op);
      if (op.fontFamily !== undefined) l.fontFamily = op.fontFamily;
      if (op.fontSize !== undefined) l.fontSize = op.fontSize;
      if (op.fontWeight !== undefined) l.fontWeight = op.fontWeight;
      if (op.fontStyle !== undefined) l.fontStyle = op.fontStyle;
      break;
    }
    case 'setFill': {
      const l = mustFind(layers, op.layerId, op);
      // fill semantics per layer type (docs/03 §6.5 example applies setFill to a text headline):
      // text/legal/smart → color; shape/cta/frame → fill; logo → tint.
      if (l.type === 'text' || l.type === 'legal' || l.type === 'smart') l.color = op.fill;
      else if (l.type === 'logo') l.tint = op.fill;
      else l.fill = op.fill;
      break;
    }
    case 'addLayer': {
      const layer = op.layer as AnyLayer;
      if (findLayer(layers, layer.id)) throw new LayerPatchError(`layer '${layer.id}' already exists`, op);
      if (op.afterLayerId === null) {
        layers.push(layer); // topmost (z-order = array order)
      } else {
        const parent = findParentArray(layers, op.afterLayerId);
        if (!parent) throw new LayerPatchError(`afterLayerId '${op.afterLayerId}' not found`, op);
        parent.splice(parent.findIndex((l) => l.id === op.afterLayerId) + 1, 0, layer);
      }
      break;
    }
    case 'removeLayer': {
      const parent = findParentArray(layers, op.layerId);
      if (!parent) throw new LayerPatchError(`layer '${op.layerId}' not found`, op);
      parent.splice(parent.findIndex((l) => l.id === op.layerId), 1);
      break;
    }
    case 'replaceAsset': {
      const l = mustFind(layers, op.layerId, op);
      l.assetId = op.assetId;
      delete l.src; // force re-resolution of the asset URL at render time
      break;
    }
    case 'setBinding': {
      const l = mustFind(layers, op.layerId, op);
      if (l.type !== 'smart') throw new LayerPatchError(`setBinding requires a smart layer, got '${l.type}'`, op);
      l.binding = op.binding;
      if (op.template !== undefined) l.template = op.template;
      if (op.fallback !== undefined) l.fallback = op.fallback;
      break;
    }
    case 'setVisible':
      mustFind(layers, op.layerId, op).visible = op.visible;
      break;
    case 'setSlideOrder':
      // Deck-level op — reorders carousel slides, not layers in this tree. No-op here by design;
      // the orchestrator routes it to applySlideOrder(). Kept non-throwing so a mixed batch stays atomic.
      break;
  }
}

export function applyLayerPatch(tree: LayerTreeT, patch: LayerPatchT): LayerTreeT {
  const next = structuredClone(tree) as LayerTreeT & { layers: AnyLayer[] };
  for (const op of patch.ops) applyOp(next.layers, op);
  return next;
}

/** Deck-level companion for the `setSlideOrder` op: returns slides reordered per `order` (slide ids). */
export function applySlideOrder<T extends { id: string }>(slides: T[], order: string[]): T[] {
  const byId = new Map(slides.map((s) => [s.id, s]));
  if (order.length !== slides.length || order.some((id) => !byId.has(id))) {
    throw new LayerPatchError(
      `setSlideOrder order must be a permutation of the current slide ids (got [${order.join(',')}])`,
    );
  }
  return order.map((id) => byId.get(id)!);
}
