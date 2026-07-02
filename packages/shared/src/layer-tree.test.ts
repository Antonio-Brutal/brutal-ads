import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyLayerPatch, applySlideOrder, BrandKitData, BriefNormalized, EngagementScores,
  LayerPatch, LayerPatchError, LayerTree, RenderKind, Strategy, VideoComposition,
} from './index';

// Locks the CANONICAL schemas (docs/03 §12, CANON §12 L3/L6/L7). If these fail, someone
// redefined the single source of truth — fix the caller, not this test.

const FIXTURE_TREE = {
  schemaVersion: 1,
  ratio: '1:1',
  canvas: { width: 1200, height: 1200, background: '#0a0a0a' },
  safeZones: { profileOverlap: { top: 0.12, left: 0 }, seeMoreFold: 0.85 },
  layers: [
    { id: 'ly_bg', type: 'image', x: 0, y: 0, width: 1200, height: 1200, assetId: 'as_bg_01' },
    { id: 'ly_headline', type: 'text', x: 80, y: 640, width: 1040, height: 300,
      text: '1.200 Kanzleien vertrauen Brutal', fontFamily: 'Playfair Display', fontSize: 72,
      fontWeight: 700, color: '#f5f5f0' },
    { id: 'ly_cta', type: 'cta', x: 80, y: 980, width: 420, height: 96, text: 'Demo buchen',
      fill: '#b6e64a', textColor: '#0a0a0a', fontFamily: 'Inter', fontSize: 32 },
    { id: 'ly_legal', type: 'legal', x: 80, y: 1120, width: 1040, height: 40,
      text: 'Rechtlicher Hinweis: Ergebnisse ersetzen keine anwaltliche Beratung.',
      fontFamily: 'Inter', fontSize: 18, color: '#9a9a92', requiredBy: 'legal_ai_de' },
    { id: 'ly_grp', type: 'group', x: 0, y: 0, width: 1200, height: 1200,
      children: [
        { id: 'ly_accent', type: 'shape', x: 0, y: 600, width: 1200, height: 8, shape: 'rect', fill: '#cba65e' },
      ] },
    { id: 'ly_count', type: 'smart', x: 80, y: 520, width: 600, height: 90,
      binding: '{{customer_count}}', template: '{{customer_count}}+ Kanzleien',
      fontFamily: 'Playfair Display', fontSize: 64, color: '#f5f5f0' },
  ],
  smartData: {
    customer_count: { value: 1200, display: '1.200', spoken: { de: 'zwölfhundert', en: 'twelve hundred' } },
  },
} as const;

describe('LayerTree (docs/03 §6 canonical shape)', () => {
  it('parses the canonical fixture incl. nested group + smart layer', () => {
    const tree = LayerTree.parse(FIXTURE_TREE);
    expect(tree.layers).toHaveLength(6);
    expect(tree.canvas.unit).toBe('px');            // default applied
    expect(tree.layers[0].opacity).toBe(1);          // base defaults applied
    expect(tree.layers[4].children[0].id).toBe('ly_accent'); // recursion works
  });

  it('rejects unknown layer types', () => {
    expect(() => LayerTree.parse({ ...FIXTURE_TREE, layers: [{ id: 'x', type: 'blob', x: 0, y: 0, width: 1, height: 1 }] }))
      .toThrow();
  });
});

