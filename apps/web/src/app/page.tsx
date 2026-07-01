export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ width: 18, height: 18, background: 'var(--acid)', display: 'inline-block' }} />
        <span style={{ fontWeight: 900, letterSpacing: '-0.02em', fontSize: 22 }}>
          BRUTAL <span style={{ color: '#8a8a99', fontWeight: 400, fontSize: 14 }}>ADS</span>
        </span>
      </div>
      <h1 style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.05, marginBottom: 12 }}>
        Describe the ad.<br />
        <span style={{ color: 'var(--acid)' }}>The studio builds the rest.</span>
      </h1>
      <p style={{ color: '#9a9aa2', fontSize: 16, marginBottom: 32 }}>
        Scaffold only — the platform (brief → agent studio → variant board → Polotno editor → export) is
        built from the specification in <code>/docs</code>. See the working UX reference in{' '}
        <code>/prototype</code>. Start the build from <code>BUILD.md</code>.
      </p>
      <ul style={{ color: '#9a9aa2', fontSize: 14, lineHeight: 1.9 }}>
        <li>Data model + RLS → <code>docs/03</code>, migrations → <code>supabase/</code></li>
        <li>Provider bus (BFL/Fal/Kling/ElevenLabs) → <code>docs/04</code>, <code>src/server/providers/</code></li>
        <li>Creative Studio agents → <code>docs/05</code>, <code>src/server/studio/</code></li>
        <li>Editor + compositor → <code>docs/06</code>, <code>src/editor/</code></li>
        <li>Engagement engine → <code>docs/08</code>, <code>services/engine/</code></li>
      </ul>
    </main>
  );
}
