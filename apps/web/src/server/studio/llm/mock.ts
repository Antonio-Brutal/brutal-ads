import type { z } from 'zod';
import type { LlmProvider } from '@brutal/shared';

// MockLlmProvider — fixture-driven, zero LLM spend. Fixtures are keyed by agent tag,
// which callers pass via opts.agent; falls back to matching on prompt content.

export interface MockCall { agent?: string; prompt: string }

export function createMockLlm(fixtures: Record<string, unknown>): LlmProvider & { calls: MockCall[] } {
  const calls: MockCall[] = [];
  return {
    calls,
    async complete(prompt, opts) {
      calls.push({ agent: opts?.agent as string, prompt });
      return String(fixtures[(opts?.agent as string) ?? 'complete'] ?? 'ok');
    },
    async structured<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, prompt: string, opts?: Record<string, unknown>): Promise<T> {
      const agent = (opts?.agent as string) ?? 'unknown';
      calls.push({ agent, prompt });
      const fixture = fixtures[agent];
      if (fixture === undefined) throw new Error(`MockLlmProvider: no fixture for agent '${agent}'`);
      return schema.parse(fixture);   // zod-validated, same as the real path
    },
  };
}
