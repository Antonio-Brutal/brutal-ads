import type { BrandKit } from './types';

// Placeholder Brand Kit for the demo. In the product this is a versioned, first-class
// object bootstrapped from brutal.ai (scrape) or uploaded brand guidelines.
export const BRUTAL: BrandKit = {
  name: 'Brutal',
  colors: {
    ink: '#0b0b0f',
    paper: '#f6f6f4',
    accent: '#c6ff3a', // acid lime
    accent2: '#ff3d7f', // hot magenta
  },
  fontDisplay: 'Arial Black, Helvetica Neue, Inter, sans-serif',
  fontBody: 'Inter, system-ui, sans-serif',
  voice: 'Confident, contrarian, plain-spoken. Picks a fight with the status quo. No jargon, no fluff.',
  bannedTerms: ['synergy', 'cutting-edge', 'revolutionary', 'leverage', 'best-in-class'],
  disclaimer: 'Brutal Inc.',
};
