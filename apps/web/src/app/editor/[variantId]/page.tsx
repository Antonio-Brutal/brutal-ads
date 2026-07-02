import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVariant } from '@/server/runtime';
import { EditorClient } from './EditorClient';

export const dynamic = 'force-dynamic';

export default async function EditorPage({ params }: { params: Promise<{ variantId: string }> }) {
  const { variantId } = await params;
  const v = await getVariant(variantId);
  if (!v) notFound();

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px' }}>
      <p style={{ marginBottom: 18 }}>
        <Link href={`/board/${v.briefId}`} style={{ color: '#8a8a99', textDecoration: 'none' }}>← Board</Link>
        <span style={{ color: '#cba65e', marginLeft: 16, fontSize: 13 }}>{v.archetype}</span>
      </p>
      <EditorClient variantId={v.id} initialTree={v.layerTree as never} hook={v.copy.hook} />
    </main>
  );
}
