import type { GenResultT, GenSpecT, ImageProvider, JobDescriptor, ProviderBus } from '@brutal/shared';
import { ProviderError } from './_shared/errors';
import { cacheKey } from './cache-key';

// docs/04 §1/§5 — the ProviderBus: job_kind → ranked driver list, fallback-on-retryable-error,
// per-call cost/lineage record via injected onJobRecord (P4 wires it to generation_job rows).

export interface JobRecord {
  jobKind: string;
  provider: string;
  model: string;
  cacheKey: string;
  costUsd: number;
  status: 'succeeded' | 'failed';
  error?: string;
}

export interface BusDeps {
  drivers: Record<string, ImageProvider>;
  onJobRecord?: (r: JobRecord) => void;
  /** docs/04 routing policy — job_kind → ranked provider ids. */
  policy?: Record<string, string[]>;
}

// Default routing policy (docs/04 §1 table). Slugs are config, not constants.
export const DEFAULT_POLICY: Record<string, string[]> = {
  photoreal_bg: ['bfl', 'fal', 'gemini'],      // hero/background imagery — FLUX primary
  brand_edit: ['gemini', 'bfl'],               // brand-consistent edit — nano-banana primary, kontext fallback
  design_bg: ['fal', 'bfl'],                   // design-y/vector-ish (Recraft via fal)
  default: ['bfl', 'fal'],
};

export function createProviderBus(deps: BusDeps): ProviderBus {
  const policy = deps.policy ?? DEFAULT_POLICY;

  function image(job: JobDescriptor): ImageProvider {
    const ranked = (policy[job.kind] ?? policy.default ?? ['bfl'])
      .map((id) => deps.drivers[id])
      .filter((d): d is ImageProvider => Boolean(d));
    if (ranked.length === 0) throw new Error(`ProviderBus: no drivers for job kind '${job.kind}'`);

    const attempt = async (fn: (d: ImageProvider) => Promise<GenResultT>, spec: GenSpecT): Promise<GenResultT> => {
      let lastErr: unknown;
      for (const driver of ranked) {
        const model = spec.model ?? '';
        try {
          const result = await fn(driver);
          deps.onJobRecord?.({
            jobKind: job.kind, provider: result.provider, model: result.model,
            cacheKey: cacheKey(result.provider, result.model, null, spec),
            costUsd: result.costUsd, status: 'succeeded',
          });
          return result;
        } catch (e) {
          lastErr = e;
          deps.onJobRecord?.({
            jobKind: job.kind, provider: driver.id, model, cacheKey: cacheKey(driver.id, model, null, spec),
            costUsd: 0, status: 'failed', error: String(e),
          });
          // non-retryable failures that are driver-specific (auth/quota) still fall through to the
          // next ranked driver; moderation/invalid_request abort the whole job (docs/04 §3.1).
          if (e instanceof ProviderError && (e.code === 'moderation' || e.code === 'invalid_request')) throw e;
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
    };

    return {
      id: `bus(${job.kind})`,
      generate: (spec) => attempt((d) => d.generate(spec), spec),
      edit: (spec) => attempt((d) => {
        if (!d.edit) throw new ProviderError('invalid_request', `${d.id}: edit() unsupported`, { retryable: false, provider: d.id });
        return d.edit(spec);
      }, spec),
    };
  }

  return {
    image,
    video: () => { throw new Error('ProviderBus.video lands in P9 (docs/04 §6 Kling/Seedance/Veo)'); },
    audio: () => { throw new Error('ProviderBus.audio lands in P9 (docs/04 §7 ElevenLabs)'); },
    predictor: () => { throw new Error('ProviderBus.predictor wired in P6 (docs/08 engine client)'); },
  };
}
