# 05 — Creative Studio: Runtime Agents, Orchestration & LayerPatch (CANON §7)

> ⚠️ **CROSS-REFERENCE NOTE — read first (authoritative, per CANON §12 L1).** Some inline `docs/NN` / `doc NN` pointers in this file predate the frozen document map and may cite the wrong number. **Resolve every cross-reference by ROLE using this map, not by the integer written inline:** `01` product · `02` architecture · `03` data-model (all DDL/zod/schemas) · `04` providers · `05` agent-studio · `06` editor + `packages/render` + export · `07` creative-playbook · `08` engagement · `09` brand-kit · `10` build-plan · `11` env · `12` security/ops · `13` acceptance · `14` appendix. There is **no localization doc** (localization lives in `05` LocalizationAgent + `09` brand-kit `localization` + `07`) and **no "exporter" doc** (export lives in `06`). Source paths live under `apps/web/src/**` (never a top-level `lib/` directory under `apps/web`). Where anything here disagrees with CANON §12, **the ledger wins.**

> **Read `handoff/CANON.md` first.** This document specifies the **Creative Studio** — the runtime
> pipeline of Claude agents that turns a normalized `Brief` into a ranked board of on-brand, testable LinkedIn
> ads (CANON §0, §7). It is authored for an autonomous build factory with **zero outside context**. Every
> object-model name, provider interface, agent name, env var, and model tier below is **canonical (CANON §5/§6/§7/§10)**
> and must not be renamed. Where research suggests a deviation, it appears as a clearly-labelled **⚑ RECOMMENDATION**,
> never a silent divergence. Every external API carries a **`VERIFY current docs before coding`** note.
>
> **Scope of this doc:** the agents (`Strategist`, `Copywriter`, `ArtDirector`, `CarouselArchitect`,
> `CompositorPlanner`, `BrandGuardian`, `Critic`, `EngagementAnalyst`, `EditorAgent`, `LocalizationAgent`), their
> exact I/O schemas + system prompts + model tier + guardrails, the orchestration graph (brief→board),
> parallelism, the bounded auto-iterate loop, human-approve gates, `AgentRun` observability, cost caps, and the
> `LayerPatch` contract used by `EditorAgent`.
> **Out of scope (referenced, not defined here):** the layer-tree/object-model DDL (docs/03), the provider drivers
> + `ProviderBus` internals (docs/04), `packages/render` (docs/06), the engagement engine internals (docs/08),
> the editor UI / Polotno `EditorAdapter` (docs/06). This doc consumes their interfaces.

---

## 0. TL;DR — the ten decisions this doc locks

1. **Eleven runtime agents** (the ten canonical CANON §7 agents **+ `IntakeAgent`**, an additive brief-normalizer
   — see `⚑ R-A1`, inherited from R7). Each agent **emits a zod-validated structured artifact, never free text.**
2. **Model tiering (⚑ R-LLM1, from R7):** default **`claude-sonnet-5`**; escalate to **`claude-opus-4-8`** for
   judgment-heavy agents (`ArtDirector`, `Critic`, hard `BrandGuardian` calls, and **any auto-iterate round 2**);
   **`claude-haiku-4-5`** for cheap classification (`IntakeAgent` field-extraction, `smart`-layer binding). CANON
   §4 says "latest models" — this satisfies it and adds a cost lever. **Do not hardcode `claude-opus-4-8` everywhere.**
3. **Two parallel branches, one join.** Copy generation (`Copywriter`) and imagery generation (`ArtDirector` →
   `ProviderBus.image`) run **in parallel** and only meet at `CompositorPlanner`. **Text never enters an image
   prompt** — this is the structurally-enforced anti-re-roll invariant (CANON §2 load-bearing decision).
4. **Two gates, one loop.** `BrandGuardian` is a **mechanical hard gate** (fail → loop back to author agent).
   The **human-approve gate** is judgment (nothing ships un-approved, CANON §7). Auto-iterate is **bounded ≤2 rounds**
   and lives *before* the human sees the board.
5. **`BrandGuardian` and the `legal` layer are hard, not vibes.** Palette / voice-register / banned-terms /
   mandatory-disclaimer / localization are checked mechanically against the **versioned `BrandKit`**.
6. **`EditorAgent` emits typed `LayerPatch` diffs, never full re-rolls** (CANON §4). Contract in §6.
7. **`EngagementAnalyst` always reports bands + confidence** via `EngagementPredictor` (`ENGAGEMENT_BACKEND=saliency`
   on the commercial path); it interprets, it never invents CTR (CANON §6/§9, docs/08).
8. **Every agent call is an `AgentRun`** with `tokens/latency/cost_usd/model/model_version` (CANON §4/§5). **Hard
   per-brief and per-workspace `cost_usd` caps** are enforced **pre-flight** by the orchestrator.
9. **`LocalizationAgent` transcreates DE⇄EN** (not literal translation) and emits **TTS-safe number spelling**
   ("zwölfhundert") for the VO track while keeping numerals in on-screen text layers (CANON §7, R2 §4.4).
10. **Structured outputs via Anthropic tool/JSON schema** (CANON §4). Every agent's output schema lives in
    `packages/shared` as a **zod schema** and is enforced at the boundary. Fan-out (e.g. 6-variant copy) uses the
    **Batch API (50% off)** where non-interactive.

---

## 1. Agent roster at a glance

