import { NextResponse } from 'next/server';
import { createBrief, studioMode } from '@/server/runtime';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { rawInput, locale } = await req.json();
  if (!rawInput || typeof rawInput !== 'string') {
    return NextResponse.json({ error: 'rawInput required' }, { status: 400 });
  }
  const brief = await createBrief(rawInput, locale === 'en' ? 'en' : 'de');
  return NextResponse.json({ briefId: brief.id, status: brief.result.status, mode: studioMode() });
}
