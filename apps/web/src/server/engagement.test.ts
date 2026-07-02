import { describe, expect, it } from 'vitest';
import { EngagementScores, type LayerTreeT } from '@brutal/shared';
import { layerBoxes, stubScores } from './engagement';

// Minimal tree with the standard archetype layer ids — geometry only matters here.
const tree = {
  canvas: { width: 1200, height: 1200, unit: 'px' },
  layers: [
    { id: 'ly_bg', x: 0, y: 0, width: 1200, height: 1200, visible: true },
    { id: 'ly_headline', x: 80, y: 620, width: 1040, height: 220, visible: true },
    { id: 'ly_cta', x: 80, y: 950, width: 420, height: 100, visible: true },
    { id: 'ly_legal', x: 80, y: 1110, width: 1040, height: 40, visible: true },
    { id: 'ly_logo', x: 80, y: 60, width: 200, height: 80, visible: false },
  ],
} as unknown as LayerTreeT;

describe('P6 engagement (stub seam)', () => {
  it('maps layer ids to engine roles and drops hidden layers', () => {
    const boxes = layerBoxes(tree);
    expect(boxes.map((b) => b.role)).toEqual(['image', 'headline', 'cta', 'legal']);
    expect(boxes.find((b) => b.id === 'ly_logo')).toBeUndefined();
    expect(boxes[1]).toMatchObject({ x: 80, y: 620, w: 1040, h: 220 });
  });

  it('produces canonical EngagementScores with bands + low stub confidence', () => {
    const s = stubScores(tree);
    EngagementScores.parse(s);                              // canonical shape (CANON §6)
    expect(s.saliencySource).toBe('stub-geometry');
    expect(s.stoppingPower!.value).toBeGreaterThan(0);
    expect(s.stoppingPower!.value).toBeLessThanOrEqual(1);
    expect(s.stoppingPower!.band[0]).toBeLessThanOrEqual(s.stoppingPower!.value);
    expect(s.stoppingPower!.band[1]).toBeGreaterThanOrEqual(s.stoppingPower!.value);
    expect(s.stoppingPower!.confidence).toBeLessThan(0.5);  // stub must self-report low confidence
    expect(s.predictedCtrBand!.low).toBeLessThan(s.predictedCtrBand!.high);
  });

  it('is deterministic (same tree → same scores)', () => {
    expect(stubScores(tree)).toEqual(stubScores(tree));
  });

  it('rewards a present CTA over a missing one', () => {
    const noCta = { ...tree, layers: (tree.layers as unknown[]).filter((l) => (l as { id: string }).id !== 'ly_cta') } as LayerTreeT;
    expect(stubScores(tree).ctaAttention!.value).toBeGreaterThan(stubScores(noCta).ctaAttention!.value);
  });
});
