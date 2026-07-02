import { describe, expect, it } from 'vitest';
import { LayerTree, type LayerTreeT } from './layer-tree';
import { RATIO_DIMS, smartRelayout } from './relayout';

const baseTree = (): LayerTreeT =>
  LayerTree.parse({
    schemaVersion: 1,
    ratio: '1:1',
    canvas: { width: 1200, height: 1200, background: '#0a0a0a' },
    safeZones: { profileOverlap: { top: 0.12, left: 0 }, seeMoreFold: 0.85 },
    layers: [
      { id: 'bg', type: 'image', x: 0, y: 0, width: 1200, height: 1200, assetId: 'a', src: 'x' },
      { id: 'scrim', type: 'shape', x: 0, y: 560, width: 1200, height: 640, shape: 'rect', fill: '#0a0a0a', opacity: 0.5 },
      { id: 'logo', type: 'logo', x: 80, y: 200, width: 280, height: 84, assetId: null, src: 'y',
        renderHints: { anchor: 'top-left' } },
      { id: 'headline', type: 'text', x: 80, y: 640, width: 1040, height: 300, text: 'Verträge — schneller.',
        fontFamily: 'Playfair Display', fontSize: 76, color: '#f5f5f0',
        renderHints: { anchor: 'bottom-left', autoFit: true, minFontPx: 28 } },
      { id: 'cta', type: 'cta', x: 80, y: 970, width: 420, height: 92, text: 'Demo buchen', fill: '#b6e64a',
        textColor: '#0a0a0a', fontFamily: 'Inter', fontSize: 32, renderHints: { anchor: 'bottom-left' } },
      { id: 'legal', type: 'legal', x: 80, y: 1120, width: 1040, height: 44, text: 'Hinweis.',
        fontFamily: 'Inter', fontSize: 18, color: '#9a9a92', requiredBy: 'legal_ai_de',
        renderHints: { anchor: 'bottom-left', minFontPx: 14 } },
    ],
  });

describe('smartRelayout (docs/06 §8 — re-layout, never naive crop)', () => {
  it('same ratio returns an identical (cloned) tree', () => {
    const t = baseTree();
    const out = smartRelayout(t, '1:1');
    expect(out).toEqual(t);
    expect(out).not.toBe(t);
  });

  for (const ratio of ['1.91:1', '4:5'] as const) {
    it(`1:1 → ${ratio}: canvas resized, background covers, everything in-bounds`, () => {
      const out = smartRelayout(baseTree(), ratio);
      const dims = RATIO_DIMS[ratio];
      expect(out.canvas).toMatchObject(dims);
      expect(LayerTree.parse(out)).toBeTruthy();               // still schema-valid

      const bg = out.layers.find((l: { id: string }) => l.id === 'bg');
      expect([bg.width, bg.height]).toEqual([dims.width, dims.height]);   // full-bleed cover

      for (const l of out.layers as Array<Record<string, number>>) {
        expect(l.x).toBeGreaterThanOrEqual(0);
        expect(l.y).toBeGreaterThanOrEqual(0);
        expect(l.x + l.width).toBeLessThanOrEqual(dims.width + 0.51);
        expect(l.y + l.height).toBeLessThanOrEqual(dims.height + 0.51);
      }
    });
  }

  it('landscape: CTA stays above the "see more" fold', () => {
    const out = smartRelayout(baseTree(), '1.91:1');
    const dims = RATIO_DIMS['1.91:1'];
    const cta = out.layers.find((l: { id: string }) => l.id === 'cta');
    expect(cta.y + cta.height).toBeLessThanOrEqual(0.85 * dims.height + 0.51);
  });

  it('typography auto-fits with the minFontPx floor respected', () => {
    const out = smartRelayout(baseTree(), '4:5');
    const headline = out.layers.find((l: { id: string }) => l.id === 'headline');
    const legal = out.layers.find((l: { id: string }) => l.id === 'legal');
    expect(headline.fontSize).toBeGreaterThanOrEqual(28);
    expect(headline.fontSize).toBeLessThan(76);                 // actually scaled down
    expect(legal.fontSize).toBeGreaterThanOrEqual(14);          // legal floor absolute
  });

  it('bottom-anchored layers keep their bottom margin proportion', () => {
    const out = smartRelayout(baseTree(), '1.91:1');
    const dims = RATIO_DIMS['1.91:1'];
    const legal = out.layers.find((l: { id: string }) => l.id === 'legal');
    const bottomMarginFrac = (dims.height - (legal.y + legal.height)) / dims.height;
    expect(bottomMarginFrac).toBeCloseTo((1200 - (1120 + 44)) / 1200, 1);
  });
});
