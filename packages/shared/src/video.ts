import { z } from 'zod';
import { AdRatio, LocaleCode } from './enums';

// docs/03 §9 — VideoComposition (variant.video_composition; the canonical Remotion payload, R2 §5).
// Muted-first with burned-in subtitles (CANON §8). The variant.layer_tree on a video variant holds
// the poster / persistent overlay layers; time-varying elements live in the tracks below.

export const VideoClip = z.object({
  id: z.string(),
  assetId: z.string(),
  src: z.string().optional(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  trimStartMs: z.number().nonnegative().default(0),
  // per-clip lineage (R2 §6)
  provider: z.string().optional(),
  model: z.string().optional(),
  model_version: z.string().optional(),
  seed: z.number().int().optional(),
  prompt: z.string().optional(),
  negative_prompt: z.string().optional(),
});

export const AudioTrackRef = z.object({
  assetId: z.string(), src: z.string().optional(), volume: z.number().min(0).max(1).default(1),
});

export const CaptionCue = z.object({
  startMs: z.number().nonnegative(), endMs: z.number().positive(), text: z.string(),
});

export const VideoComposition = z.object({
  schemaVersion: z.literal(1),
  compositionId: z.string(),                       // Remotion <Composition id>
  fps: z.number().int().positive(),
  durationInFrames: z.number().int().positive(),
  dimensions: z.object({ width: z.number().int(), height: z.number().int() }),
  ratio: AdRatio,
  mutedFirst: z.boolean().default(true),           // CANON §8
  clips: z.array(VideoClip),
  audio: z.object({
    vo: AudioTrackRef.extend({
      voiceId: z.string().optional(), model_id: z.string().optional(), seed: z.number().int().optional(),
    }).optional(),
    music: AudioTrackRef.optional(),
    sfx: z.array(AudioTrackRef.extend({ startFrame: z.number().int().nonnegative() })).default([]),
  }).default({ sfx: [] }),
  captions: z.object({
    style: z.string().default('tiktok'),           // createTikTokStyleCaptions (R2 §5.1)
    combineTokensWithinMs: z.number().default(1200),
    locale: LocaleCode,
    safeZone: z.boolean().default(true),
    cues: z.array(CaptionCue).default([]),
  }).optional(),
  overlayLayerTreeRef: z.string().default('variant.layer_tree'),
  render: z.object({
    codec: z.string().default('h264'),
    crf: z.number().default(23),
    maxBytes: z.number().default(209715200),       // ≤200 MB gate (CANON §8)
  }).default({ codec: 'h264', crf: 23, maxBytes: 209715200 }),
  inputPropsHash: z.string().optional(),           // lineage: sha256 of the Remotion input props (R2 §6)
});
export type VideoClipT = z.infer<typeof VideoClip>;
export type VideoCompositionT = z.infer<typeof VideoComposition>;
