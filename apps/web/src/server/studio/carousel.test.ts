import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderDocument, closeRenderInstance } from '@brutal/render';
import { BrandKitData, type BrandKitDataT } from '@brutal/shared';
import { createMockLlm } from './llm/mock';
import { STUDIO_FIXTURES } from './fixtures';
import { DOCUMENT_AD_SIZE, runCarousel, scaleTree } from './orchestrator';

// P7 gate (docs/10 §9.4): brief → multi-slide carousel with a hook→…→close arc,
// every slide passes BrandGuardian, exports to a spec-valid multi-page PDF.

function kit(): BrandKitDataT {
  const seed = readFileSync(join(process.cwd(), '../../supabase/seed.sql'), 'utf8');
  return BrandKitData.parse(JSON.parse(seed.match(/\$\$(\{[\s\S]*?\})\$\$::jsonb/)![1]!));
}

const gradientSrc = `data:image/png;base64,${readFileSync(
  join(process.cwd(), '../../packages/render/fixtures/gradient.png')).toString('base64')}`;

const deps = {
  llm: createMockLlm(STUDIO_FIXTURES),
  dispatchImagery: async () => ({ assetId: 'as_carousel_stub', src: gradientSrc, costUsd: 0 }),
};

describe('P7 — carousel → PDF document ad', () => {
  it('produces a 5-slide hook→close arc, every slide on-brand at 1080²', async () => {
    const result = await runCarousel(
      { rawInput: 'Why German law firms are switching to AI contract drafting', brandKit: kit(), targetLocale: 'de' },
      deps,
    );
    expect(result.status).toBe('succeeded');
    expect(result.slides).toHaveLength(5);
    expect(result.slides[0]!.role).toBe('hook');
    expect(result.slides[4]!.role).toBe('close');
    expect(result.continuityNote.length).toBeGreaterThan(10);
    for (const s of result.slides) {
      expect(s.guardian.pass).toBe(true);
      expect(s.layerTree.canvas.width).toBe(DOCUMENT_AD_SIZE);
      expect(s.layerTree.canvas.height).toBe(DOCUMENT_AD_SIZE);
    }
    // continuity: every slide composites the SAME imagery asset
    const bgSrcs = new Set(result.slides.map((s) =>
      (s.layerTree.layers as Array<{ id: string; src?: string }>).find((l) => l.id === 'ly_bg')?.src));
    expect(bgSrcs.size).toBe(1);
  });

  it('scaleTree scales geometry + fontSize uniformly and re-validates', async () => {
    const result = await runCarousel(
      { rawInput: 'x', brandKit: kit(), targetLocale: 'de' }, deps);
    const tree = result.slides[0]!.layerTree;                      // already 1080
    const back = scaleTree(tree, 1200);
    expect(back.canvas.width).toBe(1200);
    const h1080 = (tree.layers as Array<{ id: string; fontSize?: number }>).find((l) => l.id === 'ly_headline')!;
    const h1200 = (back.layers as Array<{ id: string; fontSize?: number }>).find((l) => l.id === 'ly_headline')!;
    expect(h1200.fontSize! / h1080.fontSize!).toBeCloseTo(1200 / 1080, 5);
  });

  it('exports a multi-page PDF (one page per slide, square)', async () => {
    const result = await runCarousel(
      { rawInput: 'Why German law firms are switching to AI contract drafting', brandKit: kit(), targetLocale: 'de' },
      deps,
    );
    const trees = result.slides.map((s) => s.layerTree);
    const { renders } = await renderDocument({
      variant: { layerTree: trees[0]!, slides: trees, locale: 'de' }, format: 'pdf',
    });
    const pdf = renders[0]!.buffer;
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const text = pdf.toString('latin1');
    const pageCount = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pageCount).toBe(5);
    const box = text.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/);
    expect(box).not.toBeNull();
    expect(Number(box![1])).toBeCloseTo(Number(box![2]), 1);       // square pages
    expect(renders[0]!.width).toBe(DOCUMENT_AD_SIZE);
    await closeRenderInstance();
  }, 180_000);
});
