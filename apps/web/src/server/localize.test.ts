import { describe, expect, it } from 'vitest';
import { createBrief, getVariant, localizeVariant, variantsForBrief } from './runtime';

// P8 gate (docs/10): one ad, TWO languages, on-brand, from the SAME tree.
// Keyless mode → MockLlm LocalizationAgent fixture (EN transcreation).

describe('P8 — localization', () => {
  it('produces an EN variant from a DE tree: text swapped, geometry identical, guardian pass', async () => {
    const brief = await createBrief('KI-Vertragsentwürfe für deutsche Kanzleien', 'de');
    const [src] = await variantsForBrief(brief.id);
    const { variantId, copy } = await localizeVariant(src!.id, 'en');

    expect(variantId).not.toBe(src!.id);                          // NEW variant, source untouched
    expect(copy.headline).toBe('Draft contracts — 40% faster.');  // fixture transcreation

    const loc = (await getVariant(variantId))!;
    const layer = (id: string, tree = loc.layerTree) =>
      (tree.layers as Array<Record<string, unknown>>).find((l) => l.id === id);

    expect(layer('ly_headline')!.text).toBe('Draft contracts — 40% faster.');
    expect(layer('ly_cta')!.text).toBe('Book a demo');
    // legal disclaimer switched to the EN text from the brand kit
    const legal = (loc.layerTree.layers as Array<{ type: string; text?: string }>).find((l) => l.type === 'legal');
    expect(legal?.text).toMatch(/legal advice|attorney|lawyer|substitute/i);

    // SAME tree: geometry + archetype untouched
    const srcAfter = (await getVariant(src!.id))!;
    expect(layer('ly_headline')!.text).not.toBe(layer('ly_headline', srcAfter.layerTree)!.text);
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(layer('ly_headline')![key]).toBe(layer('ly_headline', srcAfter.layerTree)![key]);
    }
    expect(loc.archetype).toBe(srcAfter.archetype);
  });
});
