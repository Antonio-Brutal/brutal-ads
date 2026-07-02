'use client';

import { useState } from 'react';
import { TreePreview } from '@/components/TreePreview';

interface Props { variantId: string; initialTree: never; hook: string }

export function EditorClient({ variantId, initialTree, hook }: Props) {
  const [tree, setTree] = useState<never>(initialTree);
  const [log, setLog] = useState<Array<{ who: 'you' | 'agent'; text: string }>>([
    { who: 'agent', text: 'Chat-to-edit bereit. Beispiele: "mach die Headline gold", "kürzer", "größer", "hide the logo".' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    const instruction = input.trim();
    if (!instruction) return;
    setBusy(true);
    setLog((l) => [...l, { who: 'you', text: instruction }]);
    setInput('');
    const res = await fetch('/api/editor/patch', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ variantId, instruction }),
    });
    const data = await res.json();
    if (res.ok) {
      setTree(data.tree);
      setLog((l) => [...l, { who: 'agent', text: `LayerPatch angewendet: ${data.patch.ops.map((o: { op: string }) => o.op).join(', ')} (${data.patch.note ?? data.patch.id})` }]);
    } else {
      setLog((l) => [...l, { who: 'agent', text: `Fehler: ${data.error}` }]);
    }
    setBusy(false);
  }

  async function exportJpg() {
    setBusy(true);
    const res = await fetch('/api/export', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ variantId, format: 'jpg' }),
    });
    setBusy(false);
    if (!res.ok) { setLog((l) => [...l, { who: 'agent', text: `Export-Fehler: ${res.status}` }]); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `brutal-ad-${variantId.slice(0, 8)}.jpg`; a.click();
    URL.revokeObjectURL(url);
    setLog((l) => [...l, { who: 'agent', text: `Exportiert: ${res.headers.get('x-render-bytes')} bytes (≤5MB Gate ✓), sha256 ${res.headers.get('x-render-sha256')?.slice(0, 12)}…` }]);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28 }}>
      <div>
        <TreePreview tree={tree} width={640} />
        <p style={{ color: '#8a8a99', fontSize: 12, marginTop: 10 }}>&ldquo;{hook}&rdquo;</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button data-testid="export" onClick={exportJpg} disabled={busy}
          style={{ background: '#b6e64a', color: '#0a0a0a', fontWeight: 800, padding: '12px 18px',
            borderRadius: 10, border: 0, cursor: 'pointer' }}>
          Export JPG (headless render, ≤5MB) ↓
        </button>
        <div style={{ background: '#141419', border: '1px solid #2a2a33', borderRadius: 12, padding: 14,
          minHeight: 320, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {log.map((m, i) => (
            <div key={i} style={{ fontSize: 13, color: m.who === 'you' ? '#f6f6f4' : '#b6e64a' }}>
              <b>{m.who === 'you' ? 'Du' : 'EditorAgent'}:</b> {m.text}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input data-testid="chat-input" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Edit per Chat…"
            style={{ flex: 1, background: '#0b0b0f', color: '#f6f6f4', border: '1px solid #2a2a33',
              borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
          <button data-testid="chat-send" onClick={send} disabled={busy}
            style={{ background: '#cba65e', color: '#0a0a0a', fontWeight: 700, padding: '10px 16px',
              borderRadius: 10, border: 0, cursor: 'pointer' }}>Send</button>
        </div>
      </div>
    </div>
  );
}
