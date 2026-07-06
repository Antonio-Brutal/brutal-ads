import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EngagementScoresT, LayerTreeT, VideoCompositionT } from '@brutal/shared';
import type { RunBriefResult, RunCarouselResult, StudioVariant } from './studio/orchestrator';

// ─────────────────────────────────────────────────────────────────────────────
// Persistence: Supabase (real schema, RLS-respecting — signs in as the seeded
// workspace member, so policies stay intact) with an in-memory fallback for
// keyless local dev. Serverless-safe: every lambda re-hydrates from the DB.
// Dev-mode note: archetype/copy/guardian ride in engagement.raw until the
// dedicated columns land with P6 scoring (marked TODO(P6)).
// ─────────────────────────────────────────────────────────────────────────────

export interface StoredVariant extends StudioVariant { id: string; briefId: string; engagement?: EngagementScoresT }
export interface StoredBrief {
  id: string; rawInput: string;
  result: Pick<RunBriefResult, 'status' | 'normalized' | 'strategy' | 'spendUsd'>;
}
export interface StoredCarousel {
  id: string;                                     // variant id (carousel variant carries no tree; slides do)
  briefId: string;
  continuityNote: string;
  slides: RunCarouselResult['slides'];
  lineage: RunCarouselResult['lineage'];
}

export interface Store {
  saveBrief(rawInput: string, result: RunBriefResult): Promise<{ brief: StoredBrief; variants: StoredVariant[] }>;
  getBrief(id: string): Promise<StoredBrief | null>;
  getVariant(id: string): Promise<StoredVariant | null>;
  variantsForBrief(briefId: string): Promise<StoredVariant[]>;
  updateVariantTree(id: string, tree: LayerTreeT): Promise<void>;
  updateEngagement(id: string, scores: EngagementScoresT): Promise<void>;
  saveCarousel(rawInput: string, result: RunCarouselResult): Promise<{ brief: StoredBrief; carousel: StoredCarousel }>;
  getCarousel(variantId: string): Promise<StoredCarousel | null>;
  saveLocalizedVariant(sourceVariantId: string, tree: LayerTreeT, locale: 'de' | 'en', copy: StudioVariant['copy']): Promise<StoredVariant>;
  updateVideoComposition(id: string, comp: VideoCompositionT): Promise<void>;
  addResult(variantId: string, metrics: ResultMetrics): Promise<void>;
  resultsForVariant(variantId: string): Promise<ResultMetrics[]>;
}

export interface ResultMetrics {
  impressions: number; clicks: number;
  spendUsd?: number; conversions?: number; source?: string;
}

const WS = '00000000-0000-0000-0000-000000000001';   // Brutal seed workspace (supabase/seed.sql)

// ── in-memory fallback (keyless local dev) ───────────────────────────────────
function memoryStore(): Store {
  const g = globalThis as unknown as {
    __briefs?: Map<string, StoredBrief>; __vars?: Map<string, StoredVariant>; __carousels?: Map<string, StoredCarousel>;
  };
  const briefs = (g.__briefs ??= new Map());
  const vars = (g.__vars ??= new Map());
  const carousels = (g.__carousels ??= new Map());
  return {
    async saveBrief(rawInput, result) {
      const brief: StoredBrief = { id: crypto.randomUUID(), rawInput, result };
      briefs.set(brief.id, brief);
      const variants = result.variants.map((v) => {
        const sv: StoredVariant = { ...v, id: crypto.randomUUID(), briefId: brief.id };
        vars.set(sv.id, sv);
        return sv;
      });
      return { brief, variants };
    },
    async getBrief(id) { return briefs.get(id) ?? null; },
    async getVariant(id) { return vars.get(id) ?? null; },
    async variantsForBrief(briefId) { return [...vars.values()].filter((v) => v.briefId === briefId); },
    async updateVariantTree(id, tree) { const v = vars.get(id); if (v) v.layerTree = tree; },
    async updateEngagement(id, scores) { const v = vars.get(id); if (v) v.engagement = scores; },
    async saveCarousel(rawInput, result) {
      const brief: StoredBrief = { id: crypto.randomUUID(), rawInput,
        result: { status: result.status, normalized: result.normalized, strategy: result.strategy, spendUsd: result.spendUsd } };
      briefs.set(brief.id, brief);
      const carousel: StoredCarousel = { id: crypto.randomUUID(), briefId: brief.id,
        continuityNote: result.continuityNote, slides: result.slides, lineage: result.lineage };
      carousels.set(carousel.id, carousel);
      return { brief, carousel };
    },
    async getCarousel(variantId) { return carousels.get(variantId) ?? null; },
    async saveLocalizedVariant(sourceVariantId, tree, _locale, copy) {
      const src = vars.get(sourceVariantId);
      if (!src) throw new Error('store.saveLocalizedVariant: source variant not found');
      const sv: StoredVariant = { ...src, id: crypto.randomUUID(), layerTree: tree, copy, engagement: undefined };
      vars.set(sv.id, sv);
      return sv;
    },
    async updateVideoComposition(id, comp) {
      const v = vars.get(id) as (StoredVariant & { video?: unknown }) | undefined;
      if (v) v.video = comp;
    },
    async addResult(variantId, metrics) {
      const g2 = globalThis as unknown as { __results?: Map<string, ResultMetrics[]> };
      const all = (g2.__results ??= new Map());
      all.set(variantId, [...(all.get(variantId) ?? []), metrics]);
    },
    async resultsForVariant(variantId) {
      const g2 = globalThis as unknown as { __results?: Map<string, ResultMetrics[]> };
      return g2.__results?.get(variantId) ?? [];
    },
  };
}

