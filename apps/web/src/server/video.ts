import { createHash } from 'node:crypto';
import { RATIO_DIMS, VideoComposition, type AdRatio, type VideoCompositionT } from '@brutal/shared';
import { getStore, type StoredVariant } from './store';

// ─────────────────────────────────────────────────────────────────────────────
// P9 scaffold — deterministic VideoComposer (docs/06 §10, CANON §8).
// Emits the canonical VideoComposition that the Remotion assembly consumes.
// The expensive halves are SEAMS, wired but not spent:
//  · clips carry provider 'kling' + the variant's imagery asset + motion prompt
//    (img2video generation is the fast-follow — docs/10 P9);
//  · audio.vo stays absent until ElevenLabs lands (mutedFirst anyway, CANON §8).
// Muted-first + burned-in-caption cues are REAL and validated here.
// ─────────────────────────────────────────────────────────────────────────────

const FPS = 24;
const BEAT_FRAMES = 72;                                  // 3s per narrative beat

export function composeVideoPlan(v: StoredVariant, locale: 'de' | 'en' = 'de'): VideoCompositionT {
  const tree = v.layerTree;
  const dims = RATIO_DIMS[tree.ratio as AdRatio] ?? { width: 1200, height: 1200 };
  const beats = [
    { key: 'hook', text: v.copy.hook, motion: 'slow push-in, subject holds focus' },
    { key: 'proof', text: v.copy.kicker ?? v.copy.headline, motion: 'lateral drift, shallow depth of field' },
    { key: 'close', text: `${v.copy.headline} — ${v.copy.cta}`, motion: 'settle to stillness on the subject' },
  ];

  const composition = {
    schemaVersion: 1 as const,
    compositionId: `vc_${v.id.slice(0, 8)}`,
    fps: FPS,
    durationInFrames: BEAT_FRAMES * beats.length,        // 9s — feed sweet spot
    dimensions: dims,
    ratio: tree.ratio,
    mutedFirst: true,                                    // CANON §8 — never rely on audio
    clips: beats.map((b, i) => ({
      id: `clip_${b.key}`,
      assetId: v.lineage.imageryAssetId,                 // Kling img2video seam: animate the ad's own imagery
      startFrame: i * BEAT_FRAMES,
      endFrame: (i + 1) * BEAT_FRAMES,
      provider: 'kling',
      prompt: `${v.lineage.prompt} — camera: ${b.motion}`,
      negative_prompt: v.lineage.negativePrompt,
    })),
    captions: {
      style: 'tiktok',
      combineTokensWithinMs: 1200,
      locale,
      safeZone: true,
      cues: beats.map((b, i) => ({
        startMs: i * (BEAT_FRAMES / FPS) * 1000,
        endMs: (i + 1) * (BEAT_FRAMES / FPS) * 1000,
        text: b.text,
      })),
    },
    overlayLayerTreeRef: 'variant.layer_tree',
  };
  const inputPropsHash = createHash('sha256').update(JSON.stringify(composition)).digest('hex');
  return VideoComposition.parse({ ...composition, inputPropsHash });
}

export async function planVideo(variantId: string, locale: 'de' | 'en' = 'de'): Promise<VideoCompositionT> {
  const v = await getStore().getVariant(variantId);
  if (!v) throw new Error('variant not found');
  const plan = composeVideoPlan(v, locale);
  await getStore().updateVideoComposition(variantId, plan);
  return plan;
}
