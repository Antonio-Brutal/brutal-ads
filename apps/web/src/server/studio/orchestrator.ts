import {
  applyLayerPatch, LayerPatch, LayerTree,
  type AgentName, type BrandKitDataT, type BriefNormalizedT, type GenSpecT, type LayerTreeT,
  type LlmProvider, type StrategyT,
} from '@brutal/shared';
import { ARCHETYPE_ROTATION, composeLayerTree } from './agents/compositor';
import { runBrandGuardian, type GuardianResult } from './agents/guardian';
import { runArtDirector, runCarouselArchitect, runCopywriter, runIntakeAgent, runStrategist } from './agents/llm-agents';
import type { LayoutArchetypeT, SlideRoleT } from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// docs/05 orchestration — brief → variants pipeline with cost/budget guard
// (workspace.spend_cap_usd_per_brief, L8) and per-call observability records
// (agent_run rows via onAgentRun). Auto-iterate (Critic loop ≤2) lands with P6
// scores — seam marked below.
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentRunRecord {
  agent: AgentName | string;
  model: string;
  status: 'succeeded' | 'failed' | 'budget_exceeded';
  costUsd: number;
  error?: string;
}

export interface RunBriefDeps {
  llm: LlmProvider;
  dispatchImagery: (spec: GenSpecT, jobKind: string) => Promise<{ assetId: string; src?: string; costUsd?: number }>;
  onAgentRun?: (r: AgentRunRecord) => void;
  budget?: { capUsdPerBrief: number; estimateAgentCallUsd?: number };
}

export interface RunBriefInput {
  rawInput: string;
  brandKit: BrandKitDataT;
  targetLocale: 'de' | 'en';
  variantCount?: number;
}

export interface StudioVariant {
  layerTree: LayerTreeT;
  archetype: LayoutArchetypeT;
  copy: { hook: string; headline: string; cta: string; kicker?: string };
  lineage: {
    prompt: string; negativePrompt: string; jobKind: string;
    imageryAssetId: string; guardian: GuardianResult;
  };
}

export interface RunBriefResult {
  status: 'succeeded' | 'budget_exceeded';
  normalized: BriefNormalizedT;
  strategy: StrategyT;
  variants: StudioVariant[];
  spendUsd: number;
  agentRuns: AgentRunRecord[];
}

export class BudgetExceededError extends Error {
  constructor(readonly spendUsd: number, readonly capUsd: number) {
    super(`budget_exceeded: $${spendUsd.toFixed(4)} ≥ cap $${capUsd.toFixed(2)}`);
  }
}

