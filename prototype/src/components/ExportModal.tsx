export function ExportModal({
  dataUrl,
  onClose,
  onDownload,
}: {
  dataUrl: string | null;
  onClose: () => void;
  onDownload: () => void;
}) {
  const specs = [
    ['Dimensions', '1200 × 1200 px'],
    ['Aspect ratio', '1:1 (square)'],
    ['File type', 'JPG'],
    ['Est. size', '≈ 0.4 MB (limit 5 MB)'],
    ['Color', 'sRGB'],
  ];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div
        className="rounded-2xl w-full max-w-2xl overflow-hidden fadein"
        style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="font-display text-xl">Export for LinkedIn</div>
          <button onClick={onClose} className="text-xl" style={{ color: 'var(--muted)' }}>
            ✕
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-5 p-5">
          <div className="rounded-lg overflow-hidden grid place-items-center" style={{ background: 'var(--ink)', aspectRatio: '1/1' }}>
            {dataUrl ? (
              <img src={dataUrl} alt="export preview" className="w-full h-full object-contain" />
            ) : (
              <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
                Rendering 1200×1200…
              </div>
            )}
          </div>
          <div>
            <div className="text-[12px] uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>
              Single image ad
            </div>
            <div className="space-y-1.5 mb-5">
              {specs.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-[13px]">
                  <span style={{ color: 'var(--muted)' }}>{k}</span>
                  <span className="font-medium">{v}</span>
                  <span style={{ color: 'var(--acid)' }}>✓</span>
                </div>
              ))}
            </div>
            <button
              onClick={onDownload}
              disabled={!dataUrl}
              className="w-full font-display text-lg px-5 py-3 rounded-lg disabled:opacity-50"
              style={{ background: 'var(--acid)', color: 'var(--ink)' }}
            >
              ↓ Download JPG
            </button>
            <p className="text-[12px] mt-3" style={{ color: 'var(--muted)' }}>
              Real export — the actual editor canvas, flattened to a LinkedIn-spec JPG. Other ratios (1.91:1, 4:5)
              derive from the same layer tree.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
