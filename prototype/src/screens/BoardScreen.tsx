import { useState } from 'react';
import type { Format, Variant } from '../lib/types';
import { FORMAT_DIMS } from '../lib/types';
import { LinkedInPost } from '../components/LinkedInPost';
import { AdComposite } from '../components/AdComposite';
import { ScoreChips, ScorePanel } from '../components/Scores';

const FORMATS: Format[] = ['1:1', '1.91:1', '4:5'];

export function BoardScreen({
  brief,
  variants,
  onOpen,
  onNewBrief,
  onMore,
}: {
  brief: string;
  variants: Variant[];
  onOpen: (v: Variant) => void;
  onNewBrief: () => void;
  onMore: () => void;
}) {
  const [format, setFormat] = useState<Format>('1:1');
  const [selectedId, setSelectedId] = useState(variants[0]?.id);
  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-[1240px] mx-auto px-6 py-6">
        {/* controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="min-w-0">
            <div className="text-[12px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
              Variant board · {variants.length} concepts
            </div>
            <div className="text-[14px] truncate max-w-xl" title={brief}>
              “{brief}”
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              {FORMATS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className="px-3 py-1.5 text-[13px]"
                  style={{
                    background: format === f ? 'var(--acid)' : 'transparent',
                    color: format === f ? 'var(--ink)' : 'var(--paper)',
                  }}
                  title={FORMAT_DIMS[f].note}
                >
                  {f}
                </button>
              ))}
            </div>
            <button onClick={onMore} className="px-3 py-1.5 text-[13px] rounded-lg" style={{ background: 'var(--ink-3)' }}>
              ↻ Make 6 more
            </button>
            <button onClick={onNewBrief} className="px-3 py-1.5 text-[13px] rounded-lg" style={{ background: 'var(--ink-3)' }}>
              + New brief
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(360px,460px)_1fr] gap-8">
          {/* featured: live LinkedIn feed preview + scores */}
          <div className="lg:sticky lg:top-4 self-start space-y-4 fadein" key={selected?.id}>
            <div className="text-[12px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
              Feed preview · {FORMAT_DIMS[format].label}
            </div>
            {selected && <LinkedInPost variant={selected} format={format} />}
            <div className="rounded-xl p-4" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] font-semibold">{selected?.angle}</div>
                <button
                  onClick={() => selected && onOpen(selected)}
                  className="font-display px-4 py-2 rounded-lg text-[14px]"
                  style={{ background: 'var(--acid)', color: 'var(--ink)' }}
                >
                  Open in editor →
                </button>
              </div>
              {selected && <ScorePanel s={selected.scores} />}
            </div>
          </div>

          {/* grid of alternatives */}
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {variants.map((v, i) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                onDoubleClick={() => onOpen(v)}
                className="text-left rounded-xl overflow-hidden transition-transform hover:-translate-y-0.5"
                style={{
                  border: '2px solid',
                  borderColor: v.id === selectedId ? 'var(--acid)' : 'var(--line)',
                  background: 'var(--ink-2)',
                }}
              >
                <div className="relative">
                  <AdComposite variant={v} format={format} />
                  {i === 0 && (
                    <div
                      className="absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--acid)', color: 'var(--ink)' }}
                    >
                      ★ Top performer
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
                    {v.angle}
                  </div>
                  <ScoreChips s={v.scores} />
                </div>
              </button>
            ))}
          </div>
        </div>
        <p className="text-[12px] mt-6" style={{ color: 'var(--muted)' }}>
          Click a card to preview it in the feed · double-click or “Open in editor” to edit every layer.
        </p>
      </div>
    </div>
  );
}