export async function runBrief(input: RunBriefInput, deps: RunBriefDeps): Promise<RunBriefResult> {
  const runs: AgentRunRecord[] = [];
  const cap = deps.budget?.capUsdPerBrief ?? 25;                 // DDL default (docs/03 §2)
  const perCall = deps.budget?.estimateAgentCallUsd ?? 0.02;     // conservative agent-call estimate
  let spend = 0;

  const record = (r: AgentRunRecord) => { runs.push(r); deps.onAgentRun?.(r); };
  const charge = (agent: string, model: string, usd: number) => {
    spend += usd;
    if (spend >= cap) {
      record({ agent, model, status: 'budget_exceeded', costUsd: usd });
      throw new BudgetExceededError(spend, cap);
    }
  };
  const llmCall = async <T>(agent: AgentName, fn: () => Promise<T>): Promise<T> => {
    charge(agent, 'claude-sonnet-5', perCall);
    try {
      const out = await fn();
      record({ agent, model: 'claude-sonnet-5', status: 'succeeded', costUsd: perCall });
      return out;
    } catch (e) {
      record({ agent, model: 'claude-sonnet-5', status: 'failed', costUsd: perCall, error: String(e) });
      throw e;
    }
  };

  try {
    const count = input.variantCount ?? 4;
    const kit = input.brandKit;

    const normalized = await llmCall('IntakeAgent', () => runIntakeAgent(deps.llm, input.rawInput, kit));
    const strategy = await llmCall('Strategist', () => runStrategist(deps.llm, normalized, kit));
    const copySet = await llmCall('Copywriter', () => runCopywriter(deps.llm, normalized, strategy, kit, count, input.targetLocale));
    const art = await llmCall('ArtDirector', () => runArtDirector(deps.llm, strategy, kit, count, ARCHETYPE_ROTATION));

    const variants: StudioVariant[] = [];
    for (let i = 0; i < count; i++) {
      const copy = copySet.variants[i % copySet.variants.length]!;
      const direction = art.directions[i % art.directions.length]!;
      // composite-don't-bake enforcement at the seam: imagery prompt must not carry the copy
      for (const s of [copy.headline, copy.cta]) {
        if (s && direction.prompt.toLowerCase().includes(s.toLowerCase())) {
          throw new Error(`ArtDirector leaked ad copy into imagery prompt: "${s}" (CANON §2)`);
        }
      }
      const genSpec: GenSpecT = {
        prompt: direction.prompt, negativePrompt: direction.negativePrompt,
        aspect: '1:1', seed: 1000 + i, model: direction.model,
      };
      const imagery = await deps.dispatchImagery(genSpec, direction.jobKind);
      charge('ArtDirector', direction.model ?? 'image', imagery.costUsd ?? 0.04);

      const archetype = ARCHETYPE_ROTATION[i % ARCHETYPE_ROTATION.length]!;   // L10 board diversity
      let layerTree = composeLayerTree({
        copy, imagery: { assetId: imagery.assetId, src: imagery.src }, brandKit: kit, archetype,
        locale: input.targetLocale,
      });
      record({ agent: 'CompositorPlanner', model: 'deterministic', status: 'succeeded', costUsd: 0 });

      // BrandGuardian gate: apply safe auto-fixes, hard-fail on errors (docs/05)
      let guardian = runBrandGuardian(layerTree, kit);
      if (guardian.autoFixes.length > 0) {
        layerTree = applyLayerPatch(layerTree, LayerPatch.parse({
          id: `bg_fix_${i}`, variantId: '00000000-0000-0000-0000-000000000000',
          origin: 'agent', createdBy: 'agent', note: 'BrandGuardian auto-fixes', ops: guardian.autoFixes,
        }));
        guardian = runBrandGuardian(layerTree, kit);
      }
      record({ agent: 'BrandGuardian', model: 'mechanical', status: guardian.pass ? 'succeeded' : 'failed', costUsd: 0 });
      if (!guardian.pass) {
        throw new Error(`BrandGuardian hard violations: ${guardian.violations.filter((v) => v.severity === 'error').map((v) => v.detail).join('; ')}`);
      }

      // TODO(P6 seam): Critic + EngagementAnalyst scores → bounded auto-iterate ≤2 (docs/05).
      variants.push({
        layerTree, archetype,
        copy: { hook: copy.hook, headline: copy.headline, cta: copy.cta, kicker: copy.kicker },
        lineage: { prompt: direction.prompt, negativePrompt: direction.negativePrompt,
          jobKind: direction.jobKind, imageryAssetId: imagery.assetId, guardian },
      });
    }

    return { status: 'succeeded', normalized, strategy, variants, spendUsd: spend, agentRuns: runs };
  } catch (e) {
    if (e instanceof BudgetExceededError) {
      return { status: 'budget_exceeded', normalized: {} as BriefNormalizedT, strategy: {} as StrategyT,
        variants: [], spendUsd: spend, agentRuns: runs };
    }
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// P7 — carousel (LinkedIn document ad). ONE imagery generation shared by every
// slide (cross-slide visual continuity + cost control); the narrative arc comes
// from CarouselArchitect, the per-slide layout from a role→archetype map.
// Slides render at 1080×1080 (document-ad square recommendation, CANON §8).
// ─────────────────────────────────────────────────────────────────────────────

export const DOCUMENT_AD_SIZE = 1080;

const ARCHETYPE_BY_ROLE: Record<SlideRoleT, LayoutArchetypeT> = {
  hook: 'full-bleed-hero-lower-third',
  reframe: 'editorial-kicker-top',
  proof: 'quote-card',
  body: 'split-panel',
  close: 'full-bleed-hero-lower-third',   // close mirrors the hook: full-bleed + dominant CTA
};

/** Uniformly scale a tree (compositor works at 1200²; document ads want 1080²). Pure; re-validated. */
export function scaleTree(tree: LayerTreeT, targetWidth: number): LayerTreeT {
  const f = targetWidth / tree.canvas.width;
  if (f === 1) return tree;
  return LayerTree.parse({
    ...tree,
    canvas: { ...tree.canvas, width: Math.round(tree.canvas.width * f), height: Math.round(tree.canvas.height * f) },
    layers: (tree.layers as Array<Record<string, unknown>>).map((l) => ({
      ...l,
      x: (l.x as number) * f, y: (l.y as number) * f,
      width: (l.width as number) * f, height: (l.height as number) * f,
      ...(typeof l.fontSize === 'number' ? { fontSize: l.fontSize * f } : {}),
    })),
  });
}

export interface StudioSlide {
  position: number;                       // 0-based, matches slide.position (docs/03)
  role: SlideRoleT;
  layerTree: LayerTreeT;
  copy: { hook: string; headline: string; cta: string; kicker?: string };
  guardian: GuardianResult;
}

export interface RunCarouselInput {
  rawInput: string;
  brandKit: BrandKitDataT;
  targetLocale: 'de' | 'en';
  slideCount?: number;                    // default 5
}

export interface RunCarouselResult {
  status: 'succeeded' | 'budget_exceeded';
  normalized: BriefNormalizedT;
  strategy: StrategyT;
  continuityNote: string;
  slides: StudioSlide[];
  lineage: { prompt: string; negativePrompt: string; jobKind: string; imageryAssetId: string };
  spendUsd: number;
  agentRuns: AgentRunRecord[];
}

export async function runCarousel(input: RunCarouselInput, deps: RunBriefDeps): Promise<RunCarouselResult> {
  const runs: AgentRunRecord[] = [];
  const cap = deps.budget?.capUsdPerBrief ?? 25;
  const perCall = deps.budget?.estimateAgentCallUsd ?? 0.02;
  let spend = 0;

  const record = (r: AgentRunRecord) => { runs.push(r); deps.onAgentRun?.(r); };
  const charge = (agent: string, model: string, usd: number) => {
    spend += usd;
    if (spend >= cap) {
      record({ agent, model, status: 'budget_exceeded', costUsd: usd });
      throw new BudgetExceededError(spend, cap);
    }
  };
  const llmCall = async <T>(agent: AgentName, fn: () => Promise<T>): Promise<T> => {
    charge(agent, 'claude-sonnet-5', perCall);
    try {
      const out = await fn();
      record({ agent, model: 'claude-sonnet-5', status: 'succeeded', costUsd: perCall });
      return out;
    } catch (e) {
      record({ agent, model: 'claude-sonnet-5', status: 'failed', costUsd: perCall, error: String(e) });
      throw e;
    }
  };

  try {
    const kit = input.brandKit;
    const slideCount = input.slideCount ?? 5;

    const normalized = await llmCall('IntakeAgent', () => runIntakeAgent(deps.llm, input.rawInput, kit));
    const strategy = await llmCall('Strategist', () => runStrategist(deps.llm, normalized, kit));
    const plan = await llmCall('CarouselArchitect',
      () => runCarouselArchitect(deps.llm, normalized, strategy, kit, slideCount, input.targetLocale));
    if (plan.slides[0]!.role !== 'hook' || plan.slides[plan.slides.length - 1]!.role !== 'close') {
      throw new Error(`CarouselArchitect broke the narrative arc: roles [${plan.slides.map((s) => s.role).join(', ')}] — must open with hook, end with close`);
    }

    // one direction, one generation — the continuity anchor for every slide
    const art = await llmCall('ArtDirector', () => runArtDirector(deps.llm, strategy, kit, 1, ['full-bleed-hero-lower-third']));
    const direction = art.directions[0]!;
    for (const s of plan.slides.flatMap((sl) => [sl.copy.headline, sl.copy.cta])) {
      if (s && direction.prompt.toLowerCase().includes(s.toLowerCase())) {
        throw new Error(`ArtDirector leaked ad copy into imagery prompt: "${s}" (CANON §2)`);
      }
    }
    const imagery = await deps.dispatchImagery(
      { prompt: direction.prompt, negativePrompt: direction.negativePrompt, aspect: '1:1', seed: 7000, model: direction.model },
      direction.jobKind,
    );
    charge('ArtDirector', direction.model ?? 'image', imagery.costUsd ?? 0.04);

    const slides: StudioSlide[] = plan.slides.map((sl, i) => {
      let layerTree = scaleTree(
        composeLayerTree({
          copy: sl.copy, imagery: { assetId: imagery.assetId, src: imagery.src },
          brandKit: kit, archetype: ARCHETYPE_BY_ROLE[sl.role], locale: input.targetLocale,
        }),
        DOCUMENT_AD_SIZE,
      );
      record({ agent: 'CompositorPlanner', model: 'deterministic', status: 'succeeded', costUsd: 0 });

      let guardian = runBrandGuardian(layerTree, kit);
      if (guardian.autoFixes.length > 0) {
        layerTree = applyLayerPatch(layerTree, LayerPatch.parse({
          id: `bg_fix_s${i}`, variantId: '00000000-0000-0000-0000-000000000000',
          origin: 'agent', createdBy: 'agent', note: 'BrandGuardian auto-fixes', ops: guardian.autoFixes,
        }));
        guardian = runBrandGuardian(layerTree, kit);
      }
      record({ agent: 'BrandGuardian', model: 'mechanical', status: guardian.pass ? 'succeeded' : 'failed', costUsd: 0 });
      if (!guardian.pass) {
        throw new Error(`BrandGuardian hard violations on slide ${i} (${sl.role}): ${guardian.violations.filter((v) => v.severity === 'error').map((v) => v.detail).join('; ')}`);
      }
      return { position: i, role: sl.role, layerTree, copy: sl.copy, guardian };
    });

    return {
      status: 'succeeded', normalized, strategy, continuityNote: plan.continuityNote, slides,
      lineage: { prompt: direction.prompt, negativePrompt: direction.negativePrompt,
        jobKind: direction.jobKind, imageryAssetId: imagery.assetId },
      spendUsd: spend, agentRuns: runs,
    };
  } catch (e) {
    if (e instanceof BudgetExceededError) {
      return { status: 'budget_exceeded', normalized: {} as BriefNormalizedT, strategy: {} as StrategyT,
        continuityNote: '', slides: [], lineage: { prompt: '', negativePrompt: '', jobKind: '', imageryAssetId: '' },
        spendUsd: spend, agentRuns: runs };
    }
    throw e;
  }
}
