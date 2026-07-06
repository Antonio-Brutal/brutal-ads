import { z } from 'zod';

// Agent-output schemas beyond what @brutal/shared already defines (docs/05 contracts).
// BriefNormalized/Strategy/LayerPatch/LayerTree come from shared — never redefined.

export const CopyVariant = z.object({
  hook: z.string().max(150),                 // intro text before "see more" (docs/07 §2.1)
  headline: z.string().max(70),              // hard LinkedIn limit (CANON §8)
  cta: z.string().max(30),
  kicker: z.string().max(80).optional(),     // small proof/eyebrow line
  rationale: z.string().optional(),
});
export const CopySet = z.object({ variants: z.array(CopyVariant).min(1) });
export type CopySetT = z.infer<typeof CopySet>;

export const ImageryDirection = z.object({
  prompt: z.string(),                        // IMAGERY-ONLY — never contains ad copy (CANON §2)
  negativePrompt: z.string(),
  jobKind: z.enum(['photoreal_bg', 'design_bg', 'brand_edit']).default('photoreal_bg'),
  model: z.string().optional(),
  mood: z.string().optional(),
});
export const ArtDirection = z.object({ directions: z.array(ImageryDirection).min(1) });
export type ArtDirectionT = z.infer<typeof ArtDirection>;

export const LocalizedCopy = z.object({
  locale: z.enum(['de', 'en']),
  variants: z.array(CopyVariant).min(1),
});
export type LocalizedCopyT = z.infer<typeof LocalizedCopy>;

export const LayoutArchetype = z.enum([
  'full-bleed-hero-lower-third',
  'split-panel',
  'editorial-kicker-top',
  'quote-card',
]);   // L10 — the 4th variant-matrix axis; board diversity depends on these not collapsing
export type LayoutArchetypeT = z.infer<typeof LayoutArchetype>;

// Design v3 — the Critic sees the RENDERED variant (vision input) and returns a
// score + bounded layout-fix ops. It never rewrites copy and never touches
// imagery; the op whitelist is enforced again in the orchestrator.
export const CritiqueOp = z.discriminatedUnion('op', [
  z.object({ op: z.literal('resize'), layerId: z.string(), x: z.number().optional(), y: z.number().optional(),
    width: z.number().optional(), height: z.number().optional() }),
  z.object({ op: z.literal('setFont'), layerId: z.string(), fontFamily: z.string().optional(),
    fontSize: z.number().optional(), fontWeight: z.number().optional(), lineHeight: z.number().optional(),
    letterSpacing: z.number().optional() }),
  z.object({ op: z.literal('setFill'), layerId: z.string(), fill: z.string() }),
  z.object({ op: z.literal('setVisible'), layerId: z.string(), visible: z.boolean() }),
]);
export const VisualCritique = z.object({
  score: z.number().min(0).max(10),          // ≥8 ships as-is; <8 applies ops
  issues: z.array(z.string()).default([]),
  ops: z.array(CritiqueOp).default([]),
});
export type VisualCritiqueT = z.infer<typeof VisualCritique>;

// P7 — CarouselArchitect output (docs/05; docs/03 slide.role). Narrative arc:
// slide 1 is ALWAYS the hook, the last slide ALWAYS the close.
export const SlideRole = z.enum(['hook', 'reframe', 'proof', 'body', 'close']);
export type SlideRoleT = z.infer<typeof SlideRole>;

export const SlidePlan = z.object({
  role: SlideRole,
  copy: CopyVariant,
});
export const CarouselPlan = z.object({
  slides: z.array(SlidePlan).min(3).max(10),   // LinkedIn document-ad sweet spot (CANON §8)
  continuityNote: z.string(),                  // what visually/narratively binds the slides
});
export type CarouselPlanT = z.infer<typeof CarouselPlan>;
