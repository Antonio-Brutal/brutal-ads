# R7 — Blank-Slate Architecture: the IDEAL "brief → great, editable LinkedIn ads" system

> **Author's stance.** Fresh eyes, no prior context. I independently designed the best system I could for
> *type a brief → get a board of on-brand, testable LinkedIn ads → edit any element by drag or chat → export
> to spec*, then reconciled it against `CANON.md`. **Where I agree, I say so and reinforce the reasoning.
> Where I'd change something, it appears as a clearly-labelled `⚑ RECOMMENDATION`** — never as a silent
> divergence. CANON's object-model names, provider interfaces, agent names, env vars, repo shape, and locked
> decisions are treated as canonical throughout.
>
> **Verification note.** Every model name / endpoint / price / license below was checked against live sources
> in **July 2026** (see inline citations + Sources). The AI-media API surface drifts fast; every load-bearing
> external fact carries a **`VERIFY before coding`** flag with the exact thing to re-confirm.

---

## 0. Executive summary — the independent conclusion

The single most important architectural decision is already in CANON and it is correct: **AI generates imagery
only; every legible/on-brand element (headline, subhead, logo, CTA, legal, price, slide copy) is a composited,
editable vector/text layer on a JSON layer tree.** Independently, I arrived at the same conclusion — it is the
only design that dissolves *both* failure modes of the prior attempts ("hard to prompt" and "hard to edit") at
once. Baking text into pixels is the root cause of the re-roll death-spiral; a layer tree makes the text
free, instant, on-brand, localizable, and A/B-testable.

Beyond that, the ideal system is five loosely-coupled abstractions:

1. **`AdDocument` / layer-tree** — the single serializable source of truth for a creative (agrees with CANON).
2. **`ProviderBus`** — a policy-routed façade over every external generator, so the agent loop is
   provider-agnostic and every job is cached, cost-metered, and swappable (agrees with CANON).
3. **The agent loop** — a bounded, observable pipeline of named Claude agents (Strategist → … → Critic →
   EngagementAnalyst) that *emit structured artifacts*, never free text, and hard-gate on Brand + human
   approval (agrees with CANON; I add one agent — see `⚑ R-A1`).
4. **The engagement test loop** — a commercially-clean saliency/heuristic predictor as the production path,
   TRIBE v2 quarantined behind a research flag, everything reported as **bands + confidence** and calibrated
   against the tenant's real LinkedIn results (agrees with CANON).
5. **The versioned `BrandKit`** — an immutable, versioned brand contract that every render, agent, and lineage
   record pins to, so "on-brand" is deterministic and auditable (agrees with CANON).

My only material recommendations: **(a)** default the whole studio to **Claude Sonnet 5** with an **Opus 4.8**
escalation tier, not "latest Opus everywhere" (huge cost lever, verified pricing below); **(b)** make the job
queue **Supabase Queues (pgmq) the default** and treat **Inngest as an adapter**, because pgmq now ships
inside the exact stack CANON already mandates; **(c)** route imagery to **FLUX.2 [pro]** as the primary
photoreal/背景 generator and **Gemini 3 Pro Image ("Nano Banana Pro")** as the primary *editable-with-text*
and reference-consistency generator, with Ideogram/Recraft demoted to **fallback-only** (the layer-tree makes
their in-pixel-text superpower nearly moot). All flagged below.

---

## 1. The core abstractions — independently derived, then reconciled

### 1.1 `AdDocument` + the layer tree — the spine

**Why it must exist.** A LinkedIn ad is not an image; it is a *composition*: a generated background + a stack
of editable layers, rendered to an exact spec. If the canonical artifact is the **composition (JSON)** rather
than a **pixel buffer**, then: editing is a diff on JSON (`LayerPatch`), localization is a text-layer swap,
re-sizing to 1:1/1.91:1/4:5 is a re-layout of the same tree, A/B variants are cheap forks, and lineage is a
field on the node. If the canonical artifact were a PNG, all of those become "regenerate from scratch."

**Reconciliation with CANON §5 — full agreement.** I independently reached CANON's exact hierarchy:

```
Workspace → BrandKit(versioned) → Campaign → Brief → AdDocument → Variant → (Slide for carousel) → Layer
```

- `AdDocument.type ∈ single_image | carousel | video` — correct; carousel = ordered `Slide[]`, each with its
  own layer tree; video = a Remotion composition spec + layer/subtitle/audio tracks.
- Layer types `image | text | logo | shape | cta | frame | legal | group | smart` — correct. The `smart`
  (data-bound, e.g. `{{customer_count}}+ firms`) type is the sleeper feature: it makes ads *programmatic*
  and localizable without touching pixels.
- **Lineage on every `Variant`** (`brief_id, brand_kit_version, provider, model, model_version, seed, prompt,
  negative_prompt, parent_variant_id, created_by, engagement{}`) — this is exactly what makes results
  feedback and "why did this ad win" possible. Keep it verbatim.

**Load-bearing design rule (independent, reinforces CANON).** The layer tree must be a **superset that the
editor (`Polotno` store JSON) can be losslessly derived from and merged back into** — not the Polotno JSON
itself. Store the *canonical* tree in `packages/shared` types; adapt to Polotno at the `EditorAdapter`
boundary. This is what keeps the editor swappable (CANON §4) and keeps `smart`/`legal`/localization semantics
that Polotno doesn't natively model.

> `⚑ R-LT1 (RECOMMENDATION)` — **Add a `renderHints` object per layer** (`{safeZone, maxLines, autoFit,
> minFontPx}`) so the re-layout engine can derive 1:1 / 1.91:1 / 4:5 from one base *deterministically* and
> never overflow the "see more" fold or profile-overlap safe zone (CANON §8). Not a name change — an additive
> field. Rationale: CANON §8 demands "smart re-layout (not naive cropping)"; that requires per-layer intent.

### 1.2 `ProviderBus` — the routed façade

**Why.** There are ~10 image models, ~4 video models, 1–2 audio models, and 2+ engagement backends in play,
all drifting monthly in price/quality/availability. The agent loop must never name a provider. It asks the
bus for "the best image driver for *this job*," and the bus consults a **policy table (job → ranked
providers)** with **manual override + automatic fallback** (CANON §6 — full agreement, verbatim interfaces).

