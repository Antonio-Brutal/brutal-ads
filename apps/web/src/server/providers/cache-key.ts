import { createHash } from 'node:crypto';
import type { GenSpecT } from '@brutal/shared';

// CANON §4 cache key: sha256(provider, model, model_version, prompt, negativePrompt, seed, aspect, params)
// with stable (sorted-key) serialization so object key order never changes the key.

function stable(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value as object).sort()
      .map((k) => `${k}:${stable((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function cacheKey(provider: string, model: string, modelVersion: string | null, spec: GenSpecT): string {
  const payload = stable({
    provider, model, modelVersion,
    prompt: spec.prompt, negativePrompt: spec.negativePrompt ?? null,
    seed: spec.seed ?? null, aspect: spec.aspect, params: spec.params ?? {},
    refs: spec.refs ?? [],
  });
  return createHash('sha256').update(payload).digest('hex');
}
