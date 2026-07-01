// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import { createStore } from 'polotno/model/store';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Workspace } from 'polotno/canvas/workspace';
import { SidePanel } from 'polotno/side-panel';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import type { Variant } from '../lib/types';
import { ART } from '../lib/art';
import { ChatPanel } from '../components/ChatPanel';
import { PreflightPanel } from '../components/PreflightPanel';
import { ExportModal } from '../components/ExportModal';

const POLOTNO_KEY = 'nFA5H9elEytDyPyvKL7T'; // public dev key (localhost)

function uri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
const SCRIM = uri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0.4" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.82"/></linearGradient></defs><rect width="1200" height="1200" fill="url(#s)"/></svg>`,
);
const SAFE = uri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200">
    <rect x="60" y="60" width="1080" height="1080" fill="none" stroke="#c6ff3a" stroke-width="3" stroke-dasharray="14 10"/>
    <text x="68" y="48" fill="#c6ff3a" font-family="sans-serif" font-size="22">safe zone</text>
    <circle cx="112" cy="112" r="66" fill="none" stroke="#ff3d7f" stroke-width="3" stroke-dasharray="8 8"/>
    <line x1="0" y1="760" x2="1200" y2="760" stroke="#5b9bff" stroke-width="3" stroke-dasharray="14 10"/>
    <text x="12" y="752" fill="#5b9bff" font-size="20" font-family="sans-serif">"see more" fold</text>
  </svg>`,
);

const PUNCHY = [
  'STOP LOSING DEALS TO SLOW FOLLOW-UP',
  'YOUR SDR JUST STOPPED SLEEPING',
  'OUTBOUND THAT NEVER CLOCKS OUT',
  'THE FOLLOW-UP, HANDLED.',
];
const CTAS = ['See it work →', 'Book a teardown →', 'Watch the demo →', 'Get the numbers →'];

function buildStore(variant: Variant) {
  const store = createStore({ key: POLOTNO_KEY, showCredit: false });
  store.setSize(1200, 1200);
  const page = store.addPage();
  page.set({ background: '#0b0b0f' });

  page.addElement({ type: 'image', src: ART[variant.artId], x: 0, y: 0, width: 1200, height: 1200, removable: false });
  const scrim = page.addElement({ type: 'image', src: SCRIM, x: 0, y: 0, width: 1200, height: 1200, selectable: false, removable: false });
  const safe = page.addElement({ type: 'image', src: SAFE, x: 0, y: 0, width: 1200, height: 1200, selectable: false, removable: false, opacity: 0, alwaysOnTop: true });
  const logo = page.addElement({ type: 'text', text: 'BRUTAL', x: 72, y: 60, width: 700, fontSize: 48, fontFamily: 'Roboto', fontWeight: 'bold', fill: '#f6f6f4', align: 'left' });
  const headline = page.addElement({ type: 'text', text: variant.headline, x: 72, y: 730, width: 1056, fontSize: 94, fontFamily: 'Roboto', fontWeight: 'bold', fill: '#f6f6f4', lineHeight: 1.0, align: 'left' });
  const cta = page.addElement({ type: 'text', text: variant.cta + ' →', x: 72, y: 1058, width: 640, fontSize: 38, fontFamily: 'Roboto', fontWeight: 'bold', fill: '#0b0b0f', align: 'left', backgroundEnabled: true, backgroundColor: '#c6ff3a', backgroundOpacity: 1, backgroundPadding: 0.45, backgroundCornerRadius: 0.3 });

  return { store, ids: { scrim: scrim.id, safe: safe.id, logo: logo.id, headline: headline.id, cta: cta.id } };
}

