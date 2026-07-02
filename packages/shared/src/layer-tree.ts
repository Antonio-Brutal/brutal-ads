import { z } from 'zod';
import { AdRatio } from './enums';

// ─────────────────────────────────────────────────────────────────────────────
// docs/03 §6 + §12.2 — the LAYER TREE (the anti-baked-pixel spine) and the ONE
// canonical LayerPatch (CANON §12 L6). Everything imports these; never redefine.
// Deviation from the doc's illustrative zod (flagged per §14.7 zod-API VERIFY):
// zod v3's discriminatedUnion requires plain ZodObject options, so GroupLayer
// carries its recursion inside `children: z.array(z.lazy(...))` instead of being
// wrapped in z.lazy itself. Same validated shape, working construction.
// ─────────────────────────────────────────────────────────────────────────────

export const RenderHints = z.object({
  safeZone: z.boolean().default(true),
  maxLines: z.number().int().positive().optional(),
  autoFit: z.boolean().default(true),
  minFontPx: z.number().positive().optional(),
  anchor: z.enum(['top-left','top-center','top-right','center','bottom-left','bottom-center','bottom-right'])
    .default('top-left'),
  pinTo: z.enum(['canvas','parentGroup']).default('canvas'),
});

const LayerBase = z.object({
  id: z.string(),
  name: z.string().default(''),
  x: z.number(), y: z.number(), width: z.number(), height: z.number(),
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  zLocked: z.boolean().default(false),
  renderHints: RenderHints.optional(),
  custom: z.record(z.string(), z.unknown()).default({}),
});

export const ImageLayer = LayerBase.extend({ type: z.literal('image'),
  assetId: z.string().nullable(), src: z.string().optional(), fit: z.enum(['cover','contain','fill']).default('cover'),
  flipX: z.boolean().default(false), flipY: z.boolean().default(false),
  crop: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }).optional(),
  filters: z.object({ brightness: z.number(), contrast: z.number(), grayscale: z.number() }).partial().optional() });

export const TextLayer = LayerBase.extend({ type: z.literal('text'),
  text: z.string(), fontFamily: z.string(), fontSize: z.number().positive(),
  fontWeight: z.number().default(400), fontStyle: z.enum(['normal','italic']).default('normal'),
  lineHeight: z.number().default(1.1), letterSpacing: z.number().default(0),
  align: z.enum(['left','center','right','justify']).default('left'),
  verticalAlign: z.enum(['top','middle','bottom']).default('top'),
  color: z.string(), textTransform: z.enum(['none','uppercase','lowercase','capitalize']).default('none'),
  backgroundColor: z.string().nullable().default(null) });

export const LogoLayer = LayerBase.extend({ type: z.literal('logo'),
  assetId: z.string().nullable(), lockup: z.enum(['wordmark','symbol','combined']).default('wordmark'),
  src: z.string().optional(), tint: z.string().nullable().default(null) });

export const ShapeLayer = LayerBase.extend({ type: z.literal('shape'),
  shape: z.enum(['rect','ellipse','line','polygon']), fill: z.string().nullable(),
  stroke: z.string().nullable().default(null), strokeWidth: z.number().default(0),
  cornerRadius: z.number().default(0), points: z.array(z.number()).nullable().default(null) });

export const CtaLayer = LayerBase.extend({ type: z.literal('cta'),
  text: z.string(), style: z.enum(['solid','outline','ghost']).default('solid'),
  fill: z.string(), textColor: z.string(), cornerRadius: z.number().default(8),
  paddingX: z.number().default(28), paddingY: z.number().default(16),
  fontFamily: z.string(), fontSize: z.number(), fontWeight: z.number().default(600),
  icon: z.string().nullable().default(null), href: z.string().nullable().default(null) });

export const FrameLayer = LayerBase.extend({ type: z.literal('frame'),
  frameStyle: z.enum(['border','mask','device']).default('border'), fill: z.string().nullable().default(null),
  stroke: z.string().nullable(), strokeWidth: z.number().default(0), cornerRadius: z.number().default(0),
  clipsChildren: z.boolean().default(false) });

export const LegalLayer = LayerBase.extend({ type: z.literal('legal'),
  text: z.string(), fontFamily: z.string(), fontSize: z.number(), color: z.string(),
  align: z.enum(['left','center','right']).default('left'),
  requiredBy: z.string(),                 // key into brand_kit.disclaimers (BrandGuardian verifies)
  removable: z.boolean().default(false) });

