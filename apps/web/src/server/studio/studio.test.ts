import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { BrandKitData, LayerPatch, LayerTree, type BrandKitDataT } from '@brutal/shared';
import { createMockLlm } from './llm/mock';
import { STUDIO_FIXTURES } from './fixtures';
import { runBrief } from './orchestrator';
import { runBrandGuardian } from './agents/guardian';
import { runEditorAgent } from './agents/llm-agents';
import { composeLayerTree } from './agents/compositor';

// P3 tests — MockLlm only, ZERO LLM spend. Brand kit = the real seed (schema-consistency by reuse).

const here = dirname(fileURLToPath(import.meta.url));
const seedKit = (): BrandKitDataT => {
  const seed = readFileSync(join(here, '../../../../../supabase/seed.sql'), 'utf8');
  return BrandKitData.parse(JSON.parse(seed.match(/\$\$(\{[\s\S]*?\})\$\$::jsonb/)![1]!));
};

const dispatchImagery = vi.fn(async () => ({ assetId: 'as_fix_1', src: 'data:image/png;base64,x', costUsd: 0.04 }));

describe('runBrief pipeline (docs/05 orchestration)', () => {
  it('brief → 4 schema-valid variants with diverse archetypes and legal always present', async () => {
    const llm = createMockLlm(STUDIO_FIXTURES);
    const result = await runBrief(
      { rawInput: 'KI-Vertragsentwurf für deutsche Kanzleien bewerben', brandKit: seedKit(), targetLocale: 'de', variantCount: 4 },
      { llm, dispatchImagery },
    );
    expect(result.status).toBe('succeeded');
    expect(result.variants).toHaveLength(4);
    for (const v of result.variants) {
      expect(LayerTree.parse(v.layerTree)).toBeTruthy();
      expect(v.copy.headline.length).toBeLessThanOrEqual(70);
      const legal = (v.layerTree.layers as Array<{ type: string }>).find((l) => l.type === 'legal');
      expect(legal).toBeTruthy();                                   // required disclaimer composited
    }
    const archetypes = new Set(result.variants.map((v) => v.archetype));
    expect(archetypes.size).toBeGreaterThanOrEqual(2);              // L10 board diversity
  });

  it('design v3: every variant carries a brand mark and real-gradient grounds (no band stacks)', async () => {
    const llm = createMockLlm(STUDIO_FIXTURES);
    const result = await runBrief(
      { rawInput: 'x', brandKit: seedKit(), targetLocale: 'de', variantCount: 4 },
      { llm, dispatchImagery },
    );
    for (const v of result.variants) {
      const layers = v.layerTree.layers as Array<{ id: string; type: string; src?: string }>;
      // brand mark present (seed kit has no logo asset → wordmark signature)
      expect(layers.some((l) => l.id === 'ly_logo')).toBe(true);
      // v2's banded fake gradient (ly_scrim1..5) must never come back
      expect(layers.filter((l) => l.id.startsWith('ly_scrim'))).toHaveLength(
        layers.some((l) => l.id === 'ly_scrim') ? 1 : 0);
      // any scrim/blend ground is a continuous SVG gradient
      for (const g of layers.filter((l) => l.id === 'ly_scrim' || l.id === 'ly_blend')) {
        expect(g.src).toMatch(/^data:image\/svg\+xml/);
      }
    }
  });

  it('design v3: critic loop applies whitelisted fixes when renderPreview is wired', async () => {
    const llm = createMockLlm({
      ...STUDIO_FIXTURES,
      Critic: { score: 5, issues: ['headline collides with subject'],
        ops: [{ op: 'setFont', layerId: 'ly_headline', fontSize: 60 }] },
    } as typeof STUDIO_FIXTURES);
    const result = await runBrief(
      { rawInput: 'x', brandKit: seedKit(), targetLocale: 'de', variantCount: 1 },
      { llm, dispatchImagery, renderPreview: async () => 'ZmFrZQ==' },
    );
    const headline = (result.variants[0]!.layerTree.layers as Array<{ id: string; fontSize?: number }>)
      .find((l) => l.id === 'ly_headline');
    expect(result.variants[0]!.lineage.critique?.score).toBe(5);
    expect(headline?.fontSize).toBe(60);
  });

  it('imagery prompts never contain the ad copy (composite-don\'t-bake, CANON §2)', async () => {
    const llm = createMockLlm(STUDIO_FIXTURES);
    const result = await runBrief(
      { rawInput: 'x', brandKit: seedKit(), targetLocale: 'de', variantCount: 4 },
      { llm, dispatchImagery },
    );
    for (const v of result.variants) {
      expect(v.lineage.prompt.toLowerCase()).not.toContain(v.copy.headline.toLowerCase());
      expect(v.lineage.negativePrompt).toContain('no text');
    }
  });

  it('records an agent_run row per call incl. deterministic agents', async () => {
    const llm = createMockLlm(STUDIO_FIXTURES);
    const rows: string[] = [];
    await runBrief(
      { rawInput: 'x', brandKit: seedKit(), targetLocale: 'de', variantCount: 2 },
      { llm, dispatchImagery, onAgentRun: (r) => rows.push(`${r.agent}:${r.status}`) },
    );
    for (const agent of ['IntakeAgent', 'Strategist', 'Copywriter', 'ArtDirector', 'CompositorPlanner', 'BrandGuardian']) {
      expect(rows.some((r) => r.startsWith(agent))).toBe(true);
    }
  });

  it('budget guard: tiny cap → status budget_exceeded, no variants', async () => {
    const llm = createMockLlm(STUDIO_FIXTURES);
    const result = await runBrief(
      { rawInput: 'x', brandKit: seedKit(), targetLocale: 'de', variantCount: 4 },
      { llm, dispatchImagery, budget: { capUsdPerBrief: 0.03, estimateAgentCallUsd: 0.02 } },
    );
    expect(result.status).toBe('budget_exceeded');
    expect(result.variants).toHaveLength(0);
    expect(result.agentRuns.some((r) => r.status === 'budget_exceeded')).toBe(true);
  });
});

