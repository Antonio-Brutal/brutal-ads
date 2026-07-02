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
