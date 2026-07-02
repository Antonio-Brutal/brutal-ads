import { NextResponse } from 'next/server';
import { localizeVariant } from '@/server/runtime';

export const runtime = 'nodejs';
export const maxDuration = 60;

// P8 — one ad, two languages, from the same tree (transcreation, not literal translation).
export async function POST(req: Request) {
  const { variantId, targetLocale } = await req.json();
  if (!variantId) return NextResponse.json({ error: 'variantId required' }, { status: 400 });
  const locale = targetLocale === 'de' ? 'de' : 'en';
  try {
    const result = await localizeVariant(variantId, locale);
    return NextResponse.json({ variantId: result.variantId, locale, copy: result.copy });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: msg === 'variant not found' ? 404 : 500 });
  }
}
