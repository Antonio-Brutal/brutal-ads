// ─────────────────────────────────────────────────────────────────────────────
// Design v3 grounds — REAL gradients as SVG data-URL image layers.
// v2 faked gradients with 5 stacked rects (stepped opacity) → visible banding,
// the single biggest "programmatic template" tell in the exports. An SVG linear
// gradient rendered by Chromium is continuous, and image layers are exempt from
// the guardian palette check (colors live inside the src).
// ─────────────────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) };
}

export type GradientDirection = 'to-top' | 'to-bottom' | 'to-left' | 'to-right';

const DIR: Record<GradientDirection, { x1: number; y1: number; x2: number; y2: number }> = {
  'to-bottom': { x1: 0, y1: 0, x2: 0, y2: 1 },
  'to-top': { x1: 0, y1: 1, x2: 0, y2: 0 },
  'to-right': { x1: 0, y1: 0, x2: 1, y2: 0 },
  'to-left': { x1: 1, y1: 0, x2: 0, y2: 0 },
};

/** SVG data URL: `color` fading through [offset, alpha] stops along `direction`. */
export function svgGradient(
  width: number, height: number, color: string,
  stops: Array<[number, number]>, direction: GradientDirection = 'to-bottom',
): string {
  const { r, g, b } = hexToRgb(color);
  const d = DIR[direction];
  const stopEls = stops
    .map(([o, a]) => `<stop offset="${o}" stop-color="rgb(${r},${g},${b})" stop-opacity="${a}"/>`)
    .join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><linearGradient id="g" x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}">${stopEls}</linearGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/** Cinematic bottom scrim: transparent up top, easing to `maxAlpha` at the base. */
export function scrimStops(maxAlpha: number): Array<[number, number]> {
  // smoothstep-ish ease — no perceivable band edges
  return [[0, 0], [0.16, maxAlpha * 0.06], [0.34, maxAlpha * 0.24], [0.52, maxAlpha * 0.52],
    [0.72, maxAlpha * 0.82], [0.88, maxAlpha * 0.96], [1, maxAlpha]];
}

/** Panel→photo blend: solid at the panel edge, dissolving over the image. */
export function blendStops(maxAlpha = 1): Array<[number, number]> {
  return [[0, maxAlpha], [0.35, maxAlpha * 0.72], [0.65, maxAlpha * 0.32], [0.85, maxAlpha * 0.1], [1, 0]];
}
