import { NextResponse } from 'next/server';
import { planVideo } from '@/server/video';

export const runtime = 'nodejs';

// P9 scaffold — deterministic VideoComposition for a variant (Remotion input;
// Kling/ElevenLabs generation is the flagged fast-follow).
export async function POST(req: Request) {
  const { variantId, locale } = await req.json();
  if (!variantId) return NextResponse.json({ error: 'variantId required' }, { status: 400 });
  try {
    const plan = await planVideo(variantId, locale === 'en' ? 'en' : 'de');
    return NextResponse.json(plan);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: msg === 'variant not found' ? 404 : 500 });
  }
}
