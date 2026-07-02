import { describe, expect, it, vi } from 'vitest';
import { GenResult, type GenSpecT } from '@brutal/shared';
import { cacheKey } from './cache-key';
import { createBflDriver } from './drivers/bfl';
import { createFalDriver } from './drivers/fal';
import { createGeminiDriver } from './drivers/gemini';
import { createProviderBus } from './bus';

// P2 tests — ZERO network: every driver gets an injected mock fetch.

const spec: GenSpecT = {
  prompt: 'documentary photo, lawyer at dark oak desk, muted light',
  negativePrompt: 'no text, no watermark',
  aspect: '1:1',
  seed: 42,
};

const saveAsset = vi.fn(async () => ({ assetId: 'as_test_1' }));
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('BFL driver (submit → poll, docs/04 §4.1)', () => {
  it('builds the documented request and returns a zod-valid GenResult', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/v1/flux-2-pro')) {
        return json({ id: 'task1', polling_url: 'https://api.bfl.ai/v1/get_result?id=task1' });
      }
      return json({ status: 'Ready', result: { sample: 'https://cdn.bfl.ai/out.jpg' } });
    }) as unknown as typeof fetch;

    const bfl = createBflDriver({ apiKey: 'k', saveAsset, fetchImpl, pollIntervalMs: 1 });
    const result = await bfl.generate(spec);

    // request shape asserted (URL, auth header, body fields)
    expect(calls[0]!.url).toBe('https://api.bfl.ai/v1/flux-2-pro');
    const headers = calls[0]!.init!.headers as Record<string, string>;
    expect(headers['x-key']).toBe('k');
    const body = JSON.parse(String(calls[0]!.init!.body));
    expect(body.seed).toBe(42);
    expect(body.width).toBe(1024);
    expect(body.prompt).toContain('lawyer');

    expect(GenResult.parse(result)).toBeTruthy();
    expect(result.provider).toBe('bfl');
    expect(result.costUsd).toBeGreaterThan(0);
    expect(saveAsset).toHaveBeenCalled();
  });

  it('polls through Pending → Ready', async () => {
    let polls = 0;
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes('get_result')) {
        polls += 1;
        return polls < 3 ? json({ status: 'Pending' }) : json({ status: 'Ready', result: { sample: 'https://x/o.jpg' } });
      }
      return json({ id: 't', polling_url: 'https://api.bfl.ai/v1/get_result?id=t' });
    }) as unknown as typeof fetch;
    const bfl = createBflDriver({ apiKey: 'k', saveAsset, fetchImpl, pollIntervalMs: 1 });
    await bfl.generate(spec);
    expect(polls).toBe(3);
  });

  it('eu region routes to api.eu.bfl.ai (GDPR tenant)', async () => {
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      urls.push(String(url));
      return String(url).includes('get_result')
        ? json({ status: 'Ready', result: { sample: 'https://x/o.jpg' } })
        : json({ id: 't', polling_url: 'https://api.eu.bfl.ai/v1/get_result?id=t' });
    }) as unknown as typeof fetch;
    await createBflDriver({ apiKey: 'k', region: 'eu', saveAsset, fetchImpl, pollIntervalMs: 1 }).generate(spec);
    expect(urls[0]).toContain('https://api.eu.bfl.ai/');
  });
});

describe('Fal driver (queue gateway, docs/04 §4.2)', () => {
  it('submits to queue.fal.run with Key auth and walks status→response', async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(String(url));
      const u = String(url);
      if (u === 'https://queue.fal.run/fal-ai/flux-2-pro') {
        expect((init!.headers as Record<string, string>).Authorization).toBe('Key fk');
        return json({ request_id: 'r1', status_url: 'https://queue.fal.run/s/r1', response_url: 'https://queue.fal.run/r/r1' });
      }
      if (u.endsWith('/s/r1')) return json({ status: 'COMPLETED' });
      return json({ images: [{ url: 'https://fal.cdn/o.png', width: 1024, height: 1024 }], seed: 42 });
    }) as unknown as typeof fetch;

    const fal = createFalDriver({ apiKey: 'fk', saveAsset, fetchImpl, pollIntervalMs: 1 });
    const result = await fal.generate(spec);
    expect(GenResult.parse(result).width).toBe(1024);
    expect(calls[0]).toBe('https://queue.fal.run/fal-ai/flux-2-pro');
  });
});

describe('Gemini driver (generateContent, docs/04 §4.3)', () => {
  it('posts to generateContent with x-goog-api-key and decodes inlineData', async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      expect(String(url)).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent');
      expect((init!.headers as Record<string, string>)['x-goog-api-key']).toBe('gk');
      const body = JSON.parse(String(init!.body));
      expect(body.contents[0].parts[0].text).toContain('Do NOT include');
      return json({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'aGk=' } }] } }] });
    }) as unknown as typeof fetch;
    const result = await createGeminiDriver({ apiKey: 'gk', saveAsset, fetchImpl }).generate(spec);
    expect(GenResult.parse(result).provider).toBe('gemini');
  });
});

describe('cache key (CANON §4)', () => {
  it('is stable across params key order and changes on seed', () => {
    const a = cacheKey('bfl', 'flux-2-pro', null, { ...spec, params: { a: 1, b: 2 } });
    const b = cacheKey('bfl', 'flux-2-pro', null, { ...spec, params: { b: 2, a: 1 } });
    const c = cacheKey('bfl', 'flux-2-pro', null, { ...spec, seed: 43, params: { a: 1, b: 2 } });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('ProviderBus (routing + fallback, docs/04 §1)', () => {
  const failing = (id: string) => ({
    id,
    generate: vi.fn(async () => { throw new Error(`${id} boom`); }),
  });
  const succeeding = (id: string) => ({
    id,
    generate: vi.fn(async () => ({
      assetId: 'as_ok', width: 1024, height: 1024, provider: id, model: 'm', seed: 42, costUsd: 0.03, raw: {},
    })),
  });

  it('falls back to the next ranked driver and records both attempts', async () => {
    const records: Array<{ provider: string; status: string }> = [];
    const bus = createProviderBus({
      drivers: { bfl: failing('bfl'), fal: succeeding('fal') },
      onJobRecord: (r) => records.push({ provider: r.provider, status: r.status }),
    });
    const result = await bus.image({ kind: 'photoreal_bg', modality: 'image' }).generate(spec);
    expect(result.provider).toBe('fal');
    expect(records).toEqual([
      { provider: 'bfl', status: 'failed' },
      { provider: 'fal', status: 'succeeded' },
    ]);
  });

  it('cost accounting reaches the record callback', async () => {
    let cost = 0;
    const bus = createProviderBus({
      drivers: { bfl: succeeding('bfl') },
      onJobRecord: (r) => { cost = r.costUsd; },
    });
    await bus.image({ kind: 'default', modality: 'image' }).generate(spec);
    expect(cost).toBeGreaterThan(0);
  });

  it('video/audio/predictor throw NotImplemented with phase pointers', () => {
    const bus = createProviderBus({ drivers: {} });
    expect(() => bus.video({ kind: 'x', modality: 'video' })).toThrow(/P9/);
    expect(() => bus.audio({ kind: 'x', modality: 'audio' })).toThrow(/P9/);
    expect(() => bus.predictor({ kind: 'x', modality: 'image' })).toThrow(/P6/);
  });
});
