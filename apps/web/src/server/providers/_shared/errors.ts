// docs/04 §3.1 — shared error taxonomy every driver maps into.
// Server-only: never import into client bundles (holds provider failure semantics).

export type ProviderErrorCode =
  | 'auth' // 401/403 bad or missing key → NOT retryable, alert ops
  | 'rate_limit' // 429 → retry w/ backoff, then fallback driver
  | 'quota' // out of credits/balance → fallback + alert (no retry)
  | 'moderation' // content blocked by provider safety → surface reason, do NOT retry same prompt
  | 'invalid_request' // 400 bad params → bug; do NOT retry, log for dev
  | 'provider_failed' // task returned failed/error status
  | 'timeout' // poll/HTTP timeout → retry then fallback
  | 'network' // fetch/DNS/connection → retry then fallback
  | 'unknown';

export interface ProviderErrorOpts {
  retryable: boolean;
  provider?: string;
  httpStatus?: number;
  providerCode?: string;
  raw?: unknown;
}

export class ProviderError extends Error {
  code: ProviderErrorCode;
  opts: ProviderErrorOpts;

  constructor(code: ProviderErrorCode, message: string, opts: ProviderErrorOpts = { retryable: false }) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.opts = opts;
  }

  static async fromResponse(res: Response, provider?: string): Promise<ProviderError> {
    let raw: unknown;
    try {
      raw = await res.json();
    } catch {
      try {
        raw = await res.text();
      } catch {
        raw = undefined;
      }
    }
    const status = res.status;
    const opts: ProviderErrorOpts = { retryable: false, provider, httpStatus: status, raw };
    if (status === 401 || status === 403) {
      return new ProviderError('auth', `provider auth failed (${status})`, opts);
    }
    if (status === 429) {
      return new ProviderError('rate_limit', `provider rate limited (${status})`, { ...opts, retryable: true });
    }
    if (status === 402) {
      return new ProviderError('quota', `provider quota exhausted (${status})`, opts);
    }
    if (status === 400 || status === 422) {
      return new ProviderError('invalid_request', `provider rejected request (${status})`, opts);
    }
    if (status >= 500) {
      return new ProviderError('provider_failed', `provider server error (${status})`, { ...opts, retryable: true });
    }
    return new ProviderError('unknown', `provider error (${status})`, opts);
  }

  static network(e: unknown, provider?: string) {
    return new ProviderError('network', String(e instanceof Error ? e.message : e), { retryable: true, provider });
  }

  static timeout(m: string, provider?: string) {
    return new ProviderError('timeout', m, { retryable: true, provider });
  }

  static providerFailed(m: string, provider?: string, raw?: unknown) {
    return new ProviderError('provider_failed', m, { retryable: false, provider, raw });
  }

  static moderation(m: string, provider?: string, raw?: unknown) {
    return new ProviderError('moderation', m, { retryable: false, provider, raw });
  }
}
