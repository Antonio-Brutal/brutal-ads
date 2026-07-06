// ─────────────────────────────────────────────────────────────────────────────
// Design v3 — image-aware compositing. v2 composed blind: fixed scrim strength,
// fixed panel side, gold kicker over gold lamp glow. This module samples the
// ACTUAL generated imagery (sharp is already a dep for the exporter) so the
// compositor can pick scrim opacity and layout side from real luminance.
// Returns null on any failure — composition falls back to deterministic defaults
// (mock mode, tests, and the odd un-fetchable src all stay green).
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageStats {
  /** mean luminance 0–1 of the lower third (hero text zone) */
  bottomLuma: number;
  /** mean luminance 0–1 of the top quarter (masthead/logo zone) */
  topLuma: number;
  /** mean luminance 0–1 per horizontal half */
  leftLuma: number;
  rightLuma: number;
  /** luma standard deviation per half — busyness proxy for panel-side choice */
  leftVar: number;
  rightVar: number;
}

const GRID = 8;

export async function analyzeImagery(src: string): Promise<ImageStats | null> {
  try {
    const { default: sharp } = await import('sharp');
    let buf: Buffer;
    if (src.startsWith('data:')) {
      buf = Buffer.from(src.slice(src.indexOf(',') + 1), 'base64');
    } else {
      const res = await fetch(src);
      if (!res.ok) return null;
      buf = Buffer.from(await res.arrayBuffer());
    }
    const raw = await sharp(buf).resize(GRID, GRID, { fit: 'fill' }).greyscale().raw().toBuffer();
    const cell = (col: number, row: number) => (raw[row * GRID + col] ?? 0) / 255;

    const region = (cols: [number, number], rows: [number, number]) => {
      const vals: number[] = [];
      for (let r = rows[0]; r <= rows[1]; r++) for (let c = cols[0]; c <= cols[1]; c++) vals.push(cell(c, r));
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
      return { mean, std: Math.sqrt(variance) };
    };

    const bottom = region([0, GRID - 1], [Math.floor(GRID * 0.62), GRID - 1]);
    const top = region([0, GRID - 1], [0, Math.floor(GRID * 0.25)]);
    const left = region([0, Math.floor(GRID / 2) - 1], [0, GRID - 1]);
    const right = region([Math.floor(GRID / 2), GRID - 1], [0, GRID - 1]);

    return {
      bottomLuma: bottom.mean, topLuma: top.mean,
      leftLuma: left.mean, rightLuma: right.mean,
      leftVar: left.std, rightVar: right.std,
    };
  } catch {
    return null;
  }
}
