import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStore } from '@/server/store';

export const runtime = 'nodejs';

const Ingest = z.object({
  variantId: z.string().uuid(),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  spendUsd: z.number().nonnegative().optional(),
  conversions: z.number().int().nonnegative().optional(),
  source: z.string().default('manual'),
});

// P10 — manual paste-in of LinkedIn campaign results. Feeds calibrateCtrBand on
// the next scoring pass (docs/10: predicted bands tighten against real CTR).
export async function POST(req: Request) {
  const parsed = Ingest.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { variantId, ...metrics } = parsed.data;
  try {
    await getStore().addResult(variantId, metrics);
    const all = await getStore().resultsForVariant(variantId);
    return NextResponse.json({ ok: true, resultsForVariant: all.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
