import { EngagementScores, type CtrBandT, type EngagementScoresT, type LayerTreeT } from '@brutal/shared';
import { getStore, type ResultMetrics } from './store';

// ─────────────────────────────────────────────────────────────────────────────
// P6 — engagement scoring (docs/08). Same seam pattern as LLM/imagery:
//  · ENGINE_URL set → FastAPI saliency engine (services/engine, POST /v1/score,
//    shared-secret auth). Commercial backend is ALWAYS 'saliency' (CANON §9).
//  · keyless → deterministic layer-geometry heuristics, clearly low-confidence,
//    so the board UX works at $0 without the Python service running.
// Bands + confidence, never bare points (CANON §6).
// ─────────────────────────────────────────────────────────────────────────────

export function engagementMode(): 'engine' | 'stub' {
  return process.env.ENGINE_URL ? 'engine' : 'stub';
}

interface EngineLayerBox { id: string; role: string; x: number; y: number; w: number; h: number }
type AnyLayer = { id: string; visible?: boolean; x: number; y: number; width: number; height: number };

const ROLE_BY_ID: Record<string, string> = {
  ly_headline: 'headline', ly_cta: 'cta', ly_logo: 'logo', ly_legal: 'legal', ly_bg: 'image',
};

// Structural ground (scrims, panels, rules, ornaments) is design furniture, not
// content — it must not count as clutter or attention targets.
const STRUCTURAL = /^ly_(scrim|panel|rule|quotemark)/;

export function layerBoxes(tree: LayerTreeT): EngineLayerBox[] {
  return (tree.layers as AnyLayer[])
    .filter((l) => l.visible !== false && !STRUCTURAL.test(l.id))
    .map((l) => ({ id: l.id, role: ROLE_BY_ID[l.id] ?? 'other', x: l.x, y: l.y, w: l.width, h: l.height }));
}

export async function scoreVariant(variantId: string): Promise<EngagementScoresT> {
  const v = await getStore().getVariant(variantId);
  if (!v) throw new Error('variant not found');

  const scores = engagementMode() === 'engine'
    ? await engineScores(v.layerTree)
    : stubScores(v.layerTree);
  scores.scoredAt = new Date().toISOString();

  // P10 — real results re-fit the predicted band (docs/10: bands TIGHTEN over time)
  const results = await getStore().resultsForVariant(variantId);
  if (results.length && scores.predictedCtrBand) {
    scores.predictedCtrBand = calibrateCtrBand(scores.predictedCtrBand, results);
    scores.raw = { ...((scores.raw as object) ?? {}), calibratedFrom: results.length };
  }

  await getStore().updateEngagement(variantId, scores);
  return scores;
}

/**
 * P10 — precision-weighted re-fit of the predicted CTR band against observed results.
 * The observed CTR pulls the band's center with weight n = min(1, impressions/50k) and
 * SHRINKS its width (docs/10 P10: "predicted bands tighten against real CTR over time").
 * Below 1000 impressions the signal is noise — band unchanged.
 */
export function calibrateCtrBand(band: CtrBandT, results: ResultMetrics[]): CtrBandT {
  const impressions = results.reduce((s, r) => s + r.impressions, 0);
  const clicks = results.reduce((s, r) => s + r.clicks, 0);
  if (impressions < 1000) return band;
  const observed = (100 * clicks) / impressions;            // CTR in %
  const n = Math.min(1, impressions / 50_000);
  const mid = (band.low + band.high) / 2;
  const width = band.high - band.low;
  const newMid = mid + (observed - mid) * n;
  const newWidth = Math.max(0.02, width * (1 - 0.6 * n));
  return {
    low: Number(Math.max(0, newMid - newWidth / 2).toFixed(3)),
    high: Number((newMid + newWidth / 2).toFixed(3)),
    confidence: Number(Math.min(0.95, band.confidence + 0.5 * n).toFixed(3)),
  };
}

