import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EngagementScoresT, LayerTreeT } from '@brutal/shared';
import type { RunBriefResult, StudioVariant } from './studio/orchestrator';

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

export interface Store {
  saveBrief(rawInput: string, result: RunBriefResult): Promise<{ brief: StoredBrief; variants: StoredVariant[] }>;
  getBrief(id: string): Promise<StoredBrief | null>;
  getVariant(id: string): Promise<StoredVariant | null>;
  variantsForBrief(briefId: string): Promise<StoredVariant[]>;
  updateVariantTree(id: string, tree: LayerTreeT): Promise<void>;
  updateEngagement(id: string, scores: EngagementScoresT): Promise<void>;
}

const WS = '00000000-0000-0000-0000-000000000001';   // Brutal seed workspace (supabase/seed.sql)

// ── in-memory fallback (keyless local dev) ───────────────────────────────────
function memoryStore(): Store {
  const g = globalThis as unknown as { __briefs?: Map<string, StoredBrief>; __vars?: Map<string, StoredVariant> };
  const briefs = (g.__briefs ??= new Map());
  const vars = (g.__vars ??= new Map());
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
      const { data } = await db.from('variant').select('*').eq('id', id).maybeSingle();
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
  };
}

export function getStore(): Store {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? supabaseStore()
    : memoryStore();
}
