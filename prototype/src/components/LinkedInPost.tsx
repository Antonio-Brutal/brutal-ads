import type { Format, Variant } from '../lib/types';
import { AdComposite } from './AdComposite';

/** Renders the creative inside an authentic LinkedIn single-image sponsored post (dark mode). */
export function LinkedInPost({ variant, format = '1:1' }: { variant: Variant; format?: Format }) {
  return (
    <div
      style={{ background: '#1b1f23', border: '1px solid #2c333a', color: '#e9eaec' }}
      className="rounded-lg overflow-hidden w-full"
    >
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <div className="font-display grid place-items-center" style={{ width: 48, height: 48, background: '#c6ff3a', color: '#0b0b0f', fontSize: 24 }}>
          B
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-[15px]">Brutal</div>
          <div className="text-[12px]" style={{ color: '#8b949e' }}>
            3,418 followers · Promoted
          </div>
        </div>
        <div className="ml-auto text-xl" style={{ color: '#8b949e' }}>
          ⋯
        </div>
      </div>

      {/* intro text (the hook) */}
      <div className="px-4 pb-3 text-[14px] leading-snug">
        {variant.hook} <span style={{ color: '#8b949e' }}>…see more</span>
      </div>

      {/* the creative */}
      <AdComposite variant={variant} format={format} />

      {/* LinkedIn footer: domain + headline field + preset CTA button */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#15191c' }}>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide" style={{ color: '#8b949e' }}>
            brutal.ai
          </div>
          <div className="text-[14px] font-semibold truncate">Meet your tireless AI SDR</div>
        </div>
        <button
          className="ml-auto shrink-0 rounded-full px-4 py-1.5 text-[14px] font-semibold"
          style={{ border: '1px solid #5b9bff', color: '#7eb0ff' }}
        >
          Learn more
        </button>
      </div>

      {/* reactions row */}
      <div className="flex items-center justify-around px-2 py-2 text-[13px]" style={{ color: '#8b949e', borderTop: '1px solid #2c333a' }}>
        <span>👍 Like</span>
        <span>💬 Comment</span>
        <span>🔁 Repost</span>
        <span>➤ Send</span>
      </div>
    </div>
  );
}