**Reconciliation — agree, with the routing policy made concrete (see §5).** CANON gives the interfaces; it
(correctly) leaves the *policy* to research. My verified job→provider policy is in **§5**.

**Independent addition — the caching key is load-bearing.** CANON §4 says cache by
`(provider, model, version, prompt, seed, params)`. I reinforce: this key is what makes the re-roll spiral
*impossible to reintroduce* — identical requests are free, and because text is never in the prompt, prompts
are stable across copy edits. Put the cache *inside* the bus, keyed on a hash, with the asset in
Supabase/R2 Storage.

### 1.3 The agent loop — structured artifacts, hard gates, bounded iteration

**Why.** The value is not "an LLM writes an ad." It's a **pipeline of specialists that each emit a typed
artifact** the next stage can rely on, with two non-negotiable gates: a **BrandGuardian hard gate** and a
**human-approve gate before anything ships** (CANON §7 — agree completely). Free-text hand-offs are the enemy;
every agent returns JSON validated by a zod schema in `packages/shared`.

**Reconciliation with CANON §7 agent roster — agree on all names.** `Strategist`, `Copywriter`, `ArtDirector`,
`CarouselArchitect`, `CompositorPlanner`, `BrandGuardian`, `Critic`, `EngagementAnalyst`, `EditorAgent`,
`LocalizationAgent`. Keep every name.

> `⚑ R-A1 (RECOMMENDATION)` — **Add one agent: `IntakeAgent`** (brief normalizer), running *before*
> `Strategist`. It turns a one-line brief + optional URL/attachments into a normalized `Brief` object
> (audience, vertical, offer, proof points, mandatory legal, language(s), constraints), and — critically —
> **asks at most 1–2 clarifying questions only when a required field is missing**, otherwise proceeds on
> defaults. Rationale: the north-star is "type a brief → get ads," so friction must be near-zero; but a brief
> like "ad for our legal AI" needs *just enough* structure for the Strategist to not hallucinate. This keeps
> the "it just works" promise (see §4) while preventing garbage-in. It is additive and does not rename
> anything.

**Bounded auto-iterate (agree, CANON §7).** ≤2 rounds on weak variants: `Critic` + `EngagementAnalyst` score →
if below threshold, feed structured critique back to `Copywriter`/`ArtDirector`/`CompositorPlanner` → re-score
→ stop at round 2 regardless. This bound is what keeps cost and latency sane. Enforce it in the orchestrator,
not the prompt.

### 1.4 The test loop — commercially-clean by default, TRIBE quarantined

**Why.** Predicted engagement is the difference between "a board of pretty ads" and "a board of *testable*
ads ranked by stopping-power." But the obvious reference implementation is **legally radioactive for a
commercial product**.

**Reconciliation with CANON §9 — agree, and I verified the license risk is real.** I fetched the reference
repo `amirmushichge/tribeV2_ViralAnalyser`: its README explicitly says *"all-rights-reserved, non-commercial
evaluation code"* and it **depends on `facebook/tribev2` (Hugging Face), which is CC-BY-NC-4.0
(non-commercial)** — inherited from Meta's TRIBE. [tribeV2 repo][tribe] So CANON's stance is exactly right:

- **Production path** = a **commercially-clean static predictor**: own/licensed bottom-up **saliency** + the
  **grid-salience heuristics** (contrast / color / position / focus / clutter) which are *heuristics*, not the
  TRIBE weights, and are commercially usable.
- **`ENGAGEMENT_BACKEND=tribe_research`** = flag-gated R&D in `services/engine`, **never on the commercial
  path**, gated additionally by `RESEARCH_MODE`.
- Always report **bands + confidence**, calibrated over time against the tenant's **real LinkedIn `Result`s**.
  This calibration loop is the actual moat — a first-party model trained on *this workspace's* CTR beats any
  generic virality model.

`VERIFY before coding` — re-confirm `facebook/tribev2` is still CC-BY-NC-4.0 and that no commercially-licensed
successor exists; if Meta relicenses, revisit. The static path does not depend on this.

### 1.5 The versioned `BrandKit` — the deterministic "on-brand" contract

**Why.** "On-brand" cannot be a vibe. It must be a **versioned, immutable object** that every render and every
agent pins to, so a Variant made today is reproducible next quarter and BrandGuardian can *mechanically* gate.

**Reconciliation — agree (CANON §5, §7 BrandGuardian).** The `BrandKit` holds: palette (gold `#cba65e`, lime
`#b6e64a`, acid-lime chrome), type (Playfair Display display / Inter body), logo lockups, voice register
(sober/editorial/documentary — *not hype*), banned terms, mandatory disclaimers per vertical, and localization
rules (DE⇄EN). **Versioning is non-negotiable**: `brand_kit_version` is in every Variant's lineage (CANON §5),
so you can answer "was this ad on the v3 or v4 brand?" forever. The seed Brutal kit is *data*, not product
logic (CANON §1).

---

## 2. End-to-end data flow (brief → … → results feedback)

