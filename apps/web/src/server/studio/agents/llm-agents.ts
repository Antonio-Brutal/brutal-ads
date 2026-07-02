import {
  BriefNormalized, LayerPatch, Strategy,
  type BrandKitDataT, type BriefNormalizedT, type LayerPatchT, type LayerTreeT, type LlmProvider, type StrategyT,
} from '@brutal/shared';
import { ArtDirection, CopySet, LocalizedCopy, type ArtDirectionT, type CopySetT, type LocalizedCopyT } from '../schemas';

// ─────────────────────────────────────────────────────────────────────────────
// docs/05 — the LLM-backed roster agents. System prompts encode the docs/07 §0
// load-bearing rules: one idea per ad; identity-first hooks; specificity over
// cleverness; imagery-only prompts (never ad copy in pixels); ≤70-char headlines;
// sober documentary voice, never hype (BrandKit.voice).
// ─────────────────────────────────────────────────────────────────────────────

const VOICE = (kit: BrandKitDataT) =>
  `Brand voice: ${kit.voice.register}. Banned terms (never use): ${kit.voice.bannedTerms.join(', ')}. ` +
  `Prefer specificity over cleverness. One idea per ad.`;

export async function runIntakeAgent(llm: LlmProvider, rawInput: string, kit: BrandKitDataT): Promise<BriefNormalizedT> {
  return llm.structured(BriefNormalized,
    `Normalize this one-line ad brief into the structured shape. Extract audience (identity-first, specific), ` +
    `vertical, offer, proofPoints (only ones stated or in the brand kit), mandatoryLegal (keys: ${Object.keys(kit.disclaimers).join(', ')}), ` +
    `languages (subset of ${kit.localization.locales.join(',')}). Ask at most 1-2 clarifyingQuestions ONLY if a required field is missing.\n\nBRIEF: ${rawInput}\n\nOUTPUT JSON keys (exact): {"audience": string, "vertical": string, "offer": string, "proofPoints": string[], "mandatoryLegal": string[], "languages": ("de"|"en")[], "constraints": {"mustInclude": string[], "mustAvoid": string[]}, "clarifyingQuestions": string[]}`,
    { agent: 'IntakeAgent', system: VOICE(kit) });
}

export async function runStrategist(llm: LlmProvider, brief: BriefNormalizedT, kit: BrandKitDataT): Promise<StrategyT> {
  return llm.structured(Strategy,
    `Produce the ad strategy for this normalized brief. The angle must create tension/specificity, not hype. ` +
    `keyMessage names the exact benefit; proofToLead picks the strongest proof point.\n\n${JSON.stringify(brief)}\n\nOUTPUT JSON keys (exact): {"angle": string, "jtbd": string, "positioning": string, "keyMessage": string, "proofToLead": string, "recommendedType": "single_image"|"carousel"|"video", "recommendedVariantCount": number}`,
    { agent: 'Strategist', system: VOICE(kit) });
}

export async function runCopywriter(
  llm: LlmProvider, brief: BriefNormalizedT, strategy: StrategyT, kit: BrandKitDataT, count: number, locale: string,
): Promise<CopySetT> {
  return llm.structured(CopySet,
    `Write ${count} distinct ad copy variants in ${locale}. RULES: hook ≤150 chars, identity-first (name the ` +
    `audience in the first line); headline ≤70 chars, one promise; cta verb-first ≤30 chars; kicker = proof line. ` +
    `Each variant = a DIFFERENT angle (pain, proof, contrarian, outcome...).\n\nSTRATEGY: ${JSON.stringify(strategy)}\nBRIEF: ${JSON.stringify(brief)}\n\nOUTPUT JSON keys (exact): {"variants": [{"hook": string(≤150), "headline": string(≤70), "cta": string(≤30), "kicker": string(≤80, optional)}]}`,
    { agent: 'Copywriter', system: VOICE(kit) });
}

export async function runArtDirector(
  llm: LlmProvider, strategy: StrategyT, kit: BrandKitDataT, count: number,
): Promise<ArtDirectionT> {
  return llm.structured(ArtDirection,
    `Direct ${count} background imagery concepts for this strategy. CRITICAL: prompts describe IMAGERY ONLY — ` +
    `photography/illustration of scenes, subjects, light, mood. NEVER any words, text, typography, logos or UI ` +
    `in the image (all text is composited later as vector layers). Brand imagery mood: ${kit.imagery.mood}. ` +
    `Every negativePrompt MUST include: ${kit.imagery.negativePromptDefaults}` +
    `${kit.imagery.style?.avoid?.length ? ` and avoid styles: ${kit.imagery.style.avoid.join(', ')}` : ''}.\n\nSTRATEGY: ${JSON.stringify(strategy)}\n\nOUTPUT JSON keys (exact): {"directions": [{"prompt": string, "negativePrompt": string, "jobKind": "photoreal_bg"|"design_bg"|"brand_edit"}]}`,
    { agent: 'ArtDirector', system: VOICE(kit) });
}

export async function runEditorAgent(
  llm: LlmProvider, instruction: string, tree: LayerTreeT, variantId: string, kit: BrandKitDataT,
): Promise<LayerPatchT> {
  return llm.structured(LayerPatch,
    `Convert this edit instruction into a LayerPatch (typed ops, NEVER a re-roll). Target ONLY existing layer ids. ` +
    `Envelope: id (short unique), variantId "${variantId}", origin "chat", createdBy "agent". ` +
    `Palette whitelist for any fill: ${kit.palette.allowed.join(', ')}. Fonts: ${kit.typography.display.family}, ${kit.typography.body.family}.\n\n` +
    `INSTRUCTION: ${instruction}\n\nCURRENT TREE (ids + types + text):\n${JSON.stringify(
      (tree.layers as Array<Record<string, unknown>>).map((l) => ({ id: l.id, type: l.type, text: l.text ?? null })))}\n\nOUTPUT JSON keys (exact): {"id": string, "variantId": string(uuid, as given), "origin": "chat", "createdBy": "agent", "note": string, "ops": [{"op": "setText", "layerId": string, "text": string} | {"op": "setFill", "layerId": string, "fill": "#hex"} | {"op": "setFont", "layerId": string, "fontSize"?: number, "fontFamily"?: string} | {"op": "resize", "layerId": string, "width": number, "height": number, "x"?: number, "y"?: number} | {"op": "setVisible", "layerId": string, "visible": boolean} | {"op": "removeLayer", "layerId": string} | {"op": "reorderZ", "layerId": string, "toIndex": number}]}`,
    { agent: 'EditorAgent', system: VOICE(kit) });
}

export async function runLocalizationAgent(
  llm: LlmProvider, copy: CopySetT, targetLocale: 'de' | 'en', kit: BrandKitDataT,
): Promise<LocalizedCopyT> {
  return llm.structured(LocalizedCopy,
    `Transcreate (NOT literal translation — docs/05: keep tension, cultural idiom, char limits) these ad copy ` +
    `variants into ${targetLocale}. Keep headline ≤70 chars, hook ≤150.\n\n${JSON.stringify(copy)}\n\nOUTPUT JSON keys (exact): {"locale": "de"|"en", "variants": [{"hook": string(≤150), "headline": string(≤70), "cta": string(≤30), "kicker"?: string}]}`,
    { agent: 'LocalizationAgent', system: VOICE(kit) });
}