// ── Supabase store (real schema: campaign → brief → ad_document → variant) ───
let client: SupabaseClient | null = null;
async function supa(): Promise<SupabaseClient> {
  if (client) return client;
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({
    email: process.env.BRUTAL_RUNTIME_USER_EMAIL ?? 'antonio@brutal.ai',
    password: process.env.BRUTAL_RUNTIME_USER_PASSWORD ?? 'brutal-local-dev',
  });
  if (error) throw new Error(`store: runtime sign-in failed (${error.message}) — check seeded user/creds`);
  client = c;
  return c;
}

/** Find-or-create the "Manual results" experiment arm for a variant (P10 ingest). */
async function ensureArm(db: SupabaseClient, variantId: string): Promise<string> {
  const { data: existing } = await db.from('experiment_arm').select('id').eq('variant_id', variantId).maybeSingle();
  if (existing) return existing.id;
  const { data: v, error: ve } = await db.from('variant').select('brief_id').eq('id', variantId).maybeSingle();
  if (ve || !v) throw new Error(`store.ensureArm: variant not found (${ve?.message ?? variantId})`);
  const { data: exp, error: ee } = await db.from('experiment')
    .insert({ workspace_id: WS, name: `Manual results · ${variantId.slice(0, 8)}`, status: 'running',
      hypothesis: 'manual paste-in of LinkedIn campaign results (docs/10 P10)' })
    .select('id').single();
  if (ee) throw new Error(`store.ensureArm(experiment): ${ee.message}`);
  const { data: arm, error: ae } = await db.from('experiment_arm')
    .insert({ workspace_id: WS, experiment_id: exp.id, variant_id: variantId, label: 'manual' })
    .select('id').single();
  if (ae) throw new Error(`store.ensureArm(arm): ${ae.message}`);
  return arm.id;
}

function rowToVariant(r: Record<string, any>): StoredVariant {
  const meta = (r.engagement?.raw ?? {}) as Record<string, any>;   // TODO(P6): dedicated columns
  return {
    id: r.id, briefId: r.brief_id, layerTree: r.layer_tree,
    engagement: r.engagement?.scores,        // P6 scores ride next to the dev-mode raw stash
    archetype: meta.archetype ?? 'full-bleed-hero-lower-third',
    copy: meta.copy ?? { hook: '', headline: '', cta: '' },
    lineage: meta.lineage ?? { prompt: r.prompt ?? '', negativePrompt: r.negative_prompt ?? '',
      jobKind: 'photoreal_bg', imageryAssetId: '', guardian: { pass: true, violations: [], autoFixes: [] } },
  };
}