```
                         ┌────────────────────────────────────────────────────────────────────────┐
  one-line brief  ─────► │  IntakeAgent  (⚑R-A1: normalize; ≤1–2 clarifying Qs only if required)    │
  (+optional URL/assets) └───────────────┬────────────────────────────────────────────────────────┘
                                         ▼
                                   Brief (normalized) ──► Strategist ──► Strategy{audience,angle,JTBD,proof}
                                         │
                                         ▼
                    ┌────────────────────┴─────────────────────┐
                    ▼                                           ▼
             Copywriter                                   ArtDirector
        {hooks,headlines,CTAs}                    {visual concept, MODEL CHOICE,
        specificity > cleverness                   IMAGERY-ONLY prompt + negPrompt}
                    │                                           │
        (if carousel) CarouselArchitect                        │  ProviderBus.image(job)  ── policy §5 ──►
        {slide narrative hook→reframe→close}                   ▼        FLUX.2 / Nano-Banana Pro / …
                    │                                   GenerationJob (async, cached)
                    └───────────────┬───────────────────────────┘
                                    ▼
                          CompositorPlanner  (concept + copy + generated imagery → LAYER TREE)
                                    │
                                    ▼
                            BrandGuardian  ── HARD GATE ──► (fail → back to author agent, ≤2 rounds)
                                    │ pass
                                    ▼
                      packages/render  (Polotno store JSON → PNG/JPG ; PDF for doc ads)  ► Render
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
                  Critic                      EngagementAnalyst ──► EngagementPredictor
        {LinkedIn playbook + anti-patterns}   (ENGAGEMENT_BACKEND=saliency, prod)
                    └───────────────┬───────────────┘
                                    ▼  scores as BANDS + confidence
                             weak? ──yes──► auto-iterate (≤2)  ──► re-render ──► re-score
                                    │ no / done
                                    ▼
                          ┌─────────  THE BOARD  (ranked Variants, per-workspace)  ─────────┐
                          │  HUMAN in control: review, pick, tweak                         │
                          └───────────────┬───────────────────────────────────────────────┘
                                          ▼
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
              EDIT by drag         EDIT by chat           LocalizationAgent (DE⇄EN
              (Polotno canvas)     (EditorAgent →          transcreation, TTS-safe numbers)
                    │               typed LayerPatch)              │
                    └─────────────────────┼─────────────────────┘
                                          ▼   (never a full re-roll — LayerPatch diffs only)
                                    HUMAN-APPROVE GATE (nothing ships un-approved)
                                          ▼
                                     EXPORT to exact LinkedIn spec
                        (1:1 1200×1200 / 1.91:1 1200×627 / 4:5 960×1200 ; PDF doc ad ; video MP4)
                                          ▼
                                   Ship to LinkedIn (manual or API)
                                          ▼
                              Result (real CTR/impressions/engagement)
                                          │
                                          ▼
                          CALIBRATION LOOP ──► re-fit EngagementPredictor bands
                                              per-workspace (closes the loop)
```

**Key properties of this flow (independently prioritized):**
- **Imagery gen and copy gen are parallel branches** that only meet at `CompositorPlanner` — text never enters
  an image prompt. This is the anti-re-roll invariant, structurally enforced.
- **Every arrow that crosses to an external API is an async `GenerationJob`** with progress the UI subscribes
  to (CANON §4). No synchronous 30-second waits.
- **Two gates, one loop-back:** BrandGuardian (mechanical) and Human-Approve (judgment). Auto-iterate is
  bounded and lives *before* the human sees the board.
- **The board is the product surface** — humans stay in control there and at export. Agents never ship.

---

## 3. Minimal LOVABLE product + the exact one-shot BUILD ORDER

The MLP is the shortest path to the north-star *feeling*: **type a brief → get 3–6 on-brand static single-image
LinkedIn ads on a board → tweak by drag/chat → export to spec.** Carousel, engagement scoring, and video are
fast-follows layered on the *same* spine. Build order minimizes risk by making the **layer-tree + render + one
image provider + one export** work end-to-end *before* adding agents, scoring, or extra providers.

| Phase | Ships | Why this order (risk-first) | Proves |
|---|---|---|---|
| **P0 Skeleton** | pnpm monorepo per CANON tree; `packages/shared` object model + zod; Supabase (Postgres+RLS+Auth+Storage), `workspace_id` multi-tenant from day 1; `.env.example`; seed Brutal `BrandKit` v1 | Everything downstream pins to these types + RLS. Getting multi-tenancy wrong later is a rewrite. | Types compile; a workspace + brand kit exist; RLS blocks cross-tenant reads. |
| **P1 Render spine** | `packages/render`: layer-tree → Polotno store JSON → PNG/JPG headless (`polotno-node`) | The whole thesis ("editable layers, not baked pixels") is unproven until a JSON tree renders to a correct 1:1 ad. De-risk the hardest, least-flashy part first. | A hand-authored layer tree renders a pixel-correct 1200×1200 ad with real fonts. |
| **P2 One image provider + ProviderBus** | `ProviderBus.image` with **one** driver (FLUX.2 [pro] via BFL) + cache + `GenerationJob` async + progress | Proves the async job/cache pattern and the imagery-only contract with the least surface area. | Brief → generated *background* → composited under text layers → rendered ad. |
| **P3 The agent loop (static)** | `IntakeAgent`→`Strategist`→`Copywriter`→`ArtDirector`→`CompositorPlanner`→`BrandGuardian`; Claude via Agent SDK/Messages, structured outputs; `AgentRun` logging + cost caps | Now a *brief* (not a hand-authored tree) produces ads. This is the "wow." Built on the proven P1/P2 spine. | Type a brief → 3–6 on-brand static ads appear on a board. |
| **P4 The board + editor (drag & chat)** | Board UI; Polotno canvas behind `EditorAdapter`; `EditorAgent` (NL→typed `LayerPatch`); human-approve gate | The "easy to edit" half of the promise. Drag + chat editing is what makes it *lovable*, not just clever. | Move/retype any layer by drag; "make the headline shorter and gold" by chat — no re-roll. |
| **P5 Export to spec** | Exporter: 1:1 / 1.91:1 / 4:5 via **smart re-layout** (renderHints, safe-zones) + `≤5 MB` JPG/PNG | Closes the core loop: a real, spec-correct LinkedIn asset leaves the building. | Download a spec-valid asset in all three ratios from one base. |
| — **MLP LINE** — | *(P0–P5 = the minimal lovable product)* | | |
| **P6 Critic + Engagement (clean path)** | `Critic` (LinkedIn playbook) + `EngagementAnalyst` + `EngagementPredictor` (`saliency` backend) in `services/engine`; scores as **bands+confidence**; ranks the board | Ranking makes the board *testable*, not just pretty. Clean path only; TRIBE stays out. | Board arrives ranked with focal-clarity / stopping-power bands. |
| **P7 Carousel** | `CarouselArchitect`; `Slide[]` per `AdDocument`; PDF document-ad export (hook→reframe→close) | Same spine, +ordered slides. High client value (their prior pain), low new risk. | Brief → multi-slide doc ad → PDF export. |
| **P8 Localization** | `LocalizationAgent` (DE⇄EN transcreation; TTS-safe numbers); `smart` layers bound to locale | Bilingual is first-class for Brutal (CANON §1). Text-layer swap, not re-render. | One ad, two languages, on-brand, from the same tree. |
| **P9 Video (fast-follow)** | `VideoProvider` (Kling primary) + ElevenLabs VO + Remotion assembly; muted-first + burned-in subs; first-3-seconds | Explicitly a *first-class fast-follow* (CANON §0). Heaviest infra; comes after the static loop is loved. | Brief → 1:1/4:5/16:9 MP4, muted-first, ≤200 MB. |
| **P10 Results feedback + calibration** | `Result` ingest (manual paste or LinkedIn API) → re-fit predictor bands per workspace | Turns predictions from generic to *this-tenant-true*. The compounding moat. | Predicted bands tighten against real CTR over time. |

