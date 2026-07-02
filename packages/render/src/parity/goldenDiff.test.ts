import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { afterAll, describe, expect, it } from 'vitest';
import { LayerTree, type LayerTreeT } from '@brutal/shared';
import { renderDocument } from '../index';
import { closeRenderInstance } from '../polotno/renderStatic';

// docs/10 §3.1 #1.5 — golden-file parity: rendered PNG ≈ committed reference (<0.5% pixels differ).
// First run writes the golden (committed to git); later runs diff against it. This is what catches
// font drift, watermark changes, scaling filters, and any renderer nondeterminism.
// Requires headless Chromium (polotno-node) — auto-skips when the browser can't boot (rare).

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(here, '../../fixtures');
const GOLDEN_DIR = join(FIXTURES, 'golden');

function loadFixtureTree(): LayerTreeT {
  const tree = LayerTree.parse(JSON.parse(readFileSync(join(FIXTURES, 'single-image-1x1.json'), 'utf8')));
  // inject committed placeholder art as data URLs (fixture:// scheme → local file, no network)
  for (const layer of tree.layers as Array<{ src?: string }>) {
    if (layer.src?.startsWith('fixture://')) {
      const file = layer.src.replace('fixture://', '');
      layer.src = `data:image/png;base64,${readFileSync(join(FIXTURES, file)).toString('base64')}`;
    }
  }
  return tree;
}

describe('P1 golden render (composite-don\'t-bake proof)', () => {
  afterAll(async () => { await closeRenderInstance(); });

  it('renders the 1200×1200 fixture and matches the committed golden', { timeout: 180_000 }, async () => {
    const tree = loadFixtureTree();
    const result = await renderDocument({ variant: { layerTree: tree, locale: 'de' }, format: 'png' });
    const render = result.renders[0]!;
    expect(render.width).toBe(1200);

    mkdirSync(GOLDEN_DIR, { recursive: true });
    const goldenPath = join(GOLDEN_DIR, 'single-image-1x1.png');
    // always write the latest render for human inspection
    writeFileSync(join(GOLDEN_DIR, 'single-image-1x1.latest.png'), render.buffer);

    if (!existsSync(goldenPath)) {
      writeFileSync(goldenPath, render.buffer);
      console.warn('golden written (first run) — commit fixtures/golden/single-image-1x1.png');
      return;
    }

    const golden = PNG.sync.read(readFileSync(goldenPath));
    const actual = PNG.sync.read(render.buffer);
    expect(actual.width).toBe(golden.width);
    expect(actual.height).toBe(golden.height);
    const mismatched = pixelmatch(golden.data, actual.data, undefined, golden.width, golden.height,
      { threshold: 0.02 });
    const ratio = mismatched / (golden.width * golden.height);
    expect(ratio).toBeLessThan(0.005);   // <0.5% pixels differ (docs/06 §7.4)
  });

  it('jpg export passes the LinkedIn ≤5MB gate', { timeout: 180_000 }, async () => {
    const tree = loadFixtureTree();
    const result = await renderDocument({ variant: { layerTree: tree, locale: 'de' }, format: 'jpg' });
    const render = result.renders[0]!;
    expect(render.bytes).toBeLessThanOrEqual(5 * 1024 * 1024);
    expect(render.bytes).toBeGreaterThan(10_000);   // sanity: not an empty frame
    writeFileSync(join(GOLDEN_DIR, 'single-image-1x1.latest.jpg'), render.buffer);
  });
});