export function EditorScreen({ variant, onBack }: { variant: Variant; onBack: () => void }) {
  const { store, ids } = useMemo(() => buildStore(variant), [variant]);
  const [, setRev] = useState(0);
  const [showSafe, setShowSafe] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const headlineIdx = useRef(0);
  const ctaIdx = useRef(0);

  // live re-render on any canvas change (drag, inline edit, chat edit)
  useEffect(() => {
    const cb = () => setRev((r) => r + 1);
    store.on?.('change', cb);
    return () => store.off?.('change', cb);
  }, [store]);

  useEffect(() => {
    store.getElementById(ids.safe)?.set({ opacity: showSafe ? 1 : 0 });
  }, [showSafe, store, ids.safe]);

  function applyInstruction(text: string): { agent: string; msg: string } {
    const t = text.toLowerCase();
    const h = store.getElementById(ids.headline);
    const cta = store.getElementById(ids.cta);
    const logo = store.getElementById(ids.logo);
    const page = store.pages[0];
    let msg = '';

    if (/(punch|angr|bold|short|stronger|harder|rewrite)/.test(t)) {
      headlineIdx.current = (headlineIdx.current + 1) % PUNCHY.length;
      h?.set({ text: PUNCHY[headlineIdx.current] });
      msg = `Rewrote the headline → "${PUNCHY[headlineIdx.current]}". Patched 1 layer (headline.text).`;
    } else if (/(bigger|larger|huge)/.test(t)) {
      h?.set({ fontSize: Math.min((h.fontSize || 94) + 16, 168) });
      msg = `Bumped headline to ${h?.fontSize}px.`;
    } else if (/(smaller|tighter)/.test(t)) {
      h?.set({ fontSize: Math.max((h.fontSize || 94) - 14, 48) });
      msg = `Reduced headline to ${h?.fontSize}px.`;
    } else if (/(magenta|pink)/.test(t)) {
      h?.set({ fill: '#ff3d7f' });
      msg = 'Headline → magenta. Pre-flight re-checked contrast.';
    } else if (/(acid|lime|green)/.test(t)) {
      h?.set({ fill: '#c6ff3a' });
      msg = 'Headline → acid lime.';
    } else if (/(white|paper)/.test(t)) {
      h?.set({ fill: '#f6f6f4' });
      msg = 'Headline → paper white.';
    } else if (/dark/.test(t)) {
      page?.set({ background: '#0b0b0f' });
      h?.set({ fill: '#f6f6f4' });
      msg = 'Switched to the dark brand theme.';
    } else if (/light/.test(t)) {
      page?.set({ background: '#f6f6f4' });
      h?.set({ fill: '#0b0b0f' });
      msg = 'Switched to a light theme — watch the contrast warning in pre-flight.';
    } else if (/logo/.test(t)) {
      if (/right/.test(t) && /bottom/.test(t)) logo?.set({ x: 760, y: 1090 });
      else if (/bottom/.test(t)) logo?.set({ x: 72, y: 1090 });
      else if (/right/.test(t)) logo?.set({ x: 820, y: 60 });
      else logo?.set({ x: 72, y: 60 });
      msg = 'Moved the logo layer.';
    } else if (/(cta|button)/.test(t)) {
      ctaIdx.current = (ctaIdx.current + 1) % CTAS.length;
      cta?.set({ text: CTAS[ctaIdx.current] });
      msg = `New CTA → "${CTAS[ctaIdx.current]}".`;
    } else {
      msg =
        "I edit any layer directly. Try: 'make the headline punchier', 'switch to magenta', 'move logo bottom-right', 'bigger headline', or 'new CTA options'.";
    }
    setRev((r) => r + 1);
    return { agent: 'Editor-Agent', msg };
  }

  function hideSafe() {
    store.getElementById(ids.safe)?.set({ opacity: 0 });
  }
  function restoreSafe() {
    store.getElementById(ids.safe)?.set({ opacity: showSafe ? 1 : 0 });
  }
  async function openExport() {
    setExportUrl(null);
    setShowExport(true);
    hideSafe(); // never export the guide overlay
    try {
      const url = await Promise.resolve(store.toDataURL({ mimeType: 'image/jpeg', pixelRatio: 1 }));
      setExportUrl(url);
    } catch {
      setExportUrl(null);
    } finally {
      restoreSafe();
    }
  }
  function download() {
    hideSafe();
    store.saveAsImage({ fileName: 'brutal-ad-1200x1200.jpg', mimeType: 'image/jpeg' });
    restoreSafe();
  }

  const h = store.getElementById(ids.headline);
  const cta = store.getElementById(ids.cta);
  const snap = {
    headlineFill: h?.fill ?? '#f6f6f4',
    headlineSize: h?.fontSize ?? 94,
    headlineText: h?.text ?? '',
    ctaText: cta?.text ?? '',
  };

  return (
    <div className="h-full flex flex-col">
      {/* mini bar */}
      <div className="flex items-center gap-3 px-4 shrink-0" style={{ height: 52, borderBottom: '1px solid var(--line)' }}>
        <button onClick={onBack} className="text-[14px] px-2 py-1 rounded" style={{ color: 'var(--muted)' }}>
          ← Board
        </button>
        <div className="text-[14px] font-semibold">{variant.angle}</div>
        <div className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: 'var(--ink-3)', color: 'var(--muted)' }}>
          1200 × 1200 · 1:1
        </div>
        <button
          onClick={openExport}
          className="ml-auto font-display px-4 py-2 rounded-lg text-[14px]"
          style={{ background: 'var(--acid)', color: 'var(--ink)' }}
        >
          Export ↓
        </button>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* Polotno editor */}
        <div className="flex-1 min-w-0 h-full bp5-dark">
          <PolotnoContainer style={{ width: '100%', height: '100%' }}>
            <SidePanelWrap>
              <SidePanel store={store} />
            </SidePanelWrap>
            <WorkspaceWrap>
              <Toolbar store={store} />
              <Workspace store={store} />
              <ZoomButtons store={store} />
            </WorkspaceWrap>
          </PolotnoContainer>
        </div>

        {/* right rail */}
        <div className="shrink-0 h-full flex flex-col" style={{ width: 348, borderLeft: '1px solid var(--line)', background: 'var(--ink-2)' }}>
          <div className="px-4 py-3 text-[12px] flex items-center gap-2" style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>
            <span style={{ width: 12, height: 12, background: 'var(--acid)', display: 'inline-block' }} />
            Brand kit: <span style={{ color: 'var(--paper)' }}>Brutal</span> · acid / ink · Inter
          </div>

          <div className="px-4 pt-3 pb-1 text-[12px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Edit by chat
          </div>
          <div className="flex-1 min-h-0 px-4 pb-3">
            <ChatPanel onInstruction={applyInstruction} />
          </div>

          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--line)' }}>
            <PreflightPanel snap={snap} showSafe={showSafe} onToggleSafe={() => setShowSafe((s) => !s)} />
          </div>
        </div>
      </div>

      {showExport && <ExportModal dataUrl={exportUrl} onClose={() => setShowExport(false)} onDownload={download} />}
    </div>
  );
}
