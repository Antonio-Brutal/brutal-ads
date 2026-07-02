import { z } from 'zod';
import { AdRatio, LocaleCode } from './enums';

// docs/03 §12.1a — BrandKitData (L7: the ONE superset shape, back-ported from docs/09).
// Two mechanical fixes vs the doc's illustrative zod (flagged per §14.7 zod-API VERIFY):
// the doc's `.and(LocalizedText)` intersections would reject their own §7.1 sample (a record
// of strings cannot also hold booleans), so localized free-keys use `.catchall(z.string())`
// on objects instead. Identical accepted shape.

const LocalizedText = z.record(z.string(), z.string());   // { de: '…', en: '…' }

export const BrandKitData = z.object({
  palette: z.object({
    background: z.string(), surface: z.string(), text: z.string(), muted: z.string(),
    accents: z.record(z.string(), z.string()),
    allowed: z.array(z.string()),                          // BrandGuardian whitelist
    sets: z.record(z.string(), z.array(z.string())).optional(),
  }),
  typography: z.object({
    display: z.object({ family: z.string(), weights: z.array(z.number()), source: z.string() }),
    body:    z.object({ family: z.string(), weights: z.array(z.number()), source: z.string() }),
    scale:   z.record(z.string(), z.number()),
  }),
  logos: z.array(z.object({
    id: z.string(), lockup: z.enum(['wordmark','symbol','combined']),
    assetId: z.string().nullable(), minWidthPx: z.number().positive(),
  })),
  iconography: z.object({                                  // L7 (docs/09)
    style: z.enum(['line','solid','duotone']).default('line'),
    strokeWidthPx: z.number().optional(),
    cornerStyle: z.enum(['sharp','rounded']).optional(),
    assetIds: z.array(z.string()).default([]),
    avoid: z.array(z.string()).default([]),
  }).optional(),
  voice: z.object({
    register: z.string(), person: z.string(),
    bannedTerms: z.array(z.string()),
    preferSpecificityOverCleverness: z.boolean().default(true),
  }),
  messaging: z.object({                                    // L7 (docs/09)
    approvedClaims: z.array(
      z.object({
        id: z.string(),
        requiresProof: z.boolean().default(false),
        proofPointId: z.string().optional(),
      }).catchall(z.string())                              // per-locale claim text: { de, en, … }
    ).default([]),
    taglines: z.record(z.string(), z.array(z.string())).optional(),
  }).optional(),
  proofPoints: z.array(z.object({                          // L7 (docs/09) — per-locale, TTS-safe `spoken`
    id: z.string(), value: z.union([z.string(), z.number()]),
    display: LocalizedText.optional(),
    spoken: LocalizedText.optional(),                      // TTS-safe number spelling (R2 §4.4)
    claim: LocalizedText.optional(),
    sourceUrl: z.string().nullable().optional(),
    verifiedAt: z.string().nullable().optional(),
  })).default([]),
  disclaimers: z.record(z.string(), z.object({
    de: z.string(), en: z.string(), required: z.boolean().default(false),
  })),
  requiredDisclaimers: z.array(z.string()).default([]),    // L7 (docs/09) — keys into `disclaimers`
  disclosures: z.object({                                  // L7 (docs/09) + CANON L10
    aiContent: z.object({
      required: z.boolean().default(false),
      errorVerticals: z.array(z.string()).default([]),     // verticals where the warn escalates to error
    }).catchall(z.string()).optional(),                    // per-locale disclosure text: { de, en, … }
  }).optional(),
  localization: z.object({
    locales: z.array(LocaleCode), default: LocaleCode,
    transcreate: z.boolean().default(true),
    ttsNumberSpelling: z.boolean().default(true),
  }),
  imagery: z.object({
    mood: z.string(), negativePromptDefaults: z.string(),
    aspectDefaults: z.record(z.string(), AdRatio),
    style: z.object({ avoid: z.array(z.string()).default([]) }).optional(),  // L10: wired into negative prompt
  }),
  safeZoneDefaults: z.object({
    profileOverlap: z.object({ top: z.number(), left: z.number() }),
    seeMoreFold: z.number(),
  }).optional(),
  governance: z.object({                                   // L7 (docs/09) — governance metadata
    owner: z.string().optional(),
    approvedBy: z.string().nullable().optional(),
    approvedAt: z.string().nullable().optional(),
    sourceDoc: z.string().optional(),
    immutablePerVersion: z.boolean().default(true),
  }).optional(),
});
export type BrandKitDataT = z.infer<typeof BrandKitData>;
