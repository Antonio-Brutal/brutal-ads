import { useState } from 'react';

type Msg = { role: 'user' | 'agent'; text: string; agent?: string };

const SUGGESTIONS = [
  'Make the headline punchier',
  'Switch to a magenta theme',
  'Move the logo bottom-right',
  'Make the headline bigger',
  'New CTA options',
];

export function ChatPanel({ onInstruction }: { onInstruction: (text: string) => { agent: string; msg: string } }) {
  const [log, setLog] = useState<Msg[]>([
    { role: 'agent', agent: 'Editor-Agent', text: 'Tell me what to change. I edit the layers directly — no re-rolling the whole ad.' },
  ]);
  const [input, setInput] = useState('');

  function send(text: string) {
    if (!text.trim()) return;
    const res = onInstruction(text.trim());
    setLog((l) => [...l, { role: 'user', text: text.trim() }, { role: 'agent', agent: res.agent, text: res.msg }]);
    setInput('');
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto space-y-2 pr-1">
        {log.map((m, i) => (
          <div
            key={i}
            className="rounded-lg px-3 py-2 text-[13px] fadein"
            style={{
              background: m.role === 'user' ? 'var(--ink-3)' : '#16190f',
              border: m.role === 'agent' ? '1px solid #2e3a16' : '1px solid var(--line)',
              marginLeft: m.role === 'user' ? '20%' : 0,
              marginRight: m.role === 'agent' ? '8%' : 0,
            }}
          >
            {m.role === 'agent' && (
              <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--acid)' }}>
                {m.agent}
              </div>
            )}
            {m.text}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 my-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="text-[11px] px-2 py-1 rounded-full"
            style={{ background: 'var(--ink-3)', color: 'var(--muted)' }}
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Edit by chat…"
          className="flex-1 rounded-lg px-3 py-2 text-[13px] outline-none"
          style={{ background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--paper)' }}
        />
        <button type="submit" className="px-3 rounded-lg font-semibold text-[13px]" style={{ background: 'var(--acid)', color: 'var(--ink)' }}>
          Send
        </button>
      </form>
    </div>
  );
}
