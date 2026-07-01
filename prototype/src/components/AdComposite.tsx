import type { Format, Variant } from '../lib/types';
import { FORMAT_DIMS } from '../lib/types';
import { ART } from '../lib/art';
import { BRUTAL } from '../lib/brand';

/**
 * The CREATIVE — a composited ad. AI-generated background (art) + editable layers
 * (logo / headline / CTA) on top. This is the visual proof of "composite, don't bake".
 * Scales with its container via container-query units (cqw).
 */
export function AdComposite({
  variant,
  format = '1:1',
  showCta = true,
}: {
  variant: Variant;
  format?: Format;
  showCta?: boolean;
}) {
  const dims = FORMAT_DIMS[format];
  const c = BRUTAL.colors;
  return (
    <div
      style={{
        containerType: 'inline-size',
        aspectRatio: `${dims.w} / ${dims.h}`,
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        background: c.ink,
      }}
    >
      <img
        src={ART[variant.artId]}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {/* bottom scrim for headline legibility */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.30) 44%, rgba(0,0,0,0) 72%)',
        }}
      />
      {/* logo layer */}
      <div
        className="font-display"
        style={{ position: 'absolute', left: '5%', top: '5%', display: 'flex', alignItems: 'center', gap: '2cqw' }}
      >
        <span style={{ width: '4.6cqw', height: '4.6cqw', background: c.accent, display: 'inline-block' }} />
        <span style={{ color: c.paper, fontSize: '3.8cqw', letterSpacing: '0.04em' }}>BRUTAL</span>
      </div>
      {/* headline layer */}
      <div
        className="font-display"
        style={{
          position: 'absolute',
          left: '5%',
          right: '8%',
          bottom: showCta ? '19%' : '7%',
          color: c.paper,
          fontSize: format === '1.91:1' ? '5.6cqw' : '7.2cqw',
          lineHeight: 1.02,
          textWrap: 'balance',
        }}
      >
        {variant.headline}
      </div>
      {/* CTA layer */}
      {showCta && (
        <div style={{ position: 'absolute', left: '5%', bottom: '6.5%' }}>
          <span
            style={{
              background: c.accent,
              color: c.ink,
              fontWeight: 800,
              fontSize: '3.2cqw',
              padding: '1.5cqw 3cqw',
              borderRadius: '1.2cqw',
              display: 'inline-block',
              boxShadow: '0.6cqw 0.6cqw 0 rgba(0,0,0,0.45)',
            }}
          >
            {variant.cta} →
          </span>
        </div>
      )}
    </div>
  );
}
