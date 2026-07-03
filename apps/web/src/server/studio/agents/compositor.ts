import { LayerTree, type BrandKitDataT, type LayerTreeT } from '@brutal/shared';
import type { LayoutArchetypeT } from '../schemas';
import type { CopySetT } from '../schemas';

// ─────────────────────────────────────────────────────────────────────────────
// docs/05 CompositorPlanner — DETERMINISTIC (no LLM) design system, v2.
// v1 used fixed pixel boxes → long German copy overflowed, elements collided,
// and half-canvas image crops left dead voids. v2 rules:
//  1. MEASURE type first (greedy word-wrap estimate) → pick the largest size on
//     a ladder that fits the line budget → layout FLOWS from measured heights.
//  2. Imagery is ALWAYS full-bleed; archetypes differ by the GROUND put over it
//     (gradient scrim / side panel / top band / type card), never by letterboxing.
//  3. One accent voice per layout (gold rule or lime CTA dominates, not both).
// Layer ids stay stable (ly_bg/ly_headline/ly_cta/…) — patches, localization and
// scoring target them.
// ─────────────────────────────────────────────────────────────────────────────

export interface ComposeInput {
  copy: CopySetT['variants'][number];
  imagery: { assetId: string; src?: string };
  brandKit: BrandKitDataT;
  archetype: LayoutArchetypeT;
  locale: 'de' | 'en';
}

const W = 1200; const H = 1200;
const M = 88;                                   // canvas margin
const SAFE_TOP = 150;                           // LinkedIn profile overlap (12%)

// ── deterministic type measurement (avg-char-width greedy wrap) ──────────────
const CHAR_W: Record<string, number> = { 'Playfair Display': 0.53, Inter: 0.55 };

export function estimateLines(text: string, fontSize: number, boxWidth: number, family: string): number {
  const cw = (CHAR_W[family] ?? 0.55) * fontSize;
  let lines = 1; let lineW = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const w = word.length * cw;
    const withSpace = lineW === 0 ? w : lineW + cw * 0.45 + w;
    if (withSpace > boxWidth && lineW > 0) { lines += 1; lineW = w; }
    else lineW = withSpace;
  }
  return lines;
}

interface FittedText { fontSize: number; lines: number; blockHeight: number }
export function fitText(
  text: string, boxWidth: number, family: string,
  { sizes, maxLines, lineHeight }: { sizes: number[]; maxLines: number; lineHeight: number },
): FittedText {
  for (const fontSize of sizes) {
    const lines = estimateLines(text, fontSize, boxWidth, family);
    if (lines <= maxLines) return { fontSize, lines, blockHeight: Math.ceil(lines * fontSize * lineHeight) };
  }
  const fontSize = sizes[sizes.length - 1]!;
  const lines = Math.min(maxLines, estimateLines(text, fontSize, boxWidth, family));
  return { fontSize, lines, blockHeight: Math.ceil(lines * fontSize * lineHeight) };
}

const HEADLINE_SIZES = [96, 88, 80, 72, 64, 56, 48, 42];
const LH = 1.06;                                // Playfair display leading

