import { z } from 'zod';
// BrandKit (CANON §1/§10, docs/09 — the superset, back-ported per CANON §12 L7).
// Starter shape; the factory expands to the full docs/09 spec. Versioned; ads pin the version.
const LocalizedText = z.object({ de: z.string().optional(), en: z.string().optional() });
export const BrandKitData = z.object({
    colors: z.object({
        ink: z.string(),
        paper: z.string(),
        accent: z.string(),
        accent2: z.string().optional(),
    }),
    typography: z.object({ display: z.string(), body: z.string() }),
    logos: z.array(z.object({ id: z.string(), variant: z.string(), assetId: z.string() })).default([]),
    iconography: z.object({ style: z.string().optional() }).partial().default({}),
    imagery: z.object({
        style: z.string().optional(),
        avoid: z.array(z.string()).default([]), // fed into negative prompts (CANON §12 L10)
    }).partial().default({}),
    voice: z.string(),
    bannedTerms: z.array(z.string()).default([]),
    messaging: z.object({ approvedClaims: z.array(z.string()).default([]) }).default({ approvedClaims: [] }),
    proofPoints: z.array(z.object({
        label: z.string(),
        spoken: LocalizedText.optional(), // per-locale spoken form for VO
    })).default([]),
    requiredDisclaimers: z.array(z.string()).default([]),
    disclosures: z.object({
        aiContent: z.object({
            required: z.boolean().default(false),
            errorVerticals: z.array(z.string()).default([]), // verticals where AI disclosure is a hard error
        }).default({ required: false, errorVerticals: [] }),
    }).default({ aiContent: { required: false, errorVerticals: [] } }),
    localization: z.object({ locales: z.array(z.enum(['de', 'en'])).default(['en']) }).default({ locales: ['en'] }),
    governance: z.object({ version: z.number().default(1), updatedBy: z.string().optional() }).default({ version: 1 }),
});
