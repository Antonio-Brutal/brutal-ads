import type { AdRatio } from './enums';
import type { LayerTreeT } from './layer-tree';

// ─────────────────────────────────────────────────────────────────────────────
// docs/10 P5 / docs/06 §8 — smart multi-ratio RE-LAYOUT (not naive crop).
// One base tree (authored at its base ratio) → target ratio, driven by
// renderHints (anchor, autoFit, minFontPx, safeZone) + safe zones (profile
// overlap, "see more" fold). Deterministic and pure: same input → same output.
// LinkedIn target dimensions per docs/07 §2.1.
// ─────────────────────────────────────────────────────────────────────────────

export const RATIO_DIMS: Record<AdRatio, { width: number; height: number }> = {
  '1:1':    { width: 1200, height: 1200 },   // default — best mobile feed (docs/07)
  '1.91:1': { width: 1200, height: 628 },    // desktop+mobile landscape
  '4:5':    { width: 720,  height: 900 },    // mobile-only vertical
  '16:9':   { width: 1920, height: 1080 },   // video landscape
  '9:16':   { width: 1080, height: 1920 },   // video vertical
};

type AnyLayer = Record<string, any> & { id: string; type: string };

const FULL_BLEED_COVERAGE = 0.95;   // a layer covering ≥95% of both axes is treated as background

function isFullBleed(l: AnyLayer, canvas: { width: number; height: number }): boolean {
  return l.width >= canvas.width * FULL_BLEED_COVERAGE && l.height >= canvas.height * FULL_BLEED_COVERAGE;
}

function anchorOf(l: AnyLayer): string {
  return l.renderHints?.anchor ?? 'top-left';
}

/** Re-anchor a scaled layer: preserve the fractional margin on the anchored edges. */
function reposition(
  l: AnyLayer, scaled: { width: number; height: number },
  from: { width: number; height: number }, to: { width: number; height: number },
): { x: number; y: number } {
  const anchor = anchorOf(l);
  const [v, h] = anchor === 'center' ? ['center', 'center'] : anchor.split('-') as [string, string];

  const leftFrac = l.x / from.width;
  const rightFrac = (from.width - (l.x + l.width)) / from.width;
  const topFrac = l.y / from.height;
  const bottomFrac = (from.height - (l.y + l.height)) / from.height;

  let x: number;
  if (h === 'left') x = leftFrac * to.width;
  else if (h === 'right') x = to.width - rightFrac * to.width - scaled.width;
  else x = (to.width - scaled.width) * (leftFrac + rightFrac === 0 ? 0.5 : leftFrac / (leftFrac + rightFrac));

  let y: number;
  if (v === 'top') y = topFrac * to.height;
  else if (v === 'bottom') y = to.height - bottomFrac * to.height - scaled.height;
  else y = (to.height - scaled.height) * (topFrac + bottomFrac === 0 ? 0.5 : topFrac / (topFrac + bottomFrac));

  return { x, y };
}

function relayoutLayer(
  l: AnyLayer, from: { width: number; height: number }, to: { width: number; height: number },
  scale: number, safeZones: LayerTreeT['safeZones'],
): AnyLayer {
  const out: AnyLayer = structuredClone(l);

  if ((l.type === 'image' || l.type === 'shape') && isFullBleed(l, from)) {
    // background/scrim: stretch to fill the new canvas (cover)
    out.x = 0; out.y = 0; out.width = to.width;
    out.height = isFullBleed(l, { width: from.width, height: from.height }) && l.height >= from.height * FULL_BLEED_COVERAGE
      ? to.height
      : l.height * scale;
    if (l.width >= from.width * FULL_BLEED_COVERAGE && l.height < from.height * FULL_BLEED_COVERAGE) {
      // full-width band (e.g. scrim over lower third): keep band height scaled, re-anchor
      const pos = reposition(l, { width: to.width, height: l.height * scale }, from, to);
      out.y = pos.y; out.height = l.height * scale;
    }
    return out;
  }

  out.width = l.width * scale;
  out.height = l.height * scale;
  const pos = reposition(l, { width: out.width, height: out.height }, from, to);
  out.x = pos.x;
  out.y = pos.y;

  // typography scales with autoFit, floored at minFontPx (legal floor is absolute)
  if (typeof out.fontSize === 'number') {
    const minPx = out.renderHints?.minFontPx ?? (l.type === 'legal' ? 14 : 12);
    out.fontSize = Math.max(minPx, Math.round(out.fontSize * scale * 100) / 100);
  }

  // safe-zone clamps (docs/06: priority layers must survive every re-layout)
  if (out.renderHints?.safeZone !== false) {
    const overlapTop = (safeZones?.profileOverlap?.top ?? 0) * to.height;
    if (l.type === 'logo' || l.type === 'legal') {
      // keep clear of the profile-photo overlay region only if the layer started below it
      if (out.y < overlapTop && l.y >= (safeZones?.profileOverlap?.top ?? 0) * from.height) out.y = overlapTop;
    }
    const fold = (safeZones?.seeMoreFold ?? 1) * to.height;
    if ((l.type === 'cta') && out.y + out.height > fold) {
      out.y = Math.max(0, fold - out.height);       // CTA must stay above the "see more" fold
    }
    // hard clamp inside canvas
    out.x = Math.min(Math.max(0, out.x), Math.max(0, to.width - out.width));
    out.y = Math.min(Math.max(0, out.y), Math.max(0, to.height - out.height));
  }

  if (l.type === 'group' && Array.isArray(l.children)) {
    out.children = l.children.map((c: AnyLayer) => relayoutLayer(c, from, to, scale, safeZones));
  }
  return out;
}

/**
 * smartRelayout — derive a target-ratio tree from the base tree (docs/06 §8).
 * Never a naive crop: full-bleed media re-covers, content re-anchors per renderHints,
 * type auto-fits with floors, CTA stays above the fold, logo/legal respect overlays.
 */
export function smartRelayout(tree: LayerTreeT, targetRatio: AdRatio): LayerTreeT {
  if (tree.ratio === targetRatio) return structuredClone(tree);
  const from = { width: tree.canvas.width, height: tree.canvas.height };
  const to = RATIO_DIMS[targetRatio];
  const scale = Math.min(to.width / from.width, to.height / from.height);

  const out = structuredClone(tree) as LayerTreeT & { layers: AnyLayer[] };
  out.ratio = targetRatio;
  out.canvas = { ...tree.canvas, width: to.width, height: to.height };
  out.layers = (tree.layers as AnyLayer[]).map((l) => relayoutLayer(l, from, to, scale, tree.safeZones));
  return out;
}