export const SmartLayer = LayerBase.extend({ type: z.literal('smart'),
  render: z.enum(['text','image']).default('text'),
  binding: z.string(), template: z.string(), fallback: z.string().optional(),
  ttsTemplate: z.string().optional(),     // TTS-safe form (R2 §4.4)
  fontFamily: z.string().optional(), fontSize: z.number().optional(), color: z.string().optional(),
  assetId: z.string().nullable().optional() });

export const GroupLayer = LayerBase.extend({ type: z.literal('group'),
  children: z.array(z.lazy((): z.ZodTypeAny => Layer)).default([]),
  clip: z.boolean().default(false) });

export const Layer: z.ZodTypeAny = z.discriminatedUnion('type', [
  ImageLayer, TextLayer, LogoLayer, ShapeLayer, CtaLayer, FrameLayer, LegalLayer, SmartLayer, GroupLayer,
]);

export const SmartDataEntry = z.object({
  value: z.union([z.string(), z.number()]),
  display: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  spoken: z.record(z.string(), z.string()).optional(),   // per-locale TTS-safe (R2 §4.4)
});

export const LayerTree = z.object({
  schemaVersion: z.literal(1),
  ratio: AdRatio,
  canvas: z.object({ width: z.number(), height: z.number(), unit: z.literal('px').default('px'),
    background: z.string() }),
  safeZones: z.object({
    feedCrop: z.object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() }),
    profileOverlap: z.object({ top: z.number(), left: z.number() }),
    seeMoreFold: z.number(),
  }).partial(),
  layers: z.array(Layer),
  smartData: z.record(z.string(), SmartDataEntry).optional(),
});

// ── LayerPatch — the chat-to-edit diff (CANON §12 L6: the ONE reconciled schema) ──
export const LayerPatchOp = z.discriminatedUnion('op', [
  z.object({ op: z.literal('setText'),      layerId: z.string(), text: z.string() }),
  z.object({ op: z.literal('resize'),       layerId: z.string(), x: z.number().optional(), y: z.number().optional(),
    width: z.number().positive(), height: z.number().positive() }),
  z.object({ op: z.literal('rotate'),       layerId: z.string(), rotation: z.number() }),
  z.object({ op: z.literal('reorderZ'),     layerId: z.string(), toIndex: z.number().int() }),
  z.object({ op: z.literal('setFont'),      layerId: z.string(), fontFamily: z.string().optional(),
    fontSize: z.number().positive().optional(), fontWeight: z.number().optional(),
    fontStyle: z.enum(['normal','italic']).optional() }),
  z.object({ op: z.literal('setFill'),      layerId: z.string(), fill: z.string() }),
  z.object({ op: z.literal('addLayer'),     afterLayerId: z.string().nullable(), layer: Layer }),
  z.object({ op: z.literal('removeLayer'),  layerId: z.string() }),
  z.object({ op: z.literal('replaceAsset'), layerId: z.string(), assetId: z.string() }),
  z.object({ op: z.literal('setBinding'),   layerId: z.string(), binding: z.string(),
    template: z.string().optional(), fallback: z.string().optional() }),
  z.object({ op: z.literal('setSlideOrder'),order: z.array(z.string()) }),
  z.object({ op: z.literal('setVisible'),   layerId: z.string(), visible: z.boolean() }),
]);

// L6 envelope: { id, variantId, slideId?, origin, createdBy, note?, ops }
export const LayerPatch = z.object({
  id: z.string(),
  variantId: z.string().uuid(),
  slideId: z.string().uuid().optional(),          // set only when the patch targets a carousel slide tree
  origin: z.enum(['chat','canvas','agent','system']),
  createdBy: z.enum(['human','agent','system']),  // actor_kind
  note: z.string().optional(),                    // audit / undo label
  ops: z.array(LayerPatchOp),
});
export const LayerPatchSet = z.array(LayerPatch);  // L6: alias for LayerPatch[]

export type RenderHintsT = z.infer<typeof RenderHints>;
export type LayerT = z.infer<typeof ImageLayer> | z.infer<typeof TextLayer> | z.infer<typeof LogoLayer>
  | z.infer<typeof ShapeLayer> | z.infer<typeof CtaLayer> | z.infer<typeof FrameLayer>
  | z.infer<typeof LegalLayer> | z.infer<typeof SmartLayer>
  | (z.infer<typeof LayerBase> & { type: 'group'; children: unknown[]; clip: boolean });
export type LayerTreeT = z.infer<typeof LayerTree>;
export type LayerPatchOpT = z.infer<typeof LayerPatchOp>;
export type LayerPatchT = z.infer<typeof LayerPatch>;
export type LayerPatchSetT = z.infer<typeof LayerPatchSet>;
