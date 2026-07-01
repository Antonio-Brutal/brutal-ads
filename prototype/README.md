# Brutal Ads — Clickable Prototype

A **front-end-only** prototype of the platform. No backend, no API keys, no real image
generation — generation is mocked with bundled artwork so you can *feel the UX* and judge the
direction before we build the real thing. The editor uses the **real Polotno SDK** (the editor
foundation you chose), so layered editing is genuine.

## Run it

```bash
cd prototype
npm install      # already done if you see node_modules/
npm run dev      # → http://localhost:5173
```

## The flow (what to click)

1. **Brief** — type or pick an example, hit *Generate concepts*.
2. **Studio working** — watch the 8-agent pipeline (Strategist → Copywriter → Art Director →
   Image Gen → Compositor → Brand Guardian → Critic → Engagement). This is the team-of-agents model.
3. **Board** — left = a live **LinkedIn feed preview**; right = scored variants. Click a card to
   preview it in the feed, switch formats (1:1 / 1.91:1 / 4:5), or *Make 6 more*.
4. **Editor** — open any variant:
   - The creative is a **layer tree**: AI background + editable **logo / headline / CTA**.
   - **Edit by chat** (right rail): "make the headline punchier", "switch to a magenta theme",
     "move logo bottom-right", "bigger headline", "new CTA options" — these patch layers live.
   - **Pre-flight** (right rail): real WCAG contrast, legibility, spec, brand checks + a
     **safe-zone overlay** toggle (feed crop, profile overlap, "see more" fold).
   - **Export** → a real 1200×1200 JPG flattened from the canvas, to LinkedIn's single-image spec.

## What's mock vs real

| Real | Mocked (for the demo) |
|---|---|
| Polotno layered editor, drag/resize/type | "AI" backgrounds (bundled SVG art, not FLUX) |
| Chat-to-edit patching actual layers | The agent pipeline animation (no real Claude calls) |
| WCAG contrast + pre-flight checks | Engagement scores (plausible numbers) |
| Real JPG export from the canvas | Variant copy (curated, lightly themed) |

## Known item

The editor canvas shows a **"FREE TRIAL LICENSE"** watermark — that's Polotno's unlicensed-dev
mark (it does **not** appear on the exported JPG). Removing it on-canvas needs a free Polotno
dev key registered to a domain, or a license. Tracked as a decision for the real build.

## Stack

Vite + React 18 + TypeScript + Tailwind v4 + Polotno. No backend by design.
