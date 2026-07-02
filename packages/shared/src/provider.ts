import { z } from 'zod';
import { AdRatio } from './enums';
import type { EngagementScoresT } from './engagement';

// ─────────────────────────────────────────────────────────────────────────────
// docs/03 §12.4 — CANON §6 provider contracts. The zod schemas validate the DATA
// payloads; the behavioral interfaces below are CANON §6 verbatim (kept here per
// the §12.4 interface note — do not redefine elsewhere).
// ─────────────────────────────────────────────────────────────────────────────

export const AssetRef = z.object({ assetId: z.string() });

export const GenSpec = z.object({                    // CANON §6 (verbatim)
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  aspect: AdRatio,
  seed: z.number().int().optional(),
  refs: z.array(AssetRef).optional(),
  model: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const GenResult = z.object({                  // CANON §6 (verbatim)
  assetId: z.string(), width: z.number(), height: z.number(),
  provider: z.string(), model: z.string(),
  seed: z.number().int().optional(), costUsd: z.number(), raw: z.unknown(),
});

export const EditSpec = GenSpec.extend({             // CANON §6 — instruct-edit / inpaint
  baseAssetId: z.string(),
  maskAssetId: z.string().optional(),
});

export const UpscaleSpec = z.object({ assetId: z.string(), factor: z.union([z.literal(2), z.literal(4)]) });

export const VideoGenSpec = GenSpec.extend({});      // params carries mode/duration/image2video/cfg_scale (R2 §1.3)

export const TtsSpec = z.object({
  text: z.string(), voiceId: z.string(), model: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),   // language_code, seed, voice_settings (R2 §4.1)
});

export type AssetRefT = z.infer<typeof AssetRef>;
export type GenSpecT = z.infer<typeof GenSpec>;
export type GenResultT = z.infer<typeof GenResult>;
export type EditSpecT = z.infer<typeof EditSpec>;
export type UpscaleSpecT = z.infer<typeof UpscaleSpec>;
export type VideoGenSpecT = z.infer<typeof VideoGenSpec>;
export type TtsSpecT = z.infer<typeof TtsSpec>;

// ── Behavioral interfaces (CANON §6 verbatim) ────────────────────────────────

export interface ImageProvider {
  id: string;
  generate(spec: GenSpecT): Promise<GenResultT>;
  edit?(spec: EditSpecT): Promise<GenResultT>;
  upscale?(spec: UpscaleSpecT): Promise<GenResultT>;
}

export interface VideoProvider {
  id: string;
  generate(spec: VideoGenSpecT): Promise<GenResultT>;
}

export interface AudioProvider {
  id: string;
  tts(spec: TtsSpecT): Promise<GenResultT>;
}

export interface LlmProvider {
  complete(prompt: string, opts?: Record<string, unknown>): Promise<string>;
  structured<T>(schema: z.ZodType<T>, prompt: string, opts?: Record<string, unknown>): Promise<T>;
}

export interface RenderRef { renderId: string; url?: string }
export interface VideoRef { assetId: string; url?: string }
export interface GridRef { assetIds: string[] }

export interface EngagementPredictor {
  id: string;
  score(input: RenderRef | VideoRef | GridRef): Promise<EngagementScoresT>;
}

// Job → ranked-providers routing policy lives in docs/04; the bus resolves per job with fallback.
export interface JobDescriptor {
  kind: string;                                  // routing key, e.g. 'photoreal_bg','animate_still_i2v'
  modality: 'image' | 'video' | 'audio';
  [k: string]: unknown;
}

export interface ProviderBus {
  image(job: JobDescriptor): ImageProvider;
  video(job: JobDescriptor): VideoProvider;
  audio(job: JobDescriptor): AudioProvider;
  predictor(job: JobDescriptor): EngagementPredictor;
}