**Why this specific order is lowest-risk:** it front-loads the two things most likely to sink the project (the
layer-tree render fidelity, and multi-tenant RLS) into P0–P1 where they're cheap to fix, and defers the
flashiest-but-most-decoupled work (video, TRIBE R&D) to the end. Each phase ships something demoable; nothing
requires ripping out an earlier phase.

---

## 4. Consumer-friendliness — "it just works," with humans in control

The product must feel like magic to a founder typing one line, and like a safe, controllable tool to a
marketer. Concretely:

**Sensible defaults (zero prompt-engineering):**
- Default output = **1:1 1200×1200** (best mobile feed, CANON §8); default count = **4–6 variants**; default
  language from workspace locale; default model routing = the policy in §5 (user never picks a model).
- `IntakeAgent` (⚑R-A1) fills unstated fields from the `BrandKit` + brief; it asks **at most 1–2** questions,
  and only when a *required* field (e.g. the offer, or which language) is genuinely missing.

**Empty states that teach:**
- No campaigns yet → a single "Describe your ad in one line" input with 2–3 ghost example briefs specific to
  the tenant's vertical (e.g. "Legal AI that drafts German contracts in seconds").
- No brand kit → guided 60-second brand import (logo + 2 colors + 2 fonts), pre-filled with the Brutal seed
  for the seed tenant.
- Empty board while generating → live progress from the `GenerationJob` stream + skeleton cards, never a spinner.

**Guardrails (mechanical, not vibes):**
- `BrandGuardian` **hard gate**: palette/voice/banned-terms/mandatory-disclaimer/localization — a Variant that
  fails cannot reach the board; it loops back to the author agent (≤2 rounds).
- **Content moderation surface** on every gen failure (CANON §4) so a refused image is explained, not swallowed.
- Legal/disclaimer as a **first-class `legal` layer type** — never optional free text.

**Cost caps ("it won't surprise your card"):**
- **Hard per-brief and per-workspace `cost_usd` caps** (CANON §4/§10). Every `AgentRun` and `GenerationJob`
  logs tokens/latency/`cost_usd`; the orchestrator refuses to start a job that would breach the cap and shows
  the remaining budget in the UI.
- **Bounded auto-iterate (≤2)** is itself a cost cap. Caching by `(provider,model,version,prompt,seed,params)`
  makes edits nearly free.
- **Model tiering** (see §5, `⚑ R-LLM1`): Sonnet 5 by default, Opus 4.8 only on escalation, is a ~40% LLM-cost
  reduction with negligible quality loss for this workload.

**"It just works" behaviors:**
- **Never a raw model failure in the UI.** Every provider call has a fallback chain (§5); on exhaustion the UI
  shows a graceful "we couldn't generate imagery for variant 3 — retry / edit brief," not a stack trace.
- **Edits never re-roll.** Drag or chat → `LayerPatch` diff → re-render only affected layers. A copy tweak
  costs zero image credits.
- **Deterministic re-layout** to other ratios from one base (renderHints + safe zones), so "give me the 4:5"
  is instant and never crops the headline.

**Where humans stay in control (non-negotiable):**
- **The board** — humans pick, compare, tweak. Agents rank; they never choose.
- **The human-approve gate** — *nothing ships un-approved* (CANON §7).
- **Manual model override** always available (CANON §6) for power users, hidden by default.
- **Export is a human action.** Publishing to LinkedIn is human-triggered (P10 may automate ingest of
  *results*, never automate *spend*).

---

## 5. Job → provider routing policy (verified July 2026) + comparison

CANON §6 defines the interfaces and leaves the *policy* to research. Here it is, verified against live sources.
The `ProviderBus` reads this as a **ranked table with automatic fallback**; manual override always wins.

### 5.1 Verified provider landscape (image)

