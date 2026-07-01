import type { Concept, Scores, Variant } from './types';
import { ART_IDS } from './art';

// The agent pipeline shown while "generating" — sells the team-of-agents model.
export const AGENT_STEPS: { agent: string; task: string }[] = [
  { agent: 'Strategist', task: 'Parsing brief → persona, pain, promise, funnel stage' },
  { agent: 'Copywriter', task: 'Drafting hooks, headlines & CTAs (specificity > cleverness)' },
  { agent: 'Art Director', task: 'Choosing visual concepts + picking the image model' },
  { agent: 'Image Gen', task: 'Rendering backgrounds via FLUX — imagery only, no baked text' },
  { agent: 'Compositor', task: 'Assembling editable headline / CTA / logo layers' },
  { agent: 'Brand Guardian', task: 'Checking voice, palette, banned terms, disclaimer' },
  { agent: 'Critic', task: 'Scoring against the LinkedIn conversion playbook' },
  { agent: 'Engagement', task: 'Predicting attention map + thumb-stop power' },
];

// Curated concept pool (illustrative copy, themed to "Brutal AI SDR → RevOps").
const POOL: Omit<Concept, 'id' | 'artId'>[] = [
  {
    angle: 'Pain · missed follow-up',
    hook: 'Reps drop 48% of follow-ups. Your AI SDR drops exactly zero.',
    headline: 'IT NEVER FORGETS THE FOLLOW-UP',
    cta: 'See it work',
    theme: 'dark',
  },
  {
    angle: 'Contrarian · kill the busywork',
    hook: "Hot take: your SDRs shouldn't write 100 emails a day. Agents are better at it.",
    headline: 'STOP PAYING HUMANS TO COPY-PASTE',
    cta: 'Book a teardown',
    theme: 'dark',
  },
  {
    angle: 'Outcome · pipeline 24/7',
    hook: "Pipeline doesn't clock out at 6pm. Now your outbound doesn't either.",
    headline: 'YOUR SDR NEVER SLEEPS',
    cta: 'Watch the demo',
    theme: 'dark',
  },
  {
    angle: 'Proof · number-led',
    hook: '1 AI SDR gave every rep 4 hours back — per day — of manual prospecting.',
    headline: '4 HOURS BACK. EVERY REP. EVERY DAY.',
    cta: 'Get the numbers',
    theme: 'dark',
  },
  {
    angle: 'Identity · for RevOps',
    hook: 'RevOps leaders: your forecast is only as clean as your top-of-funnel.',
    headline: 'CLEAN PIPELINE, ON AUTOPILOT',
    cta: 'See how',
    theme: 'dark',
  },
  {
    angle: 'Tension · the inbox truth',
    hook: "Most outbound dies in the follow-up. That's the part we automated first.",
    headline: 'THE FOLLOW-UP IS WHERE DEALS LIVE',
    cta: 'Show me',
    theme: 'dark',
  },
  {
    angle: 'Bold · collapse the stack',
    hook: 'Six tools, one job. We collapsed the outbound stack into a single agent.',
    headline: 'ONE AGENT. THE WHOLE FUNNEL.',
    cta: 'Compare stacks',
    theme: 'dark',
  },
  {
    angle: 'Provocative · quota',
    hook: "What if quota attainment wasn't a coin flip every quarter?",
    headline: 'MAKE QUOTA BORING AGAIN',
    cta: 'Talk to us',
    theme: 'dark',
  },
];

function scoreFor(i: number): Scores {
  const jitter = (n: number, spread: number) => Math.round(n + (Math.random() - 0.5) * spread);
  // First couple of concepts skew strong so there's a clear "top performer".
  const base = i < 2 ? 85 : i < 4 ? 76 : 68;
  const stoppingPower = Math.min(96, Math.max(52, jitter(base, 14)));
  const focalClarity = Math.min(95, Math.max(50, jitter(base - 2, 16)));
  const valuePropAttention = Math.min(93, Math.max(48, jitter(base - 6, 18)));
  const ctaAttention = Math.min(88, Math.max(38, jitter(base - 14, 20)));
  const clutter = Math.min(60, Math.max(14, jitter(40 - base / 4, 16)));
  const ctrMid = 0.5 + (stoppingPower / 100) * 1.1; // ~0.5%–1.6%
  return {
    stoppingPower,
    focalClarity,
    valuePropAttention,
    ctaAttention,
    clutter,
    ctrLow: +(ctrMid - 0.25).toFixed(2),
    ctrHigh: +(ctrMid + 0.25).toFixed(2),
    confidence: +(0.55 + Math.random() * 0.25).toFixed(2),
  };
}

export function generateVariants(_brief: string, count = 6): Variant[] {
  const picks = POOL.slice(0, count);
  return picks
    .map((c, i) => ({
      ...c,
      id: `v${i + 1}-${Math.random().toString(36).slice(2, 7)}`,
      artId: ART_IDS[i % ART_IDS.length],
      scores: scoreFor(i),
    }))
    // sort so the strongest predicted performers surface first
    .sort((a, b) => b.scores.stoppingPower - a.scores.stoppingPower);
}

// Used by "regenerate / make more variations".
export function moreVariants(seedCount: number): Variant[] {
  return POOL.map((c, i) => ({
    ...c,
    id: `v${seedCount + i}-${Math.random().toString(36).slice(2, 7)}`,
    artId: ART_IDS[(i + 2) % ART_IDS.length],
    scores: scoreFor(i),
  })).sort((a, b) => b.scores.stoppingPower - a.scores.stoppingPower);
}

export const EXAMPLE_BRIEFS = [
  'Promote Brutal’s AI SDR to RevOps leaders. Confident, slightly contrarian. Goal: demo bookings.',
  'Sell our AI SDR to heads of sales tired of manual outbound. Punchy, proof-led.',
  'Awareness ad for Brutal aimed at founders doing their own prospecting. Bold, a little cheeky.',
];
