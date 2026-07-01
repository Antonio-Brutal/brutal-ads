export type Format = '1:1' | '1.91:1' | '4:5';

export const FORMAT_DIMS: Record<Format, { w: number; h: number; label: string; note: string }> = {
  '1:1': { w: 1200, h: 1200, label: 'Square 1:1', note: 'Best mobile feed real estate' },
  '1.91:1': { w: 1200, h: 627, label: 'Landscape 1.91:1', note: 'Safe on desktop + mobile' },
  '4:5': { w: 960, h: 1200, label: 'Vertical 4:5', note: 'Mobile-only delivery' },
};

export interface BrandKit {
  name: string;
  colors: { ink: string; paper: string; accent: string; accent2: string };
  fontDisplay: string;
  fontBody: string;
  voice: string;
  bannedTerms: string[];
  disclaimer: string;
}

export interface Scores {
  stoppingPower: number; // 0..100
  focalClarity: number; // 0..100
  valuePropAttention: number; // 0..100
  ctaAttention: number; // 0..100
  clutter: number; // 0..100 (lower better)
  ctrLow: number; // %
  ctrHigh: number; // %
  confidence: number; // 0..1
}

export interface Concept {
  id: string;
  angle: string; // the strategic angle / hook type
  hook: string; // intro text (the line above the image)
  headline: string; // in-image headline
  cta: string;
  artId: string;
  theme: 'dark' | 'light';
}

export interface Variant extends Concept {
  scores: Scores;
}
