import { z } from 'zod';
import { EngagementBackend } from './enums';

// docs/03 §12.3 — EngagementScores (mirrors CANON §6). Bands + confidence, never bare points.

export const Band = z.object({ value: z.number(), band: z.tuple([z.number(), z.number()]), confidence: z.number().min(0).max(1) });
export const CtrBand = z.object({ low: z.number(), high: z.number(), confidence: z.number().min(0).max(1) });

export const PerSlideScore = z.object({
  position: z.number().int(), role: z.string().optional(),
  stoppingPower: Band.optional(), ctaAttention: Band.optional(),
  focalClarity: Band.optional(), clutter: Band.optional(),
});

export const EngagementScores = z.object({          // CANON §6 (bands + confidence — R4 §7)
  backend: EngagementBackend.optional(),
  saliencySource: z.string().optional(),
  modelVersion: z.string().optional(),
  attentionMap: z.object({ assetId: z.string(), src: z.string().optional() }).optional(),
  focalClarity: Band.optional(),
  valuePropAttention: Band.optional(),
  ctaAttention: Band.optional(),
  clutter: Band.optional(),
  stoppingPower: Band.optional(),
  firstThreeSeconds: Band.optional(),               // video only
  predictedCtrBand: CtrBand.optional(),
  perSlide: z.array(PerSlideScore).optional(),       // carousel only
  scoredAt: z.string().optional(),
  raw: z.unknown().optional(),
});
export type BandT = z.infer<typeof Band>;
export type CtrBandT = z.infer<typeof CtrBand>;
export type PerSlideScoreT = z.infer<typeof PerSlideScore>;
export type EngagementScoresT = z.infer<typeof EngagementScores>;
