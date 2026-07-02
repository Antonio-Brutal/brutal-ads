import { z } from 'zod';
import { AdDocumentType, LocaleCode } from './enums';

// docs/03 §8.1 — brief.normalized (IntakeAgent output, R7 ⚑R-A1)
export const BriefNormalized = z.object({
  audience: z.string(),
  vertical: z.string(),                               // 'legal_ai_de' | 'pe' | free string
  offer: z.string(),
  proofPoints: z.array(z.string()).default([]),
  mandatoryLegal: z.array(z.string()).default([]),    // keys into brand_kit.disclaimers
  languages: z.array(LocaleCode).default(['de']),     // subset of brand_kit.localization.locales
  constraints: z.object({
    mustInclude: z.array(z.string()).default([]),
    mustAvoid: z.array(z.string()).default([]),
  }).default({ mustInclude: [], mustAvoid: [] }),
  clarifyingQuestions: z.array(z.string()).default([]),  // ≤1–2, only when a required field is missing
});
export type BriefNormalizedT = z.infer<typeof BriefNormalized>;

// docs/03 §8.2 — brief.strategy (Strategist output, CANON §7)
export const Strategy = z.object({
  angle: z.string(),
  jtbd: z.string(),
  positioning: z.string(),
  keyMessage: z.string(),
  proofToLead: z.string(),
  recommendedType: AdDocumentType,
  recommendedVariantCount: z.number().int().positive(),
});
export type StrategyT = z.infer<typeof Strategy>;
