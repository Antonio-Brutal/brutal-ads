import { describe, expect, it } from 'vitest';
import { VideoComposition } from '@brutal/shared';
import { createBrief, variantsForBrief } from './runtime';
import { composeVideoPlan, planVideo } from './video';
import { calibrateCtrBand, scoreVariant } from './engagement';
import { getStore } from './store';

// P9 scaffold + P10 calibration gates (keyless: mock studio, memory store).

describe('P9 — video composition scaffold', () => {
  it('emits a canonical, deterministic VideoComposition (muted-first, captioned, 9s)', async () => {
    const brief = await createBrief('KI-Verträge für Kanzleien', 'de');
    const [v] = await variantsForBrief(brief.id);

    const plan = await planVideo(v!.id, 'de');
    VideoComposition.parse(plan);                              // canonical shape (docs/03 §9)
    expect(plan.mutedFirst).toBe(true);                        // CANON §8
    expect(plan.fps).toBe(24);
    expect(plan.durationInFrames).toBe(216);                   // 3 beats × 3s
    expect(plan.clips).toHaveLength(3);
    expect(plan.clips.every((c) => c.provider === 'kling')).toBe(true);
    expect(plan.clips.every((c) => c.assetId === v!.lineage.imageryAssetId)).toBe(true);
    expect(plan.captions!.cues).toHaveLength(3);
    expect(plan.captions!.cues[2]!.text).toContain(v!.copy.cta);
    // deterministic: same variant → identical plan incl. lineage hash
    expect(composeVideoPlan(v!, 'de')).toEqual(composeVideoPlan(v!, 'de'));
    expect(plan.inputPropsHash).toHaveLength(64);
  });
});

describe('P10 — results calibration', () => {
  const band = { low: 0.4, high: 0.7, confidence: 0.2 };

  it('under 1000 impressions: band unchanged (noise)', () => {
    expect(calibrateCtrBand(band, [{ impressions: 500, clicks: 5 }])).toEqual(band);
  });

  it('pulls the band toward observed CTR and TIGHTENS it, confidence up', () => {
    // observed CTR 1.2% over 50k impressions (full weight)
    const c = calibrateCtrBand(band, [{ impressions: 50_000, clicks: 600 }]);
    const mid = (c.low + c.high) / 2;
    expect(mid).toBeCloseTo(1.2, 2);                           // fully pulled at n=1
    expect(c.high - c.low).toBeLessThan(band.high - band.low); // tightened
    expect(c.confidence).toBeGreaterThan(band.confidence);
  });

  it('partial evidence moves the band partway', () => {
    const c = calibrateCtrBand(band, [{ impressions: 10_000, clicks: 120 }]);   // n=0.2, observed 1.2
    const mid = (c.low + c.high) / 2;
    expect(mid).toBeGreaterThan(0.55);                         // moved from 0.55…
    expect(mid).toBeLessThan(1.2);                             // …but not all the way
  });

  it('scoreVariant applies calibration once results are ingested', async () => {
    const brief = await createBrief('Noch ein Test', 'de');
    const [v] = await variantsForBrief(brief.id);
    const before = await scoreVariant(v!.id);
    await getStore().addResult(v!.id, { impressions: 50_000, clicks: 600 });
    const after = await scoreVariant(v!.id);
    expect(after.predictedCtrBand!.high - after.predictedCtrBand!.low)
      .toBeLessThan(before.predictedCtrBand!.high - before.predictedCtrBand!.low);
    expect((after.raw as { calibratedFrom?: number }).calibratedFrom).toBe(1);
  });
});
