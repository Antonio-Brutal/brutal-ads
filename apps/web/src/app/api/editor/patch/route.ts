import { NextResponse } from 'next/server';
import { chatEdit } from '@/server/runtime';

export const runtime = 'nodejs';

// docs/06 §4.3 — POST /api/editor/patch: NL instruction → typed LayerPatch → applyLayerPatch (server-authoritative).
export async function POST(req: Request) {
  const { variantId, instruction } = await req.json();
  if (!variantId || !instruction) return NextResponse.json({ error: 'variantId + instruction required' }, { status: 400 });
  try {
    const { patch, tree } = await chatEdit(variantId, instruction);
    return NextResponse.json({ patch, tree });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
