# 07 — LinkedIn Creative Playbook — Brutal Ads

> ⚠️ **CROSS-REFERENCE NOTE — read first (authoritative, per CANON §12 L1).** Some inline `docs/NN` / `doc NN` pointers in this file predate the frozen document map and may cite the wrong number. **Resolve every cross-reference by ROLE using this map, not by the integer written inline:** `01` product · `02` architecture · `03` data-model (all DDL/zod/schemas) · `04` providers · `05` agent-studio · `06` editor + `packages/render` + export · `07` creative-playbook · `08` engagement · `09` brand-kit · `10` build-plan · `11` env · `12` security/ops · `13` acceptance · `14` appendix. There is **no localization doc** (localization lives in `05` LocalizationAgent + `09` brand-kit `localization` + `07`) and **no "exporter" doc** (export lives in `06`). Source paths are `apps/web/src/**` (never `apps/web/lib/**`). Where anything here disagrees with CANON §12, **the ledger wins.**

> **Read `handoff/CANON.md` first.** This document is subordinate to CANON. Every object-model
> name, provider interface, agent name, env var, repo path, and LinkedIn format spec used here is
> canonical (CANON §5–§10). Where research or craft suggests a change, it is written as a clearly-labelled
> **⚑ RECOMMENDATION** and never silently diverges. Every external API carries a
> **`VERIFY current docs before coding`** note. Every assumption is flagged **⚑ ASSUMPTION**.
>
> **Audience:** an autonomous AI build factory with **zero outside context**. This is doc 07 of ~15.
>
> **Scope of this doc:** the **canonical creative rules the Creative Studio agents encode** — the format
> specs the exporter enforces, the conversion hierarchy every layout obeys, the hook/angle libraries the
> `Copywriter`/`Strategist` draw from, the carousel narrative structure the `CarouselArchitect` builds, the
> **variant matrix doctrine** that decides *what set of ads a brief becomes*, directional benchmarks (all
> flagged), the muted-first video rules, the anti-patterns the platform **structurally prevents**, and
> policy/compliance. **Written to be pasted verbatim into agent system prompts** (see §12 for the ready-made
> prompt blocks).
>
> **This doc is authoritative for:** *creative doctrine* — the rules agents apply. It is **not** authoritative
> for mechanisms owned elsewhere: object model → doc 03; agents' orchestration → doc 05; providers → doc 04;
> editor → doc 06; exporter render mechanics → doc 06/`packages/render`; engagement scoring →
> doc 08; localization → doc 05 (`LocalizationAgent`) + doc 09 (BrandKit `localization`) + §9 here. When this
> doc says "the exporter enforces X," doc 06 is authoritative for *how*; this doc is authoritative for *what
> the rule is*.

---

## 0. TL;DR (read this first)

1. **One load-bearing rule governs every creative decision (CANON §2):** *AI generates imagery only; every
   legible/on-brand element — headline, subhead, logo, CTA, legal, price, slide copy — is a **composited,
   editable vector/text `Layer`**, never baked into pixels.* Every rule below is downstream of this.
2. **The conversion hierarchy (§2) is the spine.** Stop the scroll → earn the second look → make the value
   legible in one glance → make the ask obvious. Agents optimize in that order. `Critic` and
   `EngagementAnalyst` score against it.
3. **A brief does not become one ad. It becomes a *matrix* (§5).** The **variant matrix doctrine** defines
   the canonical spread: **angle × hook-family × visual-concept**, deduplicated, producing the **4–6 ranked
   `Variant`s** the board shows. This is *structured diversity*, not random re-rolls.
4. **Specificity beats cleverness (CANON §7).** The `Copywriter` prefers a concrete number, named audience,
   or dated proof over a pun. Vague > clever is a bug.
5. **Muted-first is a hard constraint for video (CANON §8, R2 §5).** LinkedIn autoplays muted; **burned-in
   subtitles carry the story**; the **first 3 seconds** must earn the watch with **zero audio**.
6. **The platform *prevents* the classic LinkedIn-ad failure modes (§8)** rather than merely discouraging
   them — baked text, cropped headlines, missing disclaimers, and off-brand palettes are made *structurally
   impossible* by the layer tree + `BrandGuardian` hard gate + smart re-layout, not left to a human to
   remember.
7. **Every benchmark number in this doc is DIRECTIONAL and flagged (§6).** No benchmark is a promise. Real
   calibration comes only from the tenant's own LinkedIn `Result`s (CANON §9; doc 08).

> **Grounding research (whole-doc scope).** This document is grounded in **`R3-linkedin-playbook.md`**
> (`handoff/research/R3-linkedin-playbook.md` — the performance-CMO-grade 2026 LinkedIn creative
> playbook), alongside **R2/R4/R7** where they touch creative. **Every LinkedIn format fact is grounded in
> CANON §8** (the locked 2026 LinkedIn spec) and cross-checked against R3 §2. Creative craft (conversion
> hierarchy, hook/angle libraries, carousel structure, variant matrix, anti-patterns) is derived from
> **CANON §0–§2, §7–§9**, **R3 §3–§6**, and the client context. **All performance numbers (§6) are
> DIRECTIONAL priors** — labelled as such and **calibrated against the tenant's real LinkedIn `Result`s**
> (R3 §7; CANON §9; doc 08 §7); they are R3-sourced directional priors, not promises. Where R3 and any other
> doc disagree, **CANON §12 + R3 win** (R3 conforms to the ledger L1–L12). Nothing here contradicts CANON §8.

---

## 1. Canonical format specs (the exporter and agents enforce these — CANON §8)

These are the **only** creative dimensions the platform ships. All are lifted verbatim from CANON §8; the
platform **derives every ratio from one base via smart re-layout, never naive cropping**, respecting
safe-zones (CANON §8; R7 ⚑R-LT1). Copy limits are enforced by the `Copywriter` (author-time) **and** the
exporter (ship-time gate).

### 1.1 Single-image ad (`AdDocument.type = 'single_image'`)

| Field | Value | Enforced by | Notes |
|---|---|---|---|
| **Base ratio (default)** | **1:1 → 1200×1200 px** | exporter (base), `CompositorPlanner` | Best mobile feed. All other ratios re-layout from this base. |
| Ratio | **1.91:1 → 1200×627 px** | exporter (re-layout) | Desktop / landscape link-style. |
| Ratio | **4:5 → 960×1200 px** | exporter (re-layout) | **Mobile-only** placement. |
| File type | **JPG / PNG / GIF** | exporter | |
| File size | **≤ 5 MB** | exporter (ship-time gate) | Re-encode/compress if over before marking `Render` complete. |
| **Headline** | **≤ 70 characters** | `Copywriter` + exporter | Hard cap. Truncation at ship = bug. |
| **Intro text ("primary text")** | **~150 chars visible before "see more"; 600 chars max** | `Copywriter` | Front-load the hook into the first ~150 chars (the visible fold). |