| # | Agent (canonical) | One-line responsibility | Default model tier | Escalates to | Parallelizable? | Emits (artifact) |
|---|---|---|---|---|---|---|
| 0 | `IntakeAgent` `⚑R-A1` | Normalize one-line brief (+URL/assets) → structured `Brief`; ask ≤1–2 Qs only if a required field is missing | `claude-haiku-4-5` | `claude-sonnet-5` | no (gate) | `NormalizedBrief` |
| 1 | `Strategist` | `Brief` → strategy: audience, angle, JTBD, proof points, funnel stage | `claude-sonnet-5` | `claude-opus-4-8` | no | `Strategy` |
| 2 | `Copywriter` | Strategy → hooks/headlines/intro-text/CTAs (**specificity > cleverness**) | `claude-sonnet-5` | `claude-opus-4-8` | **yes** (with #3) | `CopySet` |
| 3 | `ArtDirector` | Strategy → visual concept + **model choice hint** + **imagery-only** prompt + negPrompt | `claude-opus-4-8` | — | **yes** (with #2) | `ArtDirection` |
| 4 | `CarouselArchitect` | (carousel only) multi-slide narrative hook→reframe→close + continuity | `claude-sonnet-5` | `claude-opus-4-8` | after #1 | `CarouselNarrative` |
| 5 | `CompositorPlanner` | Concept + copy + generated imagery → **layer tree** (join point) | `claude-sonnet-5` | `claude-opus-4-8` | no (join) | `LayerTree` |
| 6 | `BrandGuardian` | **HARD GATE**: palette / voice / banned terms / disclaimer / localization vs `BrandKit` | `claude-sonnet-5` | `claude-opus-4-8` | no (gate) | `BrandVerdict` |
| 7 | `Critic` | Score vs LinkedIn playbook + anti-patterns; structured critique | `claude-opus-4-8` | — | **yes** (with #8) | `CriticReport` |
| 8 | `EngagementAnalyst` | Call `EngagementPredictor`; interpret bands+confidence; recommend | `claude-sonnet-5` | `claude-opus-4-8` | **yes** (with #7) | `EngagementReport` |
| 9 | `EditorAgent` | NL edit request → typed **`LayerPatch[]`** (never a re-roll) | `claude-sonnet-5` | `claude-opus-4-8` | n/a (post-board) | `EditResult` (wraps `LayerPatchSet`) |
| 10 | `LocalizationAgent` | DE⇄EN **transcreation**; TTS-safe number spelling; locale `smart`-layer bindings | `claude-sonnet-5` | `claude-opus-4-8` | n/a (post-board) | `LocalizationResult` |

> `⚑ R-A1 (RECOMMENDATION, inherited from R7 §1.3)` — `IntakeAgent` is **additive**, not a rename. It runs
> *before* `Strategist` to keep the "type a brief → get ads" promise near-zero-friction while preventing
> garbage-in. If the factory prefers strict CANON §7 minimalism, `IntakeAgent`'s logic may be folded into the
> `Strategist` system prompt — but a separate agent is cleaner to observe and cost-cap. Recommended: keep separate.

> `⚑ ASSUMPTION A1` — `claude-sonnet-5`, `claude-opus-4-8`, `claude-haiku-4-5` are the current Anthropic model
> ids per R7 §5.3. **`VERIFY current docs before coding`**: model ids + Sonnet 5 intro-pricing window (intro
> **$2/$10** ends 2026-08-31) at `platform.claude.com/docs/en/about-claude/models/overview`. Model ids live in
> **config, never hardcoded** (see §9.4); a startup check hits the Anthropic Models API and fails fast if a
> pinned model was retired.

---

## 2. The orchestration graph (brief → board)

### 2.1 The full pipeline

```
  one-line brief (+optional URL / attachments)
        │
        ▼
  [0] IntakeAgent ──► NormalizedBrief   (persist Brief; ≤1–2 clarifying Qs ONLY if a required field missing)
        │                                (haiku extraction; sonnet fallback if ambiguous)
        ▼
  [1] Strategist ──► Strategy{audience, angle, jtbd, proofPoints[], funnelStage, tone}
        │
        ├──────────────── PARALLEL FORK (per variant N) ────────────────┐
        ▼                                                               ▼
  [2] Copywriter ──► CopySet                              [3] ArtDirector ──► ArtDirection
      {hooks[], headline, introText, cta,                     {concept, modelHint, imageryPrompt,
       specificityScore}                                       negativePrompt, aspect, refs[]}
      (Batch API fan-out for N variants)                            │
        │                                                           │  ProviderBus.image(job)  (docs/04)
        │  (if AdDocument.type==carousel)                           ▼   → FLUX.2 / Nano-Banana Pro / …
        │  [4] CarouselArchitect ──► CarouselNarrative       GenerationJob (async, cached, cost-metered)
        │      {slides:[{role:hook|reframe|close, beat}]}           │
        └───────────────────────────┬───────────────────────────────┘
                                    ▼
  [5] CompositorPlanner ──► LayerTree   (concept + copy + generated imagery → JSON layer tree;
        │                                 assigns renderHints per layer; binds smart layers)
        ▼
  [6] BrandGuardian ── HARD GATE ──► BrandVerdict{pass|fail, violations[]}
        │  fail ──► route to offending author agent (Copywriter/ArtDirector/CompositorPlanner) ─┐
        │  pass                                                                                  │
        ▼                                                                                        │
  packages/render (docs/06): LayerTree → Polotno store JSON → PNG/JPG (PDF for doc ads) ► Render │
        │                                                                                        │
        ├──────────────── PARALLEL FORK ────────────────┐                                        │
        ▼                                               ▼                                        │
  [7] Critic ──► CriticReport            [8] EngagementAnalyst ──► EngagementReport               │
      {playbookScore, antiPatterns[],        (calls EngagementPredictor;                         │
       fixes[]}                               ENGAGEMENT_BACKEND=saliency, prod)                  │
        └───────────────────┬───────────────────────────┘  scores = BANDS + confidence           │
                            ▼                                                                     │
                     verdict = combine(CriticReport, EngagementReport)                            │
                            │                                                                     │
              weak? ──yes──► AUTO-ITERATE (≤2 rounds; round-2 = opus tier) ──► re-author ─────────┘
                            │ no / round-2 exhausted
                            ▼
        ┌───────────────  THE BOARD  (ranked Variants per workspace)  ───────────────┐
        │  HUMAN in control: review · compare · pick · tweak                         │
        └───────────────────────────┬───────────────────────────────────────────────┘
                                    ▼
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
        EDIT by drag         [9] EditorAgent ──►    [10] LocalizationAgent ──►
        (Polotno canvas,      LayerPatchSet          LocalizationResult
         docs/06)             (typed LayerPatch[])   (DE⇄EN transcreation,
              │                    │                  TTS-safe numbers)
              └─────────────────────┼─────────────────────┘
                                    ▼   (apply LayerPatch → re-render ONLY affected layers; never a re-roll)
                          HUMAN-APPROVE GATE  (nothing ships un-approved — CANON §7)
                                    ▼
                       EXPORT to exact LinkedIn spec (docs/06) → ship → Result (CANON §5)
```

### 2.2 Orchestration invariants (the non-negotiables)

| Invariant | Enforced where | Why |
|---|---|---|
| Copy gen and imagery gen are **parallel** and text **never** enters an image prompt | Orchestrator fork + `ArtDirection.imageryPrompt` schema forbids copy strings | Structural anti-re-roll (CANON §2) |
| Every cross-API step is an **async `GenerationJob`** with UI-subscribed progress | `ProviderBus` + job queue (pgmq default, `⚑R-INFRA1`) | No 30-s synchronous waits (CANON §4) |
| `BrandGuardian` is a **hard gate**; a failing variant **cannot reach the board** | Orchestrator (not the prompt) | Deterministic "on-brand" (CANON §7) |
| Auto-iterate is **bounded ≤2 rounds** | Orchestrator counter, not the prompt | Cost + latency ceiling (CANON §7) |
| **Nothing ships un-approved** | Human-approve gate after edits, before export | Humans in control (CANON §7) |
| Every agent output is **zod-validated** before the next stage consumes it | `packages/shared` zod schemas at each boundary | No free-text hand-offs (R7 §1.3) |
| Cost caps enforced **pre-flight** | Orchestrator refuses a job that would breach the cap | "Won't surprise your card" (CANON §4, R7 §4) |

### 2.3 Where each agent runs

All agents run **server-side in `apps/web`** (Next.js 15 server actions / route handlers, CANON §4) via the
**Anthropic Agent SDK or Messages API** (CANON §4). The orchestrator is a server module
(`apps/web/src/server/studio/orchestrator.ts`). Long-running gen work is dispatched to the **job queue** and polled;
the agent LLM calls themselves are short and run inline in the server action, each wrapped in an `AgentRun`
record (§7). `EngagementAnalyst` is the only agent that calls **`services/engine`** (via `ENGINE_URL`, docs/08);
it does so through `ProviderBus.predictor(job)`, never directly.

### 2.4 Orchestrator skeleton (TypeScript, `apps/web/src/server/studio/`)

```ts
// apps/web/src/server/studio/orchestrator.ts  (skeleton — see docs/04 for ProviderBus, docs/03 for types)
import { z } from "zod";
import { runAgent } from "./agent-runner";          // wraps Anthropic call + AgentRun logging + cost cap (§7)
import { ProviderBus } from "@brutal/shared";        // CANON §6
import type { NormalizedBrief, Strategy, CopySet, ArtDirection,
  CarouselNarrative, LayerTree, BrandVerdict, CriticReport, EngagementReport } from "@brutal/shared";

export async function runBriefToBoard(input: {
  briefText: string; url?: string; attachments?: AssetRef[];
  workspaceId: string; brandKitVersion: number;
  adType: "single_image" | "carousel" | "video";
  variantCount?: number;                              // default 4–6 (R7 §4)
}): Promise<{ variants: VariantRef[] }> {
  const budget = await assertBudget(input.workspaceId, input.briefText);   // pre-flight cost cap (§8)

  // [0] Intake (gate)
  const brief: NormalizedBrief = await runAgent("IntakeAgent", { input, budget });
  if (brief.needsClarification) return { variants: [], clarifyingQuestions: brief.questions }; // ≤1–2 Qs

  // [1] Strategy
  const strategy: Strategy = await runAgent("Strategist", { brief, budget });

  const N = input.variantCount ?? 5;
  const variants = await Promise.all(range(N).map(async (i) => {
    // [2]//[3] PARALLEL: copy || imagery
    const [copy, art] = await Promise.all([
      runAgent<CopySet>("Copywriter", { strategy, variantIndex: i, budget, batch: true }),
      runAgent<ArtDirection>("ArtDirector", { strategy, variantIndex: i, budget }),
    ]);
    // [3b] imagery is an async GenerationJob via the bus (docs/04) — text NEVER in this prompt
    const image = await ProviderBus.image({ workspaceId: input.workspaceId, spec: art.toGenSpec() }).generate(art.toGenSpec());

    // [4] carousel only
    const narrative = input.adType === "carousel"
      ? await runAgent<CarouselNarrative>("CarouselArchitect", { strategy, copy, budget }) : undefined;

    // [5] JOIN → layer tree
    let tree: LayerTree = await runAgent("CompositorPlanner",
      { strategy, copy, art, image, narrative, brandKitVersion: input.brandKitVersion, adType: input.adType, budget });

    // [6] hard gate + bounded auto-iterate (≤2)
    for (let round = 0; round <= 2; round++) {
      const verdict: BrandVerdict = await runAgent("BrandGuardian",
        { tree, brandKitVersion: input.brandKitVersion, budget, escalate: round === 2 });
      if (!verdict.pass) { tree = await repairFrom(verdict, { strategy, copy, art, image, tree, budget }); continue; }

      const render = await renderDocument(tree);                                   // packages/render (docs/06)
      const [critic, eng] = await Promise.all([
        runAgent<CriticReport>("Critic", { render, tree, strategy, budget, escalate: round === 2 }),
        runAgent<EngagementReport>("EngagementAnalyst", { render, tree, budget }),  // → EngagementPredictor (docs/08)
      ]);
      if (!isWeak(critic, eng) || round === 2) return persistVariant({ tree, render, critic, eng, brief, strategy, art, image });
      tree = await autoIterate({ critic, eng, strategy, copy, art, tree, round, budget });  // feed critique back
    }
  }));
  return { variants: rankBoard(variants) };            // ranked by stoppingPower band (docs/08)
}
```

---

## 3. Per-agent specification

Format for each agent: **Responsibility · Input schema · Output schema (zod) · System prompt · Model tier ·
Guardrails.** All schemas live in `packages/shared/src/studio/*.ts` and are enforced at the orchestration
boundary. All prompts are grounded in the LinkedIn playbook (**CANON §8 format specs + §2 hook→reframe→close
narrative + the "specificity > cleverness / sober-editorial-not-hype" voice from CANON §1**). Copy strings are
rendered by the compositor as **editable text layers**, never baked into imagery.

> `⚑ ASSUMPTION A2` — CANON §7 references "the LinkedIn playbook (R3)". At authoring time **R3 does not exist as
> a research file**; the playbook rules embedded in these prompts are derived from **CANON §8 (format specs),
> CANON §2 (hook→reframe→close, the baked-text anti-pattern), and CANON §1 (voice/register)**. **`VERIFY before
> coding`**: reconcile these prompt rules against `handoff/research/R3-linkedin-playbook.md` when it lands;
> the anti-pattern list in §3.7 (`Critic`) is the single place to update.

---

### 3.0 `IntakeAgent` `⚑R-A1`

**Responsibility.** Turn a one-line brief (+optional URL/attachments) into a normalized `Brief` object; ask **at
most 1–2 clarifying questions ONLY when a required field is genuinely missing**, otherwise proceed on
`BrandKit`-derived defaults. Extraction-heavy → cheapest tier.

**Input**
```jsonc
{ "briefText": "Legal AI that drafts German contracts in seconds — target law firm partners",
  "url": "https://brutal.ai/legal",            // optional; fetched + summarized upstream
  "attachments": [{ "assetId": "…", "kind": "logo|screenshot|pdf" }],  // optional
  "brandKit": { "version": 3, "verticals": ["legal-de","pe"], "defaultLanguage": "de" },
  "workspaceLocale": "de" }
```

**Output — `NormalizedBrief` (zod)**
```ts
export const NormalizedBrief = z.object({
  offer: z.string(),                                   // the thing being advertised
  audience: z.string(),                                // who; role/seniority/vertical
  vertical: z.enum(["legal-de", "pe", "other"]),
  proofPoints: z.array(z.string()).default([]),        // e.g. "1200+ firms", "SOC2"
  mandatoryLegal: z.array(z.string()).default([]),     // disclaimers that MUST appear (→ legal layer)
  languages: z.array(z.enum(["de", "en"])).min(1),
  funnelStage: z.enum(["awareness", "consideration", "conversion"]).default("consideration"),
  adType: z.enum(["single_image", "carousel", "video"]).default("single_image"),
  constraints: z.record(z.unknown()).default({}),      // e.g. "no faces", "must show product UI"
  needsClarification: z.boolean(),
  questions: z.array(z.string()).max(2).default([]),   // ONLY if a required field is missing
});
```

**System prompt**
```
You are IntakeAgent for Brutal Ads, which turns a one-line brief into on-brand LinkedIn ads.
Your job: extract a structured Brief from the user's brief text, any provided URL summary, and the workspace
BrandKit. Fill unstated fields from the BrandKit and sensible defaults. Do NOT invent proof points, numbers,
or legal claims — only carry forward facts present in the input or BrandKit; leave unknowns empty.

Required fields that must be known before generation: offer, audience, at least one language, adType.
If and ONLY if one of these is genuinely missing and cannot be defaulted, set needsClarification=true and ask
at most TWO short, specific questions. Never ask about anything you can reasonably default from the BrandKit or
workspace locale. Prefer proceeding over asking.

Voice context (do not change it, just record it): Brutal's register is sober, editorial, documentary — NOT hype
AI. Bilingual German + English. If the brief names a vertical (legal AI for German law firms, or private equity),
set it. Carry any mandatory legal/disclaimer text into mandatoryLegal verbatim.

Return ONLY the NormalizedBrief JSON via the provided tool schema. No prose.
```

**Model tier.** `claude-haiku-4-5` for extraction; if the model's own confidence is low or the brief is
ambiguous, the orchestrator retries once at `claude-sonnet-5`.
**Guardrails.** (1) Never fabricate proof points, numbers, or legal claims. (2) `questions.length ≤ 2`, enforced
by schema. (3) If `needsClarification`, the orchestrator **halts the pipeline** and surfaces the questions in the
UI — no downstream agent runs. (4) Fetched URL content is treated as **untrusted** — summarized, never executed
as instructions (prompt-injection guard, §9.3).

---

### 3.1 `Strategist`

**Responsibility.** `Brief` → a crisp creative strategy: primary audience, the single sharpest angle, the
job-to-be-done, the strongest proof points to lead with, and the funnel stage that sets tone.

**Input.** `{ brief: NormalizedBrief, brandKit: {version, voice, verticals} }`

**Output — `Strategy` (zod)**
```ts
export const Strategy = z.object({
  audience: z.string(),                                // sharpened; e.g. "Managing partners at 5–50-lawyer DE firms"
  angle: z.string(),                                   // the ONE reframe/tension the ad exploits
  jtbd: z.string(),                                    // job-to-be-done, in the buyer's words
  proofPoints: z.array(z.string()).min(1).max(4),      // ranked; lead with #1
  emotionalDriver: z.enum(["status","time","risk","cost","curiosity","fomo","relief"]),
  funnelStage: z.enum(["awareness","consideration","conversion"]),
  tone: z.string(),                                    // must stay within Brutal's sober/editorial register
  doNot: z.array(z.string()).default([]),              // angles to avoid (off-brand, off-vertical)
});
```

**System prompt**
```
You are Strategist for Brutal Ads. Input: a normalized Brief and the workspace BrandKit. Output: ONE focused
creative strategy for a LinkedIn ad — not a menu of options.

LinkedIn is a professional feed. Buyers scroll fast and skeptically. A winning ad has ONE sharp angle, leads
with a CONCRETE proof point, and speaks to a real job-to-be-done — not a feature list. Choose the single angle
with the highest stopping power for THIS audience and funnel stage.

Rules:
- Sharpen the audience to a specific role + context (seniority, firm size, vertical). Vague audiences produce
  vague ads.
- Pick exactly ONE angle. Rank proof points; lead with the most concrete/quantified one. Specificity beats
  cleverness.
- Match funnel stage to tone: awareness = provoke a reframe; consideration = prove the claim; conversion = reduce
  risk + clear next step.
- Stay inside Brutal's register: sober, editorial, documentary. NEVER hype ("revolutionary", "game-changing",
  "unlock", "supercharge"). No emoji-driven strategy. Bilingual context: German + English are first-class.
- Do not invent facts. Use only proofPoints/legal present in the Brief/BrandKit.

Return ONLY the Strategy JSON via the tool schema.
```

**Model tier.** `claude-sonnet-5` default; **escalate to `claude-opus-4-8`** when the brief is high-stakes
(regulated vertical `legal-de`/`pe`) or the orchestrator is in auto-iterate round 2.
**Guardrails.** (1) Exactly one `angle`. (2) `proofPoints` must be a subset of the brief's — schema-level
cross-check in the orchestrator. (3) Banned hype terms rejected by `BrandGuardian` downstream, but the prompt
pre-empts them. (4) No fabricated numbers.

---

### 3.2 `Copywriter`

**Responsibility.** Strategy → the ad's **editable text**: hook options, the headline (≤70 chars, CANON §8),
intro/primary text (~150 chars visible before "see more"; ≤600, CANON §8), and the CTA. **Specificity >
cleverness** (CANON §7). Runs **in parallel with `ArtDirector`**; **produces zero imagery instructions.**

**Input.** `{ strategy: Strategy, adType, language: "de"|"en", variantIndex: number, charLimits: {headline:70, introVisible:150, introMax:600} }`

**Output — `CopySet` (zod)**
```ts
export const CopySet = z.object({
  language: z.enum(["de","en"]),
  hooks: z.array(z.string()).min(3).max(5),            // candidate first-lines / on-image hooks
  headline: z.string().max(70),                        // CANON §8 single-image headline ≤70 chars
  introText: z.string().max(600),                      // CANON §8; front-load the first ~150 chars
  cta: z.object({ label: z.string().max(24), action: z.enum(
    ["learn_more","sign_up","request_demo","download","register","contact_us"]) }),
  onImageText: z.object({                              // text destined for TEXT LAYERS (never image prompt)
    kicker: z.string().max(40).optional(),
    headline: z.string().max(60),
    subhead: z.string().max(80).optional(),
  }),
  smartBindings: z.array(z.object({                    // for smart layers, CANON §5 (e.g. {{customer_count}})
    token: z.string(), value: z.string() })).default([]),
  specificityScore: z.number().min(0).max(1),          // self-rated; Critic re-checks
});
```

**System prompt**
```
You are Copywriter for Brutal Ads. Input: a Strategy, the target language (de or en), and character limits.
Output: the editable TEXT of a LinkedIn ad. You write copy ONLY. You never describe imagery, layout, or colors.

LinkedIn character discipline (hard limits — the platform enforces them):
- Headline ≤ 70 characters. On-image headline ≤ 60. CTA label ≤ 24.
- Intro/primary text: the first ~150 characters are visible before "see more" — put the sharpest value there;
  total ≤ 600.

Voice: sober, editorial, documentary — the register of a serious trade publication, NOT hype AI. Concrete nouns
and numbers beat adjectives. Lead with a specific proof point or a specific tension. Ban: "revolutionary",
"game-changing", "unlock", "supercharge", "next-level", "🚀", exclamation-mark stacking, and vague superlatives.
Specificity > cleverness: "Drafts a German lease in 90 seconds" beats "AI that saves you time."

Bilingual: if language=de, write NATIVE German for professionals (Sie-form for partners/executives unless the
Strategy says otherwise) — do not translate from English in your head; write German that a German lawyer would
respect. Numbers stay as numerals in ON-SCREEN text (legibility).

Give 3–5 hook candidates so the human can pick. Fill onImageText for the layers the compositor will place. If
the Strategy has a countable proof point, expose it as a smart binding token (e.g. {{customer_count}}).

Return ONLY the CopySet JSON via the tool schema. No imagery, no layout.
```

**Model tier.** `claude-sonnet-5` (default). **Batch API** for the N-variant fan-out (non-interactive, 50% off,
R7 §0). Escalate to `claude-opus-4-8` only in auto-iterate round 2.
**Guardrails.** (1) Hard char limits enforced by schema `.max()`. (2) Banned-term list is a shared constant
(`packages/shared/src/brand/banned.ts`), also enforced by `BrandGuardian`. (3) **No imagery/layout fields** in the
schema — structurally cannot leak copy into the image prompt. (4) DE output validated as German (a cheap
`claude-haiku-4-5` language-id check on `language==="de"` outputs).

---

### 3.3 `ArtDirector`

**Responsibility.** Strategy → visual concept + a **model-choice hint** for the router + an **imagery-only**
generation prompt and negative prompt + the target aspect. **Never writes text to be rendered inside the image**
(CANON §2 load-bearing decision). Runs **in parallel with `Copywriter`**.

**Input.** `{ strategy: Strategy, brandKit: {palette, type, styleRefs, moodwords}, adType, aspect: "1:1"|"1.91:1"|"4:5", refs?: AssetRef[] }`

**Output — `ArtDirection` (zod)**
```ts
export const ArtDirection = z.object({
  concept: z.string(),                                 // the visual idea in one paragraph
  imageryPrompt: z.string(),                           // IMAGERY ONLY — no words to render, no UI copy
  negativePrompt: z.string(),                          // e.g. "no text, no watermark, no logos, no captions";
                                                       //   auto-appended with brandKit.imagery.style.avoid tokens (L10)
  aspect: z.enum(["1:1","1.91:1","4:5","16:9","9:16"]),// CANON §6 GenSpec aspect union
  modelHint: z.enum(["photoreal_background","reference_consistent","vector_asset","bulk_cheap","diversity"]),
  refs: z.array(z.object({ assetId: z.string(), role: z.enum(["style","subject","brand"]) })).default([]),
  seedPolicy: z.enum(["random","reuse_parent"]).default("random"),
  paletteLock: z.array(z.string()).default([]),        // hex from BrandKit to steer, e.g. ["#cba65e","#b6e64a"]
});
// helper: ArtDirection.toGenSpec() -> GenSpec (CANON §6) { prompt, negativePrompt, aspect, seed?, refs?, model?, params? }
```

**System prompt**
```
You are ArtDirector for Brutal Ads. Input: a Strategy and the workspace BrandKit (palette, type, style refs,
mood). Output: a visual concept and an IMAGERY-ONLY generation prompt for an image model.

THE ONE UNBREAKABLE RULE: your prompt describes IMAGERY ONLY. Never ask the model to render words, headlines,
UI copy, logos, captions, prices, or any legible text. All text is composited later as editable layers. If you
put text in the prompt, the whole product breaks (baked pixels = illegible, off-brand, un-editable). Your
negativePrompt MUST include: "no text, no words, no letters, no watermark, no logo, no caption, no UI".
It MUST ALSO include every token from the BrandKit's imagery.style.avoid list (e.g. "stock-photo cliché",
"neon gradients", "3D render", "corporate handshake") — these off-brand looks are appended to the negative
prompt automatically so the image model steers away from them (L10).

Brutal's look: sober, editorial, documentary. Dark, muted-first palette; cinematic, restrained; think a serious
photo essay, not a stock-photo ad. Steer toward the BrandKit palette (gold #cba65e, lime #b6e64a for the PE set;
acid-lime for chrome) via lighting/materials/accents — do not spell hex in the prompt, describe the mood. Leave
deliberate NEGATIVE SPACE where the compositor will place the headline/CTA (top-third or lower-third), and note
where in the concept.

Pick a modelHint for the router (docs/04):
- photoreal_background = photoreal hero/background (router → FLUX.2 [pro]).
- reference_consistent = must match a brand/subject/style ref, or edit-in-place (router → Gemini 3 Pro Image / Nano Banana Pro).
- vector_asset = an icon/logo shape (router → Recraft V3 vector).
- bulk_cheap = many cheap variants (router → Seedream 4.5).
- diversity = deliberately different look for A/B variety (router → gpt-image-1.5).

Compose for the aspect given (LinkedIn: 1:1 1200×1200 default, 1.91:1, 4:5). Respect mobile safe zones — keep the
subject clear of the top-left profile overlap and the "see more" fold.

Return ONLY the ArtDirection JSON via the tool schema.
```

**Model tier.** **`claude-opus-4-8` (default)** — art direction is judgment-heavy and directly determines
stopping power (CANON §7 lists `ArtDirector` among escalation-tier agents, R7 §5.3 ⚑R-LLM1).
**Guardrails.** (1) `imageryPrompt` is scanned for text-rendering intent (regex + a `claude-haiku-4-5`
classifier); if it requests words, the orchestrator rejects and re-prompts. (2) `negativePrompt` MUST contain the
no-text tokens (schema `.refine()`). (3) `modelHint` maps to the router policy table (docs/04 §5.3); manual
override always available (CANON §6). (4) `paletteLock` values must be members of the `BrandKit` palette. (5)
`brandKit.imagery.style.avoid` tokens are **automatically appended** to `negativePrompt` by the orchestrator
(deterministic, not left to the LLM) so every off-brand look the BrandKit bans is steered against (L10).

---

### 3.4 `CarouselArchitect`

**Responsibility.** (carousel only) Turn Strategy + CopySet into a **multi-slide narrative** with the canonical
**hook → reframe → close** arc (CANON §2/§8), ensuring **continuity across slides** (visual + verbal), 3–12 slides
(square 1080×1080 recommended, delivered as a PDF document ad, CANON §8).

**Input.** `{ strategy: Strategy, copy: CopySet, slideCount?: number /*default derived*/, language }`

**Output — `CarouselNarrative` (zod)**
```ts
export const CarouselNarrative = z.object({
  slides: z.array(z.object({
    index: z.number().int().min(0),
    role: z.enum(["hook","reframe","proof","close"]),  // hook first, close last; reframe/proof in the middle
    beat: z.string(),                                   // the narrative beat this slide carries
    onImageText: z.object({ kicker: z.string().max(40).optional(),
      headline: z.string().max(60), subhead: z.string().max(80).optional() }),
    imageryDirection: z.string(),                       // IMAGERY-ONLY guidance handed to ArtDirector per slide
    continuityCue: z.string().optional(),               // what carries over from the previous slide (color/motif)
  })).min(3).max(12),
  throughline: z.string(),                              // the single idea binding all slides
  ctaSlideIndex: z.number().int(),                      // which slide carries the CTA (usually the close)
});
```

**System prompt**
```
You are CarouselArchitect for Brutal Ads. Input: a Strategy and a CopySet. Output: a slide-by-slide narrative
for a LinkedIn document/carousel ad (delivered as a multi-page PDF, square 1080×1080).

The proven arc is HOOK → REFRAME → CLOSE:
- Slide 1 (hook) must EARN THE SWIPE — the strongest stopping-power line, a specific tension or number. It is the
  thumbnail; if it fails, nothing else is seen.
- Middle slides (reframe / proof) shift the reader's mental model and back it with concrete proof. One idea per
  slide. Never a wall of text — slides are read in <2 seconds each.
- Final slide (close) states the payoff and carries the CTA.

Continuity is mandatory: a recurring visual motif, consistent palette, and a verbal throughline must bind every
slide so the set reads as ONE story, not N posters. State the continuityCue per slide (what carries over).

Keep on-image text short (headline ≤60 chars) — it becomes editable text layers, never baked pixels. imagery-
Direction is IMAGERY ONLY (no words to render). Choose 3–12 slides; fewer, sharper slides beat more, weaker ones.
Register: sober, editorial, documentary. No hype.

Return ONLY the CarouselNarrative JSON via the tool schema.
```

**Model tier.** `claude-sonnet-5` default; escalate to `claude-opus-4-8` for long (>8-slide) or regulated-vertical
sets, or auto-iterate round 2.
**Guardrails.** (1) First slide `role="hook"`, last slide carries CTA (schema `.refine()`). (2) On-image text char
limits enforced. (3) `imageryDirection` scanned for text-rendering intent (same as `ArtDirector`). (4)
`services/engine` per-slide scoring later requires **slide 1 to have the highest `stoppingPower`** (docs/08 §5.4)
— `CarouselArchitect` is told this so it front-loads the hook.

---

### 3.5 `CompositorPlanner`

**Responsibility.** The **join point.** Combine the visual concept, the generated imagery asset, the copy, and
(for carousel) the narrative into a **canonical layer tree** (CANON §5): assign layer types, positions,
`renderHints` (safe-zone/maxLines/autoFit/minFontPx — `⚑R-LT1`), bind `smart` layers, and place the mandatory
`legal` layer. It also **chooses a named layout archetype** — the **4th variant-matrix axis** (alongside
angle/copy/imagery) that drives board diversity (L10): `full-bleed-hero-lower-third`, `split-panel`,
`editorial-kicker-top`, or `quote-card`. Produces the artifact `packages/render` turns into pixels.

**Input.** `{ strategy, copy: CopySet, art: ArtDirection, image: GenResult, narrative?: CarouselNarrative, brandKit, adType, aspect }`

**Output — `LayerTree`** (the CANONICAL `Layer`/`LayerTree` zod lives in `docs/03` §12.1 = `@brutal/shared`; shown here for the CompositorPlanner's usage, adapted to Polotno at the `EditorAdapter` — R7 §1.1. On any field mismatch, `docs/03` wins; e.g. font size is `fontSize` per doc 03.)
```ts
export const Layer = z.object({
  id: z.string(),
  type: z.enum(["image","text","logo","shape","cta","frame","legal","group","smart"]),  // CANON §5
  x: z.number(), y: z.number(), w: z.number(), h: z.number(),                            // in base-canvas px
  rotation: z.number().default(0), z: z.number().int(),                                  // stacking order
  // type-specific payloads:
  text: z.string().optional(),                          // text|cta|legal|smart
  assetId: z.string().optional(),                       // image|logo
  fill: z.string().optional(),                          // shape|frame — hex from BrandKit palette only
  fontFamily: z.enum(["Playfair Display","Inter"]).optional(),  // CANON §1 seed type; source from BrandKit
  fontSizePx: z.number().optional(),
  binding: z.string().optional(),                       // smart layer token, e.g. "{{customer_count}}"
  renderHints: z.object({                               // ⚑R-LT1 — deterministic multi-ratio re-layout
    safeZone: z.enum(["feed","profile_overlap","see_more_fold","none"]).default("none"),
    maxLines: z.number().int().default(2),
    autoFit: z.boolean().default(true),
    minFontPx: z.number().default(18),
  }).default({}),
});
// Named layout archetypes — the 4th variant-matrix axis (L10). CompositorPlanner picks one per variant;
// board diversity depends on these NOT collapsing to a single archetype (see Critic `layout_homogeneity`).
export const LayoutArchetype = z.enum([
  "full-bleed-hero-lower-third",   // edge-to-edge image, headline/CTA banded across the lower third
  "split-panel",                   // image occupies one panel, copy block the other (vertical or horizontal split)
  "editorial-kicker-top",          // kicker + headline stacked top, image below — trade-publication feel
  "quote-card",                    // large pulled quote/stat as the hero element, image recessed/muted
]);
export const LayerTree = z.object({
  adType: z.enum(["single_image","carousel","video"]),
  base: z.object({ w: z.number(), h: z.number(), aspect: z.enum(["1:1","1.91:1","4:5","16:9","9:16"]) }),
  layoutArchetype: LayoutArchetype,                     // 4th matrix axis (L10); carousels: per-slide below
  // single_image/video: one layers[]; carousel: slides[] each with its own layers[]
  layers: z.array(Layer).optional(),
  slides: z.array(z.object({ index: z.number().int(),
    layoutArchetype: LayoutArchetype, layers: z.array(Layer) })).optional(),
  brandKitVersion: z.number().int(),
});
```

**System prompt**
```
You are CompositorPlanner for Brutal Ads. You are the JOIN POINT: you receive a generated background image, the
ad copy, the art direction, and (for carousels) the slide narrative, and you output a LAYER TREE — the JSON
composition that the renderer turns into a pixel-perfect LinkedIn ad.

Core principle: the image is a BACKGROUND. Every legible element — headline, subhead, CTA, logo, legal, price,
slide copy — is its OWN editable layer on top, using the correct layer type: image | text | logo | shape | cta |
frame | legal | group | smart. Never merge text into the image. This is what makes the ad editable, on-brand,
localizable, and testable.

Layout rules (LinkedIn, mobile-first):
- Choose a named LAYOUT ARCHETYPE for this variant (the 4th diversity axis, alongside angle/copy/imagery):
  full-bleed-hero-lower-third | split-panel | editorial-kicker-top | quote-card. Pick the archetype that best
  serves THIS concept, and — when you know the other variants on the board — deliberately VARY it so the board
  does not collapse into near-identical layouts (a board where ≥3 variants share an archetype is flagged
  `layout_homogeneity` by the Critic). Set layoutArchetype on the tree (and per slide for carousels).
- Base canvas = the given aspect (1:1 1200×1200 default). Place the headline in the negative space the
  ArtDirector left (top-third or lower-third). Keep the CTA prominent and legible.
- Respect safe zones via renderHints.safeZone: keep critical text out of the top-left profile-overlap and above
  the "see more" fold. Set maxLines, autoFit, minFontPx so the same tree re-lays-out cleanly to 1.91:1 and 4:5
  without cropping (smart re-layout, not naive crop).
- Fonts: Playfair Display for display/headline, Inter for body — sourced from the BrandKit, never hardcoded.
  Colors: only hex values from the BrandKit palette.
- Mandatory legal/disclaimer text becomes a `legal` layer — never optional free text, never omitted.
- Countable proof points become `smart` layers bound to tokens (e.g. {{customer_count}}+ firms) so they update
  without touching pixels.
- Carousel: emit slides[] in order; carry the continuityCue (recurring motif/palette) across slides.

Return ONLY the LayerTree JSON via the tool schema. Every layer needs a stable id, position, z-order, and
renderHints.
```

**Model tier.** `claude-sonnet-5` default; escalate to `claude-opus-4-8` for complex carousels or round 2.
**Guardrails.** (1) A `legal` layer **must** exist iff `brief.mandatoryLegal` is non-empty (orchestrator
cross-check — legal is never silently dropped). (2) `fill`/text colors must be `BrandKit` palette members. (3)
`fontFamily` restricted to `BrandKit` fonts. (4) `smart` bindings must resolve against `copy.smartBindings`. (5)
Output must be **losslessly convertible to Polotno store JSON** at the `EditorAdapter` (R7 §1.1); a round-trip
test in `packages/render` CI guards this.

---

### 3.6 `BrandGuardian` — the hard gate

**Responsibility.** **Mechanical gate.** Verify a `LayerTree` (and its copy) against the **versioned `BrandKit`**:
palette adherence, voice register, banned terms, mandatory disclaimer present, localization correctness. A
failing variant **cannot reach the board** — it loops back to the offending author agent (≤2 rounds).

**Input.** `{ tree: LayerTree, copy: CopySet, brandKit: {version, palette, fonts, voiceRules, bannedTerms[], disclaimersByVertical, localizationRules}, vertical }`

**Output — `BrandVerdict` (zod)**
```ts
export const BrandVerdict = z.object({
  pass: z.boolean(),
  violations: z.array(z.object({
    rule: z.enum(["palette","font","voice_register","banned_term","missing_disclaimer",
      "localization","baked_text","safe_zone","char_limit"]),
    severity: z.enum(["hard","soft"]),                  // hard = must fix; soft = warn
    layerId: z.string().optional(),
    detail: z.string(),
    fixHint: z.string(),                                // routed to the author agent for repair
  })).default([]),
  routeTo: z.enum(["Copywriter","ArtDirector","CompositorPlanner","LocalizationAgent","none"]),
});
```

**System prompt**
```
You are BrandGuardian for Brutal Ads — the last mechanical gate before a variant can reach the board. You verify
a LayerTree and its copy against the VERSIONED BrandKit. You are strict and literal. You do not improve the ad;
you only judge whether it is on-brand and compliant, and if not, say precisely what to fix and who fixes it.

Check, in order:
1. PALETTE — every fill/text color must be a member of the BrandKit palette. Flag any off-palette hex (hard).
2. FONTS — display text uses Playfair Display; body uses Inter (or the BrandKit's fonts). Flag others (hard).
3. VOICE REGISTER — sober, editorial, documentary, NOT hype. Flag banned terms (revolutionary, game-changing,
   unlock, supercharge, 🚀, superlative stacking) and any hype tone (hard for banned terms, soft for tone).
4. MANDATORY DISCLAIMER — if the vertical requires a disclaimer, a `legal` layer with that text MUST be present.
   Missing = hard fail.
5. LOCALIZATION — if the ad is German, copy must be native German (not translated-sounding), Sie-form for senior
   audiences unless specified; numbers as numerals on-screen. Flag issues (hard) and route to LocalizationAgent.
6. NO BAKED TEXT — the background image layer must not contain rendered words. If it does, hard fail → ArtDirector.
7. CHAR LIMITS & SAFE ZONES — headline ≤70, on-image headline ≤60, CTA ≤24; critical text inside safe zones.

For each violation give: rule, severity (hard/soft), the offending layerId, a precise detail, and a fixHint.
Set pass=false if ANY hard violation exists. Set routeTo to the single agent best able to fix the most severe
violation. Return ONLY the BrandVerdict JSON via the tool schema.
```

**Model tier.** `claude-sonnet-5` default; **escalate to `claude-opus-4-8` for "hard" borderline calls** (voice
register, localization nuance) and round 2 (CANON §7 lists hard BrandGuardian calls at escalation tier).
**Guardrails.** (1) Palette/font/banned-term/char-limit/disclaimer checks are **also enforced deterministically in
code** (`packages/shared/src/brand/guard.ts`) — the LLM is a second layer for *tone/localization judgment*, not the
sole check for mechanical rules. (2) `pass=false` on any `severity:"hard"`. (3) A **hard cap of 2 repair rounds**;
after round 2 the variant is either passed with soft warnings surfaced to the human, or dropped (orchestrator
policy, configurable). (4) `routeTo` must be a real author agent.

---

### 3.7 `Critic`

**Responsibility.** Score a rendered variant against the **LinkedIn playbook + anti-patterns** (CANON §7). Produce
a structured, actionable critique (not a vibe). Runs **in parallel with `EngagementAnalyst`** after render.

**Input.** `{ render: RenderRef, tree: LayerTree, strategy: Strategy, playbookVersion: string }`

**Output — `CriticReport` (zod)**
```ts
export const CriticReport = z.object({
  playbookScore: z.number().min(0).max(100),           // holistic vs the playbook
  dimensions: z.object({                               // each 0–100
    hookStrength: z.number(), specificity: z.number(), clarity: z.number(),
    ctaStrength: z.number(), brandFit: z.number(), mobileLegibility: z.number(),
  }),
  antiPatterns: z.array(z.enum([
    "baked_text","feature_dump","vague_superlative","weak_hook","buried_cta",
    "low_contrast","overcrowded","generic_stock_look","hype_tone","tiny_mobile_text",
    "layout_homogeneity",   // L10 — BOARD-level: ≥3 variants share the same layoutArchetype
  ])).default([]),
  fixes: z.array(z.object({ target: z.enum(["Copywriter","ArtDirector","CompositorPlanner"]),
    change: z.string() })).default([]),
  verdict: z.enum(["strong","acceptable","weak"]),
});
```

**System prompt**
```
You are Critic for Brutal Ads — a world-class LinkedIn performance marketer reviewing ONE rendered ad against the
playbook. Be specific and honest. Score dimensions and name anti-patterns; then give concrete, routed fixes.

The LinkedIn playbook (what wins in a professional feed):
- STOPPING POWER first. The hook (headline/first line/first slide) must earn attention in <2 seconds on mobile.
- SPECIFICITY over cleverness. Concrete numbers, named outcomes, real proof beat adjectives.
- ONE idea. Feature dumps lose. A single sharp claim wins.
- CLEAR CTA. One obvious next step, legible and prominent.
- MOBILE LEGIBILITY. Text large enough on a phone; high contrast; inside safe zones (profile overlap, "see more"
  fold).
- ON-BRAND. Sober/editorial register; palette + type correct; not generic stock.

Anti-patterns (flag any present): baked_text (words rendered into the image), feature_dump, vague_superlative,
weak_hook, buried_cta, low_contrast, overcrowded, generic_stock_look, hype_tone, tiny_mobile_text,
layout_homogeneity. NOTE: layout_homogeneity is a BOARD-level check, not a single-ad check — flag it when ≥3
variants on the board share the same layoutArchetype (the board reads as one template, not a diverse set). All
other anti-patterns judge THIS ad alone.

Score playbookScore 0–100 and each dimension 0–100. verdict = strong (≥75 and no hard anti-pattern) /
acceptable (60–74) / weak (<60 or a hard anti-pattern like baked_text or buried_cta). For weak/acceptable, list
fixes as {target agent, precise change}. Return ONLY the CriticReport JSON via the tool schema.
```

**Model tier.** **`claude-opus-4-8` (default)** — critique quality directly gates the board (CANON §7 lists
`Critic` at escalation tier).
**Guardrails.** (1) `verdict="weak"` on any hard anti-pattern (`baked_text`, `buried_cta`) regardless of score.
(2) Every `fix.target` is a real author agent (feeds auto-iterate). (3) `Critic` **scores a rendered image**, not
the tree alone — it must receive the `RenderRef`. (4) `playbookVersion` is stamped on the report for
auditability (ties to `⚑ASSUMPTION A2` — the anti-pattern enum is the single update point when R3 lands).

---

### 3.8 `EngagementAnalyst`

**Responsibility.** Call the `EngagementPredictor` (via `ProviderBus.predictor(job)`), interpret the returned
`EngagementScores` as **bands + confidence**, and recommend concrete moves. It **never invents CTR** and **never
touches the TRIBE path** (commercial path is `ENGAGEMENT_BACKEND=saliency`, CANON §9, docs/08). Runs **in parallel
with `Critic`**.

**Input.** `{ render: RenderRef | VideoRef | GridRef, tree: LayerTree, adType }`
→ the analyst calls `ProviderBus.predictor(job).score(input)` → `EngagementScores` (CANON §6):
```ts
// EngagementScores (CANON §6) — the analyst INTERPRETS this, does not compute it:
// { attentionMap?, focalClarity, valuePropAttention, ctaAttention, clutter, stoppingPower,
//   firstThreeSeconds?, predictedCtrBand?{low,high,confidence}, perSlide?:[...], raw }
```

**Output — `EngagementReport` (zod)**
```ts
export const EngagementReport = z.object({
  backend: z.enum(["saliency"]),                        // commercial path ONLY; never "tribe_research"
  saliencySource: z.string(),                           // e.g. "saliency.transalnet" (docs/08 driver id)
  scores: z.object({                                    // mirrors EngagementScores, surfaced as bands
    focalClarity: z.number(), valuePropAttention: z.number(), ctaAttention: z.number(),
    clutter: z.number(), stoppingPower: z.number(),
    firstThreeSeconds: z.number().optional(),
    predictedCtrBand: z.object({ low: z.number(), high: z.number(),
      confidence: z.enum(["low","medium","high"]) }).optional(),
    perSlide: z.array(z.object({ index: z.number(), stoppingPower: z.number(),
      ctaAttention: z.number() })).optional(),
  }),
  interpretation: z.string(),                            // plain-language reading of the bands
  recommendations: z.array(z.object({ target: z.enum(["Copywriter","ArtDirector","CompositorPlanner"]),
    change: z.string(), expectedEffect: z.string() })).default([]),
  weakSlideIndexes: z.array(z.number()).default([]),     // carousel trough detection (docs/08 §5.4)
  disclaimer: z.string(),                                // "directional estimate, not a guarantee"
});
```

**System prompt**
```
You are EngagementAnalyst for Brutal Ads. You do NOT compute engagement — you call the EngagementPredictor and
INTERPRET its output for a marketer. The predictor returns saliency-based scores as BANDS with a confidence
level, calibrated against this workspace's real LinkedIn results over time. You must never present a single CTR
number as truth; always speak in ranges and confidence, and label predictions as directional estimates.

Read the EngagementScores:
- stoppingPower: will the thumb stop? (the #1 metric; for carousels, slide 1 must be highest.)
- focalClarity: is attention concentrated on the subject, or scattered?
- valuePropAttention / ctaAttention: does attention actually land on the headline and CTA? (We know the exact
  layer bboxes, so this is precise.)
- clutter: is the composition noisy?
- firstThreeSeconds (video): does the open earn attention in muted autoplay?
- predictedCtrBand{low,high,confidence}: report the range and confidence; widen the band + lower confidence when
  tenant data is thin.

For carousels, flag weak slides (a stoppingPower dip vs neighbors) as weakSlideIndexes. Turn low ctaAttention
into a CompositorPlanner fix (move/enlarge the CTA), low stoppingPower into an ArtDirector/Copywriter fix
(stronger hook/visual). Give recommendations as {target agent, precise change, expected effect}.

NEVER use or reference the TRIBE research backend — you are on the commercial saliency path only. Always include
the disclaimer that scores are directional, calibrated estimates. Return ONLY the EngagementReport JSON.
```

**Model tier.** `claude-sonnet-5` default; escalate to `claude-opus-4-8` in round 2.
**Guardrails.** (1) `backend` schema-restricted to `"saliency"` — the analyst **cannot** emit a TRIBE-derived
report (defense-in-depth atop the engine's dual gate, docs/08 §6). (2) The analyst calls the predictor **through
`ProviderBus.predictor(job)`**, never `services/engine` directly, and the bus **hard-errors** if a tenant-facing
job resolves to `research.tribe` (docs/08 §6). (3) `predictedCtrBand` is always a range + confidence — a point
CTR is a schema violation. (4) `disclaimer` is mandatory and non-empty.

---

### 3.9 `EditorAgent`

**Responsibility.** Translate a **natural-language edit request** ("make the headline shorter and gold", "move the
CTA up", "swap the background for something calmer") into a **typed `LayerPatch[]`** applied to the current
`LayerTree`. **Never re-rolls** — it emits diffs; the app applies them and re-renders **only affected layers**
(CANON §4). Post-board, human-triggered. Full `LayerPatch` contract in **§6**.

**Input.** `{ instruction: string, tree: LayerTree, selection?: string[] /*layer ids the user selected*/, brandKit }`

**Output — `EditResult` (zod; wraps the frozen `LayerPatchSet = LayerPatch[]`, see §6)**
```ts
export const EditResult = z.object({
  patches: LayerPatchSet,                                // §6 — LayerPatch[] (each a typed, minimal-op envelope)
  affectedLayerIds: z.array(z.string()),                // for partial re-render
  needsImageRegen: z.boolean(),                          // true ONLY if instruction requires new imagery
  summary: z.string(),                                   // one-line human-readable description of the change
  clarify: z.string().optional(),                        // asked ONLY if the instruction is ambiguous
});
```

**System prompt**
```
You are EditorAgent for Brutal Ads. You turn a plain-English edit request into a MINIMAL set of typed LayerPatch
operations on the current layer tree. You never regenerate the whole ad and you never re-run the image model
unless the user explicitly asks for new/different imagery (then set needsImageRegen=true — that dispatches a
GenerationJob, not a patch).

You are given the current LayerTree (ids, types, positions, text, colors, fonts), any layers the user has
selected, and the BrandKit. Emit ONE or more LayerPatch envelopes; each carries an ordered list of typed ops.
Produce the smallest set of ops that satisfies the request (op names are the frozen union):
- Text edits → setText ops on the target text|cta|legal|smart layer.
- Move/resize → resize ops (x,y,w,h); rotate ops for rotation.
- Color/font → setFill / setFont ops, using ONLY BrandKit palette colors and BrandKit fonts. If the user asks for
  an off-brand color, snap to the nearest BrandKit color and note it in summary.
- Add/remove/reorder → addLayer / removeLayer / reorderZ ops; setVisible to hide/show; setSlideOrder for carousels.
- "Swap the background / different image" → a replaceAsset op with regen=true + a target layer id and
  needsImageRegen=true; do NOT invent pixels.

Respect char limits (headline ≤70, on-image ≤60, CTA ≤24) and safe zones. If the instruction is genuinely
ambiguous (which of two headlines? which CTA?), ask ONE short clarifying question via clarify and return no
patches. Otherwise return ONLY the EditResult JSON. List affectedLayerIds for partial re-render.
```

**Model tier.** `claude-sonnet-5` (default — fast, cheap, high-frequency).
**Guardrails.** (1) Patches are **validated against the current tree** (target ids must exist; §6) before apply —
an invalid patch is rejected, not applied. (2) Color/font edits **snapped to `BrandKit`** (off-brand requests are
corrected, not honored). (3) Char limits enforced on `setText`. (4) `needsImageRegen` is the **only** path to new
pixels — a text edit **never** costs an image credit (R7 §4). (5) After apply, the result **still passes
`BrandGuardian`** before the human-approve gate (edits can't sneak past the brand gate). (6) Ambiguous → one
`clarify` question, no patches.

---

### 3.10 `LocalizationAgent`

**Responsibility.** **Transcreate** (not literally translate) a variant DE⇄EN: rewrite copy to feel native in the
target language, keep the sober/editorial register, and emit **TTS-safe number spelling** ("zwölfhundert") for any
VO track while keeping **numerals in on-screen text layers** for legibility (CANON §7, R2 §4.4). Binds locale
`smart` layers. Post-board, human-triggered; emits `LayerPatch[]` for text layers (no re-render of imagery).

**Input.** `{ tree: LayerTree, copy: CopySet, fromLang: "de"|"en", toLang: "de"|"en", forVoiceover: boolean, brandKit }`

**Output — `LocalizationResult` (zod)**
```ts
export const LocalizationResult = z.object({
  toLang: z.enum(["de","en"]),
  patches: LayerPatchSet,                                // §6 — LayerPatch[]; setText ops on text|cta|legal|smart only
  voiceoverScript: z.string().optional(),               // ONLY if forVoiceover: numbers PRE-SPELLED in target lang
  onScreenText: z.record(z.string()),                   // layerId -> transcreated on-screen string (numerals kept)
  ttsNormalizations: z.array(z.object({                 // audit of number/symbol spellings for the VO
    original: z.string(), spelled: z.string() })).default([]),
  notes: z.string().optional(),                          // transcreation choices worth surfacing
});
```

**System prompt**
```
You are LocalizationAgent for Brutal Ads. You TRANSCREATE ads between German and English — you rewrite so the ad
feels native and persuasive to a professional in the target language, NOT a literal translation. Keep Brutal's
register: sober, editorial, documentary. For German B2B, default to Sie-form for senior audiences.

Two outputs from the same idea:
1) ON-SCREEN TEXT (text/cta/legal/smart layers): transcreated copy with NUMBERS KEPT AS NUMERALS (legibility) —
   e.g. "1.200 Kanzleien". Respect char limits (headline ≤70, on-image ≤60, CTA ≤24).
2) VOICEOVER SCRIPT (only if forVoiceover=true): the SAME copy but with every number, date, currency, percent,
   and acronym SPELLED OUT IN WORDS in the target language, because the TTS engine mispronounces raw numerals in
   German. Examples (DE): "1.200" → "zwölfhundert"; "€1.200" → "eintausendzweihundert Euro"; "50 %" → "fünfzig
   Prozent"; "24/7" → "rund um die Uhr". Record each spelling in ttsNormalizations.

Do not touch imagery — only emit setText ops (inside LayerPatch envelopes) for text-bearing layers. Preserve
mandatory legal/disclaimer meaning exactly (legal is not creative — translate faithfully). Return ONLY the
LocalizationResult JSON.
```

**Model tier.** `claude-sonnet-5` (transcreation quality matters; escalate to `claude-opus-4-8` for
legal/regulated copy).
**Guardrails.** (1) `voiceoverScript` present **iff** `forVoiceover=true`. (2) On-screen numerals kept; VO numbers
spelled — a numeral in `voiceoverScript` is a validation warning (a `claude-haiku-4-5` numeral-scan). (3) `legal`
layer text is **translated faithfully, not transcreated** (meaning preserved). (4) Result patches re-pass
`BrandGuardian` (localization rule) before the human-approve gate. (5) Do **not** set `apply_text_normalization`
reliance for DE at the TTS layer — pre-spell here (R2 §4.4); on-screen and VO strings diverge by design.

---

## 4. Parallelism, the join, and the bounded auto-iterate loop

### 4.1 Parallelism map

| Stage | Parallel units | Mechanism | Bound |
|---|---|---|---|
| Variant fan-out | N variants (default 4–6) | `Promise.all` over variant indexes | `N ≤ variantCount` cap; cost cap (§8) |
| Copy ‖ Imagery | `Copywriter` ‖ `ArtDirector` (per variant) | `Promise.all`; **text never in image prompt** | one join at `CompositorPlanner` |
| Copy fan-out | N `Copywriter` calls | **Anthropic Batch API** (non-interactive, 50% off) | Batch job window |
| Imagery gen | N image `GenerationJob`s | job queue (pgmq default) + poll | provider concurrency caps (docs/04) |
| Critique ‖ Engagement | `Critic` ‖ `EngagementAnalyst` (per variant) | `Promise.all` | — |

### 4.2 The join (`CompositorPlanner`)

The **only** synchronization point per variant is `CompositorPlanner`: it cannot start until **both** the
`CopySet` (from `Copywriter`) and the **generated imagery `GenResult`** (from `ArtDirector` → `ProviderBus.image`)
are ready. This is what guarantees the anti-re-roll invariant structurally — copy and pixels are produced by
different code paths and only *composited*, never *co-generated*.

### 4.3 Bounded auto-iterate (≤2 rounds, CANON §7)

```
round = 0
loop:
  BrandGuardian(tree)  → if fail: tree = repair(routeTo, violations); round++; if round>2 break; continue
  render(tree)         → RenderRef
  [Critic ‖ EngagementAnalyst](render, tree)
  weak = Critic.verdict == "weak" OR EngagementReport.scores.stoppingPower < THRESHOLD_STOPPING
                                   OR EngagementReport.scores.ctaAttention  < THRESHOLD_CTA
  if not weak OR round == 2:  return variant                     # stop at round 2 REGARDLESS (hard bound)
  # feed STRUCTURED critique back to the specific author agent(s)
  fixes = merge(Critic.fixes, EngagementReport.recommendations)  # each carries a target agent + precise change
  tree  = reauthor(fixes)   # Copywriter/ArtDirector/CompositorPlanner re-run ONLY for their targeted fixes
  round++
  # round 2 runs targeted agents at claude-opus-4-8 (escalation tier, ⚑R-LLM1)
```

**Rules.**
- The bound (`≤2`) is enforced by the **orchestrator counter**, never by a prompt (a prompt cannot be trusted to
  count). (R7 §1.3.)
- Auto-iterate feeds **structured critique** (`fixes[]` with a `target` agent + a precise `change`) back to the
  **specific** author agent — not a vague "try again". Only targeted agents re-run; untargeted artifacts are
  reused (cheap).
- **Round 2 escalates targeted agents to `claude-opus-4-8`** (the last round gets the best judgment, ⚑R-LLM1).
- Thresholds (`THRESHOLD_STOPPING`, `THRESHOLD_CTA`) live in **workspace config**, start from global priors, and
  are **recalibrated against real `Result`s** over time (docs/08 §7).
- Auto-iterate is **entirely pre-board** — the human never sees a weak-and-un-iterated variant, and never sees a
  half-finished loop.

### 4.4 Human gates (CANON §7)

| Gate | Type | Position | Behavior |
|---|---|---|---|
| `IntakeAgent` clarify | soft | before pipeline | ≤2 questions; pipeline halts until answered (or defaults accepted) |
| `BrandGuardian` | **hard, mechanical** | before render/board | fail → loop back (≤2); a failing variant cannot reach the board |
| **Human-approve** | **hard, judgment** | after edits, before export | **nothing ships un-approved**; export is a human action (CANON §7, R7 §4) |

The **board is the product surface** — agents *rank* variants (by `stoppingPower` band, docs/08), humans *pick,
compare, tweak, and approve*. **Agents never ship.** Publishing to LinkedIn is human-triggered; the platform may
automate *ingest of results* (docs/08 §7) but **never automates spend** (R7 §4).

---

## 5. Observability (`AgentRun`) & cost caps

### 5.1 `AgentRun` — every agent call is logged (CANON §4/§5)

Every LLM call — every agent, every round, every fan-out unit — creates one `AgentRun` row (CANON §5 supporting
object). This is the studio's observability spine.

```sql
-- AgentRun (canonical CANON §5). DDL is authoritative in docs/03; shown here for the studio's fields.
-- VERIFY final column set against docs/03 before coding; names here are canonical.
CREATE TABLE agent_run (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES workspace(id),        -- multi-tenant + RLS (CANON §4)
  brief_id          uuid REFERENCES brief(id),
  variant_id        uuid REFERENCES variant(id),                   -- null for pre-variant agents (Intake/Strategist)
  agent             text NOT NULL,                                 -- 'Strategist' | 'Copywriter' | ... (CANON §7 names)
  round             int  NOT NULL DEFAULT 0,                       -- auto-iterate round (0,1,2)
  model             text NOT NULL,                                 -- 'claude-sonnet-5' | 'claude-opus-4-8' | 'claude-haiku-4-5'
  model_version     text,                                          -- resolved model version at call time
  input_tokens      int  NOT NULL,
  output_tokens     int  NOT NULL,
  cache_read_tokens int  DEFAULT 0,                                -- prompt caching (90% off) accounting
  latency_ms        int  NOT NULL,
  cost_usd          numeric(10,6) NOT NULL,                        -- computed from token usage × model price
  status            text NOT NULL,                                 -- 'ok' | 'schema_error' | 'refused' | 'timeout' | 'budget_exceeded'
  input_hash        text,                                          -- for dedup / cache
  output            jsonb,                                         -- the validated artifact (or error detail)
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON agent_run (workspace_id, brief_id);
CREATE INDEX ON agent_run (workspace_id, created_at);
-- RLS: workspace_id = auth workspace (CANON §4). service-role writes; tenant reads own rows only.
```

**`GenerationJob`** (imagery/video/audio gen) is logged separately (CANON §5, docs/04) with the same
`cost_usd`/`tokens`(n/a)/`latency` discipline; together `agent_run.cost_usd + generation_job.cost_usd` roll up to
the per-brief and per-workspace spend used by the cost caps.

### 5.2 The agent runner (wraps every call)

```ts
// apps/web/src/server/studio/agent-runner.ts  (skeleton)
export async function runAgent<T>(agent: AgentName, ctx: AgentCtx): Promise<T> {
  const model = pickModel(agent, ctx.escalate);                 // ⚑R-LLM1 tiering (§1 table)
  await ctx.budget.assertRoom(agent, model);                   // PRE-FLIGHT cost cap (refuse if would breach)
  const t0 = Date.now();
  const res = await anthropic.messages.create({                // CANON §4: structured output via tool/JSON schema
    model, tools: [toolFor(agent)], tool_choice: { type: "tool", name: schemaName(agent) },
    system: SYSTEM_PROMPT[agent], messages: buildMessages(agent, ctx),
    // prompt caching on the static system prompt (90% off); Batch API for non-interactive fan-out
  });
  const artifact = ZOD[agent].parse(extractToolInput(res));    // zod-validate at the boundary (throws → schema_error)
  await recordAgentRun({ agent, model, res, latency: Date.now() - t0, ctx });   // AgentRun row (§5.1)
  await ctx.budget.charge(costOf(res, model));                 // update per-brief/per-workspace spend
  return artifact as T;
}
```

### 5.3 Failure taxonomy (surfaced, never swallowed — CANON §4 content-mod surface)

| `status` | Cause | Handling |
|---|---|---|
| `schema_error` | Output failed zod validation | 1 retry with the validation error appended; then surface "couldn't structure output" |
| `refused` | Model content refusal | **content-moderation surface** in UI (explain, don't swallow, CANON §4); route to human |
| `timeout` | LLM/provider timeout | retry+backoff; then graceful UI state ("couldn't generate variant 3 — retry / edit brief", R7 §4) |
| `budget_exceeded` | Would breach cost cap | orchestrator refuses **pre-flight**; UI shows remaining budget (§5.4) |

---

## 5.4 Cost caps (hard, pre-flight — CANON §4/§10)

**Two hard caps, both enforced before a job starts:**

| Cap | Scope | Source | Enforcement |
|---|---|---|---|
| **Per-brief `cost_usd` cap** | one `runBriefToBoard` invocation | workspace config (default e.g. $2.00) | `budget.assertRoom` refuses the next agent/gen if projected spend > cap |
| **Per-workspace `cost_usd` cap** | rolling monthly | workspace/plan config | orchestrator refuses to start a brief that would breach the monthly cap |

**Cost levers already built into the studio:**
- **Model tiering** (⚑R-LLM1): Sonnet 5 default vs Opus 4.8 escalation ≈ ~40% LLM cost cut (R7 §4).
- **Bounded auto-iterate (≤2)** is itself a cost cap (§4.3).
- **Caching:** prompt caching (90% off) on static system prompts; provider caching by
  `(provider,model,version,prompt,seed,params)` (CANON §4) makes edits nearly free — **a copy/text edit costs
  zero image credits** because `EditorAgent` emits a `LayerPatch`, not a re-roll (R7 §4).
- **Batch API** (50% off) for the non-interactive N-variant copy fan-out.

The UI shows **remaining per-brief and per-workspace budget** and the orchestrator **never silently overspends**
— a would-breach job returns `status:"budget_exceeded"` with the remaining budget, not a surprise charge (R7 §4).

---

## 6. The `LayerPatch` contract (used by `EditorAgent` and `LocalizationAgent`)

**Purpose (CANON §4).** Chat-to-edit and localization emit **typed `LayerPatch` diffs, never full re-rolls.** A
`LayerPatch` is a **single well-typed envelope** carrying an ordered list of typed **`LayerPatchOp`** operations on
a `LayerTree`; a **`LayerPatchSet`** is simply an alias for a `LayerPatch[]` (L6). The app validates each patch
against the current tree, applies it, and **re-renders only affected layers** (docs/06).

### 6.1 The type (canonical; lives in `packages/shared/src/studio/layer-patch.ts`)

```ts
// packages/shared/src/studio/layer-patch.ts
// ── LayerPatch/LayerPatchOp/LayerPatchSet are defined ONCE (CANON §12 L6). Import the canonical
//    schema — do NOT redefine it here. Single source: docs/03 §12.2 (packages/shared, @brutal/shared). ──
import { LayerPatch, LayerPatchOp, LayerPatchSet } from "@brutal/shared"; // canonical zod: docs/03 §12.2
export { LayerPatch, LayerPatchOp, LayerPatchSet };

// The EditorAgent + LocalizationAgent MUST emit ops with docs/03 §12.2's EXACT field names/enums:
//   setText{layerId,text}   setFill{layerId,fill}   setFont{layerId,fontFamily?,fontSize?,fontWeight?,fontStyle?}
//   resize{layerId,x?,y?,width,height}   rotate{layerId,rotation}   reorderZ{layerId,toIndex}
//   setVisible{layerId,visible}   addLayer{afterLayerId,layer}   removeLayer{layerId}
//   replaceAsset{layerId,assetId}   setBinding{layerId,binding,template?,fallback?}   setSlideOrder{order:string[]}
// Envelope: { id, variantId, slideId?, origin:'chat'|'canvas'|'agent'|'system',
//             createdBy:'human'|'agent'|'system', note?, ops }
// App-level semantics (behaviour, NOT new schema fields): `setFill` is snapped to the BrandKit palette by
// BrandGuardian; char limits (headline ≤70) are re-checked; `replaceAsset` dispatches imagery via
// ProviderBus.image (docs/04) — imagery is NEVER re-rolled inline; every non-imagery op is a pure JSON diff
// (zero image credits). Map internal edit sources onto the canonical `origin`:
// drag→'canvas'; editor-agent/localization/regenerate→'agent'.

// LayerPatchSet is an ALIAS for a LayerPatch[] (L6).
export const LayerPatchSet = z.array(LayerPatch);
export type LayerPatchSet = z.infer<typeof LayerPatchSet>;

// applyLayerPatch (in packages/shared) implements EXACTLY this op union (L6).
// For carousels, ops address a slide's layer via LayerPatch.slideId (+ layerId).
```

### 6.2 Apply semantics (deterministic; lives in `packages/shared` or `packages/render`)

```ts
export function applyLayerPatch(tree: LayerTree, patches: LayerPatchSet): {
  tree: LayerTree; affected: string[]; regenLayerIds: string[]
} {
  // 1. VALIDATE every op against the CURRENT tree (target ids must exist; addLayer id must be unique).
  //    An invalid op is REJECTED (not applied) and reported — never silently dropped.
  // 2. NORMALIZE style ops to the BrandKit (snap off-brand fill to nearest palette color; clamp fonts).
  // 3. ENFORCE char limits on setText (headline ≤70, on-image ≤60, cta ≤24, legal preserved).
  // 4. APPLY each patch's ops in order; collect affectedLayerIds for PARTIAL re-render.
  // 5. replaceAsset / regen:true does NOT mutate pixels here — it returns regenLayerIds for the app to run a
  //    GenerationJob via ProviderBus.image (docs/04). Everything else is a pure JSON diff (zero image credits).
  // 6. POST-CONDITION: the patched tree must still pass BrandGuardian before the human-approve gate.
}
```

### 6.3 `LayerPatch` invariants

| Invariant | Enforced |
|---|---|
| An op targets an **existing** layer (or unique new id) | `applyLayerPatch` validation (rejects invalid) |
| Style edits stay **on-brand** (palette/fonts) | normalize-to-BrandKit step; BrandGuardian re-check |
| Text edits respect **char limits** | `setText` enforcement |
| **`legal` layer** text is never removed by an edit unless the human explicitly does so | `removeLayer` on a `legal` layer requires human confirmation (UI) |
| **New imagery is never a pure patch** | `replaceAsset`/`regen` dispatches a `GenerationJob`; all other ops are pure JSON diffs |
| A text/style/transform edit costs **zero image credits** | pure-diff ops don't touch the provider bus (R7 §4) |
| Patched tree **re-passes `BrandGuardian`** before human-approve | orchestrator post-apply hook |

---

## 7. `AgentRun` lifecycle & the "brief → board" trace

Every brief produces an auditable trace of `AgentRun` rows (§5.1) that reconstructs exactly what happened:

```
brief_id = B
  AgentRun(agent=IntakeAgent,  round=0, model=haiku,  variant_id=null)
  AgentRun(agent=Strategist,   round=0, model=sonnet, variant_id=null)
  per variant V in {v1..vN}:
    AgentRun(agent=Copywriter,        round=0, model=sonnet, variant_id=V)   [Batch]
    AgentRun(agent=ArtDirector,       round=0, model=opus,   variant_id=V)
    GenerationJob(kind=image, variant_id=V)                                  [docs/04]
    AgentRun(agent=CarouselArchitect, round=0, model=sonnet, variant_id=V)   [carousel only]
    AgentRun(agent=CompositorPlanner, round=0, model=sonnet, variant_id=V)
    AgentRun(agent=BrandGuardian,     round=0, model=sonnet, variant_id=V)   [gate]
    Render(variant_id=V)                                                     [docs/06]
    AgentRun(agent=Critic,            round=0, model=opus,   variant_id=V)
    AgentRun(agent=EngagementAnalyst, round=0, model=sonnet, variant_id=V)   [→ EngagementPredictor, docs/08]
    (if weak) round=1 targeted re-author + re-score …
    (if still weak) round=2 targeted re-author + re-score @ opus … STOP
  → board = rank(v1..vN by stoppingPower band)
post-board (human-triggered):
  AgentRun(agent=EditorAgent,        variant_id=V)  → EditResult{patches: LayerPatchSet} → applyLayerPatch → partial re-render
  AgentRun(agent=LocalizationAgent,  variant_id=V)  → LocalizationResult → setText ops → re-render text
  → HUMAN-APPROVE GATE → export (docs/06)
```

Each row carries `cost_usd`; the sum feeds the caps (§5.4). `Variant.engagement{}` (CANON §5 lineage) stores the
final `EngagementReport.scores` for the calibration loop (docs/08 §7). Lineage on the `Variant`
(`brief_id, brand_kit_version, provider, model, model_version, seed, prompt, negative_prompt, parent_variant_id,
created_by, engagement{}`, CANON §5) is populated from `ArtDirection`/`GenerationJob`/`AgentRun` at persist time.

---

## 8. Consolidated guardrails (per CANON §4/§7)

| Guardrail | Mechanism | Agent(s) |
|---|---|---|
| **Text never in image prompt** | schema forbids copy fields on `ArtDirection.imageryPrompt`; classifier scan | ArtDirector, CarouselArchitect |
| **On-brand is mechanical** | code-level palette/font/banned-term checks + LLM tone judgment | BrandGuardian (+ CompositorPlanner, EditorAgent) |
| **No fabricated facts/numbers** | prompts forbid invention; proof points must subset the Brief | Intake, Strategist, Copywriter |
| **Hard char limits** | zod `.max()`; re-checked on every `setText` | Copywriter, CarouselArchitect, EditorAgent, LocalizationAgent |
| **Mandatory disclaimer** | `legal` layer required iff `mandatoryLegal` non-empty | CompositorPlanner, BrandGuardian |
| **TTS-safe numbers** | VO spelled-out; on-screen numerals kept; numeral-scan | LocalizationAgent |
| **No TRIBE on commercial path** | `backend` schema-restricted to `saliency`; bus hard-errors | EngagementAnalyst (+ ProviderBus, docs/08) |
| **Bands, never point CTR** | `predictedCtrBand{low,high,confidence}` required | EngagementAnalyst |
| **Bounded auto-iterate ≤2** | orchestrator counter (not prompt) | orchestrator |
| **Edits never re-roll** | `LayerPatch` diffs; imagery only via `replaceAsset`→job | EditorAgent, LocalizationAgent |
| **Nothing ships un-approved** | human-approve gate before export | orchestrator |
| **Cost caps pre-flight** | `budget.assertRoom` refuses would-breach jobs | agent-runner |
| **Prompt-injection safe** | fetched URLs/attachments treated as untrusted content, never instructions | IntakeAgent (§9.3) |
| **All output structured** | zod-validated at every boundary; schema_error retried once | all agents |

---

## 9. Implementation notes, assumptions & VERIFY checklist

### 9.1 File layout (within CANON's repo tree)

```
apps/web/src/server/studio/
  orchestrator.ts            # runBriefToBoard (§2.4), auto-iterate loop (§4.3)
  agent-runner.ts            # runAgent wrapper: model tiering, AgentRun, cost cap (§5.2)
  prompts/                   # one file per agent — the SYSTEM PROMPTs in §3 (versioned)
  budget.ts                  # per-brief + per-workspace cost caps (§5.4)
packages/shared/src/studio/
  layer-tree.ts              # Layer, LayerTree zod (§3.5)
  layer-patch.ts             # LayerPatchOp union + LayerPatch envelope + LayerPatchSet alias + applyLayerPatch (§6)
  agents.ts                  # NormalizedBrief, Strategy, CopySet, ArtDirection, CarouselNarrative,
                             #   BrandVerdict, CriticReport, EngagementReport, EditResult, LayerPatchSet, LocalizationResult
packages/shared/src/brand/
  banned.ts                  # banned-term list (shared by prompts + BrandGuardian code check)
  guard.ts                   # deterministic palette/font/limit/disclaimer checks (§3.6)
```

### 9.2 Anthropic integration (CANON §4) — `VERIFY current docs before coding`

- **Structured outputs** via **tool use with a JSON schema** (`tool_choice: {type:"tool", name:...}`), or the
  structured-output surface if available. Each agent has exactly one tool = its output schema.
- **Prompt caching** (90% off) on the static system prompt; **Batch API** (50% off) for the non-interactive
  N-variant `Copywriter` fan-out (R7 §0).
- **`VERIFY`**: model ids (`claude-sonnet-5`, `claude-opus-4-8`, `claude-haiku-4-5`), Sonnet 5 intro-pricing
  window (intro $2/$10 ends **2026-08-31**), tool-schema/structured-output surface, Batch + caching semantics —
  `platform.claude.com/docs/en/about-claude/models/overview` and `/pricing`. Model ids in **config, never
  hardcoded**; a boot check hits the Models API and fails fast on a retired model (R7 §7).

### 9.3 Prompt-injection & untrusted content (IntakeAgent, EditorAgent)

Any **URL content or attachment** the `IntakeAgent` ingests is **untrusted**: it is summarized/quoted into the
context as *data*, never followed as *instructions*. The system prompt is authoritative; injected "ignore your
instructions" text in a fetched page must not change agent behavior. The `EditorAgent`'s NL instruction is
user-authored (trusted intent) but still schema- and BrandKit-constrained (§3.9). **`VERIFY`**: apply Anthropic's
current guidance on untrusted-content handling / input tagging.

### 9.4 Assumptions (flagged)

| # | Assumption | Basis | If wrong |
|---|---|---|---|
| A1 | Claude model ids/tiers per ⚑R-LLM1 | R7 §5.3 | swap ids in config; tiering logic unchanged |
| A2 | LinkedIn playbook rules derived from CANON §8/§2/§1 (R3 not yet a file) | CANON | reconcile prompts + `Critic` anti-pattern enum against R3 when it lands |
| A3 | `IntakeAgent` is an accepted additive agent | R7 ⚑R-A1 | fold into `Strategist` prompt if CANON-minimalism preferred |
| A4 | `renderHints` per layer is accepted | R7 ⚑R-LT1 | drop the field; re-layout becomes heuristic in the exporter |
| A5 | Queue = Supabase pgmq default | R7 ⚑R-INFRA1 | `INNGEST_*` adapter; orchestrator unchanged (interface-bound) |
| A6 | Weakness thresholds start from global priors, calibrated per workspace | docs/08 §7 | tune constants; loop logic unchanged |
| A7 | `EngagementPredictor` returns exactly CANON §6 `EngagementScores` | CANON §6 / docs/08 | adjust `EngagementReport` mapping only |

### 9.5 Consolidated "VERIFY before coding"

1. **Anthropic**: model ids + Sonnet 5 intro window (ends 2026-08-31) + tool-schema/structured-output surface +
   Batch/caching semantics. (§9.2)
2. **`EngagementScores` shape** as delivered by `services/engine` matches CANON §6 exactly (docs/08). (§3.8)
3. **`LayerTree` ↔ Polotno store JSON** round-trip is lossless at the `EditorAdapter` (docs/06); CI round-trip
   test. (§3.5)
4. **LinkedIn 2026 format specs** (char limits ≤70/≤600/≤24; ratios 1:1/1.91:1/4:5; ≤5 MB; carousel 1080×1080
   PDF) re-confirmed against LinkedIn's live spec page (CANON §8 is the source of truth; specs drift). (§3.2/§3.4)
5. **R3 playbook** reconciliation when the file lands — update `Critic` anti-pattern enum + prompt rules. (⚑A2)
6. **Banned-term list** (`packages/shared/src/brand/banned.ts`) reviewed with the client for the German set. (§3.6)
7. **TTS number-spelling rules** for DE (`zwölfhundert`, `Prozent`, currency) match ElevenLabs behavior; do **not**
   rely on `apply_text_normalization` for DE (R2 §4.4). (§3.10)
8. **Cost-cap defaults** ($/brief, $/workspace) set with the client per plan tier. (§5.4)

---

## 10. Cross-document contract (what this doc exports / imports)

**Exports (other docs depend on these names/shapes):**
- The **eleven agent names** and their **output schemas** (`NormalizedBrief`, `Strategy`, `CopySet`,
  `ArtDirection`, `CarouselNarrative`, `LayerTree`, `BrandVerdict`, `CriticReport`, `EngagementReport`,
  `EditResult`, `LayerPatchSet`, `LocalizationResult`) — `packages/shared/src/studio`.
- The **`LayerPatchOp`** union + **`LayerPatch`** envelope + **`LayerPatchSet`** (`= LayerPatch[]`) + `applyLayerPatch`
  semantics (§6, frozen per CANON §12 L6; DDL owned by docs/03 §12.2) — consumed by docs/06 (render & editor).
- The **orchestration contract** `runBriefToBoard` (§2.4) — consumed by docs/06/10 (UI/server actions).
- **`AgentRun`** studio fields (§5.1) — consumed by docs/03 (schema) & docs/12 (observability).

**Imports (defined elsewhere; used here by canonical name):**
- Object model / DDL — **docs/03** (`Workspace…Layer`, `AgentRun`, `GenerationJob`, lineage).
- `ProviderBus`, `ImageProvider`, `GenSpec`/`GenResult`, routing policy — **docs/04** (CANON §6).
- `packages/render` (LayerTree → pixels; exporter/re-layout) — **docs/06**.
- `EngagementPredictor`/`EngagementScores`, `ENGAGEMENT_BACKEND`, TRIBE isolation — **docs/08** (CANON §6/§9).
- Polotno `EditorAdapter`, board UI, drag-edit — **docs/06**.
- Env vars (`ANTHROPIC_API_KEY`, `ENGINE_URL`, …), cost/observability infra — **docs/11** (CANON §10).

<!-- Conforms to CANON §4/§5/§6/§7/§10. Canonical names used verbatim: Strategist, Copywriter, ArtDirector,
CarouselArchitect, CompositorPlanner, BrandGuardian, Critic, EngagementAnalyst, EditorAgent, LocalizationAgent;
AgentRun, GenerationJob, LayerPatch, LayerTree, Layer types (image|text|logo|shape|cta|frame|legal|group|smart);
ProviderBus, ImageProvider, GenSpec, GenResult, EngagementPredictor, EngagementScores; ENGAGEMENT_BACKEND
(saliency|tribe_research), RESEARCH_MODE, ENGINE_URL, ANTHROPIC_API_KEY. Model tiers claude-sonnet-5 /
claude-opus-4-8 / claude-haiku-4-5 per R7 ⚑R-LLM1. Additive items flagged: IntakeAgent (⚑R-A1), renderHints
(⚑R-LT1). Deviations flagged ⚑ RECOMMENDATION; assumptions flagged ⚑ ASSUMPTION. -->
