import Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';
import type { LlmProvider } from '@brutal/shared';

// docs/05 — the real LlmProvider (Claude API). NEVER called in tests (MockLlmProvider there).
// Model routing (R7 ⚑R-LLM1 / docs/03 §5): sonnet-5 default; opus for Strategist/Critic (set by caller).

export const STUDIO_MODELS = {
  default: 'claude-sonnet-5',
  strategist: 'claude-opus-4-8',
  critic: 'claude-opus-4-8',
} as const;

export interface AnthropicLlmOpts {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  onUsage?: (u: { model: string; inputTokens: number; outputTokens: number }) => void;
}

export function createAnthropicLlm(opts: AnthropicLlmOpts = {}): LlmProvider {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('AnthropicLlmProvider: ANTHROPIC_API_KEY missing — use MockLlmProvider in keyless/mock mode');
  }
  const client = new Anthropic({ apiKey });
  const model = opts.model ?? STUDIO_MODELS.default;

  // Vision seam (design v3): callers pass base64 JPEGs via opts.images — the
  // Critic reviews RENDERED variants. Kept inside opts so the LlmProvider
  // interface (CANON §6) stays untouched; MockLlm simply ignores them.
  async function callOnce(prompt: string, system?: string, images?: string[]): Promise<string> {
    const content: Anthropic.ContentBlockParam[] = [
      ...(images ?? []).map((img): Anthropic.ImageBlockParam => ({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: img.replace(/^data:image\/\w+;base64,/, '') },
      })),
      { type: 'text', text: prompt },
    ];
    const res = await client.messages.create({
      model,
      max_tokens: opts.maxTokens ?? 4096,
      ...(system ? { system } : {}),
      messages: [{ role: 'user', content }],
    });
    opts.onUsage?.({ model, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens });
    const text = res.content.find((b) => b.type === 'text');
    return text && 'text' in text ? text.text : '';
  }

  return {
    complete: (prompt, o) => callOnce(prompt, o?.system as string | undefined, o?.images as string[] | undefined),
    async structured<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, prompt: string, o?: Record<string, unknown>): Promise<T> {
      const sys = `${(o?.system as string) ?? ''}\nRespond with ONLY a valid JSON object matching the required schema. No prose, no markdown fences.`;
      const images = o?.images as string[] | undefined;
      const first = await callOnce(prompt, sys, images);
      try {
        return schema.parse(JSON.parse(stripFences(first)));
      } catch (err) {
        // one retry with the validation error appended (docs/05 structured-output discipline)
        const second = await callOnce(
          `${prompt}\n\nYour previous output failed validation:\n${String(err).slice(0, 800)}\nReturn corrected JSON only.`,
          sys, images,
        );
        return schema.parse(JSON.parse(stripFences(second)));
      }
    },
  };
}

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
}
