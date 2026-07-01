import { z } from 'zod';
import { LayerType } from './enums';
// ─────────────────────────────────────────────────────────────────────────────
// The Ad Document layer tree + the chat-to-edit LayerPatch.
// CANON §5/§7 + docs/03 §6/§12. This file is THE single canonical schema
// (CANON §12 L6): apps/web (EditorAgent, orchestrator) and packages/render import
// LayerPatch/LayerPatchOp from here — they must NOT redefine it.
// NOTE: this is the starter spine; the factory expands it to the full doc/03 shape.
// ─────────────────────────────────────────────────────────────────────────────
export const RenderHints = z.object({
    safeZone: z.enum(['feed', 'profile_overlap', 'see_more_fold', 'none']).default('none'),
    maxLines: z.number().int().default(2),
    autoFit: z.boolean().default(true),
    minFontPx: z.number().default(18),
});
export const Layer = z.object({
    id: z.string(),
    type: LayerType,
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    rotation: z.number().default(0),
    z: z.number().int(),
    // type-specific payloads (optional by type):
    text: z.string().optional(), // text | cta | legal | smart
    assetId: z.string().optional(), // image | logo
    fill: z.string().optional(), // shape | frame — BrandKit palette hex
    fontFamily: z.string().optional(),
    fontSize: z.number().optional(),
    fontWeight: z.number().optional(),
    fontStyle: z.enum(['normal', 'italic']).optional(),
    binding: z.string().optional(), // smart layer token e.g. "{{customer_count}}"
    renderHints: RenderHints.default({}),
});
export const LayerTree = z.object({
    format: z.string(), // base format id, e.g. "1:1"
    canvas: z.object({ w: z.number(), h: z.number(), bg: z.string().optional() }),
    layers: z.array(Layer),
});
// ── LayerPatch — the ONE reconciled chat-to-edit diff (CANON §12 L6). ──────────
export const LayerPatchOp = z.discriminatedUnion('op', [
    z.object({ op: z.literal('setText'), layerId: z.string(), text: z.string() }),
    z.object({ op: z.literal('resize'), layerId: z.string(), x: z.number().optional(), y: z.number().optional(),
        width: z.number().positive(), height: z.number().positive() }),
    z.object({ op: z.literal('rotate'), layerId: z.string(), rotation: z.number() }),
    z.object({ op: z.literal('reorderZ'), layerId: z.string(), toIndex: z.number().int() }),
    z.object({ op: z.literal('setFont'), layerId: z.string(), fontFamily: z.string().optional(),
        fontSize: z.number().positive().optional(), fontWeight: z.number().optional(),
        fontStyle: z.enum(['normal', 'italic']).optional() }),
    z.object({ op: z.literal('setFill'), layerId: z.string(), fill: z.string() }),
    z.object({ op: z.literal('addLayer'), afterLayerId: z.string().nullable(), layer: Layer }),
    z.object({ op: z.literal('removeLayer'), layerId: z.string() }),
    z.object({ op: z.literal('replaceAsset'), layerId: z.string(), assetId: z.string() }),
    z.object({ op: z.literal('setBinding'), layerId: z.string(), binding: z.string(),
        template: z.string().optional(), fallback: z.string().optional() }),
    z.object({ op: z.literal('setSlideOrder'), order: z.array(z.string()) }),
    z.object({ op: z.literal('setVisible'), layerId: z.string(), visible: z.boolean() }),
]);
export const LayerPatch = z.object({
    id: z.string(),
    variantId: z.string().uuid(),
    slideId: z.string().uuid().optional(), // set only for carousel slide trees
    origin: z.enum(['chat', 'canvas', 'agent', 'system']),
    createdBy: z.enum(['human', 'agent', 'system']),
    note: z.string().optional(),
    ops: z.array(LayerPatchOp),
});
export const LayerPatchSet = z.array(LayerPatch);
/**
 * Pure, isomorphic patch application — same fn in the browser (optimistic),
 * server (authoritative), and renderer. TODO(factory): implement per docs/06 §4.
 */
export function applyLayerPatch(_tree, _patch) {
    throw new Error('applyLayerPatch: not implemented — build per docs/06 §4');
}
