import type { BrandKitDataT, LayerTreeT, LlmProvider } from '@brutal/shared';
import { VisualCritique, type VisualCritiqueT } from '../schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Design v3 — the Critic (CANON §7 roster name) finally gets EYES. v1/v2
// composed blind and shipped whatever came out; every "looks crap" failure the
// user saw (kicker over lamp glow, headline on a lit window, dead voids) is
// only visible in PIXELS. The orchestrator renders a preview JPEG and this
// agent judges it like an art director, returning bounded fix ops.
// Ops are whitelisted (resize/setFont/setFill/setVisible) — the Critic tunes
// the composition; it never rewrites copy, swaps imagery, or deletes legal.
// ─────────────────────────────────────────────────────────────────────────────

const treeSummary = (tree: LayerTreeT) =>
  JSON.stringify((tree.layers as Array<Record<string, unknown>>).map((l) => ({
    id: l.id, type: l.type,
    x: l.x, y: l.y, w: l.width, h: l.height,
    ...(typeof l.fontSize === 'number' ? { fontSize: l.fontSize } : {}),
    ...(typeof l.text === 'string' ? { text: (l.text as string).slice(0, 48) } : {}),
  })));

export async function runVisualCritic(
  llm: LlmProvider, previewJpegB64: string, tree: LayerTreeT, kit: BrandKitDataT,
): Promise<VisualCritiqueT> {
  return llm.structured(VisualCritique,
    `You are a senior art director reviewing a rendered 1200×1200 LinkedIn feed ad (image attached). ` +
    `Judge it as a paying brand would:\n` +
    `1. LEGIBILITY — every word must sit on a quiet, high-contrast area. Text over busy or bright image ` +
    `regions is an automatic fail.\n` +
    `2. HIERARCHY — one dominant element (the headline). Eyebrow/kicker quiet, CTA visible but calm.\n` +
    `3. BALANCE — no dead voids, no crowding, margins respected, nothing clipped at canvas edges.\n` +
    `4. CRAFT — does it look like a designed poster or like a template? Banding, misaligned baselines, ` +
    `orphan words on their own line, elements colliding.\n\n` +
    `Score 0–10 (8 = client-ready). Be harsh; 5 means "obviously templated". If score < 8, return fix ops ` +
    `(resize / setFont / setFill / setVisible ONLY) that would raise it. Move or shrink text into quiet zones, ` +
    `never enlarge past the canvas. Fill colors must come from: ${kit.palette.allowed.join(', ')}. ` +
    `NEVER touch ly_bg, ly_legal, or text content. Layer geometry for reference (canvas 1200×1200):\n` +
    `${treeSummary(tree)}\n\n` +
    `OUTPUT JSON keys (exact): {"score": number(0-10), "issues": string[], "ops": [{"op": "resize", "layerId": string, "x"?: number, "y"?: number, "width"?: number, "height"?: number} | {"op": "setFont", "layerId": string, "fontSize"?: number, "fontWeight"?: number, "lineHeight"?: number, "letterSpacing"?: number} | {"op": "setFill", "layerId": string, "fill": "#hex"} | {"op": "setVisible", "layerId": string, "visible": boolean}]}`,
    { agent: 'Critic', images: [previewJpegB64] });
}
