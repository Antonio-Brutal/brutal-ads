import { renderDocument } from '@brutal/render';
import { getCarousel, getVariant } from '@/server/runtime';

export const runtime = 'nodejs';
export const maxDuration = 120;

// Export through the REAL P1 render spine (polotno-node headless): editor and export
// share one render model (CANON L5). JPG passes the LinkedIn ≤5MB gate; carousels
// export as multi-page PDF document ads (P7, docs/06 §8.2).
export async function POST(req: Request) {
  const { variantId, format } = await req.json();

  const carousel = await getCarousel(variantId);
  if (carousel) {
    const trees = carousel.slides.map((s) => s.layerTree);
    const result = await renderDocument({
      variant: { layerTree: trees[0]!, slides: trees, locale: 'de' }, format: 'pdf',
    });
    const render = result.renders[0]!;
    return new Response(new Uint8Array(render.buffer), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="brutal-carousel-${variantId.slice(0, 8)}-${trees.length}p.pdf"`,
        'x-render-bytes': String(render.bytes),
        'x-render-sha256': render.sha256,
        'x-pdf-pages': String(trees.length),
      },
    });
  }

  const v = await getVariant(variantId);
  if (!v) return new Response('variant not found', { status: 404 });
  const fmt = format === 'png' ? 'png' : format === 'pdf' ? 'pdf' : 'jpg';
  const result = await renderDocument({ variant: { layerTree: v.layerTree, locale: 'de' }, format: fmt });
  const render = result.renders[0]!;
  const mime = fmt === 'png' ? 'image/png' : fmt === 'pdf' ? 'application/pdf' : 'image/jpeg';
  return new Response(new Uint8Array(render.buffer), {
    headers: {
      'content-type': mime,
      'content-disposition': `attachment; filename="brutal-ad-${variantId.slice(0, 8)}-${render.width}x${render.height}.${fmt}"`,
      'x-render-bytes': String(render.bytes),
      'x-render-sha256': render.sha256,
    },
  });
}
