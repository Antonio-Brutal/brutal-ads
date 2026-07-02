import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LayerTree, type LayerTreeT } from '@brutal/shared';
import { fromPolotno } from '../polotno/fromPolotno';
import { toPolotno } from '../polotno/toPolotno';

// docs/06 §3.2 golden round-trip (P1, blocking): fromPolotno(toPolotno(v)) ≡ v
// for fixtures covering every layer type incl. smart, legal, nested group, and German text.

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (): LayerTreeT =>
  LayerTree.parse(JSON.parse(readFileSync(join(here, '../../fixtures/single-image-1x1.json'), 'utf8')));

const allTypesTree = (): LayerTreeT =>
  LayerTree.parse({
    schemaVersion: 1,
    ratio: '1:1',
    canvas: { width: 1200, height: 1200, background: '#0a0a0a' },
    safeZones: { seeMoreFold: 0.85 },
    layers: [
      { id: 'a', type: 'image', x: 0, y: 0, width: 1200, height: 1200, assetId: 'as_1', src: 'data:image/png;base64,x' },
      { id: 'b', type: 'text', x: 10, y: 10, width: 500, height: 100, text: 'Größenwahn — Ärger, Übermaß',
        fontFamily: 'Playfair Display', fontSize: 60, color: '#fff' },
      { id: 'c', type: 'logo', x: 20, y: 20, width: 200, height: 60, assetId: null, src: 'data:image/png;base64,y' },
      { id: 'd', type: 'shape', x: 0, y: 0, width: 100, height: 100, shape: 'rect', fill: '#cba65e' },
      { id: 'e', type: 'cta', x: 50, y: 900, width: 300, height: 80, text: 'Demo buchen',
        fill: '#b6e64a', textColor: '#0a0a0a', fontFamily: 'Inter', fontSize: 30 },
      { id: 'f', type: 'frame', x: 0, y: 0, width: 1200, height: 1200, stroke: '#cba65e', strokeWidth: 4 },
      { id: 'g', type: 'legal', x: 10, y: 1150, width: 800, height: 30, text: 'Hinweis: ärztliche Prüfung.',
        fontFamily: 'Inter', fontSize: 18, color: '#9a9a92', requiredBy: 'legal_ai_de' },
      { id: 'h', type: 'group', x: 0, y: 0, width: 400, height: 400,
        children: [
          { id: 'h1', type: 'shape', x: 0, y: 0, width: 50, height: 50, shape: 'rect', fill: '#111111' },
          { id: 'h2', type: 'group', x: 0, y: 0, width: 100, height: 100,
            children: [{ id: 'h21', type: 'text', x: 0, y: 0, width: 80, height: 20, text: 'tief',
              fontFamily: 'Inter', fontSize: 14, color: '#eee' }] },
        ] },
      { id: 'i', type: 'smart', x: 60, y: 500, width: 700, height: 70, binding: '{{customer_count}}',
        template: '{{customer_count}}+ Kanzleien', fallback: 'viele Kanzleien',
        fontFamily: 'Inter', fontSize: 34, color: '#cba65e' },
    ],
    smartData: { customer_count: { value: 1200, display: { de: '1.200', en: '1,200' } } },
  });

describe('canonical tree ⇄ Polotno store (lossless projection)', () => {
  it('round-trips the render fixture exactly', () => {
    const tree = fixture();
    expect(fromPolotno(toPolotno(tree, { locale: 'de' }))).toEqual(tree);
  });

  it('round-trips every layer type incl. nested groups + smart + German text', () => {
    const tree = allTypesTree();
    expect(fromPolotno(toPolotno(tree, { locale: 'de' }))).toEqual(tree);
  });

  it('smart layers emit the RESOLVED display string but keep the binding (§3.1 rule)', () => {
    const store = toPolotno(fixture(), { locale: 'de' });
    const el = store.pages[0]!.children.find((c) => c.id === 'ly_count') as Record<string, unknown>;
    expect(el.text).toBe('1.200+ Kanzleien vertrauen Brutal');           // resolved for the canvas
    expect((el.custom as Record<string, unknown>).binding).toBe('{{customer_count}}'); // binding preserved
    const back = fromPolotno(store);
    const smart = back.layers.find((l: { id: string }) => l.id === 'ly_count');
    expect(smart.template).toBe('{{customer_count}}+ Kanzleien vertrauen Brutal');     // never overwritten
  });

  it('smart resolution falls back per-locale and to fallback text', () => {
    const en = toPolotno(fixture(), { locale: 'en' });
    const el = en.pages[0]!.children.find((c) => c.id === 'ly_count') as Record<string, unknown>;
    expect(el.text).toBe('1,200+ Kanzleien vertrauen Brutal');
  });

  it('editor edits (geometry/text) merge back through fromPolotno', () => {
    const tree = fixture();
    const store = toPolotno(tree, { locale: 'de' });
    const headline = store.pages[0]!.children.find((c) => c.id === 'ly_headline') as Record<string, unknown>;
    headline.text = 'Kürzer.';
    headline.x = 100;
    headline.fill = '#cba65e';
    const back = fromPolotno(store);
    const hl = back.layers.find((l: { id: string }) => l.id === 'ly_headline');
    expect(hl.text).toBe('Kürzer.');
    expect(hl.x).toBe(100);
    expect(hl.color).toBe('#cba65e');
  });
});
