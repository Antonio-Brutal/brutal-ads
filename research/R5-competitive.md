# R5 — Competitive Teardown: AI Ad-Creation Tools vs. Brutal Ads (LinkedIn-native)

> **Purpose.** Decide what Brutal Ads **copies** vs. **beats**. Conforms to `CANON.md` (esp. §12 Reconciliation Ledger L1–L12). This doc is cited by `docs/01` (product-spec) and `docs/07` (creative-playbook); per **L11** any earlier "reconcile when R5 lands / VERIFY against R5" hedge in those docs must now be **deleted** and repointed here.
> **Date of research:** 2026-07-01. Pricing/models/licenses **drift** — every hard fact below carries a source; §8 lists the exact **VERIFY-before-coding** flags. Per **L12**, none of these are stop conditions: code against the stated default, adjust only on a live 4xx/observed error.

---

## 1. The market has three tribes — and a hole in the middle

The AI-ad space in mid-2026 splits into three non-overlapping camps. **No incumbent occupies all three at once**, and none is built LinkedIn-first with editable text. That gap is Brutal's wedge.

1. **Generators (prosumer/SMB).** AdCreative.ai, Creatify, Predis.ai, Simplified, Flair.ai, Booth.ai, Lapis, Icon. Fast text/URL → many ad variants. **Weakness cluster:** templated look, text baked into pixels or trapped in rigid editors, no brand governance, no real testing, TikTok/Meta-first (not LinkedIn-native), no carousel *narrative*.
2. **Model orchestrators / agentic (mid-market → enterprise).** Pencil (Brandtech), Lapis (agentic tier). Route to best-of-breed models + performance prediction. Stronger, but still export-to-Canva for pixel edits and not LinkedIn-carousel-narrative-aware.
3. **Governance & creative-intelligence (enterprise-only).** CreativeX, VidMob. Score creative against brand rules and platform best-practices *pre-flight*. **They cannot generate**, cost enterprise-custom (VidMob targets $1M+/mo ad-spend brands), and are a separate procurement.  [creativex.com](https://www.creativex.com/) · [hawky.ai](https://hawky.ai/blog/best-creative-intelligence-platforms)
4. **Managed creative-as-a-service.** Superside (AI-augmented humans). Highest quality, but $10k–$100k/mo and human-in-the-loop, not self-serve.  [g2.com/superside](https://www.g2.com/products/superside/pricing)

**Brutal's insight (from CANON §2/§9):** *generate imagery only; every legible/on-brand element (headline, CTA, legal, price, slide copy) is a composited editable vector/text layer on a JSON layer tree*, wrapped by a **hard brand gate** (BrandGuardian) and a **commercially-clean saliency predictor** — LinkedIn-native, DE⇄EN. That fuses tribes 1+2+3 into one self-serve product. No incumbent below does this.

---

## 2. Per-competitor teardown (capability · pricing · biggest gap)

Pricing is monthly, standard/most-common tier, USD unless noted. Credit systems obscure true cost — noted where material.

### 2.1 AdCreative.ai — *the templated-scoring incumbent*
- **Capability:** Text/brand-input → static image ads + product videos; "Creative Scoring AI" (conversion-probability score), Compliance Checker, batch creatives, 15M+ stock library. Multi-platform (Meta/Google-first).
- **Pricing:** 3 editions, **$39 → $599/mo**; Starter $39/mo (10 credit-downloads); Pro $249/mo (100 credits, unlocks scoring/batch/product-video); Ultimate up to $599 (25 brands, 20 seats, video). ~50% off annual. 7-day trial.  [g2.com/adcreative-ai/pricing](https://www.g2.com/products/adcreative-ai/pricing) · [scribehow](https://scribehow.com/page/AdCreative_AI_Pricing_2026_Which_Plan_Is_Worth_It__i9cflqNNT46xl67HDt6B0A)
- **Biggest gap:** **Baked/rigid output + no real editing.** Users: *"can't adjust fonts granularly, modify grid layouts, or make deep structural changes… once the AI generates a design you can't fully adjust font style, element placement, or color."* Output reads *"generic and templated… interchangeable with competitor ads."* Recommended *"as a testing/iteration tool, not a creative production platform."* Billing-surprise complaints common.  [capterra](https://www.capterra.com/p/253052/AdCreativeai/reviews/) · [zeely](https://zeely.ai/blog/adcreative-review/) · [max-productive](https://max-productive.ai/ai-tools/adcreative-ai/)

### 2.2 Creatify — *product-URL → many video ads (UGC-style)*
- **Capability:** URL/product → AI-avatar UGC video ads; 300+ AI actors, 200+ templates, 75+ languages, AI Media Buyer, competitor ad tracking, ad launcher. Image ads too. TikTok/Meta-first.
- **Pricing:** Free (10 credits, watermark); Starter ~$39/mo (100 credits); **Pro from $49/mo (300 credits)**; Enterprise (API). *Real cost:* quality videos ~20 credits each ⇒ ~5 videos/mo on Starter; **credits expire every 2 months.**  [creatify.ai/pricing](https://creatify.ai/pricing) · [ezugc](https://www.ezugc.ai/creatify-pricing) · [g2](https://www.g2.com/products/creatify-labs-inc-creatify-ai/pricing)
- **Biggest gap:** **Miscast for B2B/LinkedIn + no post-gen editing.** *"Limited customization once the video is generated; manual editing requires export and re-import."* *"B2B audiences are… less responsive to UGC-style video… Creatify UGC is mostly miscast for B2B."*  [phygital](https://phygital.plus/blog/ai-ad-creative-generators/) · [ngram](https://www.ngram.com/blog/arcads-vs-creatify)

### 2.3 Icon (icon.com) — *"Human Admaker," ad-spy + one-click Meta*
- **Capability:** Admaker 2.0 = 8–10 tools-in-1 (production, ad-spy, analytics, creative library, one-click Meta launch, unlimited revisions). Newer "Human Admaker" pairs real-creator footage with the software.
- **Pricing:** Entry from **$39/mo** (3-day trial); flagship human-UGC pack **$399** (6 filmed+edited ads); AI-only **$399/mo** (500 ads, unlimited edits, then $0.99/extra download). Higher tiers custom.  [icon.com/pricing](https://icon.com/pricing) · [g2](https://www.g2.com/products/icon-icon-ai-admaker/pricing) · [platform-review](https://www.platform-review.com/reviews/icon-com)
- **Biggest gap:** **Meta/DTC-first, no LinkedIn document/carousel narrative, no brand-governance gate.** Editing = revisions, not a layered canvas.

### 2.4 Arcads — *premium synthetic-UGC actors*
- **Capability:** Script → AI-actor UGC video; strongest actor realism in class; actor cloning (Pro).
- **Pricing:** **Starter $110/mo (10 videos), Creator $220/mo (20), Pro custom (API)** ⇒ ~$11/video. **No free trial, no annual discount, credits don't roll over;** face-cloning is four-figure/yr Pro-only.  [eesel](https://www.eesel.ai/blog/arcads-ai-pricing) · [ezugc](https://www.ezugc.ai/arcads-pricing)
- **Biggest gap:** **Video-only, UGC-only, wrong register for sober B2B/LinkedIn.** No static/carousel, no editing surface, no governance.

### 2.5 Pencil (The Brandtech Group) — *agentic orchestrator + performance prediction*
- **Capability:** Purpose-built agents (image/video/beauty-shot/insights/personas/ideation/brand-strategy/media-plan); **orchestrates OpenAI, Google, Adobe, Runway, Bria** — closest architecture to Brutal's provider bus. Predicts winners against "billions of data points." 1,000+ brands. Multi-channel (Meta/TikTok/YouTube/Amazon/Pinterest).
- **Pricing:** Core ~$14/mo (solo, structured output + prediction); Starter ~$21/mo → ~$141/mo higher volume; enterprise on request.  [trypencil.com/pricing](https://trypencil.com/pricing) · [softwaresuggest](https://www.softwaresuggest.com/pencil)
- **Biggest gap:** **Not LinkedIn-carousel-native, no hard brand gate, and pixel edits still leave the tool** (export-to-design). Strong prediction ≠ editable layer tree. This is the competitor to watch on **architecture**; Brutal beats it on **LinkedIn-native narrative + editability + governance**.

### 2.6 Canva Magic Studio — *the 800-lb design gorilla*
- **Capability:** Magic Design, Dream Lab (image gen on Leonardo Phoenix arch; rated > DALL·E 3, < Midjourney v7 in Apr-2026 tests), Magic Write, Magic Resize, Style Transfer, Brand Kit, video, app-building. Real layered editor + Brand Kit already exist.
- **Pricing:** Free (10 Magic Design, 5 Dream Lab); **Pro ~$15/mo** (unlimited Magic Design, 500 Dream Lab, brand-voice, full Brand Kit); Teams per-seat.  [canva.com/canva-ai](https://www.canva.com/canva-ai/) · [eesel](https://www.eesel.ai/blog/canva-ai-pricing) · [aitoolanalysis](https://aitoolanalysis.com/canva-magic-studio-review/)
- **Biggest gap:** **General-purpose, not ad-outcome-driven.** No engagement prediction, no LinkedIn-spec exporter/safe-zones, no hook→reframe→close carousel logic, no ad-variant matrix, no hard brand-compliance gate (Brand Kit is guidance, not a blocking gate), weak DE⇄EN *transcreation*. Canva is the **editing bar Brutal must clear** (it proves users expect a real layered canvas — validates Polotno choice) but it is not an ad engine.

### 2.7 Superside — *managed AI-augmented creative service*
- **Capability:** Human designers + AI for high-impact ad creative, image libraries, at ~60% of traditional cost. Governance/quality via humans.
- **Pricing:** Subscription **$10k–$100k/mo** + mandatory $1k/mo service fee; G2 shows start ~$10k; **12-month commit required.** Year-one $10k tier ≈ $135k.  [checkthat](https://checkthat.ai/brands/superside/pricing) · [g2](https://www.g2.com/products/superside/pricing)
- **Biggest gap:** **Not self-serve, not real-time, enterprise-only budget.** Brutal's whole promise (brief → board in minutes, tweak by chat) is the anti-Superside.

### 2.8 Flair.ai — *AI product photography / scenes*
- **Capability:** Drag-drop scene builder, realistic lighting/shadows, custom product models, fashion photoshoots (garment/jewelry fit with logo/pattern preservation), API (higher tiers), video gen.
- **Pricing:** Free ($0); **Pro $10/mo; Pro+ $35/mo (commercial license); Scale $55/mo (API early access)**; Enterprise custom. **Caveat:** instant/ad generation burns credits **4×** — advertised counts misleading.  [flair.ai/pricing](https://flair.ai/pricing) · [wizcommerce](https://wizcommerce.com/blog/flair-ai-pricing/)
- **Biggest gap:** **Product-shot tool, not an ad system.** No copy, no layout/CTA/legal layers, no LinkedIn spec, no governance/testing. Could be a *reference/upstream imagery source*, not a competitor to the whole.

### 2.9 Booth.ai — *product photography (LEGACY / likely dead)*
- **Capability:** Product photo gen from sample images; lifestyle scene staging.
- **Pricing (historical):** ~$25/mo standard, $49/mo Pro, credit-based.  [softwaresuggest](https://www.softwaresuggest.com/booth-ai)
- **Status / biggest gap:** **⚠️ Multiple 2026 sources say Booth.ai is a legacy product and slated to cease service (one source: "by May 2025"), steering users to CapCut Web.** Treat as **non-competitive / do-not-benchmark**. VERIFY only if a stakeholder insists it's live.  [softwaresuggest](https://www.softwaresuggest.com/booth-ai) · [revoyant](https://www.revoyant.com/product/booth-ai)

### 2.10 Predis.ai — *social content + AI carousels*
- **Capability:** AI carousels (one of its core content types), AI ad/video generation, competitor analysis, voice-over, multi-channel scheduling/publishing. Closest incumbent to *carousel* generation.
- **Pricing:** **Lite $32/mo, Premium $59/mo, Agency $249/mo**; credit-based (Lite = 60 posts, 50 VO-min, 5 channels). Extra carousel credits $5–15/pack-of-10.  [predis.ai/pricing](https://predis.ai/pricing/) · [socialrails](https://socialrails.com/blog/predis-pricing)
- **Biggest gap:** **Social-post carousels, not LinkedIn *document-ad narrative*.** No hook→reframe→close continuity logic, no cross-slide continuity-layer propagation, no brand gate, no engagement prediction, no LinkedIn PDF-document-ad spec/safe-zones, no DE⇄EN transcreation. This is the **carousel competitor to beat** on narrative + editability.

### 2.11 Simplified — *all-in-one marketing workspace*
- **Capability:** AI design + video + writing + social scheduling; models incl. DALL·E / Stable Diffusion; "replace multiple tools."
- **Pricing:** Free; **Small Team ~$24/mo; Business ~$40/mo** (reports range $19–$79); Enterprise custom; credit-based (10k on Pro).  [eesel](https://www.eesel.ai/blog/simplified-ai-pricing) · [g2](https://www.g2.com/products/simplified/reviews)
- **Biggest gap:** **Breadth over depth.** No ad-outcome engine, no LinkedIn-native spec, no governance gate, no engagement testing. Generic design output.

### 2.12 Bria — *licensed, IP-indemnified image gen (a PROVIDER, not a rival)*
- **Capability:** Enterprise image/video gen API trained **only on licensed data (Getty, Alamy, Envato)** with **full IP indemnification**; open-source weights available. Not an ad app.
- **Pricing:** **Self-Service $0.08/image, $0.16/video-sec**; PaaS custom; 1,000 free actions; startup usage fees ~$0.005–0.04.  [bria.ai/pricing](https://bria.ai/pricing) · [saasworthy](https://www.saasworthy.com/product/bria-ai/pricing)
- **Strategic role:** **Not a competitor — a candidate provider** behind Brutal's `ImageProvider` bus (CANON §6) for **legally-clean, indemnified imagery**, decisive for EU legal/PE verticals. Its commercial/indemnity terms are already a **CANON L9 sign-off item**. Copy nothing; *integrate* it.

### 2.13 Lapis (trylapis.com) — *multi-platform agentic ad generator, LinkedIn-aware*
- **Capability:** Single prompt → production-ready ads for **6 platforms incl. LinkedIn** (Meta/Google/TikTok/WhatsApp/ChatGPT); uses your logos/colors/fonts/product images for brand-matched image ads; auto-resize per placement; **built-in performance forecasting, competitor tracking, web analytics**; agentic "managed" tier that launches+optimizes.
- **Pricing:** Free (5 credits/mo); **Basic $99/mo; Pro $599/mo (250 campaign credits ≈ $2.40/campaign)**; managed tiers.  [trylapis.com/pricing-comparison](https://www.trylapis.com/resources/ai-ad-generator-pricing-comparison) · [everydev](https://www.everydev.ai/tools/lapis)
- **Biggest gap:** **The closest overall competitor — beat it precisely.** LinkedIn is *one of six* placements (auto-resize ≠ LinkedIn-native narrative/safe-zones); no hook→reframe→close **document-ad** logic; **no editable layer tree** (brand-matched ≠ tweak-any-element-by-drag/chat); no hard brand-compliance **gate**; no DE⇄EN transcreation; forecasting is self-reported, not calibrated to a tenant's real LinkedIn Results. Brutal's differentiators map 1:1 to Lapis's gaps.

---

## 3. Comparison matrix

Legend: ✅ real/strong · 🟡 partial/weak · ❌ absent · ⚠️ caveat. "Editable layers" = post-generation drag/chat edit of text/CTA/layout without export-round-trip.

| Product | Category | Entry price/mo | LinkedIn-native | Static | Carousel *narrative* | Video | **Editable layer tree** | Brand-governance **gate** | Engagement **testing** | DE⇄EN transcreation | Provider-router |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Brutal Ads** | Gen+gov+test | (self-serve) | ✅ built-first | ✅ | ✅ hook→reframe→close | 🟡 fast-follow | ✅ Polotno JSON | ✅ BrandGuardian hard gate | ✅ saliency bands+calib | ✅ LocalizationAgent | ✅ ProviderBus |
| AdCreative.ai | Generator | $39 | 🟡 supported | ✅ | ❌ | 🟡 | ❌ rigid editor | 🟡 compliance-checker | 🟡 creative score | ❌ | ❌ |
| Creatify | UGC video | ~$39 | 🟡 | 🟡 | ❌ | ✅ | ❌ export/re-import | ❌ | 🟡 | 🟡 75+ langs | 🟡 |
| Icon | Gen + ad-spy | $39 / $399 | ❌ Meta-first | ✅ | ❌ | ✅ | 🟡 revisions | ❌ | 🟡 analytics | ❌ | ❌ |
| Arcads | UGC video | $110 | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | 🟡 | ❌ |
| Pencil | Orchestrator | $14–$21 | 🟡 | ✅ | ❌ | ✅ | ❌ export-to-design | ❌ | ✅ prediction | 🟡 | ✅ multi-model |
| Canva Magic | Design suite | $15 | ❌ no ad spec | ✅ | 🟡 manual | ✅ | ✅ full editor | 🟡 Brand Kit (guide) | ❌ | 🟡 | 🟡 |
| Superside | Managed svc | $10k+ | 🟡 human | ✅ | 🟡 human | ✅ | ✅ (humans) | ✅ (humans) | 🟡 | ✅ human | n/a |
| Flair.ai | Product photo | $10 | ❌ | 🟡 imagery | ❌ | 🟡 | 🟡 scene canvas | ❌ | ❌ | ❌ | ❌ |
| Booth.ai ⚠️ | Product photo | ~$25 (legacy) | ❌ | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Predis.ai | Social content | $32 | 🟡 | ✅ | 🟡 slides ≠ narrative | ✅ | 🟡 | ❌ | ❌ | 🟡 | ❌ |
| Simplified | All-in-one | ~$24 | ❌ | ✅ | 🟡 | ✅ | ✅ editor | 🟡 Brand Kit | ❌ | 🟡 | 🟡 |
| Bria (provider) | Image API | $0.08/img | n/a | n/a | n/a | n/a | n/a | ✅ IP-indemnity | n/a | n/a | (is a driver) |
| Lapis | Agentic gen | $99 | 🟡 1-of-6 | ✅ | ❌ | 🟡 | ❌ brand-match only | ❌ | ✅ forecasting | ❌ | ✅ |
| CreativeX / VidMob | Gov/intel | enterprise-custom | 🟡 platform-fit | n/a (scores only) | n/a | n/a | ❌ (can't generate) | ✅ CQS 21 elements | ✅ deep | 🟡 | n/a |

*CreativeX/VidMob are scoring/governance-only, enterprise-custom (VidMob targets $1M+/mo spenders).*  [creativex.com](https://www.creativex.com/) · [hawky.ai](https://hawky.ai/blog/best-creative-intelligence-platforms)

---

## 4. Where they collectively fail (the 7 category-wide holes)

1. **Baked/uneditable text.** Category-wide: text is either burned into the generated pixels or trapped in a rigid editor. *"You can't adjust fonts granularly, modify grid layouts, or make deep structural changes… for pixel-perfect control you export to Canva."* — this is **exactly the pain CANON §2 names**, industry-confirmed across AdCreative, Creatify, Runway.  [max-productive](https://max-productive.ai/ai-tools/adcreative-ai/) · [phygital](https://phygital.plus/blog/ai-ad-creative-generators/) → **Brutal beats via the composited JSON layer tree (Polotno) — imagery-only gen, everything legible is an editable vector layer.**
2. **Generic/templated output.** *"Generic and templated… interchangeable with competitor ads… too rigid for brand-specific storytelling."*  [zeely](https://zeely.ai/blog/adcreative-review/) · [capterra](https://www.capterra.com/p/253052/AdCreativeai/reviews/) → **Brutal beats via layout-archetype diversity (L10) + `layout_homogeneity` Critic anti-pattern + brand-kit-driven art direction.**
3. **No brand-governance gate.** Governance is a *separate, enterprise-only* purchase (CreativeX/VidMob, $1M+ tier) that **can't generate**; generators ship a "Brand Kit" that is *guidance, not a blocking gate*.  [creativex.com](https://www.creativex.com/) → **Brutal beats via BrandGuardian as an in-line hard gate (palette/voice/banned terms/disclaimer/AI-disclosure/localization) on every variant — governance built into generation, self-serve.**
4. **No real, credible testing.** Generators offer a self-reported "creative score"; real testing lives in enterprise intel tools you can't self-serve. → **Brutal beats via EngagementPredictor: commercially-clean saliency (TranSalNet MIT per L9) + grid-salience heuristics, reported as bands+confidence, calibrated against the tenant's *real* LinkedIn Results (never TRIBE on the commercial path).**
5. **Weak editing / export round-trips.** Even video tools force export→re-import; even design suites (Canva) lack ad-outcome logic. → **Brutal beats via chat-to-edit emitting typed `LayerPatch` diffs (never re-rolls) on a live layered canvas.**
6. **Not LinkedIn-native.** The category is TikTok/Meta-first; LinkedIn is at best "one of six placements" via naive auto-resize. Note the platform fact: **LinkedIn killed native organic carousel uploads (late 2023); the supported path is now PDF *document* posts/ads** — so a LinkedIn-native tool must think in *documents/PDF*, not image swipes.  [buffer](https://buffer.com/resources/linkedin-carousel-examples/) · [ngram](https://www.ngram.com/blog/arcads-vs-creatify) → **Brutal beats via LinkedIn-first specs (CANON §8), PDF document-ad export, safe-zones (feed crop / "see more" fold), smart re-layout from one base (not crop).**
7. **No carousel narrative.** Predis/others generate *slides*, not a **hook→reframe→close** story with cross-slide continuity. → **Brutal beats via `CarouselArchitect` + continuity-layer propagation (edit propagates across slides w/ per-slide opt-out, L10) + deck-level pre-flight.**

**Bonus hole — B2B register.** UGC-actor tools (Arcads/Creatify/Icon) are *"miscast for B2B"*; Brutal's sober/editorial/documentary DE⇄EN voice is a deliberate anti-position.  [ngram](https://www.ngram.com/blog/arcads-vs-creatify)

---

## 5. Brutal's wedge (defensible, one sentence + the moat stack)

> **"Type one brief → get a board of on-brand, *testable*, LinkedIn-native ads (static + hook→reframe→close carousels) where every word is an editable layer, not baked pixels — tweak anything by drag or chat, pass a hard brand gate, predict engagement, export to exact LinkedIn PDF/spec, in German or English."**

The moat is the **combination no one else has assembled**, ordered by defensibility:
1. **Editable layer tree (imagery-only gen).** Structurally different from the whole generator tribe; dissolves both "hard to prompt" and "hard to edit." *Hardest to copy — it's an architecture, not a feature.*
2. **BrandGuardian hard gate + AI-disclosure** built into generation (governance without a second enterprise purchase). *Sells to regulated EU legal/PE.*
3. **LinkedIn-native narrative + PDF document-ad exporter + safe-zone-aware smart re-layout.** *Niche depth incumbents won't prioritize (LinkedIn is a small slice of their TAM).*
4. **Calibrated engagement bands** tied to the tenant's real Results (not a vanity score). *Compounds with usage — a data moat.*
5. **DE⇄EN transcreation** (TTS-safe number spelling), first-class not bolt-on. *Serves the exact seed customer (German law firms).*
6. **ProviderBus** (route to best/cheapest/legally-clean model, incl. IP-indemnified **Bria**). *Matches Pencil's one real strength while beating it on 1–5.*

---

## 6. Copy vs. Beat — explicit calls

**COPY (table-stakes / proven patterns — don't reinvent):**
- **Brief → board of variants** (AdCreative/Lapis): the core loop. ✔ CANON has it.
- **Model orchestration behind one UI** (Pencil): ✔ CANON ProviderBus.
- **Performance prediction as a first-class surface** (Pencil/Lapis/AdCreative score): ✔ CANON EngagementPredictor — but make it *calibrated bands*, not a black-box score.
- **Brand Kit ingestion** (Canva/Lapis: logos/colors/fonts): ✔ CANON BrandKit — but upgrade from *guidance* to *hard gate*.
- **Auto-resize across placements** (Lapis/AdCreative): ✔ CANON smart re-layout — but from-one-base + safe-zones, not naive crop.
- **Credit/spend transparency**: incumbents get slammed for hidden credit burn (Flair 4×, Creatify expiry, AdCreative billing surprises). ✔ CANON per-brief/per-workspace hard caps + `cost_usd` logging is a *marketing advantage* — surface it.

**BEAT (the wedge — invest here):**
- **Editable layer tree over baked pixels** (beats all generators).
- **Hard brand gate inside generation** (beats CreativeX being a separate $$$ purchase + generators' toothless Brand Kits).
- **LinkedIn document-ad carousel *narrative*** (beats Predis slides + everyone's Meta-first bias).
- **Chat-to-edit via typed LayerPatch, no re-rolls** (beats export-round-trips).
- **Calibrated engagement vs. tenant's real Results** (beats vanity scores).
- **DE⇄EN transcreation + sober B2B register** (beats UGC miscast + English-only).

**DO NOT build (out of scope / distraction):**
- Synthetic-UGC AI actors (Arcads/Creatify lane) — wrong register for sober B2B; revisit only if data demands.
- Ad-account media-buying/launch automation (Lapis/Icon/Creatify) — a *later* integration, not v1.
- General-purpose design suite (Canva lane) — stay ad-outcome-focused.
- Ad-spy/competitor-library scraping (Icon/AdCreative) — nice-to-have, not the wedge.

---

## 7. Prioritized MoSCoW feature list (v1 vs. later)

Framed for the CANON build package (`docs/01`, `docs/07`). "v1" = first shippable to the Brutal seed tenant.

### MUST (v1 — the wedge is non-negotiable)
- **M1** Brief → board of static single-image LinkedIn ads (1:1 1200×1200 default; derive 1.91:1, 4:5) — CANON §8.
- **M2** **Composited editable layer tree** (imagery-only gen; text/logo/CTA/legal/price = vector/text layers) — Polotno via EditorAdapter (CANON §4/§6). *This is the wedge; nothing ships without it.*
- **M3** **BrandGuardian hard gate** (palette/voice/banned-terms/required-disclaimer/AI-disclosure/localization) blocking on every variant — CANON §7, L7.
- **M4** **Carousel/document ads with hook→reframe→close narrative** + continuity-layer propagation (per-slide opt-out) + PDF document-ad export — CANON §8, L10, L3 (`render_kind` PDF, no PPTX).
- **M5** **Chat-to-edit → typed `LayerPatch`** (no re-rolls) — CANON §7, L6.
- **M6** **LinkedIn-native exporter**: exact specs, ≤5 MB encode, safe-zones, smart re-layout from one base — CANON §8, L5 `renderDocument`.
- **M7** **DE⇄EN transcreation** (LocalizationAgent, TTS-safe numbers) — CANON §7, L1.
- **M8** **ProviderBus** with policy table + manual override + fallback (image: `flux-2-pro`, edit `gemini-3-pro-image`; incl. an IP-indemnified path via **Bria** for legal/PE) — CANON §6, L4.
- **M9** **Engagement testing (commercially-clean saliency)**: TranSalNet (MIT) + grid-salience heuristics; bands+confidence — CANON §9, L9. (TRIBE stays flag-gated R&D, off the commercial path.)
- **M10** **Cost/observability**: per-brief + per-workspace hard caps, `cost_usd`/token/latency logging on every AgentRun/GenerationJob — CANON §4, L8 (`spend_cap_usd_per_brief` column).
- **M11** **Layout-archetype diversity** (4 named archetypes) + `layout_homogeneity` Critic anti-pattern — L10 (directly kills the "templated" failure mode).

### SHOULD (v1 if time, else fast-follow)
- **S1** Engagement **calibration loop** against the tenant's real `Result` rows (turns prediction into a data moat) — CANON §9.
- **S2** **Advanced-brief panel** (angle lock, proof-point pick, variant count, matrix-axis emphasis) — L10.
- **S3** Bounded **auto-iterate (≤2 rounds)** on weak variants — CANON §7.
- **S4** Deck-level **carousel pre-flight** (continuity/divergence warnings) — L10.
- **S5** **Spend/credit transparency UI** (turn the incumbents' hidden-credit weakness into a visible advantage).

### COULD (later)
- **C1** **Video** as first-class (Remotion + Kling `kling-v2-5-turbo` default, escalate `kling-3.0-omni`; Veo-3.1 fallback) — CANON §4, L4. *(CANON calls video a fast-follow, not v1.)*
- **C2** Multi-tenant self-serve onboarding beyond the seed tenant.
- **C3** **A/B test → auto-import LinkedIn results** for closed-loop calibration.
- **C4** Additional locales beyond DE/EN.
- **C5** Competitor-ad reference library (ad-spy-lite).

### WON'T (v1 — explicitly parked)
- **W1** Synthetic-UGC AI actors / avatars (Arcads/Creatify lane).
- **W2** Native ad-account media-buying / one-click launch (Lapis/Icon lane).
- **W3** Non-LinkedIn placements (Meta/Google/TikTok) — stay LinkedIn-native to win the niche first.
- **W4** PPTX export (L3 — PDF only for document ads).
- **W5** TRIBE v2 on any commercial path (L9 — R&D flag only).

---

## 8. VERIFY before coding (facts that drift — pair with CANON L12: code the default now, adjust only on live error)

| # | Claim to re-verify | Code-this default now | Why it matters |
|---|---|---|---|
| V1 | **Booth.ai is discontinued/legacy** (source: "cease service by May 2025") | Treat as **non-competitive**; do not benchmark | Don't waste build effort on a dead product; confirm before any stakeholder cites it.  [softwaresuggest](https://www.softwaresuggest.com/booth-ai) |
| V2 | **LinkedIn organic carousels removed (2023) → PDF document posts are the supported path** | Build carousel = **PDF document ad**, page-per-slide | Whole M4 depends on this; re-confirm LinkedIn Help before exporter work.  [buffer](https://buffer.com/resources/linkedin-carousel-examples/) · [linkedin help a1640349](https://www.linkedin.com/help/lms/answer/a1640349) |
| V3 | **LinkedIn's own AI (AI Ad Variants live; Flexible Ad Creation rolling out early-2026)** generates **copy only, not images/carousels**, and personalization is **managed-customer-gated** | Position Brutal as complementary (imagery+layers+carousels+governance) | LinkedIn-native is a *threat surface*; today it's copy-only + rep-gated, leaving Brutal's lane open. **Re-check each quarter** — if LinkedIn ships native image/carousel gen, re-assess.  [linkedin blog](https://www.linkedin.com/business/marketing/blog/linkedin-ads/linkedin-ads-reserved-ads-ad-personalization-ai-ad-variants-flexible-ad-creation) |
| V4 | **LinkedIn ad specs** (1200×1200 / 1200×627 / 960×1200; headline ≤70; ≤5 MB; ~150 chars visible; doc ads ~10–12 pp; video ≤200 MB) — CANON §8 | Code CANON §8 values | Exporter correctness. Re-confirm LinkedIn's spec page at build.  [thebrief](https://www.thebrief.ai/blog/linkedin-ad-specifications/) · [zeely sizes](https://zeely.ai/blog/best-linkedin-ad-sizes-for-every-format-in-2026/) |
| V5 | **Bria commercial/indemnity terms + EU hosting** (a CANON L9 sign-off) and pricing ($0.08/img, $0.16/video-sec) | Wire Bria as an optional indemnified `ImageProvider` driver | Legal-clean imagery for EU legal/PE is a differentiator; terms/price must be confirmed pre-launch.  [bria.ai/pricing](https://bria.ai/pricing) |
| V6 | **Model slugs** (L4): `flux-2-pro`, `gemini-3-pro-image`, `gpt-image-1.5`, `recraft-v3`, `ideogram-3.0`, `seedream-4`; video `kling-v2-5-turbo` / `kling-3.0-omni` / `veo-3.1-*` | Code L4 slugs exactly | Provider integrations; adjust only on 4xx. `veo-3.0-*` is retired — never attempt (L4). |
| V7 | **Competitor pricing** (all §2 numbers) | Use as directional positioning only | Pricing changes monthly; never hard-code a competitor price into product logic — use for GTM/positioning, re-pull before any pricing page. |
| V8 | **CreativeX/VidMob remain generation-incapable, enterprise-custom** | Position governance as Brutal's built-in differentiator | If either ships self-serve generation, re-assess the governance moat.  [creativex.com](https://www.creativex.com/) |

---

## 9. One-paragraph recommendation

**Build the wedge, ignore the noise.** The AI-ad market in mid-2026 is a barbell: cheap generators that produce **baked, templated, uneditable, Meta-first** creative with no governance and vanity-only testing (AdCreative, Creatify, Icon, Arcads, Predis, Simplified, Flair, Lapis), and enterprise governance/service platforms that **can't self-serve or can't generate** (CreativeX/VidMob at $1M+ spend, Superside at $10k+/mo). **Pencil** is the only architecturally-similar player and **Lapis** the only LinkedIn-aware one — beat them on the six differentiators in §5. Brutal's defensible position is the **combination no one has assembled**: imagery-only generation onto an **editable layer tree**, an **in-line hard brand gate**, **LinkedIn-native hook→reframe→close PDF document-ad narratives**, **chat-to-edit LayerPatch**, **calibrated engagement bands**, and **DE⇄EN transcreation** — all self-serve. Ship the MUST list (M1–M11) exactly as CANON specifies; park UGC actors, media-buying, non-LinkedIn placements, and video for later. The incumbents' most-cited weaknesses — *"can't adjust fonts/placement/color after generation," "generic and templated," "export to Canva for real edits," "miscast for B2B"* — are Brutal's feature list.

---

*Sources (primary):* [AdCreative g2](https://www.g2.com/products/adcreative-ai/pricing) · [AdCreative capterra reviews](https://www.capterra.com/p/253052/AdCreativeai/reviews/) · [Creatify pricing](https://creatify.ai/pricing) · [Creatify ezugc](https://www.ezugc.ai/creatify-pricing) · [Icon pricing](https://icon.com/pricing) · [Arcads eesel](https://www.eesel.ai/blog/arcads-ai-pricing) · [Pencil pricing](https://trypencil.com/pricing) · [Canva AI](https://www.canva.com/canva-ai/) · [Canva eesel](https://www.eesel.ai/blog/canva-ai-pricing) · [Superside checkthat](https://checkthat.ai/brands/superside/pricing) · [Flair pricing](https://flair.ai/pricing) · [Booth softwaresuggest](https://www.softwaresuggest.com/booth-ai) · [Predis pricing](https://predis.ai/pricing/) · [Simplified eesel](https://www.eesel.ai/blog/simplified-ai-pricing) · [Bria pricing](https://bria.ai/pricing) · [Lapis pricing-comparison](https://www.trylapis.com/resources/ai-ad-generator-pricing-comparison) · [CreativeX](https://www.creativex.com/) · [LinkedIn AI ad blog](https://www.linkedin.com/business/marketing/blog/linkedin-ads/linkedin-ads-reserved-ads-ad-personalization-ai-ad-variants-flexible-ad-creation) · [LinkedIn carousel fact — Buffer](https://buffer.com/resources/linkedin-carousel-examples/) · [ngram Arcads-vs-Creatify B2B](https://www.ngram.com/blog/arcads-vs-creatify) · [phygital editing-limitation](https://phygital.plus/blog/ai-ad-creative-generators/)
