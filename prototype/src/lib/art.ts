// Self-contained SVG "AI-generated backgrounds" (offline placeholders for the demo).
// In the real product these come from FLUX / Fal / nano-banana via the ImageProvider.
// They are intentionally bold + brutalist to match Brutal's brand.

const INK = '#0b0b0f';
const INK2 = '#15151c';
const ACID = '#c6ff3a';
const MAGENTA = '#ff3d7f';

function uri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const acidGlow = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    <radialGradient id="g" cx="68%" cy="34%" r="62%">
      <stop offset="0%" stop-color="${ACID}" stop-opacity="0.9"/>
      <stop offset="38%" stop-color="${ACID}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${INK}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="1200" fill="${INK}"/>
  <g stroke="#ffffff" stroke-opacity="0.05">
    ${Array.from({ length: 13 }, (_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="1200"/>`).join('')}
    ${Array.from({ length: 13 }, (_, i) => `<line x1="0" y1="${i * 100}" x2="1200" y2="${i * 100}"/>`).join('')}
  </g>
  <rect width="1200" height="1200" fill="url(#g)"/>
  <circle cx="816" cy="408" r="150" fill="none" stroke="${INK}" stroke-opacity="0.25" stroke-width="40"/>
</svg>`;

const diagonalBlocks = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <rect width="1200" height="1200" fill="${INK}"/>
  <g transform="rotate(-18 600 600)">
    <rect x="-200" y="120" width="1700" height="150" fill="${ACID}"/>
    <rect x="-200" y="330" width="1700" height="60" fill="#ffffff" fill-opacity="0.08"/>
    <rect x="-200" y="470" width="1700" height="240" fill="${MAGENTA}" fill-opacity="0.85"/>
    <rect x="-200" y="780" width="1700" height="90" fill="#ffffff" fill-opacity="0.06"/>
  </g>
</svg>`;

const halftone = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    <radialGradient id="h" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="${ACID}"/>
      <stop offset="100%" stop-color="${INK}"/>
    </radialGradient>
    <mask id="m">
      ${Array.from({ length: 26 }, (_, r) =>
        Array.from({ length: 26 }, (_, c) => {
          const x = c * 48 + 24;
          const y = r * 48 + 24;
          const dx = x - 600;
          const dy = y - 500;
          const d = Math.sqrt(dx * dx + dy * dy);
          const rad = Math.max(0, 22 - d / 38);
          return rad > 0.5 ? `<circle cx="${x}" cy="${y}" r="${rad.toFixed(1)}" fill="#fff"/>` : '';
        }).join(''),
      ).join('')}
    </mask>
  </defs>
  <rect width="1200" height="1200" fill="${INK}"/>
  <rect width="1200" height="1200" fill="url(#h)" mask="url(#m)"/>
</svg>`;

const network = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <rect width="1200" height="1200" fill="${INK2}"/>
  <g stroke="${ACID}" stroke-opacity="0.45" stroke-width="2">
    <line x1="220" y1="300" x2="520" y2="430"/><line x1="520" y1="430" x2="860" y2="320"/>
    <line x1="520" y1="430" x2="640" y2="760"/><line x1="640" y1="760" x2="980" y2="690"/>
    <line x1="220" y1="300" x2="300" y2="640"/><line x1="300" y1="640" x2="640" y2="760"/>
    <line x1="860" y1="320" x2="980" y2="690"/><line x1="860" y1="320" x2="900" y2="120"/>
  </g>
  <g fill="${ACID}">
    <circle cx="220" cy="300" r="14"/><circle cx="860" cy="320" r="20"/><circle cx="640" cy="760" r="24"/>
    <circle cx="980" cy="690" r="12"/><circle cx="300" cy="640" r="10"/><circle cx="900" cy="120" r="9"/>
  </g>
  <circle cx="520" cy="430" r="34" fill="${MAGENTA}"/>
</svg>`;

const magentaWave = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    <linearGradient id="w" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${MAGENTA}"/>
      <stop offset="60%" stop-color="${INK}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="${INK}"/>
  <path d="M0,820 C300,680 500,980 760,800 C960,660 1100,860 1200,760 L1200,1200 L0,1200 Z" fill="url(#w)" fill-opacity="0.9"/>
  <path d="M0,920 C320,820 520,1040 820,900 C1000,820 1120,940 1200,880 L1200,1200 L0,1200 Z" fill="${ACID}" fill-opacity="0.10"/>
</svg>`;

const gridScan = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <rect width="1200" height="1200" fill="${INK}"/>
  <g stroke="${ACID}" stroke-opacity="0.12">
    ${Array.from({ length: 25 }, (_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="1200"/>`).join('')}
    ${Array.from({ length: 25 }, (_, i) => `<line x1="0" y1="${i * 50}" x2="1200" y2="${i * 50}"/>`).join('')}
  </g>
  <rect x="0" y="430" width="1200" height="260" fill="${ACID}" fill-opacity="0.16"/>
  <rect x="0" y="430" width="1200" height="6" fill="${ACID}"/>
  <rect x="0" y="684" width="1200" height="6" fill="${ACID}"/>
</svg>`;

export const ART: Record<string, string> = {
  acidGlow: uri(acidGlow),
  diagonalBlocks: uri(diagonalBlocks),
  halftone: uri(halftone),
  network: uri(network),
  magentaWave: uri(magentaWave),
  gridScan: uri(gridScan),
};

export const ART_IDS = Object.keys(ART);
