import type { Scores } from '../lib/types';

function bar(v: number, invert = false) {
  const good = invert ? 100 - v : v;
  const color = good >= 75 ? '#c6ff3a' : good >= 55 ? '#e8e85a' : '#ff8a5c';
  return { width: `${v}%`, background: color };
}

function Row({ label, v, invert }: { label: string; v: number; invert?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 text-[12px]" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#23232b' }}>
        <div className="h-full rounded-full" style={bar(v, invert)} />
      </div>
      <div className="w-9 text-right text-[12px] tabular-nums">{v}</div>
    </div>
  );
}

export function ScorePanel({ s }: { s: Scores }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-end gap-4 mb-1">
        <div>
          <div className="font-display text-4xl" style={{ color: '#c6ff3a' }}>
            {s.stoppingPower}
          </div>
          <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Stopping power
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="font-display text-2xl">
            {s.ctrLow}–{s.ctrHigh}%
          </div>
          <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Predicted CTR band · {(s.confidence * 100).toFixed(0)}% conf
          </div>
        </div>
      </div>
      <Row label="Focal clarity" v={s.focalClarity} />
      <Row label="Value-prop attention" v={s.valuePropAttention} />
      <Row label="CTA attention" v={s.ctaAttention} />
      <Row label="Clutter (lower better)" v={s.clutter} invert />
      <p className="text-[11px] pt-1" style={{ color: 'var(--muted)' }}>
        Decision-support only — calibrated against your real LinkedIn results over time, never a guaranteed CTR.
      </p>
    </div>
  );
}

export function ScoreChips({ s }: { s: Scores }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: '#1f2417', color: '#c6ff3a' }}>
        ⚡ {s.stoppingPower}
      </span>
      <span className="px-2 py-0.5 rounded-full" style={{ background: '#23232b', color: 'var(--muted)' }}>
        CTR {s.ctrLow}–{s.ctrHigh}%
      </span>
    </div>
  );
}
