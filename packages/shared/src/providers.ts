import type { Format } from './enums';

// Canonical provider contracts (CANON §6, docs/04). Drivers implement these; the ProviderBus
// routes each job to a driver by policy with fallback. Imagery is generated WITHOUT baked text.

export interface AssetRef { assetId: string; url?: string }

export interface GenSpec {
  prompt: string;
  negativePrompt?: string;
  aspect: Format;
  seed?: number;
  refs?: AssetRef[];
  model?: string;                 // slug is config, not a constant (see docs/04 routing policy)
  params?: Record<string, unknown>;
}

export interface GenResult {
  assetId: string;
  width: number;
  height: number;
  provider: string;
  model: string;
  seed?: number;
  costUsd: number;
  raw: unknown;
}

export interface EditSpec extends GenSpec { baseAssetId: string; maskAssetId?: string }
export interface UpscaleSpec { assetId: string; factor: 2 | 4 }
export interface VideoGenSpec extends GenSpec { durationSec: number; soundOn?: boolean }
export interface TtsSpec { text: string; voiceId: string; modelId?: string; locale?: 'de' | 'en' }

export interface ImageProvider {
  id: string;
  generate(s: GenSpec): Promise<GenResult>;
  edit?(s: EditSpec): Promise<GenResult>;
  upscale?(s: UpscaleSpec): Promise<GenResult>;
}
export interface VideoProvider { id: string; generate(s: VideoGenSpec): Promise<GenResult> }
export interface AudioProvider { id: string; tts(s: TtsSpec): Promise<GenResult> }

export interface EngagementScores {
  attentionMap?: unknown;
  focalClarity: number;
  valuePropAttention: number;
  ctaAttention: number;
  clutter: number;
  stoppingPower: number;
  firstThreeSeconds?: number;
  predictedCtrBand?: { low: number; high: number; confidence: number };
  perSlide?: EngagementScores[];
  raw: unknown;
}
export interface RenderRef { renderId: string; url?: string }
export interface VideoRef { assetId: string; url?: string }
export interface GridRef { assetIds: string[] }
export interface EngagementPredictor {
  id: string;
  score(input: RenderRef | VideoRef | GridRef): Promise<EngagementScores>;
}

export interface LlmProvider {
  complete(prompt: string, opts?: Record<string, unknown>): Promise<string>;
  structured<T>(schema: unknown, prompt: string, opts?: Record<string, unknown>): Promise<T>;
}

// Job → ranked-providers policy lives in docs/04; the bus resolves a driver per job with fallback.
export interface JobDescriptor { kind: string; modality: 'image' | 'video' | 'audio'; [k: string]: unknown }
export interface ProviderBus {
  image(job: JobDescriptor): ImageProvider;
  video(job: JobDescriptor): VideoProvider;
  audio(job: JobDescriptor): AudioProvider;
  predictor(job: JobDescriptor): EngagementPredictor;
}
