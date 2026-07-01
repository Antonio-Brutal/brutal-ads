import { useEffect, useState } from 'react';
import { AGENT_STEPS } from '../lib/mock';

export function GeneratingScreen({ brief, onDone }: { brief: string; onDone: () => void }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= AGENT_STEPS.length) {
      const t = setTimeout(onDone, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setActive((a) => a + 1), 520);
    return () => clearTimeout(t);
  }, [active, onDone]);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-[12px] uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--muted)' }}>
          The studio is working
        </div>
        <div className="rounded-lg px-4 py-3 mb-8 text-[14px]" style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
          “{brief}”
        </div>

        <div className="space-y-1.5">
          {AGENT_STEPS.map((step, i) => {
            const state = i < active ? 'done' : i === active ? 'running' : 'pending';
            return (
              <div
                key={step.agent}
                className="flex items-center gap-4 rounded-lg px-4 py-3 relative overflow-hidden"
                style={{
                  background: state === 'pending' ? 'transparent' : 'var(--ink-2)',
                  border: '1px solid',
                  borderColor: state === 'running' ? 'var(--acid)' : 'var(--line)',
                  opacity: state === 'pending' ? 0.45 : 1,
                }}
              >
                {state === 'running' && <div className="sweep absolute inset-0" />}
                <div
                  className="grid place-items-center rounded-full shrink-0"
                  style={{
                    width: 30,
                    height: 30,
                    background: state === 'done' ? 'var(--acid)' : 'var(--ink-3)',
                    color: state === 'done' ? 'var(--ink)' : 'var(--paper)',
                  }}
                >
                  {state === 'done' ? '✓' : state === 'running' ? <span className="pulse-dot">●</span> : i + 1}
                </div>
                <div className="min-w-0 relative">
                  <div className="font-semibold text-[15px]">{step.agent}</div>
                  <div className="text-[13px] truncate" style={{ color: 'var(--muted)' }}>
                    {step.task}
                  </div>
                </div>
                {state === 'running' && (
                  <div className="ml-auto text-[12px] relative" style={{ color: 'var(--acid)' }}>
                    working…
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
