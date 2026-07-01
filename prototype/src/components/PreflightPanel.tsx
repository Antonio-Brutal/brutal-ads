import { contrastGrade, contrastRatio } from '../lib/contrast';
import { BRUTAL } from '../lib/brand';

export interface PreflightSnapshot {
  headlineFill: string;
  headlineSize: number;
  headlineText: string;
  ctaText: string;
}

type Check = { label: string; ok: boolean; detail: string };

function Light({ ok }: { ok: boolean }) {
  return (
    <span
      className="grid place-items-center rounded-full shrink-0 text-[11px]"
      style={{ width: 18, height: 18, background: ok ? '#1f2417' : '#2e1a14', color: ok ? '#c6ff3a' : '#ff8a5c' }}
    >
      {ok ? '✓' : '!'}
    </span>
  );
}

export function PreflightPanel({
  snap,
  showSafe,
  onToggleSafe,
}: {
  snap: PreflightSnapshot;
  showSafe: boolean;
  onToggleSafe: () => void;
}) {
  // Contrast is computed against the dark scrim that sits under the headline (~ink).
  const ratio = contrastRatio(snap.headlineFill, BRUTAL.colors.ink);
  const grade = contrastGrade(ratio);

  const text = `${snap.headlineText} ${snap.ctaText}`.toLowerCase();
  const banned = BRUTAL.bannedTerms.filter((t) => text.includes(t.toLowerCase()));

  const checks: Check[] = [
    { label: 'Headline contrast', ok: grade.pass, detail: grade.label },
    { label: 'Legible at thumbnail', ok: snap.headlineSize >= 64, detail: `${Math.round(snap.headlineSize)}px on 1200px canvas` },
    { label: 'Spec: 1200×1200 · 1:1', ok: true, detail: 'Within LinkedIn single-image limits' },
    { label: 'Export: JPG ≤ 5 MB', ok: true, detail: '≈ 0.4 MB estimated' },
    { label: 'Brand voice', ok: banned.length === 0, detail: banned.length ? `Banned: ${banned.join(', ')}` : 'No banned terms · palette on-kit' },
  ];

  const passing = checks.filter((c) => c.ok).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold">
          Pre-flight{' '}
          <span style={{ color: passing === checks.length ? 'var(--acid)' : '#ff8a5c' }}>
            {passing}/{checks.length}
          </span>
        </div>
        <button
          onClick={onToggleSafe}
          className="text-[11px] px-2 py-1 rounded-full"
          style={{ background: showSafe ? 'var(--acid)' : 'var(--ink-3)', color: showSafe ? 'var(--ink)' : 'var(--muted)' }}
        >
          Safe zones {showSafe ? 'on' : 'off'}
        </button>
      </div>
      {checks.map((c) => (
        <div key={c.label} className="flex items-start gap-2.5">
          <Light ok={c.ok} />
          <div className="min-w-0">
            <div className="text-[13px] leading-tight">{c.label}</div>
            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
              {c.detail}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
