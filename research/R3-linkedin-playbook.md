# R3 — The LinkedIn Ads Creative Playbook (performance-CMO grade, mid-2026)

> **Purpose.** This is the definitive creative-performance reference that the `Copywriter`, `ArtDirector`,
> `CarouselArchitect`, `CompositorPlanner`, `BrandGuardian`, and `Critic` agents (CANON §7) encode as
> rules, scores, and defaults. It is the source doc behind `docs/07 creative-playbook-linkedin` (ledger
> **L1**). It supplies: every 2026 ad format + exact specs; what converts (thumb-stop doctrine, hooks,
> identity signals, muted-first video); ideation frameworks (angle libraries, hook→reframe→close); the
> **variant matrix with a LAYOUT-ARCHETYPE axis** (ledger **L10**); **directional** benchmarks by
> objective (label directional, calibrate on real `Result` rows — NOT "unsourced placeholder", ledger
> **L11**); anti-patterns incl. `layout_homogeneity`; and LinkedIn policy/compliance incl. **EU AI-content
> disclosure** (ledger **L10**).
>
> **Reconciliation authority.** Where this doc and any other disagree, CANON §12 wins. This doc conforms
> to L1–L12. The one non-obvious format reconciliation is flagged in §2.0 (LinkedIn "carousel" vs
> "document" ads).
>
> **Directional-number discipline (L11).** Every benchmark below is labeled **[DIRECTIONAL]** and MUST be
> treated as a *prior* that the `EngagementAnalyst` calibrates against the tenant's real `Result` rows
> (CANON §5, §9). Do NOT hard-code these as pass/fail thresholds. They seed the `predictedCtrBand`.
>
> **VERIFY discipline (L12).** Every "VERIFY" flag states the exact default to code NOW; only adjust if the
> live call/spec errors. VERIFY is never a stop condition for the factory.

---

## 0. TL;DR — what the agents must do (the 12 load-bearing rules)

1. **One idea per ad.** A single claim, a single proof, a single CTA. Multi-idea ads test worse. (`Copywriter`, `Critic`)
2. **Win the first 1.7 seconds.** Feed scroll is thumb-speed; the visual + first line must land a complete thought before the scroll continues. (`ArtDirector`, `Copywriter`)
3. **Imagery-only from the model; text is a vector layer.** Never bake headline/CTA/legal/price into pixels (CANON §2 — the load-bearing decision). Legibility and edit-ability come from the layer tree.
4. **Identity-first.** Name the reader ("German-speaking law firms", "PE operating partners") in the first line or the visual. Self-selection beats broad reach on LinkedIn.
5. **Specificity > cleverness.** Numbers, named outcomes, concrete nouns. Kill adjectives. (`Copywriter` — CANON §7)
6. **Match offer to funnel stage.** TOFU = idea/POV, no gate; MOFU = document/lead-gen; BOFU = demo/contact-sales. Mismatched CTA is the #1 silent killer. (`Strategist`, `Critic`)
7. **Muted-first video.** Burned-in subtitles carry the story; sound-on is a bonus. First 3s = stopping power. (CANON §1, §8)
8. **Proof beats promise.** One concrete proof point (customer count, named result, logo, regulator-safe stat) per ad, `smart`-layer-bound where possible.
9. **Layout diversity is a hard requirement.** A board of ≥3 variants sharing a layout archetype fails the `layout_homogeneity` anti-pattern (L10). The variant matrix's 4th axis (archetype) exists to force visual spread.
10. **Carousel/document narrative = hook → reframe → close** with continuity across slides (CANON §2, §7). Editing a continuity layer defaults to propagate-across-slides (L10).
11. **Disclose AI content where the vertical requires it.** `BrandKit.disclosures.aiContent` → `BrandGuardian` warns by default, **errors** for EU legal/PE (L10, EU AI Act Art. 50, in force **2 Aug 2026** — §8 below).
12. **Everything is a band + confidence, calibrated on real results** (CANON §9). Never present a point estimate as truth.

---

## 1. The 2026 LinkedIn ad-format landscape (what Brutal Ads targets)

CANON `AdDocument.type ∈ single_image | carousel | video` (CANON §5). Below maps those to LinkedIn's native
formats, plus the adjacent formats the platform should be aware of (thought-leader, conversation, event) even
where v1 does not author them.