### 1.2 Carousel / document ad (`AdDocument.type = 'carousel'`)

| Field | Value | Enforced by | Notes |
|---|---|---|---|
| Pages | **multi-page, up to ~10–12 slides** | `CarouselArchitect` | Ordered `Slide[]`, each with its own layer tree (CANON §5). |
| **Canvas (recommended)** | **square 1080×1080 px** | `CompositorPlanner`, exporter | Per-slide layer tree renders at this canvas. |
| Delivery | **PDF document ad** (multi-page) | exporter (`packages/render` PDF) | PPTX is a later add (doc 01 F21). |
| Narrative | **per-slide hook → reframe → close** | `CarouselArchitect` | The canonical structure (§4). |
| Scoring | **per-slide** `stoppingPower` / `ctaAttention` (`perSlide[]`) | `EngagementAnalyst` (doc 08) | Slide 1 must have the **highest** `stoppingPower`; dip detection between slides (R4 §5.4). |

### 1.3 Video ad (`AdDocument.type = 'video'`) — first-class fast-follow

| Field | Value | Enforced by | Notes |
|---|---|---|---|
| Ratios | **1:1 or 4:5 or 16:9** | exporter (re-layout) | 9:16 is *not* a LinkedIn feed target here (CANON §8 lists 1:1/4:5/16:9). |
| **File size** | **≤ 200 MB** (client's proven paid limit) | exporter spec-check (`probeFileSize()`) | Re-encode at higher `crf` if over (R2 §6). |
| **Audio** | **muted-first**; burned-in subtitles carry the story; sound-on optional | Remotion assembly (§7) | LinkedIn autoplays muted (R2 §5). |
| **Opening** | **first 3 seconds carry stopping power** | `Strategist`/`Copywriter` storyboard; `EngagementAnalyst` scores `firstThreeSeconds` | Hard design constraint (CANON §8; §7 here). |

> **VERIFY current docs before coding** — **LinkedIn ad specs drift.** Before implementing the exporter,
> re-confirm on LinkedIn's current official spec pages (Campaign Manager help + Marketing Solutions ad-specs):
> (a) exact pixel sizes and byte limits per placement; (b) whether 4:5 remains mobile-only; (c) headline /
> intro / character limits per ad format (single image vs document vs video); (d) video codec/container
> requirements and the current max file size for *paid* video; (e) document-ad page count ceiling. **CANON §8
> is the locked internal contract; the LinkedIn live docs are the external ground truth. If they diverge,
> raise it as ⚑ RECOMMENDATION — do not silently change CANON §8's numbers.**

---

## 2. The conversion hierarchy (the creative spine every layout obeys)

Every ad — static, carousel slide, or video frame — is optimized against this **ordered** hierarchy. Higher
tiers dominate: a beautiful ad that fails Tier 1 is a failed ad. `Critic` scores in this order;
`CompositorPlanner` lays out in this order; `EngagementAnalyst` maps its scores (from doc 08) onto these
tiers.

| Tier | Job of the ad | The creative question | Primary `EngagementScores` signal (CANON §6 / doc 08) | Owned by |
|---|---|---|---|---|
| **T1 — STOP** | Stop the thumb in a muted, fast feed | *Would this survive a 0.5 s glance?* | `stoppingPower`, `focalClarity` | `ArtDirector` (imagery), slide-1 / first-3s |
| **T2 — HOOK** | Earn the second look / the "see more" tap / the swipe | *Does the first line create a curiosity or stakes gap?* | intro-text hook; slide-1 headline; `firstThreeSeconds` (video) | `Copywriter`, `CarouselArchitect` |
| **T3 — VALUE** | Make the single value proposition legible in one glance | *Can a scanner get the promise without reading everything?* | `valuePropAttention`, `clutter` (lower = better) | `Copywriter` + `CompositorPlanner` |
| **T4 — PROOF** | Make the claim believable (number, name, source, logo) | *Why should they believe it?* | `focalClarity` on proof element | `Strategist` (proof), `Copywriter` |
| **T5 — ACT** | Make the ask unmistakable and low-friction | *Is the next step obvious and singular?* | `ctaAttention` | `Copywriter` (CTA), `CompositorPlanner` (`cta` layer placement) |

**Rules that fall out of the hierarchy (agents MUST apply):**

- **R-CH1 — One idea per ad.** Exactly **one** value proposition (T3) and exactly **one** primary CTA (T5)
  per `Variant`. Two asks = zero asks. Enforced by `Critic` (anti-pattern §8 AP-07).
- **R-CH2 — Front-load everything.** The hook (T2) lives in the **first ~150 chars** of intro text and in
  the **top-left-to-center** of the visual (the reading path). Never bury the promise below the "see more"
  fold or outside the feed-crop safe zone.
- **R-CH3 — Glance test before beauty.** `CompositorPlanner` must pass a "5-word / 0.5-second" glance check:
  the value + brand must read at thumbnail size before any decorative refinement. This is why `stoppingPower`
  and `focalClarity` (T1) outrank `valuePropAttention` (T3) in ranking weight.
- **R-CH4 — CTA is a first-class `cta` layer**, never body text. `ctaAttention` (T5) is only measurable
  because the CTA has its own layer bbox (doc 08 §5.3 — "our killer feature vs pixel-only vendors").
- **R-CH5 — Proof is specific or absent.** A vague proof ("trusted by many") is worse than none; the
  `Strategist` must supply a concrete proof token (count, named client, date, %, source) or the ad drops to a
  no-proof template. Ties to specificity>cleverness (§3).

> **⚑ ASSUMPTION — hierarchy naming.** The five-tier STOP→HOOK→VALUE→PROOF→ACT ladder is a synthesis of the
> conversion craft in **R3 §3** (the 1.7-second thumb-stop, hook doctrine, one-idea/one-CTA, proof-beats-promise,
> offer↔funnel matching), CANON's north star ("stop the scroll → get a testable ad"), and the
> `EngagementScores` field set (CANON §6). It is a *doctrine*, not a CANON-locked structure, and is consistent
> with R3 §3. Downstream docs should reference tiers by T1–T5.

---

## 3. Hook & angle libraries (what `Strategist` and `Copywriter` draw from)

These are **libraries the agents select from and adapt** — not a fixed menu to paste literally. The
`Strategist` picks **angles** (the strategic frame); the `Copywriter` writes **hooks** (the specific opening
line) within the chosen angle. **Specificity > cleverness is the overriding rule (CANON §7):** a concrete
number, named audience, or dated fact beats a clever turn of phrase every time.

### 3.1 Angle library (strategic frames — `Strategist` selects)

Each angle is a strategic lens on the same offer. The variant matrix (§5) spreads a brief across **distinct**
angles so the board isn't five paraphrases of one idea.

| ID | Angle | The frame | Best when | Example shape (fill from `Brief`) |
|---|---|---|---|---|
| **A1** | **Pain / cost-of-inaction** | Name the expensive status quo | Audience feels a recurring, quantifiable pain | "Every {task} your team does by hand costs {N} hours a week." |
| **A2** | **Contrarian / reframe** | Challenge a widely-held belief | Category is full of lookalike claims | "{Common practice} is why {bad outcome}. Here's the opposite." |
| **A3** | **Proof / outcome** | Lead with a concrete result | You have a hard number or named client | "{Named client} cut {metric} by {N%} in {timeframe}." |
| **A4** | **Authority / insight** | Teach one non-obvious thing | Educational, thought-leadership register | "The one thing {audience} gets wrong about {topic}." |
| **A5** | **Specific audience call-out** | Name the exact reader | Sharp ICP (e.g. "German-speaking law firms") | "For {specific role} at {specific org type}:" |
| **A6** | **Before/after / transformation** | Contrast two states | Product produces a visible delta | "From {before state} to {after state}, without {cost}." |
| **A7** | **Objection-killer** | Answer the #1 hesitation head-on | Known adoption blocker | "Worried about {objection}? {Reassurance + proof}." |
| **A8** | **Time / urgency (honest)** | A real, dated reason to act now | Genuine deadline/scarcity exists | "{Real event/date}: {what changes}." (Never fabricated urgency — §8 AP-09.) |

> **Angle library — mapping to R3's 13-angle set.** The prior client workflow used **13 angles × 3 slides**
> for carousels (CANON §2), and **R3 §4.1 enumerates that 13-angle set** (pain/cost-of-status-quo · contrarian
> reframe · named-outcome/ROI · speed/time-saved · risk/liability/compliance · authority/POV · social-proof/case ·
> comparison vs. alternative · "how it works" demystify · objection-handling · trend/"what's changing" ·
> founder/insider story · provocative question). The **A1–A8 set above is the canonicalized superset** covering
> those frames (e.g. R3's risk/liability and comparison fold into A1/A2/A7); the `Strategist` may draw the full
> R3 13-angle list and generate more. The variant matrix (§5) chooses *how many* angles a given brief spawns
> based on `AdDocument.type` and the requested variant count — the number "13" is a library size, not a per-brief
> quota.

### 3.2 Hook library (opening lines — `Copywriter` writes within the angle)

Hook *families* the `Copywriter` composes from. The chosen family must serve T2 (earn the second look) and be
grounded in a real fact from the `Brief` — no clickbait the ad can't pay off (§8 AP-04).

| ID | Hook family | Pattern | Note |
|---|---|---|---|
| **H1** | **Number-led** | Open with a specific figure | Strongest default; ties to specificity>cleverness. |
| **H2** | **Named-audience** | "For {specific role/vertical}:" | Self-selects the reader; strong for sharp ICPs. |
| **H3** | **Question (stakes)** | A question the reader can't answer complacently | Must imply real stakes, not filler ("Did you know…"). |
| **H4** | **Contrarian statement** | Flip a truism | Pairs with angle A2. |
| **H5** | **Cost / loss framing** | Frame the status quo as an ongoing loss | Pairs with A1; loss aversion. |
| **H6** | **Curiosity gap (payable)** | Withhold one specific piece the ad then delivers | The gap **must** be closed by the ad (no bait). |
| **H7** | **Direct proof** | Lead with the outcome/number itself | Pairs with A3; needs a real proof token. |
| **H8** | **Pattern-interrupt visual + terse line** | Let imagery carry T1; keep the line to ≤5 words | For strong-image ads; the line just labels the promise. |

**Copy rules the `Copywriter` MUST encode (CANON §7):**

- **C1 — Specificity > cleverness.** Prefer a concrete number/name/date over a pun. If a headline has no
  concrete noun or number, rewrite it.
- **C2 — One promise.** Headline states one value proposition (T3). No "and also."
- **C3 — Register: sober, editorial, documentary — NOT hype AI (CANON §1).** Banned tone: exclamation
  stacks, "revolutionary," "game-changer," "🚀 unleash," hustle-speak. This is enforced by `BrandGuardian`
  banned-terms (§9).
- **C4 — Headline ≤ 70 chars; hook in first ~150 chars of intro (§1.1).**
- **C5 — CTA is a verb + object, singular** (e.g. "Book the 20-minute demo"), not "Learn more / Sign up /
  Contact us" stacked. One CTA (R-CH1).
- **C6 — Numbers on screen stay numerals; numbers in VO get pre-spelled** for TTS (video only — "1.200" →
  "zwölfhundert"); see §7 and doc 05 (`LocalizationAgent`) + doc 09 (BrandKit `localization`) (R2 §4.4).
- **C7 — Bilingual by construction (CANON §1).** Copy is written so a DE **transcreation** (not literal
  translation) exists; the `LocalizationAgent` owns the second language (doc 05; BrandKit `localization` in doc 09).

### 3.3 CTA verb library (the `cta` layer text)

Singular, low-friction, action-first. `Copywriter` picks **one** per Variant.

`Book {a call/the demo}` · `Get {the guide/the template}` · `See {how it works}` · `Start {the trial}` ·
`Download {the report}` · `Request {access/a quote}` · `Talk to {sales/us}` · `Watch {the 2-min demo}`

> **⚑ ASSUMPTION.** LinkedIn's Campaign-Manager CTA *button* options (a fixed enum like "Learn More",
> "Download", "Register", "Sign Up") are set at campaign build time, **not** in the creative, and are not
> enumerated in CANON. The **in-creative `cta` layer text** above is our own copy and is independent of the
> platform button. **VERIFY** the current LinkedIn CTA-button enum when building the export/handoff surface;
> keep the in-creative CTA copy consistent with (not contradicting) the button the tenant will pick.

---

## 4. Carousel narrative structure (what `CarouselArchitect` builds)

A carousel is **not** *N* independent slides. It is **one argument told across ordered slides** with
**continuity** (CANON §7 `CarouselArchitect`: "multi-slide narrative: hook→reframe→close, continuity across
slides"). This directly fixes the client's prior pain (13 angles × 3 baked-text PNGs, each art-directed in
isolation — CANON §2).

### 4.1 The canonical arc

| Phase | Slides | Job (maps to conversion hierarchy §2) | Required properties |
|---|---|---|---|
| **HOOK** | Slide **1** (always) | T1 + T2: stop the thumb, promise the payoff | **Highest `stoppingPower` of any slide** (doc 08 §5.4). Boldest single line. No CTA yet. |
| **REFRAME** | Slides **2 … N−1** | T3 + T4: shift the reader's frame; deliver value + proof, one idea per slide | Each slide = **one** point. Escalating argument. Recurring motif for continuity. |
| **CLOSE** | Slide **N** (last) | T5: the single ask | **High `ctaAttention`**; the **only** slide with the primary CTA + `legal` layer if required. |

- **Minimum viable arc = 3 slides** (hook / reframe / close). Default when the user specifies no count.
- **Up to ~10–12 slides** (§1.2). More slides ⇒ more REFRAME beats; HOOK and CLOSE stay singular.
- **One idea per REFRAME slide.** A slide that makes two points is split or cut (`Critic` anti-pattern §8).

### 4.2 Continuity rules (`CarouselArchitect` MUST encode)

- **CN1 — Visual through-line.** A recurring motif/color/character across slides (same `BrandKit`, consistent
  style/seed/reference imagery — R1 brand-consistent lane). The reader should *feel* it is one piece.
- **CN2 — Narrative escalation.** Each REFRAME slide advances the argument; no slide is skippable without
  breaking the logic. If a slide can be removed with no loss, remove it.
- **CN3 — Slide-1 dominance.** Slide 1 carries the strongest hook and the highest stopping-power; it must
  work **alone** as a thumbnail (many users never swipe). `EngagementAnalyst` flags any carousel whose slide
  1 is *not* the stopping-power max (doc 08 §5.4).
- **CN4 — Dip detection.** No interior slide may be a stopping-power **trough** relative to its neighbors
  (the static analogue of video weak-moment detection — trough detection over the per-slide sequence, our own
  code, no TRIBE — doc 08 §5.4). Flagged for re-work.
- **CN5 — Single close.** Exactly one CLOSE slide with exactly one CTA. Disclaimers (if the vertical requires
  them) live as a `legal` layer on the CLOSE slide.

### 4.3 Per-slide layer-tree contract (feeds `CompositorPlanner`)

Each `Slide` is its own layer tree (CANON §5). Canonical slot map per phase:

```jsonc
// HOOK slide (slide 1)
{ "phase": "hook",
  "layers": ["image(bg)", "text(hook_headline)", "logo", "shape(motif)?"] }  // NO cta, NO legal
// REFRAME slide (2..N-1)
{ "phase": "reframe",
  "layers": ["image(bg)", "text(point_headline)", "text(support)?", "smart(proof)?", "logo", "shape(motif)?"] }
// CLOSE slide (N)
{ "phase": "close",
  "layers": ["image(bg)", "text(close_headline)", "cta", "logo", "legal?"] }  // the ONLY cta + legal slide
```

Layer types are canonical (CANON §5: `image|text|logo|shape|cta|frame|legal|group|smart`). `smart` layers
are data-bound (e.g. `{{customer_count}}+ firms`).

---

## 5. The variant matrix doctrine (what a brief *becomes*)

**A brief does not become one ad. It becomes a structured matrix, deduplicated to the board's 4–6 ranked
`Variant`s.** This is the doctrine that turns "generate variations" from random re-rolls (the old pain) into
**structured diversity** — every Variant differs on a *named, testable axis*, so the board is a real test,
not five near-duplicates.

### 5.1 The matrix axes

| Axis | Values (from libraries above) | Owned by | Why it's an axis |
|---|---|---|---|
| **Angle** (§3.1) | A1…A8+ | `Strategist` | Different strategic frame = genuinely different bet. |
| **Hook family** (§3.2) | H1…H8 | `Copywriter` | Different opening = different T2 test. |
| **Visual concept** | ArtDirector concepts (imagery-only) | `ArtDirector` | Different T1 stopping mechanism. |
| **Layout archetype** (§5.1.1) | `full-bleed-hero-lower-third` · `split-panel` · `editorial-kicker-top` · `quote-card` | `CompositorPlanner` | Different composition = different T1/T3 read; the axis that structurally prevents `layout_homogeneity` (§8 AP-16). |
| **(video only) Opening device** | e.g. motion cold-open vs text card vs face | `Strategist`/`ArtDirector` | Different first-3s stopping test. |

#### 5.1.1 Named layout archetypes (`CompositorPlanner` selects; the 4th matrix axis)

`CompositorPlanner` assigns each Variant a **named layout archetype** so the board spreads across compositions,
not just words and imagery. The canonical starting set:

| Archetype | Composition | Best for |
|---|---|---|
| **`full-bleed-hero-lower-third`** | Edge-to-edge image; headline + CTA banded in a lower third | Strong single hero image; pattern-interrupt visuals (H8). |
| **`split-panel`** | Image on one side, text block on the other | Before/after (A6); side-by-side proof. |
| **`editorial-kicker-top`** | Small kicker/eyebrow line top, large headline, image below | Authority/insight (A4); sober editorial register. |
| **`quote-card`** | Centered pull-quote / named-client testimonial treatment | Proof/outcome (A3); named-client social proof. |

The board must span archetypes: **`Critic` flags `layout_homogeneity` when ≥3 Variants share one archetype**
(§8 AP-16), and `CompositorPlanner` is sent back to re-spread. Additionally, `CompositorPlanner`/`ArtDirector`
**wire `brandKit.imagery.style.avoid` tokens into the imagery negative prompt automatically** (per CANON §12
L10) so off-brand visual styles are structurally excluded, not left to prompt discipline.

### 5.2 The generation rule (orchestrator + agents encode this)

1. **`Strategist` selects K distinct angles** for the brief (K scales with requested variant count and
   `AdDocument.type`; default board = **4–6 Variants**, CANON §7 / doc 01).
2. For each angle, **`Copywriter` writes ≥1 hook** (from a *different* hook family where possible) and
   **`ArtDirector` proposes ≥1 visual concept**.
3. The orchestrator forms candidate `(angle, hook, visual)` triples, **deduplicates near-identical triples**,
   and selects the **4–6 most *distinct*** to become `Variant`s. **Diversity across axes is the selection
   criterion** — never five paraphrases of one angle.
4. Each `Variant` records its matrix coordinates in lineage (`brief_id`, plus the chosen angle/hook/visual as
   part of `prompt`/metadata) so the board and later `Experiment`s are legible (CANON §5 lineage).
5. **Carousel:** the matrix operates at the *document* level — Variants are **different narrative takes on the
   same argument** (e.g. proof-led vs contrarian-led carousels), each an ordered `Slide[]`.
6. **Video:** add the *opening-device* axis; each Variant is a distinct first-3s stopping bet.

### 5.3 Matrix doctrine rules

- **VM1 — Distinct or dropped.** Two Variants that share angle **and** hook family **and** visual concept are
  the same ad; drop one. The board must span the matrix, not clump.
- **VM2 — Bounded, not exhaustive.** Do **not** generate the full Cartesian product (cost + noise). Generate
  the **4–6 most distinct** covering the widest matrix span within the per-brief cost cap (CANON §4, doc 10).
- **VM3 — One control.** Include one "safe" Variant (strongest single angle, most literal proof) as a
  baseline against which the bolder Variants are read.
- **VM4 — Ranked, not chosen.** Agents **rank** the matrix by predicted engagement (bands+confidence);
  **the human picks** (CANON §7). The matrix produces the *test*, not the *decision*.
- **VM5 — Every Variant is `Experiment`-ready.** Because each differs on a named axis, promoting the board
  into an `Experiment` with `ExperimentArm`s is mechanical (CANON §5; doc 01 F15).

> **Variant count — reconciled with R3.** CANON fixes the **board at 4–6 Variants** (CANON §7, echoed doc
> 01/R7). **R3 §5 prescribes the matrix as a 4-axis (near-)cartesian product** — Angle × Hook × Proof ×
> **Layout archetype** — deduplicated down to the board; the layout-archetype axis (§5.1.1) is mandatory to
> defeat `layout_homogeneity` (§8 AP-16). VM1–VM5 are the doctrine that fills the 4–6 slots with
> maximally-distinct bets across those axes, consistent with R3 §5. Where R3 §5's axis set is richer than an
> earlier draft here, **R3 wins** and this §5 conforms to it; the 4–6 board size (CANON) is unchanged.

---

## 6. Directional benchmarks — **ALL FLAGGED, none are promises**

> **DIRECTIONAL — calibrate on real `Result`s (read before using any number here).** These numbers are
> **directional priors sourced from R3 §7** (third-party 2026 LinkedIn aggregates), **not performance
> promises and not pass/fail thresholds.** They exist only to (a) seed cold-start `predictedCtrBand` priors
> with a *wide* band and *low* confidence (doc 08 §7; R3 §7.4 "calibration hook"), and (b) give `Critic`
> rough sanity rails. **They MUST be:** (1) shown to tenants only as **bands + confidence** with a
> "directional estimate" label (CANON §9; doc 08 §7); (2) **calibrated toward the tenant's real LinkedIn
> `Result`s** as data accrues (the calibration loop is the moat — R7 §1.4; R3 §7.4); (3) VERIFY-refreshed
> against R3's cited sources at build time per L12 (code the prior now; never gate on it). **Never surface a
> raw number as truth.** Fuller by-objective/by-industry benchmark tables live in **R3 §7**.

| Signal | Directional prior (R3 §7 — calibrate on real Results) | How the platform uses it |
|---|---|---|
| Single-image LinkedIn CTR band (cold-start) | **~0.40%–0.65%** (median ~0.50%; wide, low-confidence — R3 §7.1) | Seed `predictedCtrBand{low,high,confidence=low}`; widen further when tenant data is thin (doc 08 §7). |
| "Strong" vs "weak" stopping-power split | relative, per-tenant | `EngagementAnalyst` ranks *within* a board; absolute thresholds are **calibrated, not fixed**. |
| Video: fraction of watch decided in first 3 s | **most of it** (muted feed) | Justifies the first-3s hard constraint (§7); not a numeric gate. |
| Carousel: share of viewers who never swipe past slide 1 | **large majority** | Justifies CN3 (slide 1 must stand alone); not a numeric gate. |
| Intro-text hook fold | **~150 chars visible** | This one **is** a CANON §8 spec, not a benchmark — front-load the hook (R-CH2). |

**Doctrine:** the platform's competitive edge is **not** a claimed benchmark; it is **the per-tenant
calibration loop** that makes predictions *this-tenant-true* over time (CANON §9; R7 §1.4; doc 08 §7). Treat
every number here as a temporary crutch to be discarded on first contact with real data.

---

## 7. Muted-first video rules (the video creative contract)

Video is a **first-class fast-follow** (CANON §0). LinkedIn **autoplays muted**, so **burned-in subtitles
carry the story** and the **first 3 seconds must stop the scroll with zero audio** (CANON §8; R2 §5). The
composited-not-baked rule still holds: **brand text is a Remotion vector/HTML layer, never baked into the
model output** (CANON §2; R2 §5.1).

### 7.1 Hard rules (`Strategist`/`ArtDirector`/`CompositorPlanner`/exporter encode)

- **V1 — Muted-first is the default; sound-on is the exception.** Design assuming **no audio**. Model-native
  audio is almost always discarded (R2 §0). A sound-on variant is opt-in and rare.
- **V2 — Burned-in captions are mandatory and always-on.** Source timing from ElevenLabs `with-timestamps`
  (word-level) → `@remotion/captions` `createTikTokStyleCaptions(...)` → high-contrast, **safe-zone-aware**,
  **burned into pixels** (R2 §5.1). No optional/soft subtitle track.
- **V3 — First 3 seconds carry stopping power.** The opening frame + first cut must deliver T1 with no sound:
  a bold visual, an on-screen line, or a motion pattern-interrupt. `EngagementAnalyst` scores
  `firstThreeSeconds` + `stoppingPower` (doc 08 §5.5); weak openings auto-iterate (≤2 rounds).
- **V4 — On-screen numerals; pre-spelled VO.** On-screen caption/brand text keeps **numerals** for legibility
  ("1.200"); the **VO string is TTS-normalized** ("zwölfhundert", "%" → "Prozent") by the `LocalizationAgent`
  (R2 §4.4; doc 05 `LocalizationAgent` + doc 09 BrandKit `localization`). **DE number pre-spelling is mandatory** — ElevenLabs mispronounces DE numbers.
- **V5 — Sober register in motion too (CANON §1).** Documentary/editorial pacing; no hype stingers, no
  frantic cuts, no meme energy. Music (if any) is a **low, sober bed**, muted-first (R2 §4).
- **V6 — Text safe-zones respected.** Captions and brand cards stay inside the feed-crop / profile-overlap /
  UI-chrome safe zones for the target ratio; the exporter re-lays out 1:1 ↔ 4:5 ↔ 16:9 by smart re-layout,
  not crop (R2 §5.1; CANON §8).
- **V7 — Ship-time spec-check gate** (exporter): ✓ ratio ∈ {1:1, 4:5, 16:9} ✓ **≤200 MB** (`probeFileSize()`)
  ✓ captions present & legible in safe zones ✓ **plays correctly muted** ✓ first-3s stopping power present
  ✓ `BrandGuardian` pass (R2 §6, §8; doc 01 §4.3 C12).

### 7.2 Video storyboard skeleton (what the agents emit)

```
Storyboard (muted-first):
  [0–3s]  HOOK shot   → T1+T2: bold visual / on-screen line / motion interrupt; NO reliance on audio
  [3s..]  BODY shots  → T3+T4: one point per shot; burned-in captions carry every claim; motif continuity
  [end]   CLOSE card  → T5: single CTA (brand card / lower-third, vector layer); legal layer if required
Tracks: <OffthreadVideo> clips  +  <Audio> VO/bed/SFX (muted-first)  +  brand/CTA/logo/legal (HTML/CSS layers)
        +  always-on burned-in caption layer
```

> **VERIFY current docs before coding (video/audio APIs drift — R2 §8):** Kling host + model slugs + JWT
> HS256 exp window; Kling 3.0 Omni "elements"; Veo 3.1 slugs (3.0 sunset **2026-06-30**); Runway Gen-4 Aleph
> sunset **2026-07-30**; HeyGen v2 until **2026-10-31** (or v3 wallet API); ElevenLabs
> `eleven_multilingual_v2` + `with-timestamps` shape + **DE number pre-spelling mandatory** + Music API
> commercial-license terms; Remotion **Company License** (4+ people / funded) + `@remotion/captions`
> (native subs since v4.0.216) + Lambda region/memory; the exact `crf`/preset that keeps 1:1/4:5/16:9 clips
> **≤200 MB**. (Full detail: doc 01 §4.3 note; R2 §8.)

---

## 8. Anti-patterns the platform STRUCTURALLY PREVENTS

The point of Brutal Ads is that the classic LinkedIn-ad failure modes are **made impossible by
construction**, not merely discouraged. Each anti-pattern below names **what** is wrong, **which mechanism
prevents it**, and **where** that mechanism lives. `Critic` scores against this list; several are hard-blocked
upstream so `Critic` should rarely even see them.

| ID | Anti-pattern | Why it kills the ad | **How the platform PREVENTS it (structural)** | Enforced at |
|---|---|---|---|---|
| **AP-01** | **Baked-in text** (headline/CTA rendered by the image model) | Illegible, off-brand, uneditable → endless re-rolls (the client's original pain, CANON §2) | Image prompts are **structurally forbidden** to contain ad copy; all legible text is a vector `Layer` (P1). | `ArtDirector` (imagery-only prompt) + code assertion/lint (doc 01 DoD) |
| **AP-02** | **Cropped headline / lost CTA** in a non-base ratio | The ask disappears in 4:5 or 1.91:1 | **Smart re-layout** from one base with `renderHints`/safe-zones — **never naive crop** (CANON §8; R7 ⚑R-LT1). | exporter (`packages/render`) |
| **AP-03** | **Missing / wrong disclaimer** (esp. regulated verticals: legal, PE) | Compliance risk | **`legal` first-class layer** + `BrandGuardian` hard gate: no mandatory disclaimer ⇒ **cannot reach the board**. | `BrandGuardian` (hard gate) |
| **AP-04** | **Clickbait hook the ad can't pay off** | Burns trust; hurts the sober/editorial brand | `Copywriter` C-rules: curiosity gaps must be closed by the ad (H6); `Critic` flags unpaid hooks. | `Copywriter` + `Critic` |
| **AP-05** | **Off-brand palette / type / voice** | Breaks the seed brand (dark palette, Playfair+Inter, gold/lime) | Versioned **`BrandKit`** pinned by every render + `BrandGuardian` hard gate on palette/type/voice. | `BrandGuardian` + render pins `brand_kit_version` |
| **AP-06** | **Hype AI tone** ("revolutionary", 🚀, exclamation stacks) | Contradicts CANON §1 register (sober/editorial/documentary) | `BrandGuardian` **banned-terms** list (§9) + `Copywriter` C3. | `BrandGuardian` + `Copywriter` |
| **AP-07** | **Two value props / two CTAs** (message dilution) | Splits attention; nothing converts | R-CH1 one-idea/one-CTA; `Critic` flags dual-ask; `CompositorPlanner` allows one `cta` layer as the primary. | `Critic` + `CompositorPlanner` |
| **AP-08** | **Cluttered / low-focal-clarity layout** | Fails T1; nothing stops the thumb | `EngagementAnalyst` `clutter` + `focalClarity` signals; auto-iterate ≤2 (doc 08). | `EngagementAnalyst` |
| **AP-09** | **Fabricated urgency / false scarcity** | Compliance + trust risk | Angle A8 requires a **real** dated reason; `BrandGuardian`/`Critic` block invented deadlines. | `Strategist` + `BrandGuardian` |
| **AP-10** | **Literal translation** (DE that reads translated) | Fails the "native in both languages" bar (CANON §1) | `LocalizationAgent` does **transcreation, not literal translation** (CANON §7; doc 05; BrandKit `localization` in doc 09). | `LocalizationAgent` |
| **AP-11** | **Numbers mispronounced in DE VO** (video) | "1.200" spoken wrong destroys credibility | VO strings **pre-spelled** for TTS ("zwölfhundert"); on-screen keeps numerals (V4; R2 §4.4). | `LocalizationAgent` |
| **AP-12** | **Buried hook / promise below the fold** | Reader never sees the value | R-CH2 front-load; hook in first ~150 chars (§1.1); glance-test (R-CH3). | `Copywriter` + `CompositorPlanner` |
| **AP-13** | **Random re-rolls instead of structured variants** | A board of near-duplicates isn't a test | **Variant matrix doctrine** (§5): every Variant differs on a named axis; dedup near-identical triples (VM1). | orchestrator + `Strategist`/`Copywriter`/`ArtDirector` |
| **AP-14** | **Autonomous shipping / auto-spend** | Removes human judgment; unsafe | **Human-approve gate** — nothing ships un-approved; agents rank, humans choose (CANON §7). | orchestrator (gate) |
| **AP-15** | **Soft / optional subtitles on video** | Muted autoplay ⇒ silent, story lost | Captions are **always-on, burned-in** (V2); exporter spec-check requires them (V7). | Remotion assembly + exporter |
| **AP-16** | **`layout_homogeneity`** — a board where **≥3 Variants share the same layout archetype** | Same-looking board fails the *structured-diversity* promise (§5); it reads as re-rolls, not a real layout test | **Layout archetype is the 4th variant-matrix axis** (§5.1) chosen by `CompositorPlanner`; `Critic` flags `layout_homogeneity` when ≥3 Variants share an archetype and the board is sent back to spread archetypes. | `CompositorPlanner` (spread) + `Critic` (flag) |

---

## 9. Policy & compliance (what `BrandGuardian` mechanically enforces)

`BrandGuardian` is a **hard mechanical gate**, not a vibe (CANON §7; doc 01 P4). A Variant that fails **cannot
reach the board**; it loops back to the authoring agent (≤2 rounds) and, if still failing, is surfaced with a
reason — **never silently shipped**. All rules pin to the **versioned `BrandKit`** (CANON §5); the check
result and `brand_kit_version` are recorded in lineage.

### 9.1 The gate checklist (mechanical)

| Check | Rule | Source of truth |
|---|---|---|
| **Palette** | Only `BrandKit` colors (seed: dark palette; gold `#cba65e`, lime `#b6e64a`; acid-lime chrome). | `BrandKit.palette` |
| **Type** | Only `BrandKit` fonts (seed: **Playfair Display** display / **Inter** body). | `BrandKit.type` |
| **Voice / register** | Sober, editorial, documentary — **not hype** (CANON §1). | `BrandKit.voice` |
| **Banned terms** | No terms on the `BrandKit` banned list (hype words, competitor slurs, prohibited claims). | `BrandKit.bannedTerms` |
| **Mandatory disclaimer** | Required disclaimer(s) **per vertical** present as a `legal` layer (e.g. regulated legal-AI / PE claims). | `BrandKit.disclaimers[vertical]` |
| **AI-content disclosure** | AI-generated-creative disclosure present when required. **Hard gate:** `BrandGuardian` **warns by default; errors (blocks the board) when the tenant vertical requires it** (e.g. EU legal / PE). | `BrandKit.disclosures.aiContent` (doc 09; L7/L10) |
| **Localization** | DE/EN is transcreated (not literal); TTS-safe number spelling for VO (video). | `BrandKit.localization` (doc 09) + `LocalizationAgent` (doc 05) |
| **Composite rule** | No ad copy baked into imagery; all legible text is a `Layer` (P1). | code assertion (AP-01) |
| **One-idea rule** | One value prop, one primary CTA (R-CH1). | `Critic` handoff |

### 9.2 Regulated-vertical notes (client-specific — CANON §1)

- **Legal AI for German-speaking law firms:** legal-services advertising in DE-speaking markets is regulated.
  The `BrandKit` MUST carry the required disclaimer(s) as `legal` layer content, and claims about legal
  outcomes/accuracy must be defensible (no "guaranteed" outcomes). **⚑ ASSUMPTION:** CANON does not enumerate
  the exact DE legal-advertising disclaimer text. **VERIFY current legal-advertising rules (e.g. relevant DE
  professional-conduct / advertising rules) with the client's counsel and encode the exact disclaimer into
  the seed `BrandKit` before shipping to that vertical.**
- **Private-equity angle:** financial-promotion rules may require risk disclaimers / audience restrictions.
  **⚑ ASSUMPTION / VERIFY:** confirm the applicable financial-promotion disclaimer and encode it as a
  `legal` layer requirement in the `BrandKit` for the PE vertical before shipping.
- **AI-generated-imagery disclosure — `BrandGuardian`-enforceable gate (not a note):** creative is
  AI-generated, and some platforms/jurisdictions expect that to be disclosed. This is enforced mechanically,
  not left to a human: `BrandKit.disclosures.aiContent` (the frozen `BrandKitData` superset, CANON §12 L7)
  drives a **`BrandGuardian` rule that WARNS by default and ERRORS (blocks the board) when the tenant vertical
  requires disclosure** (per L10 — relevant for EU legal / PE). When it errors, the Variant loops back (≤2
  rounds) and, if still non-compliant, is surfaced with the reason — never silently shipped. The disclosure
  is realized as a `legal` layer (or the metadata field defined by `disclosures.aiContent`).
  **VERIFY** LinkedIn's current AI-content/disclosure policy and the exact per-vertical trigger; **code the
  warn-by-default + error-when-required behavior now** and only adjust the vertical trigger set if policy
  differs (L12).

> **VERIFY current docs before coding** — **LinkedIn Ads policies drift.** Before shipping, re-confirm
> LinkedIn's current **Advertising Policies** (prohibited/restricted content, claims substantiation, targeting
> restrictions, AI-content disclosure) and the current **ad-review** requirements. The `BrandKit` banned-terms
> and disclaimer lists are the enforcement surface; keep them in sync with LinkedIn policy + the client's
> legal counsel. **CANON does not encode jurisdiction-specific legal text — that is a `BrandKit`/counsel
> responsibility, flagged here.**

---

## 10. How each agent uses this playbook (the encoding map)

Every agent's system prompt embeds the relevant slice of this doc (ready-made blocks in §12). This table is
the index; agent orchestration is doc 05's authority.

| Agent (CANON §7) | Encodes from this doc |
|---|---|
| `Strategist` | Conversion hierarchy §2 (T3/T4 ownership); angle library §3.1; variant-matrix angle selection §5.2; specificity>cleverness. |
| `Copywriter` | Hook library §3.2; copy rules C1–C7; CTA verbs §3.3; headline/intro limits §1.1; per-slide copy §4.3. |
| `ArtDirector` | T1 stopping-power; **imagery-only** prompts (AP-01); visual-concept axis §5.1; carousel motif continuity CN1. |
| `CarouselArchitect` | Carousel arc §4; continuity CN1–CN5; slide-1 dominance; per-slide layer contract §4.3. |
| `CompositorPlanner` | Layer slot maps §4.3; glance test R-CH3; one `cta`/one value prop; safe-zone-aware placement; **layout-archetype axis §5.1.1** (spread the board, avoid AP-16); wire `brandKit.imagery.style.avoid` into the negative prompt. |
| `BrandGuardian` | Policy gate §9 (mechanical checklist); banned terms; disclaimers; **AI-content disclosure gate (warn/err) §9**; composite rule. |
| `Critic` | Scores vs conversion hierarchy §2 + anti-patterns §8 (incl. **`layout_homogeneity` AP-16**). |
| `EngagementAnalyst` | Maps `EngagementScores` (doc 08) onto tiers §2; carousel dip/slide-1 checks §4.2; directional-band caveat §6. |
| `EditorAgent` | Preserves all rules under edits (never re-introduces AP-01/AP-02/AP-07 via a `LayerPatch`). |
| `LocalizationAgent` | Transcreation (AP-10); TTS number pre-spelling (V4/AP-11); numerals-on-screen (doc 05 agent + doc 09 BrandKit `localization`). |

---

## 11. Cross-doc anchors (quick index)

- **Object model / layer types / lineage:** CANON §5 → **doc 03** authoritative.
- **Provider contracts / `EngagementScores`:** CANON §6 → **doc 04 / doc 08** authoritative.
- **Agents:** CANON §7 → **doc 05** authoritative.
- **LinkedIn format specs (§1 here):** CANON §8 → **doc 06** authoritative for render/re-layout
  *mechanics*; this doc authoritative for the *creative rules*.
- **Engagement stance / calibration / bands:** CANON §9 → **doc 08** authoritative (§2, §6 here consume it).
- **Env vars:** CANON §10 → **doc 11** authoritative.
- **Product spec / journeys / DoD:** **doc 01** (this doc's rules are the creative content of those journeys).

---

## 12. Paste-into-agent-prompt blocks (verbatim)

Drop these directly into the named agent's system prompt. They are self-contained and use only canonical
names.

### 12.1 Global creative preamble (prepend to every Creative Studio agent)

```
You produce LinkedIn ads for Brutal Ads. Non-negotiable rules:
1. AI generates IMAGERY ONLY. Never put ad copy (headline, subhead, CTA, legal, price, slide text) into an
   image/video generation prompt. Every legible/on-brand element is a composited, editable vector Layer.
2. Register: sober, editorial, documentary — NOT hype AI. No "revolutionary", no rocket emojis, no
   exclamation stacks, no hustle-speak.
3. Specificity beats cleverness: a concrete number, named audience, or dated fact beats a pun. Always.
4. One ad = one value proposition + one primary CTA. Two asks = zero asks.
5. Optimize in this order (higher wins): STOP (stop the thumb) → HOOK (earn the second look) → VALUE
   (one legible promise) → PROOF (a specific, believable fact) → ACT (one obvious CTA).
6. Bilingual by construction (DE + EN); the German version is a transcreation, never a literal translation.
7. Agents rank; humans choose; nothing ships without human approval.
```

### 12.2 `Copywriter` block

```
Write within the angle chosen by the Strategist. Hook families to compose from: number-led, named-audience,
stakes-question, contrarian, cost/loss framing, payable curiosity gap, direct proof, pattern-interrupt line.
Rules: headline ≤ 70 chars; put the hook in the first ~150 chars of intro text (visible before "see more");
intro ≤ 600 chars. CTA = one verb+object, singular ("Book the 20-minute demo"), never a stack of
"Learn more / Sign up / Contact us". A curiosity gap MUST be paid off by the ad — no clickbait. On-screen
numbers stay numerals; VO numbers are pre-spelled for TTS (DE: "1.200" → "zwölfhundert", "%" → "Prozent").
Output structured JSON per the schema in doc 05.
```

### 12.3 `CarouselArchitect` block

```
A carousel is ONE argument across ordered slides, not N independent slides. Arc: Slide 1 = HOOK (highest
stopping power, works alone as a thumbnail, NO CTA); middle slides = REFRAME (one idea each, escalating,
recurring visual motif for continuity); last slide = CLOSE (the single CTA + any legal disclaimer, the ONLY
slide with a cta layer). Minimum 3 slides; up to ~10–12. Remove any slide that can be removed without
breaking the logic. No interior slide may be a stopping-power trough versus its neighbors. Emit an ordered
slide plan; each slide is its own layer tree.
```

### 12.4 `BrandGuardian` block

```
You are a HARD GATE, not a reviewer. A Variant that fails any check CANNOT reach the board — loop it back to
the authoring agent (≤2 rounds) then surface the reason; never silently ship. Check, mechanically, against
the versioned BrandKit: (1) palette = only BrandKit colors; (2) type = only BrandKit fonts; (3) voice = sober
editorial documentary, not hype; (4) no banned terms; (5) required disclaimer(s) for this vertical present as
a legal layer; (6) AI-content disclosure (BrandKit.disclosures.aiContent) — WARN by default, ERROR (block the
board) when this tenant's vertical requires it; (7) DE/EN transcreated, VO numbers pre-spelled; (8) no ad copy
baked into imagery; (9) one value prop + one CTA. Record brand_kit_version and the check result in lineage.
```

### 12.5 `Critic` block

```
Score the Variant against the conversion hierarchy (STOP → HOOK → VALUE → PROOF → ACT) and flag any
anti-pattern: baked text, cropped/lost CTA, missing disclaimer, unpaid clickbait hook, off-brand
palette/type/voice, hype tone, two value props or two CTAs, cluttered/low-focal-clarity layout, fabricated
urgency, literal translation, mispronounced-DE-number VO, hook buried below the fold, near-duplicate variants,
soft/optional video subtitles, layout_homogeneity (≥3 Variants sharing one layout archetype). Output findings
+ a per-tier score; you rank, you do not ship.
```

---

## 13. Consolidated assumptions (flagged, for the factory)

1. **Grounding — R3 is present and cited (whole-doc).** `R3-linkedin-playbook.md` grounds this doc (format
   facts cross-checked against CANON §8 + R3 §2; craft from CANON §0–§2/§7–§9 + R3 §3–§6 + R2/R4/R7). **All
   benchmark numbers (§6) are DIRECTIONAL priors sourced from R3 §7, calibrated on the tenant's real
   `Result`s** — R3-sourced directional priors, never surfaced as truth. Where R3 and any other doc disagree,
   **CANON §12 + R3 win** (R3 conforms to L1–L12).
2. **⚑ ASSUMPTION — conversion hierarchy labels (T1–T5).** STOP→HOOK→VALUE→PROOF→ACT is a doctrine mapped to
   the `EngagementScores` field set (CANON §6) and R3 §3, not a CANON-locked structure.
3. **Angle set — reconciled with R3.** §3.1's A1–A8 is the canonicalized superset of the client's prior "13
   angles" (CANON §2), which **R3 §4.1 now enumerates**; the `Strategist` may draw R3's full 13-angle list and
   the variant matrix (§5) decides how many a brief spawns.
4. **⚑ ASSUMPTION — in-creative CTA vs LinkedIn CTA button.** LinkedIn's Campaign-Manager CTA-button enum is
   set at campaign build time and is not in CANON; the in-creative `cta` copy (§3.3) is our own and must be
   VERIFIED for consistency with the platform button at export time.
5. **⚑ ASSUMPTION — regulated-vertical disclaimer text.** CANON does not encode the exact DE legal-advertising
   or PE financial-promotion disclaimer text; §9.2 flags these as `BrandKit` + counsel responsibilities to
   VERIFY before shipping to those verticals.

**Cross-document assumptions I am relying on (so other authors stay consistent):**
**(a)** doc 08 owns `EngagementScores` semantics and the calibration loop this doc's §2/§6 consume (bands +
confidence; slide-1/dip checks; directional-prior caveat) — this doc must not contradict doc 08.
**(b)** doc 05 owns the `LocalizationAgent` (transcreation + TTS number pre-spelling) and doc 09 owns the
BrandKit `localization` block that §7 V4 and AP-10/AP-11 reference.
**(c)** the editor/exporter doc (doc 06 / `packages/render`) owns the *mechanics* of smart re-layout,
safe-zones, `renderHints` (R7 ⚑R-LT1), `probeFileSize()`, and PDF/MP4 output that §1/§7/AP-02 assume; this
doc only states the creative *rules*, not the render mechanism.
**(d)** doc 05 embeds the §12 prompt blocks into the named agents and, per doc 01, may fold `IntakeAgent`
(R7 ⚑R-A1) in front of `Strategist`; the matrix doctrine (§5) is agnostic to that choice.
None of these contradict CANON; each is a flagged, additive dependency.

<!-- Conforms to CANON §0–§10. Canonical names used verbatim: Workspace, BrandKit, Campaign, Brief,
AdDocument (single_image|carousel|video), Variant, Slide, Layer (image|text|logo|shape|cta|frame|legal|
group|smart), Asset, Render, Experiment, ExperimentArm, Result, AgentRun, GenerationJob, AuditLog;
Strategist, Copywriter, ArtDirector, CarouselArchitect, CompositorPlanner, BrandGuardian, Critic,
EngagementAnalyst, EditorAgent, LocalizationAgent; EngagementScores fields (stoppingPower, focalClarity,
valuePropAttention, ctaAttention, clutter, firstThreeSeconds, predictedCtrBand, perSlide); ProviderBus;
ENGAGEMENT_BACKEND; services/engine; packages/render. Deviations flagged ⚑ RECOMMENDATION; assumptions
flagged ⚑ ASSUMPTION; every external API carries a VERIFY-before-coding note. -->
