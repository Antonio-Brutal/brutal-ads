'use client';

import { useState } from 'react';
import type { EngagementScoresT } from '@brutal/shared';

// P6 — per-variant engagement chip on the board. Bands + confidence, never bare
// points (CANON §6): the CTR range and the stub's low confidence stay visible.

export function ScoreChip({ variantId, initial }: { variantId: string; initial?: EngagementScoresT }) {
  const [scores, setScores] = useState<EngagementScoresT | undefined>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function score(e: React.MouseEvent) {
    e.preventDefault();               // chip lives inside the card's <Link>
    e.stopPropagation();
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/engagement', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variantId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setScores(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (error) return <span style={{ fontSize: 11, color: '#e07a6a' }}>score failed: {error.slice(0, 60)}</span>;

  if (!scores?.stoppingPower) {
    return (
      <button onClick={score} disabled={busy} data-testid="score-btn"
        style={{ fontSize: 11, color: '#b6e64a', background: 'none', border: '1px solid #3a4a2a',
          borderRadius: 6, padding: '3px 8px', cursor: busy ? 'wait' : 'pointer' }}>
        {busy ? 'scoring…' : '⚡ score engagement'}
      </button>
    );
  }

  const sp = scores.stoppingPower;
  const ctr = scores.predictedCtrBand;
  const stub = scores.saliencySource === 'stub-geometry';
  return (
    <span data-testid="score-chip" title={`focal ${scores.focalClarity?.value ?? '–'} · value-prop ${scores.valuePropAttention?.value ?? '–'} · CTA ${scores.ctaAttention?.value ?? '–'} · clutter ${scores.clutter?.value ?? '–'}`}
      style={{ fontSize: 11, color: '#b6e64a' }}>
      ⚡ {Math.round(sp.value * 100)} <span style={{ color: '#7a8a5a' }}>({Math.round(sp.band[0] * 100)}–{Math.round(sp.band[1] * 100)})</span>
      {ctr ? <span style={{ color: '#8a8a99' }}> · CTR {ctr.low}–{ctr.high}%</span> : null}
      {stub ? <span style={{ color: '#66666f' }}> · stub</span> : null}
    </span>
  );
}