| CANON type | LinkedIn native format | v1 scope | Notes |
|---|---|---|---|
| `single_image` | **Single Image (Sponsored Content)** | **Ship** | The workhorse. 1:1 default. |
| `carousel` | **Document Ad (PDF)** — the multi-slide hook→reframe→close deck | **Ship** | See §2.0 reconciliation. Renders to **PDF** (ledger L3 — `render_kind` has no pptx). |
| `carousel` | **Carousel Ad (2–10 image cards)** | *Optional / post-v1* | Native swipe format; distinct from document ad. Author-able from the same slide layer trees. VERIFY before wiring as a separate exporter target. |
| `video` | **Video (Sponsored Content)** | **Ship (fast-follow)** | Muted-first, burned-in subs (CANON §8). |
| — | **Thought-Leader Ad** | *Aware, not authored v1* | Boosts a person's organic post; strong CPC. §2.5. |
| — | **Conversation / Message Ad** | *Aware, not authored v1* | Interactive DM; up to 5 CTAs. §2.6. |
| — | **Event Ad** | *Aware, not authored v1* | Auto-populates from a LinkedIn Event. §2.7. |

---

## 2. Exact format specs (2026) — agents & exporter enforce these

> **VERIFY (L12):** LinkedIn revises specs quietly. **Code the defaults below now.** Only adjust a value if
> Campaign Manager rejects an asset (a hard 4xx-equivalent upload error). Authoritative pages to re-check are
> on `business.linkedin.com/advertise/ads/...` and `linkedin.com/help/lms/...` (URLs in Sources).

### 2.0 RECONCILIATION — "carousel" vs "document" ads (READ THIS)

CANON §8 says the multi-slide hook→reframe→close deck is "delivered as a PDF document ad." **That is correct
and it is a deliberate choice.** LinkedIn has TWO distinct multi-panel formats in 2026:

- **Carousel Ad** = 2–10 **image cards** (each 1080×1080, its own headline + destination URL), native swipe UI, billed **per-card-click** (can bill the same user multiple times in one session).
- **Document Ad** = a single uploaded **PDF/DOC/PPT** (up to 100 MB, up to ~300 pages; 10–20 pages best), previewed and downloadable in-feed. The whole asset is the conversion driver.

**Brutal Ads' `carousel` `AdDocument` renders to a Document Ad (PDF)** because (a) ledger **L3** fixes
`render_kind = png|jpg|pdf|svg` with **PPTX out of scope** and document/carousel ads shipping as **PDF**, and
(b) a PDF deck preserves the hook→reframe→close narrative as one asset. The native image-Carousel is an
**optional post-v1 exporter target** off the same slide layer trees — flag **VERIFY** before you build it.
The `CarouselArchitect` agent authors the slide sequence identically for both; only the export path differs.

### 2.1 Single Image Ad (Sponsored Content) — SHIP

| Field | Spec |
|---|---|
| Ratios / recommended px | **1:1 → 1200×1200 (DEFAULT — best mobile feed & cross-device)**; 1.91:1 → 1200×628 (horizontal, desktop+mobile); Vertical (mobile-only): 4:5 → 720×900, 2:3 → 600×900, 1:1.91 → 628×1200 |
| File types | JPG, PNG, GIF |
| Max file size | **5 MB** → enforce via `encodeImageUnder5MB` (ledger L5, `packages/render`) |
| Headline | **≤70 characters** (hard truncation) |
| Introductory text | **~150 characters** visible before "see more"; keep the hook + identity in the first line |
| Ad name (internal) | ≤255 chars |
| Description (LinkedIn Audience Network only) | ≤70 chars |

**Agent rules:** default aspect = `1:1`. Derive 1.91:1 and 4:5 via **smart re-layout, not naive crop** (CANON
§8) — respect safe-zones: feed crop, profile-photo overlap (top-left), "see more" fold. Keep the value prop
and CTA inside the 1:1 safe area so they survive every re-layout.

### 2.2 Document Ad (PDF) = the CANON `carousel` — SHIP

| Field | Spec |
|---|---|
| File types | PDF, DOC, DOCX, PPT, PPTX (**Brutal exports PDF only** — L3) |
| Max file size | **100 MB** |
| Page limit | up to **300 pages**; **10–20 pages performs best**; Brutal default **8–12 slides** (CANON §8) |
| Page ratio | Square **1080×1080** recommended for the in-feed preview (matches slide layer trees) |
| Headline (companion) | ≤70 chars |
| Intro text | ≤150 chars visible (255 max) |
| Companion single-image (some placements) | 1200×628 or 1200×1200 |

