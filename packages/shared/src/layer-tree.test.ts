import { describe, expect, it } from 'vitest';
import { LayerPatch, LayerTree, RenderKind } from './index';

// Locks the CANONICAL schemas (CANON §12 L3/L6). If these fail, someone redefined the
// single source of truth — fix the caller, not this test.

describe('LayerPatch (the ONE canonical chat-to-edit schema, L6)', () => {
  const base = {
    id: 'patch-1',
    variantId: '5bb54b3e-6c8f-4f2e-9a0e-9d1f2a3b4c5d',
    origin: 'chat',
    createdBy: 'agent',
  };

  it('accepts the canonical op field names', () => {
    const patch = LayerPatch.parse({
      ...base,
      ops: [
        { op: 'setText', layerId: 'headline', text: 'STOP LOSING DEALS' },
        { op: 'resize', layerId: 'headline', width: 1040, height: 220 },
        { op: 'rotate', layerId: 'logo', rotation: 0 },
        { op: 'reorderZ', layerId: 'cta', toIndex: 3 },
        { op: 'setSlideOrder', order: ['slide-a', 'slide-b'] },
        { op: 'setBinding', layerId: 'proof', binding: '{{customer_count}}' },
      ],
    });
    expect(patch.ops).toHaveLength(6);
  });

  it('rejects the divergent field names the ledger reconciled away', () => {
    // doc-05 pre-reconciliation spellings: value/w/h/toZ — must NOT validate.
    expect(() =>
      LayerPatch.parse({ ...base, ops: [{ op: 'setText', layerId: 'h', value: 'x' }] }),
    ).toThrow();
    expect(() =>
      LayerPatch.parse({ ...base, ops: [{ op: 'resize', layerId: 'h', w: 100, h: 100 }] }),
    ).toThrow();
    expect(() =>
      LayerPatch.parse({ ...base, ops: [{ op: 'reorderZ', layerId: 'h', toZ: 2 }] }),
    ).toThrow();
    // setSlideOrder takes slide IDs (string[]), not indices.
    expect(() =>
      LayerPatch.parse({ ...base, ops: [{ op: 'setSlideOrder', order: [0, 1] }] }),
    ).toThrow();
  });

  it('rejects origins outside the canonical enum', () => {
    expect(() => LayerPatch.parse({ ...base, origin: 'editor_agent', ops: [] })).toThrow();
  });
});

describe('render_kind (L3: PDF-only document ads, no native PPTX)', () => {
  it('accepts png|jpg|pdf|svg and rejects pptx', () => {
    for (const k of ['png', 'jpg', 'pdf', 'svg']) expect(RenderKind.parse(k)).toBe(k);
    expect(() => RenderKind.parse('pptx')).toThrow();
  });
});

describe('LayerTree', () => {
  it('parses a minimal single-image tree with defaults applied', () => {
    const tree = LayerTree.parse({
      format: '1:1',
      canvas: { w: 1200, h: 1200, bg: '#0b0b0f' },
      layers: [
        { id: 'bg', type: 'image', x: 0, y: 0, width: 1200, height: 1200, z: 0, assetId: 'a1' },
        { id: 'headline', type: 'text', x: 72, y: 730, width: 1056, height: 220, z: 2, text: 'HI' },
      ],
    });
    expect(tree.layers[0]?.renderHints.safeZone).toBe('none'); // default applied
    expect(tree.layers[1]?.rotation).toBe(0);
  });
});
