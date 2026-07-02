'use client';

// Lightweight LayerTree preview (board cards + editor canvas). Interprets the CANONICAL
// tree directly — same source of truth the headless exporter renders. Full Polotno canvas
// editing wires in at the EditorAdapter seam (docs/06 §2); chat-to-edit is already canonical.

type AnyLayer = Record<string, any> & { id: string; type: string };
interface Tree { canvas: { width: number; height: number; background: string }; layers: AnyLayer[] }

function LayerEl({ l, s }: { l: AnyLayer; s: number }) {
  if (l.visible === false) return null;
  const box: React.CSSProperties = {
    position: 'absolute', left: l.x * s, top: l.y * s, width: l.width * s, height: l.height * s,
    opacity: l.opacity ?? 1, transform: l.rotation ? `rotate(${l.rotation}deg)` : undefined,
  };
  switch (l.type) {
    case 'image': case 'logo':
      return l.src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={l.src} alt="" style={{ ...box, objectFit: l.fit === 'contain' ? 'contain' : 'cover' }} />
        : <div style={{ ...box, background: '#1d1d25', border: '1px dashed #333' }} />;
    case 'shape': case 'frame':
      return <div style={{ ...box, background: l.fill ?? 'transparent',
        border: l.stroke ? `${(l.strokeWidth ?? 1) * s}px solid ${l.stroke}` : undefined,
        borderRadius: (l.cornerRadius ?? 0) * s }} />;
    case 'text': case 'legal': case 'smart':
      return <div style={{ ...box, color: l.color ?? '#fff', fontFamily: l.fontFamily,
        fontSize: (l.fontSize ?? 24) * s, fontWeight: l.fontWeight ?? 400, lineHeight: l.lineHeight ?? 1.1,
        textAlign: (l.align ?? 'left') as never, whiteSpace: 'pre-wrap', overflow: 'hidden' }}>
        {l.type === 'smart' ? (l.template ?? '').replace('{{customer_count}}', '1.200') : l.text}
      </div>;
    case 'cta':
      return <div style={{ ...box, background: l.fill, color: l.textColor, borderRadius: (l.cornerRadius ?? 8) * s,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: l.fontFamily,
        fontSize: (l.fontSize ?? 32) * s, fontWeight: l.fontWeight ?? 600 }}>{l.text}</div>;
    case 'group':
      return <>{(l.children ?? []).map((c: AnyLayer) => <LayerEl key={c.id} l={c} s={s} />)}</>;
    default:
      return null;
  }
}

export function TreePreview({ tree, width = 360 }: { tree: Tree; width?: number }) {
  const s = width / tree.canvas.width;
  return (
    <div style={{ position: 'relative', width, height: tree.canvas.height * s,
      background: tree.canvas.background, overflow: 'hidden', borderRadius: 8 }}>
      {tree.layers.map((l) => <LayerEl key={l.id} l={l} s={s} />)}
    </div>
  );
}