describe('LayerPatch (CANON §12 L6 — the ONE canonical schema)', () => {
  const envelope = {
    id: 'lp_01', variantId: '5bb54b3e-6c8f-4f2e-9a0e-9d1f2a3b4c5d',
    origin: 'chat', createdBy: 'human',
  };

  it('accepts the canonical op field names', () => {
    const patch = LayerPatch.parse({ ...envelope, ops: [
      { op: 'setText', layerId: 'ly_headline', text: 'Kürzere Headline' },
      { op: 'resize', layerId: 'ly_cta', x: 80, y: 980, width: 420, height: 96 },
      { op: 'rotate', layerId: 'ly_grp', rotation: 2 },
      { op: 'reorderZ', layerId: 'ly_legal', toIndex: 1 },
      { op: 'setSlideOrder', order: ['sl_00', 'sl_02', 'sl_01'] },
      { op: 'setBinding', layerId: 'ly_count', binding: '{{customer_count}}' },
    ] });
    expect(patch.ops).toHaveLength(6);
  });

  it('rejects the pre-reconciliation divergent field names', () => {
    expect(() => LayerPatch.parse({ ...envelope, ops: [{ op: 'setText', layerId: 'h', value: 'x' }] })).toThrow();
    expect(() => LayerPatch.parse({ ...envelope, ops: [{ op: 'resize', layerId: 'h', w: 1, h: 1 }] })).toThrow();
    expect(() => LayerPatch.parse({ ...envelope, ops: [{ op: 'reorderZ', layerId: 'h', toZ: 2 }] })).toThrow();
    expect(() => LayerPatch.parse({ ...envelope, ops: [{ op: 'setSlideOrder', order: [0, 1] }] })).toThrow();
    expect(() => LayerPatch.parse({ ...envelope, origin: 'editor_agent', ops: [] })).toThrow();
  });
});

describe('applyLayerPatch (atomic, immutable, group-aware)', () => {
  const tree = () => LayerTree.parse(FIXTURE_TREE);
  const patch = (ops: unknown[]) => LayerPatch.parse({
    id: 'lp_t', variantId: '5bb54b3e-6c8f-4f2e-9a0e-9d1f2a3b4c5d', origin: 'agent', createdBy: 'agent', ops,
  });

  it('applies text/fill/font/visibility edits without touching the input', () => {
    const input = tree();
    const out = applyLayerPatch(input, patch([
      { op: 'setText', layerId: 'ly_headline', text: 'Neu' },
      { op: 'setFill', layerId: 'ly_headline', fill: '#cba65e' },   // text layer → color
      { op: 'setFill', layerId: 'ly_cta', fill: '#c9ff2e' },        // cta layer → fill
      { op: 'setVisible', layerId: 'ly_legal', visible: false },
    ]));
    const headline = out.layers.find((l: { id: string }) => l.id === 'ly_headline');
    expect(headline.text).toBe('Neu');
    expect(headline.color).toBe('#cba65e');
    expect(out.layers.find((l: { id: string }) => l.id === 'ly_cta').fill).toBe('#c9ff2e');
    // immutability: original untouched
    expect(input.layers.find((l: { id: string }) => l.id === 'ly_headline').text).toContain('Kanzleien');
  });

  it('reaches layers nested inside groups', () => {
    const out = applyLayerPatch(tree(), patch([{ op: 'setFill', layerId: 'ly_accent', fill: '#ffffff' }]));
    expect(out.layers.find((l: { id: string }) => l.id === 'ly_grp').children[0].fill).toBe('#ffffff');
  });

  it('addLayer/removeLayer/reorderZ manage z-order (array order)', () => {
    const out = applyLayerPatch(tree(), patch([
      { op: 'addLayer', afterLayerId: 'ly_bg',
        layer: { id: 'ly_scrim', type: 'shape', x: 0, y: 0, width: 1200, height: 1200, shape: 'rect', fill: '#000000' } },
      { op: 'removeLayer', layerId: 'ly_count' },
      { op: 'reorderZ', layerId: 'ly_legal', toIndex: 0 },
    ]));
    expect(out.layers[0].id).toBe('ly_legal');
    expect(out.layers.map((l: { id: string }) => l.id)).toContain('ly_scrim');
    expect(out.layers.map((l: { id: string }) => l.id)).not.toContain('ly_count');
    expect(out.layers[out.layers.findIndex((l: { id: string }) => l.id === 'ly_bg') + 1].id).toBe('ly_scrim');
  });

  it('is atomic: an unknown layerId throws and nothing is returned', () => {
    expect(() => applyLayerPatch(tree(), patch([{ op: 'setText', layerId: 'nope', text: 'x' }])))
      .toThrow(LayerPatchError);
  });

  it('replaceAsset swaps assetId and clears the stale src', () => {
    const out = applyLayerPatch(tree(), patch([{ op: 'replaceAsset', layerId: 'ly_bg', assetId: 'as_bg_02' }]));
    const bg = out.layers.find((l: { id: string }) => l.id === 'ly_bg');
    expect(bg.assetId).toBe('as_bg_02');
    expect(bg.src).toBeUndefined();
  });

  it('applySlideOrder validates a permutation of slide ids', () => {
    const slides = [{ id: 'sl_00' }, { id: 'sl_01' }, { id: 'sl_02' }];
    expect(applySlideOrder(slides, ['sl_02', 'sl_00', 'sl_01']).map((s) => s.id))
      .toEqual(['sl_02', 'sl_00', 'sl_01']);
    expect(() => applySlideOrder(slides, ['sl_02', 'sl_00'])).toThrow(LayerPatchError);
  });
});