**Agent rules:** `CarouselArchitect` builds an ordered `Slide[]` (CANON §5). Narrative = **hook (slide 1) →
reframe (slides 2…n-1) → close/CTA (slide n)**. Continuity layers (logo, kicker, progress dots, footer legal)
**default to propagate across slides** with a "this slide only" opt-out; deck-level pre-flight warns on
divergence (ledger **L10**). Slide 1 must stand alone as a thumb-stop (many users never swipe).

### 2.3 Carousel Ad (native image cards) — OPTIONAL / POST-V1

| Field | Spec |
|---|---|
| Cards | **2–10** per carousel *(third-party aggregators cite up to 20; **VERIFY** — LinkedIn Help says max 10; code **10** as the cap)* |
| Card size | **1080×1080 (1:1)** recommended; max dimension 4320×4320; scaled to ~312×312 in feed |
| Card file | JPG/PNG/GIF (non-animated), **≤10 MB per card** |
| Card headline | **≤45 chars with a link, ≤30 without** (two-line truncation) |
| Intro text | ≤150 chars (255 max) |
| Destination URL | up to 2,000 chars; **per-card URLs allowed** (role-specific intent signal); Lead Gen Form is single across cards |
| Billing caveat | Can bill the **same user multiple times per session** (per-card click) — design so card 1 alone justifies the click |

### 2.4 Video Ad (Sponsored Content) — SHIP (fast-follow)

| Field | Spec |
|---|---|
| Ratios | 16:9 (landscape), **1:1 (square)**, 9:16 (vertical). LinkedIn now favors **1:1 and 9:16** for mobile. CANON caps at **1:1 / 4:5 / 16:9**; default **1:1** |
| Max file size | **200 MB** (CANON §8 "client's proven paid limit") |
| Duration | 3 s – 30 min; **15–30 s performs best**; <15 s for pure awareness |
| Resolution / frame rate | min 360p, **recommend 1080p**; frame rate not enforced by LinkedIn — **VERIFY**, code 30 fps |
| Captions | **Burned-in, muted-first** (CANON §1, §8). ~80% watch sound-off — do NOT rely on LinkedIn auto-captions |
| Headline / intro | ≤70 / ~150 chars (as single image) |

**Agent rules:** `ArtDirector` + Remotion (`packages/render`, ledger L5 `renderVideoLocal`). Stopping power in
the **first 3 seconds**; message must be fully legible with sound off; VO (ElevenLabs, DE/EN) is additive.
Localization number-spelling for TTS (e.g. "zwölfhundert") is owned by `LocalizationAgent` (CANON §7, L1, §9).

### 2.5 Thought-Leader Ad — AWARE (not authored v1)

Boosts an **individual employee's organic post** (with the poster's in-Campaign-Manager permission), not the
Company Page. **Supported objectives: Brand Awareness or Engagement only.** Supported original formats: single
image, video, event, article/newsletter, text-only. **Not eligible:** polls, multi-image carousels,
celebration posts, reshared posts. No Lead Gen Form / no traditional conversion tracking; URLs live in the
post / intro text and remain hyperlinked when sponsored. **Why it matters:** consistently the **most
cost-efficient** format in 2026 data — see benchmarks §5/§7. For Brutal, a future `ThoughtLeaderComposer` could
draft the founder's (Antonio's) post copy; v1 only needs to *know* the constraints so the `Strategist` can
recommend it.

### 2.6 Conversation / Message Ad — AWARE

Interactive in-DM ad. **Up to 5 CTA buttons per message** (branching "choose-your-own-path"). Message-ad limits
(VERIFY): subject ~60 chars, body ~1,500 chars, CTA button text ~20–25 chars; optional banner 300×250, ≤2 MB.
EU note: messaging ads face tightened spam/frequency and consent rules under DSA/GDPR — **not a v1 authoring
target**; flag to `Strategist` as a nurture-stage option only.

### 2.7 Event Ad — AWARE

Auto-populates image/title/details from a LinkedIn Event; minimal creative authoring. Out of v1 scope; the
`Strategist` may recommend it for webinar / roundtable pushes (relevant to PE/legal thought-leadership motions).

---

## 3. What converts on LinkedIn — the doctrine the agents encode