describe('BrandGuardian (mechanical, docs/05)', () => {
  it('catches banned terms, off-palette colors, missing disclaimers; auto-fixes are valid ops', () => {
    const kit = seedKit();
    const tree = LayerTree.parse({
      schemaVersion: 1, ratio: '1:1',
      canvas: { width: 1200, height: 1200, background: '#0a0a0a' },
      safeZones: {},
      layers: [
        { id: 'h', type: 'text', x: 0, y: 0, width: 500, height: 100,
          text: 'Ein game-changer für Kanzleien', fontFamily: 'Playfair Display', fontSize: 60, color: '#ff0000' },
      ],
    });
    const res = runBrandGuardian(tree, kit);
    expect(res.pass).toBe(false);
    const rules = res.violations.map((v) => v.rule);
    expect(rules).toContain('banned_term');
    expect(rules).toContain('off_palette');
    expect(rules).toContain('missing_disclaimer');
    for (const fix of res.autoFixes) {
      expect(LayerPatch.parse({ id: 'x', variantId: '5bb54b3e-6c8f-4f2e-9a0e-9d1f2a3b4c5d',
        origin: 'agent', createdBy: 'agent', ops: [fix] })).toBeTruthy();
    }
  });

  it('passes the CompositorPlanner output for the seed kit', () => {
    const kit = seedKit();
    const tree = composeLayerTree({
      copy: { hook: 'x', headline: 'Nüchtern. Präzise.', cta: 'Demo buchen', kicker: '1.200 Kanzleien' },
      imagery: { assetId: 'as_1' }, brandKit: kit, archetype: 'full-bleed-hero-lower-third', locale: 'de',
    });
    expect(runBrandGuardian(tree, kit).pass).toBe(true);
  });
});

describe('EditorAgent (NL → typed LayerPatch)', () => {
  it('returns a zod-valid LayerPatch from the mock', async () => {
    const llm = createMockLlm(STUDIO_FIXTURES);
    const kit = seedKit();
    const tree = composeLayerTree({
      copy: { hook: 'x', headline: 'Alt', cta: 'Demo buchen' },
      imagery: { assetId: 'as_1' }, brandKit: kit, archetype: 'quote-card', locale: 'de',
    });
    const patch = await runEditorAgent(llm, 'mach die headline gold und kürzer', tree,
      '5bb54b3e-6c8f-4f2e-9a0e-9d1f2a3b4c5d', kit);
    expect(LayerPatch.parse(patch).ops.length).toBeGreaterThan(0);
    expect(patch.ops[0]!.op).toBe('setText');
  });
});