async function engineScores(tree: LayerTreeT): Promise<EngagementScoresT> {
  // Render through the P1 spine so the engine scores EXACTLY what exports (CANON L5).
  const { renderDocument } = await import('@brutal/render');
  const { renders } = await renderDocument({ variant: { layerTree: tree, locale: 'de' }, format: 'jpg' });
  const res = await fetch(`${process.env.ENGINE_URL}/v1/score`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-engine-secret': process.env.ENGINE_SHARED_SECRET ?? '' },
    body: JSON.stringify({
      kind: 'render', backend: 'saliency',
      image_b64: renders[0]!.buffer.toString('base64'),
      layers: layerBoxes(tree),
    }),
  });
  if (!res.ok) throw new Error(`engine: HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as Record<string, unknown>;
  // The engine returns a dense attention grid; the canonical shape wants an asset ref —
  // stash anything non-canonical in raw rather than failing the parse.
  const am = body.attentionMap as { assetId?: unknown } | null | undefined;
  if (am && typeof am.assetId !== 'string') {
    body.raw = { ...((body.raw as object) ?? {}), attentionMap: body.attentionMap };
    delete body.attentionMap;
  }
  // pydantic serializes unset Optionals as null; zod .optional() means ABSENT — drop them.
  for (const k of Object.keys(body)) if (body[k] === null) delete body[k];
  return EngagementScores.parse(body);
}

// ── keyless stub: deterministic geometry heuristics ──────────────────────────
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const band = (value: number, spread: number, confidence: number) => ({
  value: Number(value.toFixed(3)),
  band: [Number(clamp01(value - spread).toFixed(3)), Number(clamp01(value + spread).toFixed(3))] as [number, number],
  confidence,
});

export function stubScores(tree: LayerTreeT): EngagementScoresT {
  const { width: W, height: H } = tree.canvas;
  const boxes = layerBoxes(tree);
  const area = (b: EngineLayerBox) => (b.w * b.h) / (W * H);
  const byRole = (role: string) => boxes.find((b) => b.role === role);

  // clutter: how much of the canvas non-image layers cover, plus layer count pressure
  const overlayCoverage = boxes.filter((b) => b.role !== 'image').reduce((s, b) => s + area(b), 0);
  const clutter = clamp01(overlayCoverage * 0.8 + boxes.length / 24);

  // headline (value prop): bigger + upper-two-thirds placement reads better
  const headline = byRole('headline');
  const valueProp = headline
    ? clamp01(Math.sqrt(area(headline)) * 2.2 * (headline.y + headline.h / 2 < H * 0.72 ? 1 : 0.8))
    : 0.1;

  // CTA: presence, legible size, conventional lower-half placement
  const cta = byRole('cta');
  const ctaAttention = cta
    ? clamp01(0.35 + Math.sqrt(area(cta)) * 2 + (cta.y > H * 0.5 ? 0.15 : 0))
    : 0.05;

  const focalClarity = clamp01(1 - clutter * 0.65);
  const stoppingPower = clamp01(focalClarity * 0.45 + valueProp * 0.35 + ctaAttention * 0.2);

  // LinkedIn single-image benchmarks hover ~0.4–0.6% CTR; the stub stays inside that reality.
  return EngagementScores.parse({
    backend: 'saliency', saliencySource: 'stub-geometry', modelVersion: 'stub-0',
    focalClarity: band(focalClarity, 0.15, 0.3),
    valuePropAttention: band(valueProp, 0.15, 0.3),
    ctaAttention: band(ctaAttention, 0.15, 0.3),
    clutter: band(clutter, 0.15, 0.3),
    stoppingPower: band(stoppingPower, 0.2, 0.25),
    predictedCtrBand: {
      low: Number((0.3 + stoppingPower * 0.2).toFixed(3)),
      high: Number((0.45 + stoppingPower * 0.35).toFixed(3)),
      confidence: 0.2,
    },
  });
}
