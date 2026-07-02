import { LayerTree, type BrandKitDataT, type LayerTreeT } from '@brutal/shared';
import type { LayoutArchetypeT } from '../schemas';
import type { CopySetT } from '../schemas';

// ─────────────────────────────────────────────────────────────────────────────
// docs/05 CompositorPlanner — DETERMINISTIC (no LLM): copy + imagery + brand kit
// + a layout archetype (L10) → canonical LayerTree. Board diversity comes from
// rotating archetypes across variants. Every tree passes LayerTree.parse and the
// composite-don't-bake rule: imagery has no text; all words are vector layers.
// ─────────────────────────────────────────────────────────────────────────────

export interface ComposeInput {
  copy: CopySetT['variants'][number];
  imagery: { assetId: string; src?: string };
  brandKit: BrandKitDataT;
  archetype: LayoutArchetypeT;
  locale: 'de' | 'en';
}

const W = 1200; const H = 1200;

export function composeLayerTree(input: ComposeInput): LayerTreeT {
  const { copy, imagery, brandKit: kit, archetype, locale } = input;
  const gold = kit.palette.accents.gold ?? kit.palette.text;
  const lime = kit.palette.accents.lime ?? gold;
  const requiredKey = kit.requiredDisclaimers[0] ?? Object.keys(kit.disclaimers).find((k) => kit.disclaimers[k]!.required);
  const disclaimer = requiredKey ? kit.disclaimers[requiredKey] : undefined;

  const bg = (x = 0, y = 0, w = W, h = H) => ({
    id: 'ly_bg', type: 'image', name: 'Background', x, y, width: w, height: h,
    assetId: input.imagery.assetId, ...(imagery.src ? { src: imagery.src } : {}), fit: 'cover',
    renderHints: { anchor: 'top-left', safeZone: false },
  });
  const scrim = (y: number, h: number, opacity = 0.55) => ({
    id: 'ly_scrim', type: 'shape', name: 'Scrim', x: 0, y, width: W, height: h,
    shape: 'rect', fill: kit.palette.background, opacity, renderHints: { safeZone: false, anchor: 'bottom-left' },
  });
  const kicker = (y: number, color = gold) => copy.kicker ? [{
    id: 'ly_kicker', type: 'text', name: 'Kicker', x: 80, y, width: W - 160, height: 48,
    text: copy.kicker, fontFamily: kit.typography.body.family, fontSize: kit.typography.scale.subhead ? 30 : 30,
    fontWeight: 600, color, renderHints: { anchor: 'bottom-left', maxLines: 1 },
  }] : [];
  const headline = (y: number, size = kit.typography.scale.headline ?? 72, width = W - 160) => ({
    id: 'ly_headline', type: 'text', name: 'Headline', x: 80, y, width, height: 300,
    text: copy.headline, fontFamily: kit.typography.display.family, fontSize: size, fontWeight: 700,
    lineHeight: 1.08, color: kit.palette.text,
    renderHints: { anchor: 'bottom-left', autoFit: true, minFontPx: 28, maxLines: 3 },
  });
  const cta = (y: number) => ({
    id: 'ly_cta', type: 'cta', name: 'CTA', x: 80, y, width: 420, height: 92,
    text: copy.cta, style: 'solid', fill: lime, textColor: kit.palette.background, cornerRadius: 10,
    fontFamily: kit.typography.body.family, fontSize: kit.typography.scale.cta ?? 32, fontWeight: 600,
    renderHints: { anchor: 'bottom-left' },
  });
  const logo = (x = 80, y = 72) => ({
    id: 'ly_logo', type: 'logo', name: 'Logo', x, y, width: 280, height: 84,
    assetId: kit.logos[0]?.assetId ?? null, lockup: kit.logos[0]?.lockup ?? 'wordmark',
    renderHints: { anchor: 'top-left' },
  });
  const legal = disclaimer ? [{
    id: 'ly_legal', type: 'legal', name: 'Disclaimer', x: 80, y: H - 80, width: W - 160, height: 44,
    text: disclaimer[locale] ?? disclaimer.de, fontFamily: kit.typography.body.family,
    fontSize: kit.typography.scale.legal ?? 18, color: kit.palette.muted, requiredBy: requiredKey!,
    removable: false, renderHints: { anchor: 'bottom-left', minFontPx: 14 },
  }] : [];

  let layers: unknown[];
  switch (archetype) {
    case 'full-bleed-hero-lower-third':
      layers = [bg(), scrim(H * 0.47, H * 0.53), ...kicker(560), headline(640), cta(970), logo(), ...legal];
      break;
    case 'split-panel':   // imagery right, solid panel left
      layers = [
        { id: 'ly_panel', type: 'shape', name: 'Panel', x: 0, y: 0, width: W * 0.52, height: H,
          shape: 'rect', fill: kit.palette.background, renderHints: { safeZone: false } },
        { ...bg(W * 0.52, 0, W * 0.48, H), id: 'ly_bg' },
        ...kicker(300), { ...headline(380, 64, W * 0.52 - 140), height: 420 }, cta(880), logo(), ...legal,
      ];
      break;
    case 'editorial-kicker-top':  // kicker + headline top, imagery lower half
      layers = [
        { id: 'ly_panel', type: 'shape', name: 'Panel', x: 0, y: 0, width: W, height: H * 0.5,
          shape: 'rect', fill: kit.palette.background, renderHints: { safeZone: false } },
        { ...bg(0, H * 0.5, W, H * 0.5), id: 'ly_bg' },
        ...kicker(180), { ...headline(260, 68), renderHints: { anchor: 'top-left', autoFit: true, minFontPx: 28, maxLines: 3 } },
        cta(H * 0.5 - 140), logo(), ...legal,
      ];
      break;
    case 'quote-card':    // no imagery dominance — typographic card on brand surface
      layers = [
        { id: 'ly_panel', type: 'shape', name: 'Card', x: 0, y: 0, width: W, height: H,
          shape: 'rect', fill: kit.palette.surface, renderHints: { safeZone: false } },
        { ...bg(0, 0, W, H), opacity: 0.18 },
        { id: 'ly_rule', type: 'shape', name: 'Rule', x: 80, y: 300, width: 160, height: 8, shape: 'rect', fill: gold },
        { ...headline(360, 84), height: 480 },
        ...kicker(880, kit.palette.muted), cta(960), logo(), ...legal,
      ];
      break;
  }

  return LayerTree.parse({
    schemaVersion: 1,
    ratio: '1:1',
    canvas: { width: W, height: H, unit: 'px', background: kit.palette.background },
    safeZones: {
      profileOverlap: kit.safeZoneDefaults?.profileOverlap ?? { top: 0.12, left: 0 },
      seeMoreFold: kit.safeZoneDefaults?.seeMoreFold ?? 0.85,
    },
    layers,
  });
}

export const ARCHETYPE_ROTATION: LayoutArchetypeT[] = [
  'full-bleed-hero-lower-third', 'split-panel', 'editorial-kicker-top', 'quote-card',
];
