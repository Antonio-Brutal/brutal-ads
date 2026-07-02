import { NextResponse } from 'next/server';
import { createBrief, createCarousel, studioMode } from '@/server/runtime';

export const runtime = 'nodejs';
export const maxDuration = 300;   // carousel: 4 LLM calls + imagery + N slide compositions

export async function POST(req: Request) {
  const { rawInput, locale, docType, slides } = await req.json();
  if (!rawInput || typeof rawInput !== 'string') {
    return NextResponse.json({ error: 'rawInput required' }, { status: 400 });
  }
  const loc = locale === 'en' ? 'en' : 'de';
  if (docType === 'carousel') {   // P7 — multi-slide document ad
    const { brief, carousel } = await createCarousel(rawInput, loc, typeof slides === 'number' ? slides : 5);
    return NextResponse.json({
      briefId: brief.id, variantId: carousel.id, slides: carousel.slides.length,
      roles: carousel.slides.map((s) => s.role), continuityNote: carousel.continuityNote,
      status: brief.result.status, mode: studioMode(),
    });
  }
  const brief = await createBrief(rawInput, loc);
  return NextResponse.json({ briefId: brief.id, status: brief.result.status, mode: studioMode() });
}
