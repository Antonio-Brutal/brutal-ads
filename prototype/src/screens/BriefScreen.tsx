import { useState } from 'react';
import { EXAMPLE_BRIEFS } from '../lib/mock';

const CHIPS = {
  Persona: ['RevOps leaders', 'Heads of Sales', 'Founders', 'SDR managers'],
  Objective: ['Demo bookings', 'Awareness', 'Lead gen', 'Webinar signups'],
  Tone: ['Confident', 'Contrarian', 'Playful', 'Proof-led'],
};

export function BriefScreen({ onSubmit }: { onSubmit: (brief: string) => void }) {
  const [brief, setBrief] = useState(EXAMPLE_BRIEFS[0]);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-14">
        <div className="text-[12px] uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--muted)' }}>
          New campaign
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.05] mb-3">
          Describe the ad.<br />
          <span style={{ color: 'var(--acid)' }}>The studio builds the rest.</span>
        </h1>
        <p className="text-[15px] mb-8" style={{ color: 'var(--muted)' }}>
          One line in. A board of on-brand, testable LinkedIn ads out — every layer editable. No prompt engineering.
        </p>

        <div className="rounded-xl p-4" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={4}
            placeholder="e.g. Promote Brutal's AI SDR to RevOps leaders. Confident, slightly contrarian. Goal: demo bookings."
            className="w-full bg-transparent outline-none resize-none text-[16px] leading-relaxed"
            style={{ color: 'var(--paper)' }}
          />
          <div className="flex flex-wrap gap-x-6 gap-y-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
            {Object.entries(CHIPS).map(([group, items]) => (
              <div key={group} className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  {group}
                </span>
                {items.map((it) => (
                  <button
                    key={it}
                    onClick={() => setBrief((b) => (b.includes(it) ? b : `${b.trim()} ${b.trim().endsWith('.') ? '' : '·'} ${it}`.trim()))}
                    className="text-[12px] px-2.5 py-1 rounded-full transition-colors"
                    style={{ background: 'var(--ink-3)', color: 'var(--paper)' }}
                  >
                    {it}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-5">
          <button
            onClick={() => brief.trim() && onSubmit(brief.trim())}
            className="font-display text-lg px-6 py-3 rounded-lg transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--acid)', color: 'var(--ink)', boxShadow: '4px 4px 0 rgba(198,255,58,0.25)' }}
          >
            Generate concepts →
          </button>
          <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
            8 agents · ~12s · 6 variants
          </span>
        </div>

        <div className="mt-10">
          <div className="text-[12px] uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>
            Try an example
          </div>
          <div className="space-y-2">
            {EXAMPLE_BRIEFS.map((ex) => (
              <button
                key={ex}
                onClick={() => setBrief(ex)}
                className="block w-full text-left text-[14px] px-4 py-3 rounded-lg transition-colors hover:brightness-125"
                style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', color: 'var(--paper)' }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
