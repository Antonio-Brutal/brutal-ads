import {
  BriefNormalized, LayerPatch, Strategy,
  type BrandKitDataT, type BriefNormalizedT, type LayerPatchT, type LayerTreeT, type LlmProvider, type StrategyT,
} from '@brutal/shared';
import {
  ArtDirection, CarouselPlan, CopySet, LocalizedCopy,
  type ArtDirectionT, type CarouselPlanT, type CopySetT, type LocalizedCopyT,
} from '../schemas';

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
    `audience in the first line); headline ≤70 chars, one promise; cta verb-first ≤30 chars. ` +
    `kicker = a 2-4 word EYEBROW LABEL (≤35 chars, e.g. "Für Wirtschaftskanzleien", "KI-Vertragsanalyse") — ` +
    `it renders as small tracked caps above the headline. NEVER a sentence, NEVER a claim with commas; ` +
    `a DIFFERENT kicker per variant. Each variant = a DIFFERENT angle (pain, proof, contrarian, outcome...).\n\n` +
    `STRATEGY: ${JSON.stringify(strategy)}\nBRIEF: ${JSON.stringify(brief)}\n\nOUTPUT JSON keys (exact): {"variants": [{"hook": string(≤150), "headline": string(≤70), "cta": string(≤30), "kicker": string(≤35, 2-4 words, optional)}]}`,
    { agent: 'Copywriter', system: VOICE(kit) });
}

// Composition brief per layout slot: the image must be DESIGNED for where the
// typography will sit, not decorated around it afterwards.
const SLOT_BRIEFS: Record<string, string> = {
  'full-bleed-hero-lower-third':
    'HERO SHOT. Subject and visual interest in the UPPER two-thirds; the lower third falls away into soft ' +
    'shadow/negative space (typography lands there). Cinematic single light source, strong depth.',
  'split-panel':
    'SUBJECT RIGHT. The subject occupies the RIGHT half of the frame, facing or lit toward the left; the left ' +
    'half stays calm and uncluttered (a panel covers it). Portrait-adjacent framing, shallow depth of field.',
  'editorial-kicker-top':
    'COVER SHOT. One strong central subject, magazine-cover energy. CRITICAL FRAMING: the subject\'s head and ' +
    'shoulders sit fully in the MIDDLE band of the frame (between 40% and 75% of frame height) — the top third is ' +
    'ONLY empty wall/sky (a masthead band covers it; a face there gets decapitated) and the bottom fifth falls dark.',
  'quote-card':
    'VERTICAL DETAIL. A tall, narrow composition — architectural detail, tactile material, or a cropped human ' +
    'moment that reads at a glance in a thin vertical strip. MID-TONE LUMINOSITY with visible detail everywhere — ' +
    'never near-black, never empty shadow; warm light must fill the frame.',
};

export async function runArtDirector(
  llm: LlmProvider, strategy: StrategyT, kit: BrandKitDataT, count: number, archetypes: string[] = [],
): Promise<ArtDirectionT> {
  const slots = Array.from({ length: count }, (_, i) => {
    const arch = archetypes[i % Math.max(1, archetypes.length)];
    return `SLOT ${i + 1}${arch ? ` (layout: ${arch})` : ''}: ${arch && SLOT_BRIEFS[arch] ? SLOT_BRIEFS[arch] : 'strong single subject, generous negative space for typography'}`;
  }).join('\n');
  return llm.structured(ArtDirection,
    `Direct ${count} background imagery concepts for this strategy — one per slot below, IN ORDER.\n\n${slots}\n\n` +
    `CRITICAL RULES:\n` +
    `- Prompts describe IMAGERY ONLY — photography of scenes, subjects, light, mood. NEVER any words, text, ` +
    `typography, logos, screens with UI, or signage (all text is composited later as vector layers).\n` +
    `- NO CLOSE-UPS of printed documents, contracts, books or screens: image models hallucinate gibberish ` +
    `pseudo-text on them and the ad looks broken. Paper may appear only distant, blank, or heavily defocused.\n` +
    `- Each slot must honor its composition brief EXACTLY (where the negative space sits is load-bearing).\n` +
    `- VARIETY IS MANDATORY: across the ${count} concepts use different visual registers — at least one moody ` +
    `low-key scene, one warm daylight scene (paper, wood, window light), one minimal graphic still-life, and one ` +
    `human moment (hands, profile, posture — no direct camera gaze). Same world, different rooms.\n` +
    `- CONTINUITY THREAD: every image carries ONE recurring warm gold light accent (lamp glow, brass, late sun) — ` +
    `it echoes the brand's gold (${kit.palette.accents.gold ?? '#cba65e'}).\n` +
    `- Craft bar: describe lens/light like a photo brief (e.g. "85mm, f2, single tungsten key from left"). ` +
    `Brand imagery mood: ${kit.imagery.mood}.\n` +
    `- Every negativePrompt MUST include: ${kit.imagery.negativePromptDefaults}` +
    `${kit.imagery.style?.avoid?.length ? ` and avoid styles: ${kit.imagery.style.avoid.join(', ')}` : ''}.\n\n` +
    `STRATEGY: ${JSON.stringify(strategy)}\n\nOUTPUT JSON keys (exact): {"directions": [{"prompt": string, "negativePrompt": string, "jobKind": "photoreal_bg"|"design_bg"|"brand_edit"}]}`,
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

export async function runCarouselArchitect(
  llm: LlmProvider, brief: BriefNormalizedT, strategy: StrategyT, kit: BrandKitDataT, slideCount: number, locale: string,
): Promise<CarouselPlanT> {
  return llm.structured(CarouselPlan,
    `Architect a ${slideCount}-slide LinkedIn document ad (carousel) in ${locale} with a hook→reframe→close ` +
    `narrative arc. RULES: slide 1 role MUST be "hook" (identity-first, names the audience, creates tension); ` +
    `the LAST slide role MUST be "close" (resolution + CTA); middle slides reframe the problem, land proof, or ` +
    `carry body detail — ONE idea per slide, each slide must earn the swipe to the next. Copy per slide: ` +
    `headline ≤70 chars, hook line ≤150, cta ≤30 (verb-first; only the close NEEDS a strong cta), kicker = proof ` +
    `line. continuityNote: one sentence on what binds the slides (recurring motif, numbered arc, escalating claim).\n\n` +
    `STRATEGY: ${JSON.stringify(strategy)}\nBRIEF: ${JSON.stringify(brief)}\n\n` +
    `OUTPUT JSON keys (exact): {"slides": [{"role": "hook"|"reframe"|"proof"|"body"|"close", "copy": {"hook": string(≤150), "headline": string(≤70), "cta": string(≤30), "kicker": string(≤80, optional)}}], "continuityNote": string}`,
    { agent: 'CarouselArchitect', system: VOICE(kit) });
}

export async function runLocalizationAgent(
  llm: LlmProvider, copy: CopySetT, targetLocale: 'de' | 'en', kit: BrandKitDataT,
): Promise<LocalizedCopyT> {
  return llm.structured(LocalizedCopy,
    `Transcreate (NOT literal translation — docs/05: keep tension, cultural idiom, char limits) these ad copy ` +
    `variants into ${targetLocale}. Keep headline ≤70 chars, hook ≤150.\n\n${JSON.stringify(copy)}\n\nOUTPUT JSON keys (exact): {"locale": "de"|"en", "variants": [{"hook": string(≤150), "headline": string(≤70), "cta": string(≤30), "kicker"?: string}]}`,
    { agent: 'LocalizationAgent', system: VOICE(kit) });
}