### 3.1 The 1.7-second thumb-stop
Feed scroll speed gives ~**1.7 s** to stop the thumb; the "hook rate / thumb-stop ratio" is the share who
watch past the first **3 s** of video (or don't scroll past a static). **[DIRECTIONAL]** Design implication:
the **primary visual + first text line must deliver a complete, self-selecting idea before the scroll
continues.** `Critic` penalizes ads whose meaning requires reading past the fold or swiping.

### 3.2 Hook doctrine (`Copywriter`)
A hook earns the next 3 seconds. Strong LinkedIn hook shapes:
- **Named-audience call-out** — "German-speaking law firms:" / "PE operating partners:" (identity signal).
- **Specific number / stat** — "Cut associate research time 60%." (specificity > cleverness).
- **Contrarian reframe** — "Legal AI isn't about speed. It's about liability." (sets up the reframe).
- **Named enemy / status quo** — "Billing by the hour is the tax on inefficiency."
- **Concrete question** — "How long does a Vertragsprüfung take your team?"

Hook anti-patterns (auto-flag): starts with "In today's fast-paced world"; buries the audience; adjective
stacks; generic "AI-powered solution"; a question with an obvious yes.

### 3.3 Identity signals
LinkedIn rewards **self-selection over reach**. The ad should make the right reader feel *"this is for me"* and
the wrong reader scroll on. Levers: name the role/vertical/firm-type; use in-group vocabulary (DE legal terms,
PE deal vocabulary); show a recognizable context (a Kanzlei setting, a data room). `BrandGuardian` checks
locale-correct vocabulary; `LocalizationAgent` transcreates rather than translates (CANON §7).

### 3.4 One idea, one CTA
Every additional idea halves the first. Enforce: exactly one primary claim, one proof, one CTA per ad
(`cta` layer, CANON §5). `Critic` flags multi-CTA statics and "and also…" copy.

### 3.5 Offer ↔ funnel matching (the silent killer)
| Funnel | Reader state | Right offer / CTA | Right format |
|---|---|---|---|
| **TOFU** | doesn't know you | POV / idea, **no gate** | Thought-leader, single image, short video |
| **MOFU** | knows the problem | gated asset, Lead Gen Form | **Document ad (PDF)**, carousel |
| **BOFU** | evaluating | demo / contact sales / pricing | single image, retargeted video |

`Strategist` sets the funnel stage on the `Brief`; `Critic` fails an ad whose CTA outruns its stage (e.g.
"Book a demo" on a cold-audience awareness ad).

### 3.6 Social proof
One concrete proof per ad, ideally a `smart` data-bound layer (CANON §5: `{{customer_count}}+ firms`): named
customer, count, named outcome, regulator-safe stat, recognizable logo. Vague proof ("trusted by industry
leaders") is flagged. Claims must be in `BrandKit.messaging.approvedClaims` (ledger **L7**) and survive
`BrandGuardian`.

### 3.7 Muted-first video
Burned-in subtitles are the primary channel; sound-on is optional (CANON §1, §8). First 3 s carry stopping
power; front-load the payoff; never depend on VO for comprehension. Optimizing the first 3 s is repeatedly
associated with materially lower CPA. **[DIRECTIONAL]**

---

## 4. Ideation frameworks (angle libraries the `Strategist`/`Copywriter` draw from)

### 4.1 Angle library (13-angle set — matches the client's prior carousel practice, CANON §2)
Seed angles (extend per brief): **1** Pain / cost-of-status-quo · **2** Contrarian reframe · **3**
Named-outcome / ROI · **4** Speed / time-saved · **5** Risk / liability / compliance (esp. legal) · **6**
Authority / POV · **7** Social proof / case · **8** Comparison vs. alternative · **9** "How it works"
demystify · **10** Objection-handling · **11** Trend / "what's changing" · **12** Founder / insider story ·
**13** Provocative question. Each angle → one `Variant` seed.

### 4.2 hook → reframe → close (per-ad AND per-deck)
The unit of persuasion for both a single ad and a document/carousel deck:
- **Hook** — earn the 3 s (identity + tension). Slide 1 / line 1.
- **Reframe** — shift how the reader sees the problem; introduce the mechanism / insight. Body / middle slides.
- **Close** — resolve to one CTA matched to funnel stage. Final line / final slide.

`CarouselArchitect` guarantees continuity (recurring kicker / logo / progress, escalating narrative) across
slides; continuity-layer edits propagate by default (L10).

### 4.3 Copy skeletons (`Copywriter` presets)
- **PAS:** Problem → Agitate → Solve.
- **Reframe:** "You think X. Actually Y. Here's why."
- **Proof-led:** "[Named result]. Here's how [audience] did it."
- **Enemy:** "Stop [status-quo behavior]. [Better mechanism] instead."
- **Numbered POV (deck):** "5 things [audience] get wrong about [topic]."

All resolve to ≤70-char headline + ≤150-char visible intro + one CTA.

---

## 5. Variant matrix — 4 axes incl. the LAYOUT-ARCHETYPE axis (ledger L10)

The board of variants is the (near-)cartesian product of **four axes**. The 4th (archetype) is mandatory to
defeat `layout_homogeneity`.

| Axis | Values (seed set) | Owner |
|---|---|---|
| **A. Angle** | the 13-angle library (§4.1) | `Strategist` |
| **B. Hook style** | named-callout · stat · contrarian · question · enemy | `Copywriter` |
| **C. Proof** | count · named-customer · named-outcome · logo-wall · none (TOFU) | `Copywriter` |
| **D. Layout archetype** | `full-bleed-hero-lower-third` · `split-panel` · `editorial-kicker-top` · `quote-card` | **`CompositorPlanner`** |

**Layout archetypes (exact tokens — the `CompositorPlanner` MUST use these names; L10):**
- `full-bleed-hero-lower-third` — edge-to-edge image; headline + CTA in a lower-third bar. Default for single image.
- `split-panel` — image one side, solid brand panel with copy the other. High legibility, low reliance on image quality.
- `editorial-kicker-top` — small kicker / eyebrow top, large Playfair headline, image below. Documentary register (CANON §1).
- `quote-card` — large pull-quote / stat as hero type, minimal or textural image. Great for proof + thought-leadership.

**Board-composition rule (Critic gate):** a board of N variants must span **≥3 distinct archetypes**; **no
archetype used by ≥3 variants** (→ `layout_homogeneity`, §6). The **Advanced brief** panel (L10) lets the
marketer set `matrix-axis emphasis`, `variant count`, `angle lock`, and `proof-point pick`, pre-filling
`NormalizedBrief` (zero friction for the founder, real control for the marketer).

**Negative-prompt wiring (L10):** `CompositorPlanner`/`ArtDirector` auto-inject `brandKit.imagery.style.avoid`
tokens into every imagery negative prompt (CANON §6 `GenSpec.negativePrompt`).

---

## 6. Anti-patterns (the `Critic` scores against these)

| # | Anti-pattern | Auto-flag rule |
|---|---|---|
| 1 | **`layout_homogeneity`** (L10) | ≥3 variants on a board share one layout archetype, OR board spans <3 archetypes |
| 2 | Baked-in text | Any headline/CTA/legal/price rendered into the AI image instead of a text/cta/legal layer (CANON §2) |
| 3 | Multi-idea / multi-CTA | >1 primary claim or >1 CTA per single ad |
| 4 | Buried identity | Target audience not signaled in visual or first line |
| 5 | Offer/funnel mismatch | CTA outruns funnel stage (§3.5) |
| 6 | Vague proof | Proof present but not specific / not in `approvedClaims` |
| 7 | Sound-dependent video | Comprehension requires audio; no burned-in subs |
| 8 | Weak 3-second open | Payoff not in first 3 s (video) / not above fold (static) |
| 9 | Adjective soup / hype | Register drifts from sober-documentary (CANON §1); banned/hype terms |
| 10 | Clutter | Too many focal points; low `focalClarity` / high `clutter` from `EngagementPredictor` (CANON §6) |
| 11 | Truncation | Headline >70 / intro >150 visible / card headline >45 (re-check per locale, §9) |
| 12 | Missing AI disclosure | Vertical requires it but `disclosures.aiContent` layer/label absent (§8) |
| 13 | Off-safe-zone | Value prop / CTA falls in feed-crop, profile-overlap, or "see more" fold on any derived ratio |

The `Critic` scores each variant against §3 doctrine + this table and the `EngagementPredictor`'s
`EngagementScores` (`stoppingPower`, `focalClarity`, `valuePropAttention`, `ctaAttention`, `clutter`,
`firstThreeSeconds`, `predictedCtrBand` — CANON §6). Bounded auto-iterate ≤2 rounds on weak variants (CANON §7).

---

## 7. Benchmarks by objective — **[DIRECTIONAL]**, calibrate on real `Result` rows (L11)

> **These are directional priors, not thresholds.** They seed `predictedCtrBand{low,high,confidence}` and are
> **recalibrated per-tenant** by the `EngagementAnalyst` against real LinkedIn `Result` rows over time
> (CANON §5, §9, ledger L11). Do NOT gate pass/fail on them. Ranges reflect wide third-party 2026 aggregates;
> B2B legal/PE (the seed tenant's verticals) tends to the **higher-CPC, lower-CTR** end.

### 7.1 By format (Sponsored Content) — **[DIRECTIONAL]**
| Format | CTR range (median) | Notes |
|---|---|---|
| Single image | 0.40–0.65% (~0.50%) | Baseline workhorse |
| Video | 0.35–0.55% (~0.44%) | Muted-first; watch-through matters more than CTR |
| Carousel (native) | 0.45–0.70% (~0.55%) | Per-card click billing |
| **Document ad (PDF)** | **0.50–0.80% (~0.62%)** | Highest engagement of the static formats — validates the CANON "carousel→PDF" choice |
| Thought-leader | ~**2.68% CTR / ~$2.29 CPC** (some sources ~$3.06 CPC) | Most cost-efficient; awareness/engagement only |

### 7.2 Platform baselines — **[DIRECTIONAL]**
- Overall CPC ≈ **$5.26**; overall Sponsored-Content CTR ≈ **0.44–0.65%**.
- Single-image ads cited as high as **~$13.23 CPC** vs thought-leader ~**$2.29–3.06** — the CPC gap is the single biggest lever the `Strategist` can pull.

### 7.3 CPC by industry (median) — **[DIRECTIONAL]**
Technology/SaaS ~$8.75 · **Financial Services ~$11.25** (relevant to the PE angle) · Professional Services
~$7.00 (relevant to legal) · Healthcare/Life-Sci ~$8.00 · Manufacturing ~$5.75 · EdTech ~$6.25.

### 7.4 Conversion & CPL — **[DIRECTIONAL]**
- Conversion rate ~**2.0–3.5%** overall. **Lead Gen Forms 10–18% (~13%)** vs external landing pages 2–6% (~3.5%) — bias MOFU offers to native Lead Gen Forms.
- CPL by offer: gated content ~$45 · webinar ~$55 · demo ~$115 · contact-sales ~$150. By industry: tech ~$70, financial ~$100, professional services ~$60.

**Calibration hook:** store these as `predictedCtrBand` priors keyed by `(format, industry, objective)`; the
`EngagementAnalyst` shrinks the band toward the tenant's observed `Result` distribution as rows accrue (CANON
§9 — "bands + confidence, calibrated against real LinkedIn results").

---

## 8. Policy & compliance — LinkedIn + EU AI-content disclosure

### 8.1 LinkedIn advertising policy essentials (`BrandGuardian` hard gate)
- **Prohibited:** illegal products/services; tobacco & alternatives; recreational drugs; adult content; gambling/sweepstakes; **political ads**; misleading health/weight-loss claims; discriminatory targeting/content (age, gender, disability, religion, ethnicity, race, national origin, sexual orientation).
- **Professional Community Policies:** no false/misleading/deceptive content; no contradiction of leading health-authority guidance.
- **Restricted / extra-review industries:** **financial services** (the PE angle), healthcare/pharma, alcohol, education (accreditation claims; no guaranteed job/salary outcomes). May need pre-authorization.
- **2026 tightening (VERIFY, code to the stricter reading now):** stricter **claim-substantiation for software/SaaS**; Lead-Gen-Form data-consent rules exceeding GDPR minimums; overhauled AI-based ad review with professional context; DSA transparency on sponsored content. → `BrandGuardian` requires every claim ∈ `approvedClaims` (L7) and blocks superlatives lacking substantiation.

### 8.2 EU AI-content disclosure — **critical for the German legal + PE verticals** (ledger L10)
**EU AI Act Article 50 transparency obligations are in force from 2 August 2026.** (Generative systems deployed
before that date get until **2 Dec 2026** for machine-readable marking.) Brutal Ads' tenants are typically
**deployers** of generative AI for ad content shown in the EU. Key points the platform encodes:

- **Deepfake-type media (image/audio/video that resembles real persons/places/events and could appear authentic)** → the deployer **must disclose** it is AI-generated/manipulated. Purely **fantastical / physically impossible** content is out of scope.
- **Artistic/creative exemption:** if the AI content is part of an evidently creative/fictional work, disclosure is still required but "in a manner that does not hamper enjoyment" — a lighter-touch label, not an exemption.
- **Assistive/editing carve-out:** AI used only for **standard editing** (grammar, minor cleanup) that does not **substantially alter** content/semantics does **not** trigger machine-readable marking. Substantial AI generation does.
- **AI-generated text** triggers disclosure only when **published to inform the public on matters of public interest** — standard product promo generally does **not** qualify; **human editorial review/responsibility** removes the text obligation. (Most Brutal ad copy is human-approved → exempt, but legal/PE ads touching public-interest claims are the risk zone.)
- **Enforcement:** under the AI Act penalty framework; the EU **Code of Practice on Transparency of AI-Generated Content** (published 10 Jun 2026) is the voluntary compliance route.

**Platform encoding (L10):** `BrandKit.disclosures.aiContent` (part of the frozen `BrandKitData` superset, L7)
drives a `BrandGuardian` rule: **warn by default; ERROR when the tenant vertical requires it** (EU legal/PE
default = error). When triggered, the compositor adds an editable **`legal` / disclosure layer** (e.g. "Bild mit
KI erstellt" / "AI-generated image") — never baked into pixels (CANON §2). This satisfies the human-facing
disclosure; **machine-readable** marking (C2PA-style) is a provider/BFL-tier concern flagged in `docs/12` §11
licensing (ledger **L9**).

> **VERIFY (L12):** exact disclosure wording, machine-readable-marking mechanics, and the final Code of
> Practice text may firm up post-2-Aug-2026. **Code the default now:** editable disclosure `legal` layer on
> AI-imagery ads for EU legal/PE tenants + `BrandGuardian` error. Adjust only if legal review changes the
> wording. This is NOT a build stop condition.

---

## 9. Localization rules (owned here per L1; agent-executed in `docs/05`)

There is **no standalone localization doc** (L1). This §9 is `docs/07`'s localization-rules block; execution is
the `LocalizationAgent` (`docs/05`) over the `BrandKit.localization` data (`docs/09`).
- **DE⇄EN is transcreation, not translation** (CANON §7). Preserve the sober-documentary register in both.
- **Character limits are per-locale:** German runs ~20–35% longer — re-check ≤70-char headline / ≤150-char
  intro **after** transcreation; `Copywriter`/`Critic` re-validate truncation (anti-pattern #11) per locale.
- **TTS number-spelling** for video VO: spell numbers for ElevenLabs (e.g. "zwölfhundert" not "1200") —
  stored in `proofPoints[].spoken` per-locale (ledger **L7**).
- **Legal/disclosure layers localize too:** the AI-disclosure label (§8.2) renders in the ad's locale.
- **Formal register (Sie) default** for German legal/PE unless the `BrandKit` voice specifies otherwise.

---

## 10. Comparison table — format choice by goal (the `Strategist`'s decision aid)

| If the goal is… | Best format | Why | CANON type |
|---|---|---|---|
| Cold awareness, cheapest reach | **Thought-leader ad** | ~2.68% CTR, ~$2.29 CPC; human-voiced credibility | (aware; post-v1 author) |
| Explain a POV / demystify | **Document ad (PDF)** | highest static engagement (~0.62% CTR); hook→reframe→close | `carousel` |
| Multi-product / role-specific story | **Native carousel** | per-card URLs = role intent signals | `carousel` (opt. export) |
| Single sharp claim + proof | **Single image (1:1)** | fastest to produce; cleanest thumb-stop | `single_image` |
| Emotional / demo / transformation | **Video (muted-first)** | first-3s stopping power; retarget engaged | `video` |
| Gated MOFU lead capture | **Single image / document + Lead Gen Form** | LGF converts 10–18% vs 2–6% off-platform | `single_image`/`carousel` |
| BOFU demo / contact sales | **Single image / retargeted video** | direct CTA to warm audience | `single_image`/`video` |
| Webinar / roundtable push | **Event ad** | auto-populates; low creative lift | (aware) |
| 1:1 nurture at scale | **Conversation ad** | up to 5 branching CTAs (watch EU spam/consent rules) | (aware) |

---

## 11. Clear recommendation (what Brutal Ads v1 should default to)

1. **Author three CANON types now:** `single_image` (1:1 default) and `carousel`→**Document Ad (PDF)** at
   launch; `video` (muted-first, 1:1, ≤200 MB) as the fast-follow (CANON §0, §8). Native image-Carousel is a
   post-v1 exporter off the same slide trees (VERIFY before wiring).
2. **Make the founder's motion easy:** surface **thought-leader ads** as a `Strategist` recommendation (biggest
   CPC lever) even though v1 doesn't fully author them — draft the post copy, hand off for permission.
3. **Bias MOFU to native Lead Gen Forms** (10–18% vs 2–6%).
4. **Ship the 4-axis variant matrix with the layout-archetype axis and the `layout_homogeneity` gate on day
   one** (L10) — this is what makes a Brutal board look art-directed, not templated.
5. **Default the EU AI-disclosure to ERROR for legal/PE tenants** (L10, Art. 50 live 2 Aug 2026) with an
   editable disclosure `legal` layer.
6. **Treat every benchmark as a calibratable prior** feeding `predictedCtrBand`; never a hard gate (L11, CANON §9).

---

## 12. "VERIFY before coding" flags (each states the default to code NOW — L12)

| # | Item | **Code this default now** | Adjust only if… |
|---|---|---|---|
| V1 | Single-image max size | **5 MB**, `encodeImageUnder5MB` | upload rejects |
| V2 | Single-image ratios/px | 1:1 1200×1200 (default), 1.91:1 1200×628, 4:5 720×900 (mobile) | Campaign Manager rejects |
| V3 | Headline / intro limits | **70 / 150** chars (re-check per locale) | truncation observed |
| V4 | Document ad | PDF, **100 MB**, 8–12 slides (≤300 pp), 1080×1080 | upload rejects |
| V5 | Native carousel cards | **max 10** (aggregators say 20 — do not exceed 10) | Help doc confirms 20 |
| V6 | Carousel card headline | **45 with link / 30 without** | rejects |
| V7 | Video | 1:1 default, **200 MB**, 15–30 s, 1080p, burned-in subs, 30 fps | rejects |
| V8 | Thought-leader constraints | objectives = awareness/engagement only; no LGF; poster permission required | LinkedIn expands |
| V9 | Conversation ad limits | ≤5 CTAs; subject ~60 / body ~1500 / CTA ~20 chars (VERIFY) | rejects |
| V10 | EU AI disclosure | editable disclosure `legal` layer + `BrandGuardian` **error** for EU legal/PE; label "KI-generiert"/"AI-generated" | legal review changes wording |
| V11 | Machine-readable AI marking (C2PA) | out-of-band; provider/BFL-tier item in `docs/12` §11 (L9) — do not block v1 authoring | licensing sign-off requires it |
| V12 | Benchmarks | seed `predictedCtrBand` priors from §7; calibrate on real `Result` rows | never a stop condition |

---

## Sources (verified mid-2026)

- LinkedIn — Single Image Ads specs: https://business.linkedin.com/advertise/ads/sponsored-content/single-image-ads-specs
- LinkedIn Help — Carousel Ads specifications: https://www.linkedin.com/help/linkedin/answer/a427022
- LinkedIn — Carousel Ads specs / tips: https://business.linkedin.com/advertise/ads/sponsored-content/carousel-ads/specs · https://business.linkedin.com/advertise/ads/sponsored-content/carousel-ads/tips
- LinkedIn Help — Thought Leader Ads: https://www.linkedin.com/help/lms/answer/a1399568 · https://business.linkedin.com/advertise/ads/sponsored-content/thought-leader-ads
- LinkedIn — Ads Guide (all formats): https://business.linkedin.com/advertise/ads/ads-guide
- LinkedIn — Advertising Policies: https://www.linkedin.com/legal/ads-policy · Professional Community Policies: https://www.linkedin.com/legal/professional-community-policies
- The Brief — 2026 LinkedIn ad specifications: https://www.thebrief.ai/blog/linkedin-ad-specifications/
- Zeely — Best LinkedIn ad sizes 2026: https://zeely.ai/blog/best-linkedin-ad-sizes-for-every-format-in-2026/
- Yansmedia — LinkedIn Video Ad Specs 2026: https://www.yansmedia.com/blog/linkedin-video-ad-specs-guide
- Stackmatix — LinkedIn Ads Benchmarks 2026 (CPC/CTR): https://www.stackmatix.com/blog/linkedin-ads-benchmarks-cpc-ctr-2026 · Single Image guide: https://www.stackmatix.com/blog/linkedin-single-image-ad
- The B2B House — LinkedIn ad benchmarks (living guide): https://www.theb2bhouse.com/linkedin-ad-benchmarks/
- QuickFrame — Social Media Video Ad Specs & Placements 2026 (muted-first / 3-second): https://quickframe.com/blog/social-media-video-ad-specs-placements-guide
- Yansmedia / Pinterest — 1.7 s thumb-stop research: https://www.yansmedia.com/blog/pinterest-video-ad-specs
- EU AI Act — Article 50 (full text): https://artificialintelligenceact.eu/article/50/ · Practical guide: https://artificialintelligenceact.eu/transparency-rules-article-50/
- EU Commission — Code of Practice on Transparency of AI-Generated Content (10 Jun 2026): https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content
- Bratby Law — AI Act transparency obligations from 2 Aug 2026: https://bratby.law/ai-act-transparency-obligations-2026/
- Bird & Bird — Draft Article 50 guidelines analysis: https://www.twobirds.com/en/insights/2026/taking-the-eu-ai-act-to-practice-reading-the-commissions-draft-article-50-guidelines
- AuditSocials — LinkedIn B2B ad compliance / DSA 2026: https://www.auditsocials.com/blog/linkedin-b2b-ad-compliance-2026