describe('render_kind (L3: PDF-only document ads, no native PPTX)', () => {
  it('accepts png|jpg|pdf|svg and rejects pptx', () => {
    for (const k of ['png', 'jpg', 'pdf', 'svg']) expect(RenderKind.parse(k)).toBe(k);
    expect(() => RenderKind.parse('pptx')).toThrow();
  });
});

describe('BrandKitData ↔ seed consistency (docs/03 §7)', () => {
  it('parses the actual supabase/seed.sql brand kit JSON', () => {
    const seed = readFileSync(join(__dirname, '../../../supabase/seed.sql'), 'utf8');
    const m = seed.match(/\$\$(\{[\s\S]*?\})\$\$::jsonb/);
    expect(m).not.toBeNull();
    const kit = BrandKitData.parse(JSON.parse(m![1]!));
    expect(kit.palette.allowed).toContain('#cba65e');
    expect(kit.localization.default).toBe('de');
    expect(kit.voice.bannedTerms).toContain('game-changer');
  });
});

describe('agent-output + engagement shapes (docs/03 §8)', () => {
  it('BriefNormalized + Strategy parse their doc examples', () => {
    const b = BriefNormalized.parse({
      audience: 'Managing partners at German-speaking law firms (10–100 lawyers)',
      vertical: 'legal_ai_de',
      offer: 'AI that drafts German contracts in seconds',
      proofPoints: ['1.200 firms', '40% faster drafting'],
      mandatoryLegal: ['legal_ai_de'],
      languages: ['de'],
    });
    expect(b.constraints.mustAvoid).toEqual([]);   // default applied
    const s = Strategy.parse({
      angle: 'specificity beats hype', jtbd: 'Draft a compliant German contract',
      positioning: 'the sober tool', keyMessage: '1.200 Kanzleien drafting faster',
      proofToLead: '40% faster drafting', recommendedType: 'single_image', recommendedVariantCount: 5,
    });
    expect(s.recommendedVariantCount).toBe(5);
  });

  it('EngagementScores enforces bands + confidence (never bare points)', () => {
    const ok = EngagementScores.parse({
      backend: 'saliency',
      stoppingPower: { value: 0.66, band: [0.55, 0.77], confidence: 0.5 },
      predictedCtrBand: { low: 0.008, high: 0.021, confidence: 0.35 },
    });
    expect(ok.stoppingPower?.band).toHaveLength(2);
    expect(() => EngagementScores.parse({ stoppingPower: 0.66 })).toThrow();  // bare point rejected
  });

  it('VideoComposition parses the §9 track shape with defaults', () => {
    const v = VideoComposition.parse({
      schemaVersion: 1, compositionId: 'BrutalAd', fps: 30, durationInFrames: 450,
      dimensions: { width: 1080, height: 1080 }, ratio: '1:1', mutedFirst: true,
      clips: [{ id: 'clip_01', assetId: 'as_clip_01', startFrame: 0, endFrame: 150 }],
    });
    expect(v.render.maxBytes).toBe(209715200);      // ≤200 MB gate default
    expect(v.audio.sfx).toEqual([]);
  });
});
