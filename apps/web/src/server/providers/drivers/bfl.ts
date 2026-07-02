import type { EditSpecT, GenResultT, GenSpecT, ImageProvider } from '@brutal/shared';
import { ProviderError } from '../_shared/errors';
import { httpJson, sleep, type FetchLike } from '../_shared/http';

// docs/04 §4.1 — BFL direct (PRIMARY imagery). Async submit → poll protocol:
//   POST {base}/v1/{model}  (header x-key) → { id, polling_url }
//   GET  polling_url        (header x-key) → { status: 'Ready'|'Pending'|…, result: { sample: url } }
// Base: api.bfl.ai (global) / api.eu.bfl.ai (BFL_REGION=eu — GDPR/DE tenant).
// Pricing (docs/04 §4.1 table): flux-2-pro from $0.03/MP; kontext-pro $0.04, kontext-max $0.08 flat.

export interface SaveAsset {
  (input: { url?: string; base64?: string; mimeType: string; provider: string; model: string }): Promise<{ assetId: string }>;
}

export interface BflDriverOpts {
  apiKey?: string;
  region?: 'eu' | 'us' | 'global';
  fetchImpl?: FetchLike;
  saveAsset: SaveAsset;
  pollIntervalMs?: number;
  maxPolls?: number;
}

const RATIO_TO_DIMS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '1.91:1': { width: 1408, height: 736 },
  '4:5': { width: 912, height: 1136 },
  '16:9': { width: 1360, height: 768 },
  '9:16': { width: 768, height: 1360 },
};

function costUsd(model: string, w: number, h: number): number {
  if (model.includes('kontext-max')) return 0.08;
  if (model.includes('kontext')) return 0.04;
  return Math.round(0.03 * ((w * h) / 1_000_000) * 10_000) / 10_000; // $0.03/MP
}

export function createBflDriver(opts: BflDriverOpts): ImageProvider {
  const key = opts.apiKey ?? process.env.BFL_API_KEY ?? '';
  const base = (opts.region ?? process.env.BFL_REGION) === 'eu' ? 'https://api.eu.bfl.ai' : 'https://api.bfl.ai';
  const http = { fetchImpl: opts.fetchImpl, provider: 'bfl' };
  const headers = { 'x-key': key, 'Content-Type': 'application/json', accept: 'application/json' };

  async function run(model: string, body: Record<string, unknown>, spec: GenSpecT): Promise<GenResultT> {
    if (!key) throw new ProviderError('auth', 'bfl: BFL_API_KEY missing', { retryable: false, provider: 'bfl' });
    const create = await httpJson<{ id: string; polling_url: string }>(
      `${base}/v1/${model}`, { method: 'POST', headers, body: JSON.stringify(body) }, http);

    const interval = opts.pollIntervalMs ?? 1500;
    for (let i = 0; i < (opts.maxPolls ?? 120); i++) {
      const poll = await httpJson<{ status: string; result?: { sample?: string } }>(
        create.polling_url, { headers: { 'x-key': key } }, http);
      if (poll.status === 'Ready' && poll.result?.sample) {
        const dims = RATIO_TO_DIMS[spec.aspect] ?? RATIO_TO_DIMS['1:1']!;
        const { assetId } = await opts.saveAsset({ url: poll.result.sample, mimeType: 'image/jpeg', provider: 'bfl', model });
        return {
          assetId, width: dims.width, height: dims.height, provider: 'bfl', model,
          seed: spec.seed, costUsd: costUsd(model, dims.width, dims.height), raw: poll,
        };
      }
      if (['Error', 'Failed', 'Content Moderated', 'Request Moderated'].includes(poll.status)) {
        const code = poll.status.includes('Moderated') ? 'moderation' : 'provider_failed';
        throw new ProviderError(code, `bfl: ${poll.status}`, { retryable: false, provider: 'bfl', raw: poll });
      }
      await sleep(interval);
    }
    throw new ProviderError('timeout', 'bfl: polling exceeded maxPolls', { retryable: true, provider: 'bfl' });
  }

  const toBody = (s: GenSpecT): Record<string, unknown> => {
    const dims = RATIO_TO_DIMS[s.aspect] ?? RATIO_TO_DIMS['1:1']!;
    return {
      prompt: s.negativePrompt ? `${s.prompt}. Avoid: ${s.negativePrompt}` : s.prompt, // VERIFY: BFL has no negative_prompt field — folded per docs/04 default
      width: dims.width, height: dims.height,
      ...(s.seed !== undefined ? { seed: s.seed } : {}),
      ...(s.params ?? {}),
    };
  };

  return {
    id: 'bfl',
    generate: (s) => run(s.model ?? 'flux-2-pro', toBody(s), s),
    edit: (s: EditSpecT) => run(s.model ?? 'flux-kontext-pro',
      { ...toBody(s), input_image: s.baseAssetId, ...(s.maskAssetId ? { mask_image: s.maskAssetId } : {}) }, s),
  };
}
