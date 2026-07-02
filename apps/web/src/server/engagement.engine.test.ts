import { describe, expect, it } from 'vitest';

// P6 engine integration — runs ONLY when ENGINE_URL points at a live engine
// (e.g. `ENGINE_SHARED_SECRET=dev-secret uvicorn app.main:app --port 8317` in
// services/engine, then ENGINE_URL=http://127.0.0.1:8317 pnpm test). Exercises
// the full path: mock studio → real polotno render → saliency engine → zod → store.
describe.skipIf(!process.env.ENGINE_URL)('P6 engine integration', () => {
  it('scores a studio variant through the live saliency engine', async () => {
    const { createBrief, variantsForBrief } = await import('./runtime');
    const { scoreVariant, engagementMode } = await import('./engagement');
    expect(engagementMode()).toBe('engine');

    const brief = await createBrief('Testanzeige für Kanzlei-Software', 'de');
    const [v] = await variantsForBrief(brief.id);
    const s = await scoreVariant(v!.id);

    expect(s.backend).toBe('saliency');
    expect(s.saliencySource).not.toBe('stub-geometry');   // must be the real engine
    for (const k of ['focalClarity', 'valuePropAttention', 'ctaAttention', 'clutter', 'stoppingPower'] as const) {
      expect(s[k]!.value).toBeGreaterThanOrEqual(0);
      expect(s[k]!.value).toBeLessThanOrEqual(1);
    }
    // scores persisted on the variant
    const { getVariant } = await import('./runtime');
    expect((await getVariant(v!.id))!.engagement?.stoppingPower!.value).toBe(s.stoppingPower!.value);
  }, 180_000);
});
