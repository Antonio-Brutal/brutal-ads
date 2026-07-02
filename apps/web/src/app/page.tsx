'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const EXAMPLE = 'KI-Vertragsentwurf für deutschsprachige Kanzleien bewerben — nüchtern, belegbar, Demo-Buchungen';

export default function Home() {
  const router = useRouter();
  const [brief, setBrief] = useState(EXAMPLE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/brief', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rawInput: brief, locale: 'de' }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'succeeded') throw new Error(data.error ?? `status: ${data.status}`);
      router.push(`/board/${data.briefId}`);
    } catch (e) { setError(String(e)); setBusy(false); }
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '72px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <span style={{ width: 18, height: 18, background: '#cba65e', display: 'inline-block' }} />
        <span style={{ fontWeight: 900, letterSpacing: '-0.02em', fontSize: 22 }}>
          BRUTAL <span style={{ color: '#8a8a99', fontWeight: 400, fontSize: 14 }}>ADS</span>
        </span>
      </div>
      <h1 style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.05, marginBottom: 10 }}>
        Describe the ad.<br /><span style={{ color: '#cba65e' }}>The studio builds the rest.</span>
      </h1>
      <p style={{ color: '#9a9aa2', marginBottom: 28 }}>
        One line in → strategy → copy → art direction → composed, brand-guarded variants. Every element an editable layer.
      </p>
      <textarea
        data-testid="brief-input"
        value={brief} onChange={(e) => setBrief(e.target.value)} rows={4}
        style={{ width: '100%', background: '#141419', color: '#f6f6f4', border: '1px solid #2a2a33',
          borderRadius: 12, padding: 16, fontSize: 16, resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 16 }}>
        <button
          data-testid="generate"
          onClick={submit} disabled={busy || !brief.trim()}
          style={{ background: '#b6e64a', color: '#0a0a0a', fontWeight: 800, fontSize: 17,
            padding: '14px 26px', borderRadius: 10, border: 0, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Studio arbeitet…' : 'Generate variants →'}
        </button>
        <span style={{ color: '#8a8a99', fontSize: 13 }}>11 agents · 4 archetypes · $0 mock mode without keys</span>
      </div>
      {error && <p style={{ color: '#ff8a5c', marginTop: 16 }}>{error}</p>}
    </main>
  );
}
