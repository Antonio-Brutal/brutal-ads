import type { GenResultT, GenSpecT, ImageProvider } from '@brutal/shared';
import { ProviderError } from '../_shared/errors';
import { httpJson, sleep, type FetchLike } from '../_shared/http';
import type { SaveAsset } from './bfl';

// docs/04 §4.2 — Fal queue gateway (AGGREGATOR / fallback fabric). Uniform async pattern:
//   POST https://queue.fal.run/{model_id}  (Authorization: Key ${FAL_KEY})
//     → { request_id, status:"IN_QUEUE", status_url, response_url }
//   GET status_url → { status: 'IN_QUEUE'|'IN_PROGRESS'|'COMPLETED' }
//   GET response_url → { images: [{ url, width, height }], seed?, ... }

export interface FalDriverOpts {
  apiKey?: string;
  fetchImpl?: FetchLike;
  saveAsset: SaveAsset;
  pollIntervalMs?: number;
  maxPolls?: number;
  costTable?: Record<string, number>;      // model_id → $/image (docs/04 price table; seed data in prod)
}

const DEFAULT_COSTS: Record<string, number> = {
  'fal-ai/flux-2-pro': 0.04,
  'fal-ai/bytedance/seedream/v4': 0.03,
  'fal-ai/recraft/v3': 0.04,
};

export function createFalDriver(opts: FalDriverOpts): ImageProvider {
  const key = opts.apiKey ?? process.env.FAL_KEY ?? '';
  const http = { fetchImpl: opts.fetchImpl, provider: 'fal' };
  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };

  async function run(modelId: string, spec: GenSpecT): Promise<GenResultT> {
    if (!key) throw new ProviderError('auth', 'fal: FAL_KEY missing', { retryable: false, provider: 'fal' });
    const body = {
      prompt: spec.prompt,
      ...(spec.negativePrompt ? { negative_prompt: spec.negativePrompt } : {}),
      ...(spec.seed !== undefined ? { seed: spec.seed } : {}),
      aspect_ratio: spec.aspect,
      ...(spec.params ?? {}),
    };
    const submit = await httpJson<{ request_id: string; status_url: string; response_url: string }>(
      `https://queue.fal.run/${modelId}`, { method: 'POST', headers, body: JSON.stringify(body) }, http);

    for (let i = 0; i < (opts.maxPolls ?? 120); i++) {
      const st = await httpJson<{ status: string }>(submit.status_url, { headers }, http);
      if (st.status === 'COMPLETED') break;
      if (st.status === 'FAILED') throw new ProviderError('provider_failed', 'fal: FAILED', { retryable: false, provider: 'fal', raw: st });
      await sleep(opts.pollIntervalMs ?? 1200);
      if (i === (opts.maxPolls ?? 120) - 1) throw new ProviderError('timeout', 'fal: polling exceeded maxPolls', { retryable: true, provider: 'fal' });
    }

    const result = await httpJson<{ images?: Array<{ url: string; width?: number; height?: number }>; seed?: number }>(
      submit.response_url, { headers }, http);
    const img = result.images?.[0];
    if (!img) throw new ProviderError('provider_failed', 'fal: no images in response', { retryable: false, provider: 'fal', raw: result });
    const { assetId } = await opts.saveAsset({ url: img.url, mimeType: 'image/jpeg', provider: 'fal', model: modelId });
    return {
      assetId, width: img.width ?? 0, height: img.height ?? 0, provider: 'fal', model: modelId,
      seed: result.seed ?? spec.seed,
      costUsd: (opts.costTable ?? DEFAULT_COSTS)[modelId] ?? 0.04,
      raw: result,
    };
  }

  return { id: 'fal', generate: (s) => run(s.model ?? 'fal-ai/flux-2-pro', s) };
}
