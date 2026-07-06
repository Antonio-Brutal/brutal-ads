import { LayerTree, type BrandKitDataT, type LayerTreeT } from '@brutal/shared';
import type { LayoutArchetypeT } from '../schemas';
import type { CopySetT } from '../schemas';
import type { ImageStats } from '../../imagery-stats';
import { blendStops, scrimStops, svgGradient } from './grounds';

// ─────────────────────────────────────────────────────────────────────────────
// docs/05 CompositorPlanner — DETERMINISTIC (no LLM) design system, v3.
// v2 failures (diagnosed from real prod exports, not guessed):
//   · 5-band fake gradients → banding + text starting above the scrim
//   · gold kicker sentences in tracked caps over gold lamp glow → illegible shout
//   · one giant lime slab CTA on every layout → bolted-on, off-mood
//   · zero brand mark (seed logo assetId is null → transparent pixel)
//   · fixed panel side / scrim strength regardless of what the photo does
// v3 rules:
//   1. Grounds are REAL gradients (SVG data-URL image layers) — no banding.
//   2. Compositing is image-aware: scrim strength and panel side come from
//      sampled luminance (ImageStats) with safe defaults when absent.
//   3. ONE accent voice per ad: gold. Lime survives only as the tiny brand
//      square in the wordmark signature.
//   4. Kicker is an EYEBROW (one line, hard-capped), never a paragraph.
//   5. Every ad carries a brand mark: logo asset if present, else the
//      wordmark signature (lime square + tracked caps).
// Layer ids stay stable (ly_bg/ly_scrim/ly_headline/ly_cta/…) — patches,
// localization, scoring and the Critic all target them.
// ─────────────────────────────────────────────────────────────────────────────

export interface ComposeInput {
  copy: CopySetT['variants'][number];
  imagery: { assetId: string; src?: string };
  brandKit: BrandKitDataT;
  archetype: LayoutArchetypeT;
  locale: 'de' | 'en';
  stats?: ImageStats | null;
  brandName?: string;
}

const W = 1200; const H = 1200;
const M = 88;                                   // canvas margin
const SAFE_TOP = 150;                           // LinkedIn profile overlap (12%)

// ── deterministic type measurement (avg-char-width greedy wrap) ──────────────
const CHAR_W: Record<string, number> = { 'Playfair Display': 0.53, Inter: 0.55 };

function estimateWrap(text: string, fontSize: number, boxWidth: number, family: string): { lines: number; lastLineWords: number } {
  const cw = (CHAR_W[family] ?? 0.55) * fontSize;
  let lines = 1; let lineW = 0; let lastLineWords = 0;
  // hyphenated compounds ("Analyse-Werkzeug") wrap at the hyphen in the renderer —
  // count them as separate units or long German compounds force undersized type
  const words = text.split(/\s+/).filter(Boolean).flatMap((w) => w.split(/(?<=-)/));
  for (const word of words) {
    const w = word.length * cw;
    const withSpace = lineW === 0 ? w : lineW + cw * 0.45 + w;
    if (withSpace > boxWidth && lineW > 0) { lines += 1; lineW = w; lastLineWords = 1; }
    else { lineW = withSpace; lastLineWords += 1; }
  }
  return { lines, lastLineWords };
}

export function estimateLines(text: string, fontSize: number, boxWidth: number, family: string): number {
  return estimateWrap(text, fontSize, boxWidth, family).lines;
}

interface FittedText { fontSize: number; lines: number; blockHeight: number }
export function fitText(
  text: string, boxWidth: number, family: string,
  { sizes, maxLines, lineHeight }: { sizes: number[]; maxLines: number; lineHeight: number },
): FittedText {
  const mk = (fontSize: number, lines: number): FittedText =>
    ({ fontSize, lines, blockHeight: Math.ceil(lines * fontSize * lineHeight) });
  for (let i = 0; i < sizes.length; i++) {
    const fontSize = sizes[i]!;
    const fit = estimateWrap(text, fontSize, boxWidth, family);
    if (fit.lines > maxLines) continue;
    // orphan avoidance (Critic: lone word on the last line reads as poor craft) —
    // step down ≤2 sizes if a smaller size absorbs the orphan without adding lines
    if (fit.lines > 1 && fit.lastLineWords === 1) {
      for (let j = i + 1; j <= Math.min(i + 2, sizes.length - 1); j++) {
        const alt = estimateWrap(text, sizes[j]!, boxWidth, family);
        if (alt.lines <= fit.lines && alt.lastLineWords > 1) return mk(sizes[j]!, alt.lines);
      }
    }
    return mk(fontSize, fit.lines);
  }
  const fontSize = sizes[sizes.length - 1]!;
  return mk(fontSize, Math.min(maxLines, estimateLines(text, fontSize, boxWidth, family)));
}

