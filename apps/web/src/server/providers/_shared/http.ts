import { ProviderError } from './errors';

// Server-only fetch helper: JSON in/out, timeout, error taxonomy mapping (docs/04 §3.1).

export type FetchLike = typeof fetch;

export interface HttpOpts {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  provider: string;
}

export async function httpJson<T>(
  url: string,
  init: RequestInit,
  { fetchImpl = fetch, timeoutMs = 60_000, provider }: HttpOpts,
): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    clearTimeout(t);
    const code = (e as Error).name === 'AbortError' ? 'timeout' : 'network';
    throw new ProviderError(code, `${provider}: ${String(e)}`, { retryable: true, provider });
  }
  clearTimeout(t);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const code = res.status === 401 || res.status === 403 ? 'auth'
      : res.status === 429 ? 'rate_limit'
      : res.status === 402 ? 'quota'
      : res.status === 400 ? 'invalid_request'
      : 'provider_failed';
    throw new ProviderError(code, `${provider}: HTTP ${res.status} ${body.slice(0, 300)}`, {
      retryable: code === 'rate_limit' || res.status >= 500, provider, httpStatus: res.status,
    });
  }
  return res.json() as Promise<T>;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
