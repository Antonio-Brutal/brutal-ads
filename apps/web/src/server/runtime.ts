import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  applyLayerPatch, BrandKitData, LayerPatch,
  type BrandKitDataT, type GenSpecT, type LayerPatchT, type LayerTreeT,
} from '@brutal/shared';
import { createMockLlm } from './studio/llm/mock';
import { createAnthropicLlm } from './studio/llm/anthropic';
import { STUDIO_FIXTURES } from './studio/fixtures';
import { runBrief, type RunBriefResult, type StudioVariant } from './studio/orchestrator';
import { runEditorAgent } from './studio/agents/llm-agents';
import { createBflDriver, createFalDriver, createGeminiDriver, createProviderBus } from './providers';

// ─────────────────────────────────────────────────────────────────────────────
// P4 runtime — $0 keyless mock mode with REAL seams:
//  · LLM: MockLlmProvider fixtures unless ANTHROPIC_API_KEY is set (then real studio).
//  · Imagery: committed P1 gradient unless BFL_API_KEY/FAL_KEY is set (then the real bus).
//  · Persistence: in-memory (dev) — Supabase repo lands with infra provisioning.
// The pipeline, schemas, patches and export path are the production ones.
// ─────────────────────────────────────────────────────────────────────────────

export interface StoredVariant extends StudioVariant { id: string; briefId: string }
export interface StoredBrief { id: string; rawInput: string; result: RunBriefResult }

const globalStore = globalThis as unknown as {
  __brutalBriefs?: Map<string, StoredBrief>;
  __brutalVariants?: Map<string, StoredVariant>;
};
const briefs = (globalStore.__brutalBriefs ??= new Map());
const variants = (globalStore.__brutalVariants ??= new Map());

let cachedKit: BrandKitDataT | null = null;
export function seedBrandKit(): BrandKitDataT {
  if (!cachedKit) {
    const seed = readFileSync(join(process.cwd(), '../../supabase/seed.sql'), 'utf8');
    cachedKit = BrandKitData.parse(JSON.parse(seed.match(/\$\$(\{[\s\S]*?\})\$\$::jsonb/)![1]!));
  }
  return cachedKit;
}

function gradientDataUrl(): string {
  const png = readFileSync(join(process.cwd(), '../../packages/render/fixtures/gradient.png'));
  return `data:image/png;base64,${png.toString('base64')}`;
}

export function studioMode(): { llm: 'anthropic' | 'mock'; imagery: 'live' | 'stub' } {
  return {
    llm: process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'mock',
    imagery: process.env.BFL_API_KEY || process.env.FAL_KEY ? 'live' : 'stub',
  };
}

function makeDispatchImagery() {
  const mode = studioMode();
  if (mode.imagery === 'stub') {
    const src = gradientDataUrl();
    return async (_spec: GenSpecT, _jobKind: string) => ({ assetId: `as_stub_${randomUUID().slice(0, 8)}`, src, costUsd: 0 });
  }
  // GenResult carries assetId only (CANON §6); dev keeps provider URLs in a local map until
  // Supabase Storage lands. srcById bridges driver → compositor.
  const srcById = new Map<string, string>();
  const saveAsset = async ({ url, base64, mimeType }: { url?: string; base64?: string; mimeType: string }) => {
    const assetId = `as_${randomUUID().slice(0, 8)}`;
    if (url) {
      // provider delivery URLs (BFL/Fal) are signed + expiring — inline as durable data URLs
      // until Supabase Storage lands with infra.
      const res = await fetch(url);
      const buf = Buffer.from(await res.arrayBuffer());
      const mt = res.headers.get('content-type') ?? mimeType;
      srcById.set(assetId, `data:${mt};base64,${buf.toString('base64')}`);
    } else {
      srcById.set(assetId, `data:${mimeType};base64,${base64}`);
    }
    return { assetId };
  };
  const bus = createProviderBus({
    drivers: {
      ...(process.env.BFL_API_KEY ? { bfl: createBflDriver({ saveAsset }) } : {}),
      ...(process.env.FAL_KEY ? { fal: createFalDriver({ saveAsset }) } : {}),
      ...(process.env.GEMINI_API_KEY ? { gemini: createGeminiDriver({ saveAsset }) } : {}),
    },
  });
  return async (spec: GenSpecT, jobKind: string) => {
    const r = await bus.image({ kind: jobKind, modality: 'image' }).generate(spec);
    return { assetId: r.assetId, src: srcById.get(r.assetId), costUsd: r.costUsd };
  };
}

