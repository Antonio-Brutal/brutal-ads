import { scoreVariant } from '@/server/engagement';

export const runtime = 'nodejs';
export const maxDuration = 120;   // engine mode renders through the P1 spine first

// P6 — score a variant (docs/08). Persists EngagementScores on the variant row
// and returns them; the board re-reads on refresh.
export async function POST(req: Request) {
  const { variantId } = await req.json();
  if (!variantId) return Response.json({ error: 'variantId required' }, { status: 400 });
  try {
    const scores = await scoreVariant(variantId);
    return Response.json(scores);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === 'variant not found' ? 404 : 500;
    return Response.json({ error: msg }, { status });
  }
}