| Provider (env) | Current model (VERIFY) | Best at | ~Price/img | Editable text in-pixel? | Role in Brutal |
|---|---|---|---|---|---|
| **BFL / FLUX.2** (`BFL_API_KEY`) | `flux.2 [pro]` (32B RF-Transformer + Mistral-3 24B VLM; 4MP) [bfl-pricing][bfl-flux2] | Photoreal backgrounds, art direction, 4MP print-grade | credit-based, 1 credit=$0.01 [bfl-pricing] | N/A (we don't bake text) | **Primary** photoreal/background generator |
| **Google Gemini 3 Pro Image** ("Nano Banana Pro", `GEMINI_API_KEY`) | `gemini-3-pro-image` (GA; preview shut down 2026-06-25) [gem-3proimg][gem-blog] | Reasoned multi-turn edits, high-fidelity text, **reference/character consistency**, "Thinking" | tiered (Imagen-class ~$0.02–0.06) | **Yes, excellent** | **Primary** for reference-consistent imagery + edit-in-place |
| **fal** (`FAL_KEY`) | unified gateway: FLUX, Nano-Banana 2, Seedream 4.5, Recraft, etc. [fal-models][fal-price] | One API for many models, queue+webhook, near-zero cold start | model-dependent | depends on model | **Aggregator / fallback fabric** + Seedream access |
| **ByteDance Seedream** (`SEEDREAM_API_KEY`, via fal/BytePlus) | `seedream v4.5` (4MP/2048², up to 14 refs, strong typography) [seedream45][fal-seedream] | Cheap 4K, strong text, many refs | ~$0.04 [seedream45] | **Yes, strong** | **Cost-optimized** bulk/background fallback |
| **Ideogram** (`IDEOGRAM_API_KEY`) | Ideogram 3.0 (Turbo/Default/Quality $0.03/$0.06/$0.09) [ideo-price] | In-image typographic text | $0.03–0.09 [ideo-price] | **Yes (its specialty)** | **Fallback only** (layer-tree makes this moot) |
| **Recraft** (`RECRAFT_API_KEY`) | Recraft V3 (raster $0.04 / **vector $0.08**) [recraft-fal] | **Vector** output, brand styles, long text | $0.04 / $0.08 [recraft-fal] | **Yes + vector** | **Fallback / vector-asset** niche (icons, vector logos) |
| **OpenAI gpt-image** (`OPENAI_API_KEY`) | `gpt-image-2` (flagship; gpt-image-1 deprecating 2026-10-23) [oai-img][oai-pricing] | Instruction-following edits, broad availability | ~$0.005–0.20/img tiered [oai-img] | Yes | **Diversity fallback** / A-B variety |

### 5.2 Verified provider landscape (video / audio / LLM / engagement)

| Modality | Provider (env) | Current model (VERIFY) | Notes | Role |
|---|---|---|---|---|
| Video | **Kling** (`KLING_ACCESS_KEY`/`KLING_SECRET_KEY`) | `kling-v3`, `kling-o3` (Omni), Motion Control [kling-guide][kling-mgr] | **JWT (HS256)** auth; task-based create→query; **failed tasks don't consume credits**; ~$0.32 / 10s 1080p [kling-guide] | **Primary video** |
| Video | Seedance / Veo / Runway (via fal) | Veo `$0.4/s`, Wan `$0.05/s` on fal [fal-price] | Access through fal gateway | Fallbacks |
| Audio | **ElevenLabs** (`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_*`) | **Eleven v3** (70+ langs, 3k char/req, audio tags) [11l-tts][11l-models] | Multilingual v2/v3 $0.10 / 1k chars; Flash/Turbo $0.05 [11l-price] | **Primary TTS/VO** (DE VO) |
| LLM | **Anthropic** (`ANTHROPIC_API_KEY`) | see `⚑ R-LLM1` | Structured outputs via tool/JSON schema; 1M context; Batch API 50% off; prompt caching 90% off [claude-models][claude-price] | **All agents** |
| Engagement | in-house `saliency` (prod) / `facebook/tribev2` (research) | TRIBE v2 = **CC-BY-NC-4.0** [tribe] | Clean path commercial; TRIBE flag-gated research only | see §1.4 |

### 5.3 The routing policy (ranked; bus applies fallback top→down)

| Job | Rank 1 | Rank 2 | Rank 3 | Rationale |
|---|---|---|---|---|
| **Photoreal background / hero imagery** | FLUX.2 [pro] | Seedream 4.5 | gpt-image-2 | Highest fidelity 4MP; Seedream = cheap 4K fallback |
| **Reference/brand-consistent imagery, edit-in-place** | Gemini 3 Pro Image | FLUX.2 (Kontext edit) | gpt-image-2 | Nano-Banana Pro's reasoning + ref consistency wins here |
| **Vector asset (icon/logo shape)** | Recraft V3 (vector) | — | — | Only vector-native option |
| **Bulk / cost-sensitive variants** | Seedream 4.5 | fal-hosted FLUX | Nano-Banana 2 | Lowest $/img at 4MP |
| **In-pixel typographic image (rare — see note)** | Ideogram 3.0 | Recraft V3 | Seedream 4.5 | Only if a design *deliberately* wants baked type |
| **Video** | Kling v3 | Veo (fal) | Runway (fal) | Client-proven; failed tasks free |
| **TTS / VO (DE + EN)** | ElevenLabs v3 | — | — | Multilingual, audio tags |

> `⚑ R-PROV1 (RECOMMENDATION)` — **Demote Ideogram + Recraft to fallback-only** for image *generation*. Their
> headline superpower is *in-pixel text*, which the layer-tree architecture deliberately avoids. Keep Recraft
> for genuine **vector** assets. Keep both wired (CANON lists them; env vars stay) but they should almost never
> win the router for a normal ad. Rationale: routing to them reintroduces baked text — the exact prior pain.

> `⚑ R-PROV2 (RECOMMENDATION)` — **Prefer accessing Seedream via `FAL_KEY` (fal gateway)** rather than a
> separate direct BytePlus integration, unless a direct BytePlus contract is cheaper at volume. CANON's
> `SEEDREAM_API_KEY` env var can point at either; fal reduces integration surface (one queue/webhook pattern).
> Keep `SEEDREAM_API_KEY` as the name (CANON §10) — treat it as "the Seedream credential," source-agnostic.

> `⚑ R-LLM1 (RECOMMENDATION)` — **Model tiering for the agent loop.** Verified July 2026 Claude pricing
> [claude-models][claude-price]:
> | Model | API id | In / Out $/MTok | Use |
> |---|---|---|---|
> | **Claude Sonnet 5** | `claude-sonnet-5` | **$3 / $15** (intro **$2/$10** through 2026-08-31) | **Default** for Strategist/Copywriter/CompositorPlanner/EditorAgent/Localization |
> | **Claude Opus 4.8** | `claude-opus-4-8` | **$5 / $25** | **Escalation** for ArtDirector, Critic, hard BrandGuardian calls, and any auto-iterate round 2 |
> | Claude Haiku 4.5 | `claude-haiku-4-5` | $1 / $5 | Cheap classification / smart-layer binding / cache-key normalization |
>
> CANON §4 says "latest models" — this *satisfies* that while adding a cost lever. Default Sonnet 5, escalate to
> Opus 4.8 only where judgment quality moves the needle. All support structured outputs via tool/JSON schema
> and 1M context. Do **not** hardcode `claude-opus-4-8` everywhere. (Fable 5 `claude-fable-5` $10/$50 exists but
> is overkill for this loop; reserve for future hard reasoning only.) `VERIFY before coding`: model ids +
> intro-pricing window at `platform.claude.com/docs/en/about-claude/models/overview`.

### 5.4 Exact endpoint / auth skeletons (VERIFY each before coding)

**BFL FLUX.2 (image) — base `https://api.bfl.ai`, async create→poll.** `VERIFY`: exact path slug + field names
at `docs.bfl.ai` (I confirmed base URL + the create-then-`get_result` polling pattern + credit pricing; the
scalar/openapi page timed out, so re-confirm the `flux.2` path slug and body keys). [bfl-flux2][bfl-pricing]
```http
POST https://api.bfl.ai/v1/flux.2-pro           # VERIFY exact slug (flux.2 pro)
x-key: $BFL_API_KEY                              # BFL uses x-key header (VERIFY)
Content-Type: application/json
{ "prompt": "<IMAGERY ONLY — no text to render>",
  "aspect_ratio": "1:1",                         # or width/height; VERIFY field name
  "seed": 12345,
  "input_image": "<base64 or url for edit/Kontext>"   # optional
}
→ 200 { "id": "<task_id>", "polling_url": "https://api.bfl.ai/v1/get_result?id=<task_id>" }

GET  https://api.bfl.ai/v1/get_result?id=<task_id>
x-key: $BFL_API_KEY
→ { "status": "Ready", "result": { "sample": "<image_url>" } }   # poll until Ready
```

**Google Gemini 3 Pro Image (Nano Banana Pro).** `VERIFY`: whether to use the `interactions.create()` surface
or `models.generateContent`; aspect-ratio + image-size params ("16:9","4K"). Preview slugs
(`gemini-3-pro-image-preview`) were **shut down 2026-06-25** — use GA `gemini-3-pro-image`. [gem-3proimg][gem-blog]
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent
x-goog-api-key: $GEMINI_API_KEY                  # VERIFY header vs ?key=
{ "contents":[{"parts":[{"text":"<imagery only>"}, {"inline_data":{...ref image...}}]}],
  "generationConfig": { "imageConfig": { "aspectRatio":"1:1", "imageSize":"2K" } } }  # VERIFY keys
```

**Kling (video) — JWT (HS256), task-based.** `VERIFY`: host + task path slugs at KlingAI Open Platform (the
console doc returned HTTP 446 to unauthenticated fetch — confirm from the authenticated console). [kling-guide][kling-mgr]
```
JWT: HS256, header {alg:"HS256",typ:"JWT"},
     payload { iss: $KLING_ACCESS_KEY, exp: now+1800, nbf: now-5 }, secret = $KLING_SECRET_KEY
Authorization: Bearer <JWT>
POST <kling-host>/v1/videos/image2video   { "model_name":"kling-v3", "image":"<url>",
                                            "prompt":"...", "duration":5, ... }   # VERIFY path
→ { "data": { "task_id": "..." } }
GET  <kling-host>/v1/videos/image2video/<task_id>   → poll until "succeed"
```

**ElevenLabs (TTS/VO).** [11l-tts][11l-models]
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
xi-api-key: $ELEVENLABS_API_KEY
{ "text":"...", "model_id":"eleven_v3", "voice_settings":{...} }   # VERIFY model_id slug for v3
```
`VERIFY`: exact `model_id` for Eleven v3 in the TTS endpoint; 3k-char/request limit means chunk long VO.

**Anthropic (agents).** Messages API / Agent SDK, structured outputs via tool/JSON schema, prompt caching,
Batch API (50% off) for non-interactive fan-out (e.g. 6-variant copy). `VERIFY`: model ids + intro-pricing
window. [claude-models][claude-price]

---

## 6. Infrastructure reconciliation — queue, editor, render, hosting

**Queue (CANON §4 says "Inngest OR Supabase queue/pg-boss").**

> `⚑ R-INFRA1 (RECOMMENDATION)` — **Default to Supabase Queues (pgmq); make Inngest an adapter, not the
> baseline.** Verified July 2026: Supabase Queues is a Postgres-native durable queue on the **pgmq** extension,
> with **guaranteed / exactly-once-per-visibility-window delivery**, driven by **pg_cron + Edge Functions**,
> and it runs *inside the exact Supabase stack CANON already mandates* — zero new infra, RLS-native.
> [sb-queues][sb-jobs] This is strictly less operational surface than standing up Inngest. Keep a thin
> `JobQueue` interface so Inngest remains a drop-in when you need its fan-out/step-function ergonomics or
> long-running workflows; but the MLP should not require a second SaaS. `VERIFY`: pgmq visibility-window
> semantics + Edge Function timeout (≈150s) are adequate for your *dispatch* step — the long-running *gen* work
> lives at the provider and is polled, so the Edge Function only enqueues/polls, which fits. CANON's `INNGEST_*`
> env vars stay reserved for the adapter.

**Editor (CANON §4: Polotno behind `EditorAdapter`).** Agree. `VERIFY`: Polotno SDK is **commercially
licensed** — self-serve **$899/mo**, and **`polotno-node`** self-hosts headless-Chromium rendering (store JSON
→ PNG/JPEG/PDF/MP4/PPTX/SVG) with **no per-render fees**, data stays on your infra. [polotno-price][polotno-lic]
Budget the license into the build package; the `EditorAdapter` keeps it swappable if licensing changes.

**Render (CANON §4: `packages/render`).** Agree: `polotno-node` for static/carousel (PNG/JPG/PDF/PPTX);
**Remotion** for video. `VERIFY`: **Remotion needs a Company License for for-profit companies with 4+
employees** (Creators seat-based ~$25/dev/mo, min $100/mo or $1000/yr; or Automators render-based $0.01/render
in 1000-blocks, min $100/mo). [rem-lic][rem-pro] Brutal will exceed the free-tier headcount threshold — budget
it, and prefer the render-based plan if video volume is spiky.

**Hosting (CANON §4).** Agree: Vercel (web) + Supabase (data/auth/storage) + Modal/Replicate (engine GPU for
saliency/TRIBE research) + Supabase/R2 (assets).

---

## 7. Complete external services / API keys + failure modes & mitigations

Env-var names are **verbatim from CANON §10** (do not rename).

| Service | Env var(s) | Required for | Failure mode | Mitigation |
|---|---|---|---|---|
| Anthropic (Claude) | `ANTHROPIC_API_KEY` | **All agents** (whole studio) | 429 / model deprecation / refusal | Retry+backoff; **model tier fallback** Opus 4.8↔Sonnet 5↔Haiku 4.5; Batch API for fan-out; content-mod surface on refusal |
| BFL / FLUX | `BFL_API_KEY` | Primary imagery | Timeout / credit exhaustion / poll never Ready | Bus fallback → Seedream → gpt-image; per-workspace credit alarm; cap poll attempts then surface graceful error |
| fal | `FAL_KEY` | Aggregator, Seedream/Nano-Banana/Recraft access | Gateway/model outage | Queue+webhook retry; route to direct provider if fal down |
| Ideogram | `IDEOGRAM_API_KEY` | Fallback (in-pixel text) | — | Rarely on path (⚑R-PROV1); optional key |
| Recraft | `RECRAFT_API_KEY` | Vector assets / fallback | — | Optional; only for vector jobs |
| Google Gemini Image | `GEMINI_API_KEY` | Reference-consistent imagery, edit-in-place | Model rename / preview shutdown (happened 2026-06-25) | Pin GA `gemini-3-pro-image`; bus fallback → FLUX Kontext |
| OpenAI gpt-image | `OPENAI_API_KEY` | Diversity fallback | `gpt-image-1` deprecating 2026-10-23 | Use `gpt-image-2`; optional on path |
| Seedream | `SEEDREAM_API_KEY` (via fal/BytePlus) | Cost-optimized 4K imagery | Provider-source ambiguity | ⚑R-PROV2: source via fal; keep name source-agnostic |
| Kling | `KLING_ACCESS_KEY`, `KLING_SECRET_KEY` | Video (fast-follow) | JWT expiry / task fail | Short-lived JWT minted per request; **failed tasks are free** [kling-guide]; bus fallback → Veo/Runway via fal |
| ElevenLabs | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_*` | VO/TTS (video) | 3k-char/request limit; voice drift | Chunk long text; pin voice IDs per language in env |
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | DB/Auth/Storage/**Queue (pgmq)** | RLS misconfig = cross-tenant leak | RLS from day 1 (P0); service-role key **server-only**, never shipped to client; test cross-tenant denial |
| Engine | `ENGINE_URL`, `ENGAGEMENT_BACKEND`, `RESEARCH_MODE` | Engagement scoring | TRIBE non-commercial leak onto prod path | `saliency` default; `tribe_research` gated by BOTH `ENGAGEMENT_BACKEND` and `RESEARCH_MODE`; CI check forbids TRIBE on commercial build |
| Jobs (adapter) | `INNGEST_*` | Optional queue adapter | — | pgmq is default (⚑R-INFRA1); Inngest reserved |
| App | `APP_BASE_URL` | Webhooks, callbacks, share links | Wrong base = broken webhooks | Set per environment; validate at boot |
| Polotno (license) | (license key, add to §10) | Editor + `polotno-node` render | Unlicensed = watermark/limits | Commercial license $899/mo [polotno-price]; `⚑ R-ENV1`: add `POLOTNO_API_KEY` to canonical env list |
| Remotion (license) | (billing, not a runtime key) | Video render (P9) | Company-License requirement | Purchase Company License (4+ employees) [rem-lic]; not a runtime secret |

> `⚑ R-ENV1 (RECOMMENDATION)` — CANON §10's env list omits a **Polotno license key** (`POLOTNO_API_KEY` or
> equivalent). Polotno is a paid commercial SDK [polotno-lic]; the build package must include its key. Add it to
> docs/11's canonical env block. (Remotion is a purchased license, not a per-request runtime key, so it needs a
> line item in the cost budget, not necessarily an env var.)

**Cross-cutting failure-mode principles:**
- **No provider failure reaches the user raw** — every external call is a `GenerationJob` with a fallback chain
  and a graceful UI state (CANON §4 content-mod surface).
- **Cost caps are enforced pre-flight** — the orchestrator refuses jobs that would breach per-brief/per-workspace
  `cost_usd` caps and shows remaining budget.
- **License containment is a CI gate** — a build-time check ensures TRIBE (CC-BY-NC) code paths are unreachable
  when the commercial flag is set. This is the highest-severity failure mode (legal, not technical).
- **Model-drift resilience** — model ids live in config, never hardcoded; a startup check hits Anthropic's
  Models API and BFL/Gemini reachability, failing fast with a clear message if a pinned model was retired.

---

## 8. Summary of recommendations (all additive / flagged — nothing silently diverges)

| # | Recommendation | Impact | Conflicts with CANON? |
|---|---|---|---|
| ⚑R-A1 | Add `IntakeAgent` (brief normalizer, ≤1–2 clarifying Qs) before `Strategist` | Near-zero-friction "it just works" without garbage-in | No — additive agent |
| ⚑R-LT1 | Add `renderHints` per layer for deterministic multi-ratio re-layout | Fulfills §8 "smart re-layout, not cropping" | No — additive field |
| ⚑R-LLM1 | Default **Sonnet 5**, escalate to **Opus 4.8**, Haiku 4.5 for cheap tasks | ~40% LLM cost cut, negligible quality loss | No — satisfies "latest models" + adds a lever |
| ⚑R-PROV1 | Demote Ideogram/Recraft to fallback-only for image *gen* | Prevents re-introducing baked text | No — keeps them wired per §6/§10 |
| ⚑R-PROV2 | Source Seedream via `FAL_KEY`; keep `SEEDREAM_API_KEY` source-agnostic | Less integration surface | No — name unchanged |
| ⚑R-INFRA1 | Default queue = **Supabase Queues (pgmq)**; Inngest = adapter | Zero new infra for MLP; RLS-native | No — CANON offers "Inngest OR Supabase queue" |
| ⚑R-ENV1 | Add Polotno license key to canonical env list; budget Remotion Company License | Avoids a runtime blocker + legal gap | Minor — fills a §10 omission |

---

## 9. "VERIFY before coding" — consolidated checklist

1. **Claude model ids + intro-pricing window** (`claude-sonnet-5`, `claude-opus-4-8`, `claude-haiku-4-5`;
   Sonnet 5 intro $2/$10 ends **2026-08-31**) — `platform.claude.com/docs/en/about-claude/models/overview`. [claude-models]
2. **BFL FLUX.2 exact path slug + request body keys** (`aspect_ratio` vs `width/height`, `input_image`),
   `x-key` header, `get_result` polling — `docs.bfl.ai` (scalar page timed out on fetch). [bfl-flux2]
3. **Gemini 3 Pro Image surface** (`interactions.create` vs `generateContent`), `imageConfig` keys, GA slug
   `gemini-3-pro-image` (preview shut down **2026-06-25**). [gem-3proimg][gem-blog]
4. **Kling host + task path slugs + JWT claims** (`iss/exp/nbf`, HS256) — KlingAI Open Platform console
   (unauth fetch returned HTTP 446). [kling-guide]
5. **ElevenLabs `model_id` for Eleven v3** + 3k-char/request chunking — `elevenlabs.io/docs`. [11l-tts]
6. **Seedream 4.5 source decision** (fal `fal-ai/bytedance/seedream/v4.5/*` vs direct BytePlus) + `image_size`
   enum. [fal-seedream][seedream45]
7. **`facebook/tribev2` still CC-BY-NC-4.0** (non-commercial) — HF model card; confirms research-only gating. [tribe]
8. **Polotno commercial license price/terms** ($899/mo self-serve) + `polotno-node` render fidelity for your
   fonts (Playfair/Inter). [polotno-price][polotno-lic]
9. **Remotion Company License** requirement + plan choice (seat vs render) for 4+ employees. [rem-lic][rem-pro]
10. **Supabase Queues (pgmq)** visibility-window semantics + Edge Function timeout adequacy for dispatch/poll. [sb-queues][sb-jobs]
11. **LinkedIn 2026 format specs** (ratios/limits in CANON §8) against LinkedIn's current ad spec page before
    hardcoding exporter constraints (specs drift; CANON §8 is the intended source of truth, but re-confirm the
    ≤5 MB / ≤200 MB / char limits at ship time).

---

## Sources

- [claude-models] Anthropic — Models overview (Opus 4.8, Sonnet 5, Haiku 4.5, Fable 5 ids/pricing/context): https://platform.claude.com/docs/en/about-claude/models/overview
- [claude-price] Anthropic — Pricing (Batch 50%, caching 90%, Sonnet 5 intro window): https://platform.claude.com/docs/en/about-claude/pricing
- [bfl-pricing] Black Forest Labs — FLUX API pricing (credits, 1 credit=$0.01): https://bfl.ai/pricing
- [bfl-flux2] BFL Documentation overview (FLUX.2, Kontext, get_result): https://docs.bfl.ml/quick_start/pricing
- [fal-models] fal — model catalog (FLUX, Nano-Banana, Seedream, queue/webhook): https://fal.ai/explore/models
- [fal-price] fal — pricing (Veo $0.4/s, Wan $0.05/s, per-image rates): https://fal.ai/pricing
- [fal-seedream] fal — Seedream v4.5 text-to-image endpoint: https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/text-to-image
- [seedream45] ByteDance Seedream 4.5 (4MP/2048², $0.04, 14 refs, image_size enum): https://seed.bytedance.com/en/seedream4_5
- [gem-3proimg] Google — Gemini 3 Pro Image (Nano Banana Pro) API: https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image
- [gem-blog] Google — Nano Banana Pro for developers (GA; preview shutdown 2026-06-25): https://blog.google/technology/developers/gemini-3-pro-image-developers/
- [oai-img] OpenAI image API pricing (gpt-image-2 flagship; gpt-image-1 deprecating 2026-10-23): https://developers.openai.com/api/docs/pricing
- [oai-pricing] OpenAI API pricing: https://developers.openai.com/api/docs/pricing
- [ideo-price] Ideogram — API pricing (3.0 Turbo/Default/Quality): https://ideogram.ai/features/api-pricing
- [recraft-fal] Recraft V3 on fal (raster $0.04 / vector $0.08): https://fal.ai/models/fal-ai/recraft/v3/text-to-image
- [kling-guide] Kling AI API Guide 2026 (JWT, task-based, pricing, failed-task-free): https://kling3.pro/blog/kling-ai-api-guide
- [kling-mgr] KlingAI Open Platform — user manual: https://app.klingai.com/global/dev/document-api/quickStart/userManual
- [11l-tts] ElevenLabs — Text to Speech docs: https://elevenlabs.io/docs/overview/capabilities/text-to-speech
- [11l-models] ElevenLabs — Models (Eleven v3, 70+ langs, 3k chars): https://elevenlabs.io/docs/overview/models
- [11l-price] ElevenLabs — API pricing ($0.10/1k chars v2/v3): https://elevenlabs.io/pricing/api
- [polotno-price] Polotno SDK — pricing ($899/mo self-serve, polotno-node no per-render fee): https://polotno.com/sdk/pricing
- [polotno-lic] Polotno — license agreement (commercial): https://polotno.com/legal/license
- [rem-lic] Remotion — License & Pricing (Company License for 4+ employees): https://www.remotion.dev/docs/license
- [rem-pro] Remotion Pro — Company Licensing (Creators seat / Automators render): https://www.remotion.pro/license
- [sb-queues] Supabase — Queues (pgmq, guaranteed delivery): https://supabase.com/docs/guides/queues
- [sb-jobs] Supabase — Processing large jobs with Edge Functions, Cron, Queues: https://supabase.com/blog/processing-large-jobs-with-edge-functions
- [tribe] amirmushichge/tribeV2_ViralAnalyser (non-commercial; facebook/tribev2 CC-BY-NC-4.0): https://github.com/amirmushichge/tribeV2_ViralAnalyser
