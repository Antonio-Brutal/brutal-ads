import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Determinism pin (docs/06 §7.3): Playfair Display + Inter embedded as woff2 data URLs —
// the SAME bytes in the live editor store and the headless renderer. No system-font fallback.
// Path resolution must survive three environments: vitest (cwd=packages/render),
// next dev/prod (cwd=apps/web, files traced to <task>/packages/render/assets), and a
// bundler inlining this module (import.meta.url → build-machine path, useless at runtime).

function resolveFontDir(): string {
  const candidates = [
    join(process.cwd(), 'assets', 'fonts'),                              // vitest in packages/render
    join(process.cwd(), '..', '..', 'packages', 'render', 'assets', 'fonts'), // apps/web (dev + traced lambda)
    join(process.cwd(), 'packages', 'render', 'assets', 'fonts'),        // repo root
    join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'fonts'),  // unbundled dist
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, 'inter-400.woff2'))) return dir;
  }
  throw new Error(`brandFonts: fonts dir not found; tried ${candidates.join(' | ')}`);
}

const FONT_DIR = resolveFontDir();

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
