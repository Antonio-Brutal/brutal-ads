import { renderDocument } from '@brutal/render';
import { getVariant } from '@/server/runtime';

export const runtime = 'nodejs';
export const maxDuration = 120;

// Export through the REAL P1 render spine (polotno-node headless): editor and export
// share one render model (CANON L5). JPG passes the LinkedIn ≤5MB gate.
export async function POST(req: Request) {
  const { variantId, format } = await req.json();
  const v = getVariant(variantId);
  if (!v) return new Response('variant not found', { status: 404 });
  const fmt = format === 'png' ? 'png' : 'jpg';
  const result = await renderDocument({ variant: { layerTree: v.layerTree, locale: 'de' }, format: fmt });
  const render = result.renders[0]!;
  return new Response(new Uint8Array(render.buffer), {
    headers: {
      'content-type': fmt === 'png' ? 'image/png' : 'image/jpeg',
      'content-disposition': `attachment; filename="brutal-ad-${variantId.slice(0, 8)}-1200x1200.${fmt}"`,
      'x-render-bytes': String(render.bytes),
      'x-render-sha256': render.sha256,
    },
  });
}