export async function createBrief(rawInput: string, locale: 'de' | 'en' = 'de'): Promise<StoredBrief> {
  const kit = seedBrandKit();
  const mode = studioMode();
  const llm = mode.llm === 'anthropic' ? createAnthropicLlm() : createMockLlm(STUDIO_FIXTURES);
  const result = await runBrief(
    { rawInput, brandKit: kit, targetLocale: locale, variantCount: 4 },
    { llm, dispatchImagery: makeDispatchImagery() },
  );
  const brief: StoredBrief = { id: randomUUID(), rawInput, result };
  briefs.set(brief.id, brief);
  result.variants.forEach((v) => {
    const sv: StoredVariant = { ...v, id: randomUUID(), briefId: brief.id };
    variants.set(sv.id, sv);
  });
  return brief;
}

export const getBrief = (id: string) => briefs.get(id);
export const getVariant = (id: string) => variants.get(id);
export const variantsForBrief = (briefId: string) => [...variants.values()].filter((v) => v.briefId === briefId);

/** Chat-to-edit: real EditorAgent when a key exists; deterministic rule parser otherwise. Both emit canonical LayerPatch. */
export async function chatEdit(variantId: string, instruction: string): Promise<{ patch: LayerPatchT; tree: LayerTreeT }> {
  const v = getVariant(variantId);
  if (!v) throw new Error('variant not found');
  const kit = seedBrandKit();
  const patch = studioMode().llm === 'anthropic'
    ? await runEditorAgent(createAnthropicLlm(), instruction, v.layerTree, variantId, kit)
    : ruleBasedPatch(instruction, v.layerTree, variantId, kit);
  const tree = applyLayerPatch(v.layerTree, patch);
  v.layerTree = tree;
  return { patch, tree };
}

/** Keyless fallback: a few high-value NL commands → canonical ops (the SAME pipeline as the agent). */
function ruleBasedPatch(instruction: string, tree: LayerTreeT, variantId: string, kit: BrandKitDataT): LayerPatchT {
  const t = instruction.toLowerCase();
  const ops: unknown[] = [];
  const gold = kit.palette.accents.gold ?? '#cba65e';
  const lime = kit.palette.accents.lime ?? '#b6e64a';
  const headline = (tree.layers as Array<{ id: string; type: string; text?: string }>).find((l) => l.id === 'ly_headline');

  if (/(gold|golden)/.test(t)) ops.push({ op: 'setFill', layerId: 'ly_headline', fill: gold });
  if (/(lime|grün|green)/.test(t)) ops.push({ op: 'setFill', layerId: 'ly_headline', fill: lime });
  if (/(kürzer|shorter|punchier)/.test(t) && headline?.text) {
    const words = headline.text.split(' ');
    ops.push({ op: 'setText', layerId: 'ly_headline', text: words.slice(0, Math.max(2, Math.ceil(words.length / 2))).join(' ') });
  }
  if (/(größer|bigger|larger)/.test(t)) ops.push({ op: 'setFont', layerId: 'ly_headline', fontSize: 96 });
  if (/(kleiner|smaller)/.test(t)) ops.push({ op: 'setFont', layerId: 'ly_headline', fontSize: 56 });
  if (/(logo).*(versteck|hide)/.test(t) || /(hide).*(logo)/.test(t)) ops.push({ op: 'setVisible', layerId: 'ly_logo', visible: false });
  if (ops.length === 0 && headline) {
    // default demo behavior: treat the instruction as a rewrite
    ops.push({ op: 'setText', layerId: 'ly_headline', text: instruction.slice(0, 70) });
  }
  return LayerPatch.parse({
    id: `lp_${randomUUID().slice(0, 8)}`, variantId, origin: 'chat', createdBy: 'agent',
    note: `rule-based (keyless mode): ${instruction.slice(0, 80)}`, ops,
  });
}