export function composeLayerTree(input: ComposeInput): LayerTreeT {
  const { copy, imagery, brandKit: kit, archetype, locale } = input;
  const display = kit.typography.display.family;
  const body = kit.typography.body.family;
  const gold = kit.palette.accents.gold ?? kit.palette.text;
  const lime = kit.palette.accents.lime ?? gold;
  const bgCol = kit.palette.background;
  const requiredKey = kit.requiredDisclaimers[0] ?? Object.keys(kit.disclaimers).find((k) => kit.disclaimers[k]!.required);
  const disclaimer = requiredKey ? kit.disclaimers[requiredKey] : undefined;

  // ── shared elements ─────────────────────────────────────────────────────────
  const bg = () => ({
    id: 'ly_bg', type: 'image', name: 'Background', x: 0, y: 0, width: W, height: H,
    assetId: imagery.assetId, ...(imagery.src ? { src: imagery.src } : {}), fit: 'cover',
    renderHints: { anchor: 'top-left', safeZone: false },
  });
  /** Bottom-up gradient ground faked with 5 eased, slightly overlapping bands. */
  const scrimBands = (yTop: number, maxOpacity: number) => {
    const span = H - yTop;
    const ease = [0.1, 0.26, 0.48, 0.72, 1];
    return ease.map((t, i) => ({
      id: `ly_scrim${i + 1}`, type: 'shape', name: `Scrim ${i + 1}`, shape: 'rect', fill: bgCol,
      x: 0, y: Math.round(yTop + (span / 5) * i) - 1,
      width: W, height: Math.ceil(span / 5) + 2,
      opacity: Number((maxOpacity * t).toFixed(2)), renderHints: { safeZone: false },
    }));
  };
  // Kicker is MEASURED like the headline (uppercase + tracking eat width fast) —
  // v1 clipped long German kickers into illegible dust.
  // Polotno letterSpacing is EM-RELATIVE (×fontSize), verified by render experiment:
  // 2 → two-glyph gaps; 0.1 → editorial tracking.
  const KICKER_LS = 0.1;
  const fitKicker = (width: number): { fontSize: number; height: number; lines: number } | null => {
    if (!copy.kicker) return null;
    const text = copy.kicker.toUpperCase();
    for (const fontSize of [26, 23, 20]) {
      const effWidth = width / (1.1 + KICKER_LS);                   // caps factor + em tracking
      const lines = estimateLines(text, fontSize, effWidth, body);
      if (lines === 1) return { fontSize, height: Math.ceil(fontSize * 1.3), lines: 1 };
    }
    const lines = Math.min(2, estimateLines(text, 20, width / (1.1 + KICKER_LS), body));
    return { fontSize: 20, height: Math.ceil(lines * 20 * 1.35), lines };
  };
  const kickerEl = (x: number, y: number, width: number, fit: NonNullable<ReturnType<typeof fitKicker>>, color = gold) => ({
    id: 'ly_kicker', type: 'text', name: 'Kicker', x, y, width, height: fit.height + 6,
    text: copy.kicker!.toUpperCase(), fontFamily: body, fontSize: fit.fontSize, fontWeight: 700,
    letterSpacing: KICKER_LS, lineHeight: 1.3, color, renderHints: { maxLines: 2 },
  });
  const headlineEl = (x: number, y: number, width: number, fit: FittedText) => ({
    id: 'ly_headline', type: 'text', name: 'Headline', x, y, width, height: fit.blockHeight + 8,
    text: copy.headline, fontFamily: display, fontSize: fit.fontSize, fontWeight: 900,
    lineHeight: LH, color: kit.palette.text,
    renderHints: { autoFit: true, minFontPx: 28, maxLines: Math.max(3, fit.lines) },
  });
  const ctaEl = (x: number, y: number) => {
    const labelW = copy.cta.length * 34 * (CHAR_W[body] ?? 0.55);
    return {
      id: 'ly_cta', type: 'cta', name: 'CTA', x, y,
      width: Math.max(320, Math.ceil(labelW + 2 * 48)), height: 100,
      text: copy.cta, style: 'solid', fill: lime, textColor: bgCol, cornerRadius: 14,
      fontFamily: body, fontSize: 34, fontWeight: 600, renderHints: {},
    };
  };
  const logo = (x = M, y = 76) => ({
    id: 'ly_logo', type: 'logo', name: 'Logo', x, y, width: 250, height: 76,
    assetId: kit.logos[0]?.assetId ?? null, lockup: kit.logos[0]?.lockup ?? 'wordmark',
    renderHints: { anchor: 'top-left' },
  });
  const legal = (x: number, width: number) => disclaimer ? [{
    id: 'ly_legal', type: 'legal', name: 'Disclaimer', x, y: H - 62, width, height: 38,
    text: disclaimer[locale] ?? disclaimer.de, fontFamily: body, fontSize: 17,
    color: kit.palette.muted, opacity: 0.85, requiredBy: requiredKey!, removable: false,
    renderHints: { anchor: 'bottom-left', minFontPx: 14 },
  }] : [];

  let layers: unknown[];
  switch (archetype) {
    // 1 ── cinematic hero: image carries the ad; type sits on a gradient fade
    case 'full-bleed-hero-lower-third': {
      const textW = W - 2 * M;
      const hFit = fitText(copy.headline, textW, display, { sizes: HEADLINE_SIZES, maxLines: 3, lineHeight: LH });
      const kFit = fitKicker(textW);
      const kickBlock = kFit ? kFit.height + 6 + 24 : 0;
      const ctaY = H - 62 - 40 - 100;
      const headY = ctaY - 44 - (hFit.blockHeight + 8);
      const kickY = headY - kickBlock;
      layers = [
        bg(), ...scrimBands(kickY - 160, 0.92),
        ...(kFit ? [kickerEl(M, kickY, textW, kFit)] : []),
        headlineEl(M, headY, textW, hFit),
        ctaEl(M, ctaY), logo(), ...legal(M, textW),
      ];
      break;
    }
    // 2 ── side panel: full-bleed image, translucent panel left, subject breathes right
    case 'split-panel': {
      const panelW = Math.round(W * 0.47);
      const px = 72;                                    // panel inner padding
      const textW = panelW - 2 * px;
      const hFit = fitText(copy.headline, textW, display,
        { sizes: [64, 58, 52, 46, 42, 38, 34], maxLines: 5, lineHeight: LH });
      const kFit = fitKicker(textW);
      const kickBlock = kFit ? kFit.height + 6 + 24 : 0;
      const blockH = kickBlock + (hFit.blockHeight + 8) + 44 + 100;
      const startY = Math.max(SAFE_TOP + 60, Math.round((H - blockH) / 2));
      layers = [
        bg(),
        { id: 'ly_panel', type: 'shape', name: 'Panel', shape: 'rect', x: 0, y: 0,
          width: panelW, height: H, fill: bgCol, opacity: 0.88, renderHints: { safeZone: false } },
        { id: 'ly_rule', type: 'shape', name: 'Accent rule', shape: 'rect',
          x: panelW - 6, y: 0, width: 6, height: H, fill: gold },
        ...(kFit ? [kickerEl(px, startY, textW, kFit)] : []),
        headlineEl(px, startY + kickBlock, textW, hFit),
        ctaEl(px, startY + kickBlock + hFit.blockHeight + 8 + 44),
        logo(px, 76), ...legal(px, textW),
      ];
      break;
    }
    // 3 ── magazine cover: solid masthead band up top, image mid, CTA grounded on a fade
    case 'editorial-kicker-top': {
      const textW = W - 2 * M;
      const hFit = fitText(copy.headline, textW, display, { sizes: HEADLINE_SIZES, maxLines: 2, lineHeight: LH });
      const kFit = fitKicker(textW);
      const kickBlock = kFit ? kFit.height + 6 + 18 : 0;
      const bandH = SAFE_TOP + kickBlock + (hFit.blockHeight + 8) + 44;
      layers = [
        bg(),
        { id: 'ly_panel', type: 'shape', name: 'Masthead', shape: 'rect', x: 0, y: 0,
          width: W, height: bandH, fill: bgCol, opacity: 0.94, renderHints: { safeZone: false } },
        { id: 'ly_rule', type: 'shape', name: 'Accent rule', shape: 'rect',
          x: 0, y: bandH, width: W, height: 6, fill: gold },
        ...(kFit ? [kickerEl(M, SAFE_TOP, textW, kFit)] : []),
        headlineEl(M, SAFE_TOP + kickBlock, textW, hFit),
        ...scrimBands(H * 0.7, 0.9),
        ctaEl(M, H - 62 - 40 - 100),
        logo(), ...legal(M, textW),
      ];
      break;
    }
    // 4 ── typographic quote card: type IS the ad; photo lives in a right strip
    case 'quote-card': {
      const stripX = Math.round(W * 0.70);
      const textW = stripX - M - 64;
      const hFit = fitText(copy.headline, textW, display,
        { sizes: [76, 68, 60, 54, 48, 42, 38], maxLines: 5, lineHeight: 1.12 });
      const kFit = fitKicker(textW);
      const headY = 380;
      const attribY = headY + hFit.blockHeight + 8 + 40;
      const attribBlock = kFit ? kFit.height + 6 + 44 : 0;
      layers = [
        { id: 'ly_panel', type: 'shape', name: 'Card', shape: 'rect', x: 0, y: 0,
          width: W, height: H, fill: kit.palette.surface, renderHints: { safeZone: false } },
        { ...bg(), x: stripX, y: 0, width: W - stripX, height: H },
        { id: 'ly_rule', type: 'shape', name: 'Divider', shape: 'rect',
          x: stripX - 4, y: 0, width: 4, height: H, fill: gold },
        { id: 'ly_quotemark', type: 'text', name: 'Quote mark', x: M - 8, y: 190, width: 240, height: 200,
          text: '„', fontFamily: display, fontSize: 230, fontWeight: 900, color: gold,
          renderHints: { safeZone: false } },
        headlineEl(M, headY, textW, hFit),
        ...(kFit ? [kickerEl(M, attribY, textW, kFit, kit.palette.muted)] : []),
        ctaEl(M, attribY + attribBlock),
        logo(), ...legal(M, textW),
      ];
      break;
    }
  }

  return LayerTree.parse({
    schemaVersion: 1,
    ratio: '1:1',
    canvas: { width: W, height: H, unit: 'px', background: bgCol },
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
