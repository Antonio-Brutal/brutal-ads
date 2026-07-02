import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TreePreview } from '@/components/TreePreview';
import { getBrief, variantsForBrief } from '@/server/runtime';

export const dynamic = 'force-dynamic';

export default async function BoardPage({ params }: { params: Promise<{ briefId: string }> }) {
  const { briefId } = await params;
  const brief = await getBrief(briefId);
  if (!brief) notFound();
  const variants = await variantsForBrief(briefId);

  return (
    <main style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 24px' }}>
      <p style={{ color: '#8a8a99', fontSize: 13, textTransform: 'uppercase', letterSpacing: 2 }}>Variant board</p>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: '6px 0 4px' }}>&ldquo;{brief.rawInput}&rdquo;</h1>
      <p style={{ color: '#9a9aa2', marginBottom: 28 }}>
        Angle: {brief.result.strategy.angle} · Key message: {brief.result.strategy.keyMessage}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
        {variants.map((v) => (
          <Link key={v.id} href={`/editor/${v.id}`} data-testid="variant-card"
            style={{ textDecoration: 'none', color: 'inherit', background: '#141419',
              border: '1px solid #2a2a33', borderRadius: 12, overflow: 'hidden' }}>
            <TreePreview tree={v.layerTree as never} width={300} />
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: '#cba65e', marginBottom: 6 }}>{v.archetype}</div>
              <div style={{ fontSize: 14, color: '#c9c9d1', lineHeight: 1.4 }}>{v.copy.hook}</div>
              <div style={{ fontSize: 12, color: '#8a8a99', marginTop: 8 }}>
                Guardian: {v.lineage.guardian.pass ? '✓ on-brand' : '✗'} · open in editor →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