const HEADLINE_SIZES = [92, 84, 76, 68, 60, 52, 46];
const LH = 1.08;                                // Playfair display leading

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function composeLayerTree(input: ComposeInput): LayerTreeT {
  const { copy, imagery, brandKit: kit, archetype, locale, stats } = input;
  const display = kit.typography.display.family;
  const body = kit.typography.body.family;
  const gold = kit.palette.accents.gold ?? kit.palette.text;
  const lime = kit.palette.accents.lime ?? gold;
  const bgCol = kit.palette.background;
  const brandName = (input.brandName ?? 'Brutal').toUpperCase();
  const requiredKey = kit.requiredDisclaimers[0] ?? Object.keys(kit.disclaimers).find((k) => kit.disclaimers[k]!.required);
  const disclaimer = requiredKey ? kit.disclaimers[requiredKey] : undefined;

  // ── shared elements ─────────────────────────────────────────────────────────
  const bg = () => ({
    id: 'ly_bg', type: 'image', name: 'Background', x: 0, y: 0, width: W, height: H,
    assetId: imagery.assetId, ...(imagery.src ? { src: imagery.src } : {}), fit: 'cover',
    renderHints: { anchor: 'top-left', safeZone: false },
  });
  /** Continuous bottom-up gradient ground (v3: one SVG layer, zero banding). */
  const scrim = (yTop: number, maxAlpha: number) => ({
    id: 'ly_scrim', type: 'image', name: 'Scrim', x: 0, y: yTop, width: W, height: H - yTop,
    assetId: null, src: svgGradient(W, H - yTop, bgCol, scrimStops(maxAlpha), 'to-bottom'),
    fit: 'fill', renderHints: { safeZone: false },
  });
  // Kicker = EYEBROW. One line, gold tracked caps. If it can't fit one line at
  // 20px it is dropped from caps treatment entirely (v2 rendered 3-line cap
  // walls). Polotno letterSpacing is EM-relative (×fontSize) — 0.14 ≈ editorial.
  const KICKER_LS = 0.14;
  const fitKicker = (width: number): { fontSize: number; height: number } | null => {
    if (!copy.kicker) return null;
    const text = copy.kicker.toUpperCase();
    for (const fontSize of [24, 22, 20]) {
      const effWidth = width / (1.08 + KICKER_LS);                 // caps factor + em tracking
      if (estimateLines(text, fontSize, effWidth, body) === 1) {
        return { fontSize, height: Math.ceil(fontSize * 1.25) };
      }
    }
    return null;                                                    // too long → no shouting
  };
  const kickerEl = (x: number, y: number, width: number, fit: NonNullable<ReturnType<typeof fitKicker>>, color = gold) => ({
    id: 'ly_kicker', type: 'text', name: 'Kicker', x, y, width, height: fit.height + 4,
    text: copy.kicker!.toUpperCase(), fontFamily: body, fontSize: fit.fontSize, fontWeight: 600,
    letterSpacing: KICKER_LS, lineHeight: 1.25, color, renderHints: { maxLines: 1 },
  });
  /** Short gold rule above the kicker — quiet accent instead of a color slab. */
  const eyebrowRule = (x: number, y: number) => ({
    id: 'ly_rule', type: 'shape', name: 'Eyebrow rule', shape: 'rect',
    x, y, width: 64, height: 4, fill: gold, renderHints: { safeZone: false },
  });
  const headlineEl = (x: number, y: number, width: number, fit: FittedText, color = kit.palette.text) => ({
    id: 'ly_headline', type: 'text', name: 'Headline', x, y, width, height: fit.blockHeight + 8,
    text: copy.headline, fontFamily: display, fontSize: fit.fontSize, fontWeight: 700,
    lineHeight: LH, color,
    renderHints: { autoFit: true, minFontPx: 28, maxLines: Math.max(3, fit.lines) },
  });
  // v3 CTA: a slim gold element, not a lime slab. `outline` on photo grounds,
  // `solid` (gold fill, ink text) on flat surfaces. Arrow signals action so the
  // button can stay quiet.
  const ctaEl = (x: number, y: number, style: 'outline' | 'solid' = 'outline') => {
    // '›' (U+203A) not '→' (U+2192): the embedded Inter latin subset covers
    // U+2000–206F but omits U+2192 — prod lambdas have no fallback font, so the
    // arrow rendered as tofu (caught on a live prod export, invisible on macOS)
    const text = `${copy.cta}  ›`;
    const labelW = text.length * 28 * (CHAR_W[body] ?? 0.55);
    const height = 78;
    return {
      id: 'ly_cta', type: 'cta', name: 'CTA', x, y,
      width: Math.max(260, Math.ceil(labelW + 2 * 44)), height,
      text, style, fill: gold, textColor: style === 'solid' ? bgCol : gold,
      cornerRadius: height / 2, paddingX: 44, paddingY: 18,
      fontFamily: body, fontSize: 28, fontWeight: 600, renderHints: {},
    };
  };
  // Brand mark: real logo asset when the kit has one; otherwise the wordmark
  // signature — lime square + tracked caps (v2 shipped a transparent pixel).
  // approx wordmark footprint: square + gap + tracked caps (em tracking ≈ ×1.3)
  const wordmarkW = 14 + 16 + Math.ceil(brandName.length * 22 * (CHAR_W[body] ?? 0.55) * 1.3);
  const brandMark = (x: number, y: number, color = kit.palette.text) => {
    const logoAsset = kit.logos.find((l) => l.assetId);
    if (logoAsset) {
      return [{
        id: 'ly_logo', type: 'logo', name: 'Logo', x, y, width: 220, height: 64,
        assetId: logoAsset.assetId, lockup: logoAsset.lockup, renderHints: { anchor: 'top-left' },
      }];
    }
    return [
      { id: 'ly_logo', type: 'shape', name: 'Brand square', shape: 'rect',
        x, y: y + 5, width: 14, height: 14, fill: lime, renderHints: { safeZone: false } },
      { id: 'ly_wordmark', type: 'text', name: 'Wordmark', x: x + 30, y, width: wordmarkW + 40, height: 30,
        text: brandName, fontFamily: body, fontSize: 22, fontWeight: 700,
        letterSpacing: 0.3, lineHeight: 1.1, color, renderHints: { maxLines: 1 } },
    ];
  };
  const legal = (x: number, width: number, color = kit.palette.muted) => disclaimer ? [{
    id: 'ly_legal', type: 'legal', name: 'Disclaimer', x, y: H - 56, width, height: 34,
    text: disclaimer[locale] ?? disclaimer.de, fontFamily: body, fontSize: 16,
    color, opacity: 0.78, requiredBy: requiredKey!, removable: false,
    renderHints: { anchor: 'bottom-left', minFontPx: 14 },
  }] : [];

  let layers: unknown[];
  switch (archetype) {
    // 1 ── cinematic hero: image carries the ad; type on a continuous fade
    case 'full-bleed-hero-lower-third': {
      const textW = W - 2 * M;
      const hFit = fitText(copy.headline, textW, display, { sizes: HEADLINE_SIZES, maxLines: 3, lineHeight: LH });
      const kFit = fitKicker(textW);
      const kickBlock = kFit ? 4 + 18 + kFit.height + 4 + 22 : 0;   // rule + gap + kicker + gap
      const ctaY = H - 56 - 36 - 78;
      const headY = ctaY - 48 - (hFit.blockHeight + 8);
      const kickY = headY - kickBlock;
      // brighter lower third → stronger ground (v2 fixed 0.92 washed dark photos
      // and under-protected bright ones)
      const maxAlpha = clamp(0.55 + (stats?.bottomLuma ?? 0.28) * 1.1, 0.62, 0.96);
      layers = [
        bg(), scrim(kickY - 300, maxAlpha),
        ...(kFit ? [eyebrowRule(M, kickY), kickerEl(M, kickY + 4 + 18, textW, kFit)] : []),
        headlineEl(M, headY, textW, hFit),
        ctaEl(M, ctaY, 'outline'),
        ...brandMark(W - M - wordmarkW, ctaY + 24),
        ...legal(M, textW),
      ];
      break;
    }
    // 2 ── side panel: SOLID ink panel (v2's translucency let the photo bleed
    // behind type), gradient blend melts panel into photo, panel side follows
    // the calmer image half
    case 'split-panel': {
      const panelW = Math.round(W * 0.46);
      const flip = stats ? stats.leftVar > stats.rightVar + 0.02 : false;  // busier left → panel right
      const panelX = flip ? W - panelW : 0;
      const blendW = 170;
      const blendX = flip ? panelX - blendW : panelW;
      const px = (flip ? panelX : 0) + 72;                // panel inner padding
      const textW = panelW - 2 * 72;
      const hFit = fitText(copy.headline, textW, display,
        { sizes: [60, 54, 48, 44, 40, 36, 32], maxLines: 5, lineHeight: LH });
      const kFit = fitKicker(textW);
      const kickBlock = kFit ? kFit.height + 4 + 24 : 0;
      const blockH = kickBlock + (hFit.blockHeight + 8) + 48 + 78;
      const startY = Math.max(SAFE_TOP + 80, Math.round((H - blockH) / 2) - 20);
      layers = [
        bg(),
        { id: 'ly_panel', type: 'shape', name: 'Panel', shape: 'rect', x: panelX, y: 0,
          width: panelW, height: H, fill: bgCol, opacity: 1, renderHints: { safeZone: false } },
        { id: 'ly_blend', type: 'image', name: 'Panel blend', x: blendX, y: 0, width: blendW, height: H,
          assetId: null, src: svgGradient(blendW, H, bgCol, blendStops(1), flip ? 'to-left' : 'to-right'),
          fit: 'fill', renderHints: { safeZone: false } },
        ...brandMark(px, 170),
        ...(kFit ? [kickerEl(px, startY, textW, kFit)] : []),
        headlineEl(px, startY + kickBlock, textW, hFit),
        ctaEl(px, startY + kickBlock + hFit.blockHeight + 8 + 48, 'solid'),
        ...legal(px, textW),
      ];
      break;
    }
    // 3 ── magazine masthead: solid ink band up top with a gold hairline, photo
    // below, CTA grounded on a continuous fade
    case 'editorial-kicker-top': {
      const textW = W - 2 * M;
      const hFit = fitText(copy.headline, textW, display, { sizes: HEADLINE_SIZES, maxLines: 2, lineHeight: LH });
      const kFit = fitKicker(textW - 340);                 // wordmark shares the kicker row
      const kickRow = kFit ? kFit.height + 4 + 26 : 0;
      const bandH = SAFE_TOP + kickRow + (hFit.blockHeight + 8) + 48;
      layers = [
        bg(),
        { id: 'ly_panel', type: 'shape', name: 'Masthead', shape: 'rect', x: 0, y: 0,
          width: W, height: bandH, fill: bgCol, opacity: 1, renderHints: { safeZone: false } },
        { id: 'ly_hairline', type: 'shape', name: 'Hairline', shape: 'rect',
          x: 0, y: bandH, width: W, height: 4, fill: gold },
        ...(kFit ? [kickerEl(M, SAFE_TOP, textW - 340, kFit)] : []),
        ...brandMark(W - M - wordmarkW, SAFE_TOP - 2),
        headlineEl(M, SAFE_TOP + kickRow, textW, hFit),
        scrim(Math.round(H * 0.6), clamp(0.62 + (stats?.bottomLuma ?? 0.3), 0.72, 0.96)),
        ctaEl(M, H - 56 - 36 - 78, 'solid'),          // solid gold pops on the photo fade (Critic: outline blended away)
        ...legal(M, textW),
      ];
      break;
    }
    // 4 ── editorial statement card: type IS the ad on an ink surface; the photo
    // enters as a blended strip, not a hard-cut slice
    case 'quote-card': {
      const stripW = Math.round(W * 0.34);
      const stripX = W - stripW;
      const blendW = 200;
      const textW = stripX - M - 56;
      const hFit = fitText(copy.headline, textW, display,
        { sizes: [72, 64, 58, 52, 46, 42, 38], maxLines: 5, lineHeight: 1.12 });
      const kFit = fitKicker(textW);
      const headY = 400;
      const attribY = headY + hFit.blockHeight + 8 + 44;
      const attribBlock = kFit ? kFit.height + 4 + 48 : 0;
      layers = [
        { id: 'ly_panel', type: 'shape', name: 'Card', shape: 'rect', x: 0, y: 0,
          width: W, height: H, fill: kit.palette.surface, renderHints: { safeZone: false } },
        { ...bg(), x: stripX, y: 0, width: stripW, height: H },
        { id: 'ly_blend', type: 'image', name: 'Strip blend', x: stripX, y: 0, width: blendW, height: H,
          assetId: null, src: svgGradient(blendW, H, kit.palette.surface, blendStops(1), 'to-right'),
          fit: 'fill', renderHints: { safeZone: false } },
        ...brandMark(M, 190),
        // „ is a LOW quote — its glyph paints at the box bottom, so the box must
        // end well above the headline (the Critic flagged the v3.0 collision)
        { id: 'ly_quotemark', type: 'text', name: 'Quote mark', x: M - 10, y: 200, width: 220, height: 140,
          text: '„', fontFamily: display, fontSize: 150, fontWeight: 400, color: gold,
          renderHints: { safeZone: false } },
        headlineEl(M, headY, textW, hFit),
        ...(kFit ? [kickerEl(M, attribY, textW, kFit, kit.palette.muted)] : []),
        ctaEl(M, attribY + attribBlock, 'solid'),
        ...legal(M, textW),
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