function supabaseStore(): Store {
  return {
    async saveBrief(rawInput, result) {
      const db = await supa();
      const { data: campaign, error: ce } = await db.from('campaign')
        .insert({ workspace_id: WS, name: `Web · ${new Date().toISOString().slice(0, 10)}` })
        .select('id').single();
      if (ce) throw new Error(`store.campaign: ${ce.message}`);
      const { data: brief, error: be } = await db.from('brief').insert({
        workspace_id: WS, campaign_id: campaign.id, raw_input: rawInput,
        normalized: result.normalized, strategy: result.strategy, target_locale: 'de',
      }).select('id').single();
      if (be) throw new Error(`store.brief: ${be.message}`);
      const { data: doc, error: de } = await db.from('ad_document').insert({
        workspace_id: WS, brief_id: brief.id, type: 'single_image', title: rawInput.slice(0, 80),
      }).select('id').single();
      if (de) throw new Error(`store.ad_document: ${de.message}`);

      const rows = result.variants.map((v) => ({
        workspace_id: WS, ad_document_id: doc.id, brief_id: brief.id,
        layer_tree: v.layerTree, status: 'ready', locale: 'de', ratio: '1:1',
        brand_kit_version: 1, prompt: v.lineage.prompt, negative_prompt: v.lineage.negativePrompt,
        created_by_kind: 'agent', created_by_agent: 'CompositorPlanner',
        engagement: { raw: { archetype: v.archetype, copy: v.copy, lineage: v.lineage } },
      }));
      const { data: inserted, error: ve } = await db.from('variant').insert(rows).select('id');
      if (ve) throw new Error(`store.variant: ${ve.message}`);

      return {
        brief: { id: brief.id, rawInput, result },
        variants: result.variants.map((v, i) => ({ ...v, id: inserted![i]!.id, briefId: brief.id })),
      };
    },
    async getBrief(id) {
      const db = await supa();
      const { data } = await db.from('brief').select('id, raw_input, normalized, strategy').eq('id', id).maybeSingle();
      return data ? { id: data.id, rawInput: data.raw_input,
        result: { status: 'succeeded', normalized: data.normalized, strategy: data.strategy, spendUsd: 0 } } : null;
    },
    async getVariant(id) {
      const db = await supa();
      // don't swallow transient errors into a lying "variant not found": surface
      // the real failure, and absorb one-off hiccups with a single retry
      let { data, error } = await db.from('variant').select('*').eq('id', id).maybeSingle();
      if (error || !data) {
        await new Promise((r) => setTimeout(r, 400));
        ({ data, error } = await db.from('variant').select('*').eq('id', id).maybeSingle());
      }
      if (error) throw new Error(`store.getVariant: ${error.message}`);
      return data ? rowToVariant(data) : null;
    },
    async variantsForBrief(briefId) {
      const db = await supa();
      const { data } = await db.from('variant').select('*').eq('brief_id', briefId).order('created_at');
      return (data ?? []).map(rowToVariant);
    },
    async updateVariantTree(id, tree) {
      const db = await supa();
      const { error } = await db.from('variant').update({ layer_tree: tree }).eq('id', id);
      if (error) throw new Error(`store.updateVariantTree: ${error.message}`);
    },
    async updateEngagement(id, scores) {
      const db = await supa();
      // merge under .scores so the dev-mode raw stash (archetype/copy/lineage) survives
      const { data, error: re } = await db.from('variant').select('engagement').eq('id', id).maybeSingle();
      if (re) throw new Error(`store.updateEngagement(read): ${re.message}`);
      const engagement = { ...(data?.engagement ?? {}), scores };
      const { error } = await db.from('variant').update({ engagement }).eq('id', id);
      if (error) throw new Error(`store.updateEngagement: ${error.message}`);
    },
    async saveCarousel(rawInput, result) {
      const db = await supa();
      const { data: campaign, error: ce } = await db.from('campaign')
        .insert({ workspace_id: WS, name: `Carousel · ${new Date().toISOString().slice(0, 10)}` })
        .select('id').single();
      if (ce) throw new Error(`store.campaign: ${ce.message}`);
      const { data: brief, error: be } = await db.from('brief').insert({
        workspace_id: WS, campaign_id: campaign.id, raw_input: rawInput,
        normalized: result.normalized, strategy: result.strategy, target_locale: 'de',
      }).select('id').single();
      if (be) throw new Error(`store.brief: ${be.message}`);
      const { data: doc, error: de } = await db.from('ad_document').insert({
        workspace_id: WS, brief_id: brief.id, type: 'carousel', title: rawInput.slice(0, 80),
      }).select('id').single();
      if (de) throw new Error(`store.ad_document: ${de.message}`);
      // carousel variant carries NO tree (docs/03: slides carry their own trees)
      const { data: variant, error: ve } = await db.from('variant').insert({
        workspace_id: WS, ad_document_id: doc.id, brief_id: brief.id,
        layer_tree: null, status: 'ready', locale: 'de', ratio: '1:1', brand_kit_version: 1,
        prompt: result.lineage.prompt, negative_prompt: result.lineage.negativePrompt,
        created_by_kind: 'agent', created_by_agent: 'CarouselArchitect',
        engagement: { raw: { carousel: true, continuityNote: result.continuityNote, lineage: result.lineage } },
      }).select('id').single();
      if (ve) throw new Error(`store.variant: ${ve.message}`);
      const { error: se } = await db.from('slide').insert(result.slides.map((s) => ({
        workspace_id: WS, variant_id: variant.id, position: s.position, role: s.role, layer_tree: s.layerTree,
      })));
      if (se) throw new Error(`store.slide: ${se.message}`);
      return {
        brief: { id: brief.id, rawInput,
          result: { status: result.status, normalized: result.normalized, strategy: result.strategy, spendUsd: result.spendUsd } },
        carousel: { id: variant.id, briefId: brief.id, continuityNote: result.continuityNote,
          slides: result.slides, lineage: result.lineage },
      };
    },
    async saveLocalizedVariant(sourceVariantId, tree, locale, copy) {
      const db = await supa();
      const { data: src, error: re } = await db.from('variant').select('*').eq('id', sourceVariantId).maybeSingle();
      if (re || !src) throw new Error(`store.saveLocalizedVariant: source not found (${re?.message ?? sourceVariantId})`);
      const meta = (src.engagement?.raw ?? {}) as Record<string, any>;
      const { data: inserted, error: ve } = await db.from('variant').insert({
        workspace_id: src.workspace_id, ad_document_id: src.ad_document_id, brief_id: src.brief_id,
        layer_tree: tree, status: 'ready', locale, ratio: src.ratio, brand_kit_version: src.brand_kit_version,
        prompt: src.prompt, negative_prompt: src.negative_prompt,
        created_by_kind: 'agent', created_by_agent: 'LocalizationAgent',
        engagement: { raw: { ...meta, copy, localizedFrom: sourceVariantId } },
      }).select('id').single();
      if (ve) throw new Error(`store.saveLocalizedVariant: ${ve.message}`);
      const row = { ...src, id: inserted.id, layer_tree: tree, engagement: { raw: { ...meta, copy } } };
      return rowToVariant(row);
    },
    async updateVideoComposition(id, comp) {
      const db = await supa();
      const { error } = await db.from('variant').update({ video_composition: comp }).eq('id', id);
      if (error) throw new Error(`store.updateVideoComposition: ${error.message}`);
    },
    // P10 — results land in the REAL experiment→arm→result chain (docs/03 §10):
    // one auto-created "Manual results" experiment+arm per variant on first ingest.
    async addResult(variantId, metrics) {
      const db = await supa();
      const arm = await ensureArm(db, variantId);
      const ctr = metrics.impressions > 0 ? metrics.clicks / metrics.impressions : null;
      const { error } = await db.from('result').insert({
        workspace_id: WS, experiment_arm_id: arm, impressions: metrics.impressions, clicks: metrics.clicks,
        ctr, spend_usd: metrics.spendUsd, conversions: metrics.conversions,
        cpc_usd: metrics.spendUsd && metrics.clicks ? metrics.spendUsd / metrics.clicks : null,
        source: metrics.source ?? 'manual',
      });
      if (error) throw new Error(`store.addResult: ${error.message}`);
    },
    async resultsForVariant(variantId) {
      const db = await supa();
      const { data: arms } = await db.from('experiment_arm').select('id').eq('variant_id', variantId);
      if (!arms?.length) return [];
      const { data } = await db.from('result')
        .select('impressions, clicks, spend_usd, conversions, source')
        .in('experiment_arm_id', arms.map((a) => a.id));
      return (data ?? []).map((r) => ({
        impressions: Number(r.impressions), clicks: Number(r.clicks),
        spendUsd: r.spend_usd ? Number(r.spend_usd) : undefined,
        conversions: r.conversions ? Number(r.conversions) : undefined, source: r.source,
      }));
    },
    async getCarousel(variantId) {
      const db = await supa();
      const { data: v } = await db.from('variant').select('id, brief_id, engagement').eq('id', variantId).maybeSingle();
      if (!v || !v.engagement?.raw?.carousel) return null;
      const { data: slides, error: se } = await db.from('slide')
        .select('position, role, layer_tree').eq('variant_id', variantId).order('position');
      if (se) throw new Error(`store.getCarousel: ${se.message}`);
      return {
        id: v.id, briefId: v.brief_id,
        continuityNote: v.engagement.raw.continuityNote ?? '',
        lineage: v.engagement.raw.lineage ?? { prompt: '', negativePrompt: '', jobKind: '', imageryAssetId: '' },
        slides: (slides ?? []).map((s) => ({
          position: s.position, role: s.role, layerTree: s.layer_tree,
          copy: { hook: '', headline: '', cta: '' },              // copy lives in the tree; not re-read here
          guardian: { pass: true, violations: [], autoFixes: [] },
        })),
      };
    },
  };
}

export function getStore(): Store {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? supabaseStore()
    : memoryStore();
}
