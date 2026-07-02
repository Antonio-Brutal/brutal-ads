import type { EditSpecT, GenResultT, GenSpecT, ImageProvider } from '@brutal/shared';
import { ProviderError } from '../_shared/errors';
import { httpJson, type FetchLike } from '../_shared/http';
import type { SaveAsset } from './bfl';

// docs/04 §4.3 — Gemini image ("nano-banana"): brand-consistent edits + multi-ref consistency.
//   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
//   Header: x-goog-api-key. Response: candidates[0].content.parts[].inlineData { mimeType, data(b64) }.
// Synchronous (no polling). Default slug per docs/04: gemini-3-pro-image (VERIFY note resolved: coded default).

export interface GeminiDriverOpts {
  apiKey?: string;
  fetchImpl?: FetchLike;
  saveAsset: SaveAsset;
  costPerImageUsd?: number;   // docs/04 table default
}

interface GenerateContentResponse {
  candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> } }>;
}

export function createGeminiDriver(opts: GeminiDriverOpts): ImageProvider {
  const key = opts.apiKey ?? process.env.GEMINI_API_KEY ?? '';
  const http = { fetchImpl: opts.fetchImpl, provider: 'gemini' };
  const headers = { 'x-goog-api-key': key, 'Content-Type': 'application/json' };

  async function run(model: string, parts: unknown[], spec: GenSpecT): Promise<GenResultT> {
    if (!key) throw new ProviderError('auth', 'gemini: GEMINI_API_KEY missing', { retryable: false, provider: 'gemini' });
    const res = await httpJson<GenerateContentResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { method: 'POST', headers, body: JSON.stringify({ contents: [{ parts }] }) }, http);
    const img = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (!img) throw new ProviderError('provider_failed', 'gemini: no inlineData image in response', { retryable: false, provider: 'gemini', raw: res });
    const { assetId } = await opts.saveAsset({ base64: img.data, mimeType: img.mimeType, provider: 'gemini', model });
    return {
      assetId, width: 0, height: 0, provider: 'gemini', model,
      seed: spec.seed, costUsd: opts.costPerImageUsd ?? 0.04, raw: { mimeType: img.mimeType },
    };
  }

  const promptPart = (s: GenSpecT) => ({
    text: `${s.prompt}${s.negativePrompt ? `\nDo NOT include: ${s.negativePrompt}` : ''}\nAspect ratio: ${s.aspect}.`,
  });

  return {
    id: 'gemini',
    generate: (s) => run(s.model ?? 'gemini-3-pro-image', [promptPart(s)], s),
    edit: (s: EditSpecT) => run(s.model ?? 'gemini-3-pro-image',
      [{ inlineData: { mimeType: 'image/png', data: s.baseAssetId } }, promptPart(s)], s),
  };
}
