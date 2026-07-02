import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Determinism pin (docs/06 §7.3): Playfair Display + Inter embedded as woff2 data URLs —
// the SAME bytes in the live editor store and the headless renderer. No system-font fallback.

const here = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = join(here, '..', 'assets', 'fonts');

const WEIGHTS: Record<string, number[]> = {
  'Playfair Display': [400, 700, 900],
  Inter: [400, 500, 600, 700],
};

const FILE_PREFIX: Record<string, string> = {
  'Playfair Display': 'playfair-display',
  Inter: 'inter',
};

function dataUrl(file: string): string {
  const buf = readFileSync(join(FONT_DIR, file));
  return `data:font/woff2;base64,${buf.toString('base64')}`;
}

export interface PolotnoFont {
  fontFamily: string;
  styles: Array<{ src: string; fontStyle: string; fontWeight: string }>;
}

let cache: PolotnoFont[] | null = null;

/** Brand fonts in Polotno store-JSON `fonts` shape (docs/06 §3.2 brandFonts). */
export function brandFonts(): PolotnoFont[] {
  if (cache) return cache;
  cache = Object.entries(WEIGHTS).map(([fontFamily, weights]) => ({
    fontFamily,
    styles: weights.map((w) => ({
      src: `url(${dataUrl(`${FILE_PREFIX[fontFamily]}-${w}.woff2`)}) format('woff2')`,
      fontStyle: 'normal',
      fontWeight: String(w),
    })),
  }));
  return cache;
}
