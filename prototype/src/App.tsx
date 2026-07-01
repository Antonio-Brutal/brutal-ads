import { useState } from 'react';
import type { Variant } from './lib/types';
import { generateVariants, moreVariants } from './lib/mock';
import { BriefScreen } from './screens/BriefScreen';
import { GeneratingScreen } from './screens/GeneratingScreen';
import { BoardScreen } from './screens/BoardScreen';
import { EditorScreen } from './screens/EditorScreen';

type Screen = 'brief' | 'generating' | 'board' | 'editor';

export default function App() {
  const [screen, setScreen] = useState<Screen>('brief');
  const [brief, setBrief] = useState('');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selected, setSelected] = useState<Variant | null>(null);

  const crumbs: { key: Screen; label: string }[] = [
    { key: 'brief', label: 'Brief' },
    { key: 'board', label: 'Board' },
    { key: 'editor', label: 'Editor' },
  ];
  const order: Screen[] = ['brief', 'generating', 'board', 'editor'];

  return (
    <div className="h-full flex flex-col grain">
      {/* header */}
      <header className="flex items-center gap-4 px-5 shrink-0" style={{ height: 56, borderBottom: '1px solid var(--line)' }}>
        <button onClick={() => setScreen('brief')} className="font-display text-xl flex items-center gap-2">
          <span style={{ width: 18, height: 18, background: 'var(--acid)', display: 'inline-block' }} />
          BRUTAL <span style={{ color: 'var(--muted)' }} className="font-sans font-normal text-sm">ADS</span>
        </button>

        <nav className="flex items-center gap-1 text-[13px]">
          {crumbs.map((c, i) => {
            const active = c.key === screen || (screen === 'generating' && c.key === 'brief');
            const reachable =
              c.key === 'brief' ||
              (c.key === 'board' && variants.length > 0) ||
              (c.key === 'editor' && !!selected);
            return (
              <span key={c.key} className="flex items-center gap-1">
                {i > 0 && <span style={{ color: 'var(--line)' }}>/</span>}
                <button
                  disabled={!reachable}
                  onClick={() => reachable && setScreen(c.key)}
                  className="px-2 py-1 rounded disabled:opacity-40"
                  style={{ color: active ? 'var(--acid)' : 'var(--muted)' }}
                >
                  {c.label}
                </button>
              </span>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'var(--ink-3)', color: 'var(--muted)' }}>
            Prototype · mock data · no backend
          </span>
        </div>
      </header>

      {/* body */}
      <main className="flex-1 min-h-0">
        {screen === 'brief' && (
          <BriefScreen
            onSubmit={(b) => {
              setBrief(b);
              setScreen('generating');
            }}
          />
        )}
        {screen === 'generating' && (
          <GeneratingScreen
            brief={brief}
            onDone={() => {
              setVariants(generateVariants(brief));
              setScreen('board');
            }}
          />
        )}
        {screen === 'board' && (
          <BoardScreen
            brief={brief}
            variants={variants}
            onOpen={(v) => {
              setSelected(v);
              setScreen('editor');
            }}
            onNewBrief={() => setScreen('brief')}
            onMore={() => setVariants((vs) => [...moreVariants(vs.length).slice(0, 6)])}
          />
        )}
        {screen === 'editor' && selected && <EditorScreen variant={selected} onBack={() => setScreen('board')} />}
      </main>
    </div>
  );
}
