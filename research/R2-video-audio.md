# R2 — Video + Audio + Assembly Stack (LinkedIn video ads)

> Grounding research for the **Brutal Ads** one-shot build package. Conforms to `CANON.md`
> (object model, `VideoProvider`/`AudioProvider`/`ProviderBus` contracts, env var names,
> repo shape, LinkedIn specs). Scope: the **`AdDocument.type = 'video'`** path — muted-first,
> burned-in subtitles, ≤200 MB, DE+EN, sober/editorial register.
> **Verified mid-2026** via live docs/pricing; every drift-prone fact is flagged **`⚠️ VERIFY`**.
>
> **North-star pipeline:** brief → clips (Kling primary) → VO (ElevenLabs) → Remotion assembly
> (OffthreadVideo + burned-in captions + brand cards + audio mix) → render (local or Lambda) →
> LinkedIn spec-check (ratio + ≤200 MB + first-3-s stopping power).

---

## 0. TL;DR recommendation (job → provider routing)

| Video job | Primary | Fallback | Why |
|---|---|---|---|
| **b-roll / abstract / product motion (t2v)** | **Kling v2.5-turbo (pro)** | Seedance 2.0, Veo 3.1 Fast | Client already integrated; cheap, strong motion, muted anyway |
| **animate a supplied still (i2v)** — the default for Brutal (imagery-only rule) | **Kling i2v (v2.5-turbo pro)** | Seedance 2.0 i2v, Runway Gen-4 | Preserves composited brand still; we mute + burn subs, so no native audio needed |
| **consistent recurring face/persona across shots** | **Kling 3.0 Omni** (multi-image elements + voice bind) | Veo 3.1 (reference images) | Omni is the 2026 answer to face drift; native audio available but we usually discard it |
| **needs believable spoken dialogue in-frame (sound-on cut)** | **Veo 3.1** (audio-native) or **Kling 3.0 Omni** | — | Only when we ship a sound-on variant; DE lip-sync still weak → prefer avatar tools |
| **talking-head / UGC spokesperson (LinkedIn "founder" ad)** | **HeyGen** (avatar + our ElevenLabs VO) | Creatify / Arcads (ad-native) | Purpose-built, lip-sync, brand-safe, API-first |
| **voiceover (all languages, esp. DE)** | **ElevenLabs** `eleven_multilingual_v2` | `eleven_v3` (expressive) | Locked in CANON; multilingual, deterministic seed |
| **SFX / ambient / music bed** | **ElevenLabs** SFX + Music API | licensed library | Same vendor, same key |
| **assembly + burned-in subs + brand cards + render** | **Remotion** (local `renderMedia`) | Remotion **Lambda** (scale) | Locked in CANON; captions burned in muted-first |

**One-line policy:** *Kling is the default video engine (t2v + i2v + Omni for faces); Veo 3.1 only when in-frame audio dialogue is required; HeyGen for talking-head UGC; ElevenLabs for all audio; Remotion assembles and renders; muted-first means we almost never keep model-native audio — VO + burned-in captions carry the story.*

---

## 1. Kling — the client's primary engine (official JWT API)

**⚠️ Two different "Kling APIs" exist — do not confuse them.**
- **Official Kuaishou platform** (what the client uses): base `https://api.klingai.com` (also region hosts, e.g. `https://api-singapore.klingai.com`). **JWT HS256** auth from `KLING_ACCESS_KEY` + `KLING_SECRET_KEY`. This is canonical (CANON §10).
- **Third-party proxies** (`klingapi.com`, PiAPI, fal, Replicate, Segmind) — use a plain `Bearer <api_key>` and their own model slugs. Fine as fallback lanes, **not** the primary. `⚠️ VERIFY` which host the client's existing key targets before coding.

### 1.1 Auth — JWT HS256 (canonical, verified)
Token is a short-lived JWT signed with the **secret key**; put it in `Authorization: Bearer <token>`. Official reference implementation:

```python
import time, jwt  # PyJWT
def encode_jwt_token(ak: str, sk: str) -> str:
    headers = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "iss": ak,                      # access key
        "exp": int(time.time()) + 1800, # +30 min
        "nbf": int(time.time()) - 5,    # tolerate clock skew
    }
    return jwt.encode(payload, sk, headers=headers)
# Authorization: Bearer <token>
```
TS equivalent (for `apps/web` / provider driver): `jsonwebtoken` → `jwt.sign({iss:ak, exp, nbf}, sk, {algorithm:'HS256', header:{typ:'JWT'}})`. Regenerate per request or cache < 30 min.
Source: Kling Open Platform "Authentication". `⚠️ VERIFY` exp window & host in current docs.

### 1.2 Endpoints (official)
| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/videos/text2video` | text → video |
| POST | `/v1/videos/image2video` | image → video (**Brutal default**) |
| GET  | `/v1/videos/text2video/{task_id}` | poll task (image2video symmetric) |
| POST | `/v1/videos/video-extend` | extend a clip |
| POST | `/v1/videos/lip-sync` | lip-sync an existing clip |

### 1.3 Request bodies (verified fields)
**text2video**
```jsonc
{
  "model_name": "kling-v2-5-turbo",   // ⚠️ VERIFY exact slug per version
  "prompt": "...",
  "negative_prompt": "...",
  "cfg_scale": 0.5,                   // 0–1, prompt adherence
  "mode": "pro",                      // "std" | "pro"
  "duration": "5",                    // "5" | "10" (seconds)
  "aspect_ratio": "1:1",              // "16:9" | "9:16" | "1:1"
  "camera_control": { "type": "..." },// optional
  "callback_url": "https://..."       // optional webhook instead of polling
}
```
**image2video** (verified field set): `image` (URL or base64, **required**), `image_tail` (end frame, optional), `prompt`, `negative_prompt`, `cfg_scale`, `mode`, `duration` (+ `dynamic_masks`/`static_mask`/`camera_control` on newer versions — `⚠️ VERIFY`). For Brutal, `aspect_ratio` is typically inferred from the input image; still set it. `⚠️ VERIFY` whether aspect is passed or inherited on v2.5+.

### 1.4 Create → poll → download (verified response shape)
Create returns:
```jsonc
{ "code": 0, "message": "SUCCEED",
  "data": { "task_id": "xxx", "task_status": "submitted" } }  // submitted|processing|succeed|failed
```
Poll `GET /v1/videos/text2video/{task_id}`:
```jsonc
{ "data": {
    "task_status": "succeed",
    "task_status_msg": "",
    "task_result": { "videos": [ { "id": "...", "url": "https://...", "duration": "5" } ] } } }
```
Download the `url` (expires — persist to Supabase/R2 immediately). Poll ~every 3–5 s; typical 5 s clip completes in ~1–4 min. **Failed API tasks do not consume credits** (official) — good for retry loops.

### 1.5 Model versions & when to use (mid-2026)
| `model_name` (family) | Notes | Native audio | Use for |
|---|---|---|---|
| `kling-v1-6` / `v2-1` | legacy, cheap | no | throwaway b-roll |
| **`kling-v2-5-turbo`** | current cost/quality sweet spot, i2v strong | no | **Brutal default (t2v + i2v)** |
| `kling-v2-6` (std/pro) | better motion, optional audio | optional | premium motion |
| **`kling-v3` / `kling-3.0-omni`** (a.k.a. "O3") | multi-image **elements** for consistent faces; **voice binding** (upload ≥3 s voice → character speaks); native audio, multi-shot storyboard, 3–15 s | **yes** | **recurring persona / face consistency**; sound-on dialogue cut |

**Kling 3.0 Omni** (launched Feb 5 2026) is the face-consistency answer: build an **element** from multi-angle images (or a 3–8 s clip); the character's appearance stays locked across camera moves, and an optional ≥3 s voice sample binds a consistent voice. Muted-first Brutal usually discards the audio, but Omni's element system is the right tool when a named spokesperson/persona recurs across shots. Also reachable via `fal-ai/kling-video/v3/pro/text-to-video` and `.../o3/pro/...` as a fallback lane. `⚠️ VERIFY` exact official `model_name` string + whether elements are a separate endpoint or a param.

### 1.6 Pricing (indicative — `⚠️ VERIFY` at kling.ai/dev/pricing)
Prepaid API resource packages, separate from consumer plans. Official Kling 3.0: **~$0.084/s** (std, no video input) → **~$0.168/s** (pro w/ video input). Kling 2.6 Pro i2v via infra proxies ≈ **$0.07/s** (no audio) / **$0.14/s** (with audio). On fal, Kling 3 std t2v (audio off) ≈ **$0.168/s**, V3 Pro with voice ≈ **$0.392/s**. A 5 s pro clip ≈ **$0.35–$1.10** depending on version/audio. **Retries on failed tasks are free.**

---

## 2. Alternative video models (fallback lanes / benchmarking)

Reached via **Fal** (`FAL_KEY`) or **Replicate** — same async create→poll pattern behind our `VideoProvider`. Prices are indicative, `⚠️ VERIFY` before coding (this market re-prices monthly).

| Model (2026) | Access | i2v | Native audio | ~Price | Strength for LinkedIn muted-first |
|---|---|---|---|---|---|
| **Kling v2.5-turbo / 2.6** | Official + Fal/Replicate | ✅ | 2.6+ optional | ~$0.07–0.17/s | **Primary.** Cheap, strong motion, we mute it |
| **Kling 3.0 Omni** | Official + Fal | ✅ (elements) | ✅ | ~$0.17–0.39/s | **Face consistency** across shots; voice binding |
| **ByteDance Seedance 2.0** (1.0 Pro legacy) | Fal `bytedance/seedance-2.0`, Replicate | ✅ | ✅ (2.0) | 1.0 Pro 1080p·5 s ≈ $0.62; 2.0 10 s fast ≈ $2.42 / std ≈ $3.03 | Excellent prompt-adherence & multi-shot; great cheap b-roll. **Fast lane** |
| **Google Veo 3.1** (3.0 sunset **2026-06-30**) | Gemini API + Fal/Replicate | ✅ (image + up to 3 reference images) | **✅ best-in-class** | **$0.40/s** (std), **$0.15/s** (fast); 3.0 Full $0.75/s | **Only model to reach for when in-frame dialogue/SFX must be real.** 8 s cap, 720p/1080p/4k |
| **Runway Gen-4 / Gen-4 Turbo** (Aleph → **Aleph 2.0**; Gen-4 Aleph sunset **2026-07-30**) | Runway API (`$0.01/credit`) | ✅ | limited | Gen-4 Turbo **5 cr/s = $0.05/s**; Gen-4 **12 cr/s**; Aleph 15 cr/s | Clean realistic motion, precise camera; good premium i2v fallback |
| **Luma Ray2 / Ray2 Flash** | Luma API + Fal/Replicate | ✅ | no | Ray2 1080p·5 s ≈ $0.95; Flash 720p·5 s ≈ $0.60 | Fluid, cinematic; Flash is a cheap fast lane |
| **MiniMax / Hailuo** | Fal/Replicate + MiniMax API | ✅ | limited | ~$0.07/s (most output per $) | Cheapest volume b-roll; expressive motion |
| **Pika** | Pika API + Fal | ✅ | limited | ~$0.12–0.40/clip | Stylized effects/transitions; weak for sober register |

**Notes for the router policy table (`ProviderBus.video`):**
- Default lane = **Kling i2v** (respects Brutal's imagery-only rule: we animate a *composited* still, keeping brand text as vector layers in Remotion, **not** baked into the model).
- `face_consistency` lane → **Kling 3.0 Omni elements**; `dialogue_soundon` lane → **Veo 3.1**; `cheap_broll` lane → **Seedance 2.0 / Hailuo**; `premium_motion` lane → **Runway Gen-4 Turbo / Luma Ray2**.
- Every non-primary model is a swappable driver — **do not** hardcode; register by `id` and select via policy + manual override (CANON §6).

---

## 3. Talking-head / UGC avatar tools (LinkedIn "founder"/spokesperson ads)

Use when the ad *is* a person talking to camera (high-trust B2B LinkedIn format). These lip-sync a script; pair with **our** ElevenLabs VO for brand-consistent voice, or their built-in TTS.

| Tool | API | Model / flow | Cost (mid-2026) | Best for |
|---|---|---|---|---|
| **HeyGen** ⭐ | `X-Api-Key`; **v2** `POST /v2/video/generate` → poll `GET /v1/video_status.get?video_id=`. v1/v2 endpoints operational until **2026-10-31**; new **v3** wallet API (`GET /v3/users/me`) is USD-prepaid | avatar or `talking_photo` character + text/voice/audio | v3 wallet **$0.05/s** (Avatar IV/Photo), Digital Twin $0.0667/s; ≈ **$1–$3/min** | **Primary avatar.** API-first, brand avatars, DE support, lip-sync |
| **Creatify** | REST API | ad-native UGC avatars from a product URL/script | subscription + API | Performance-ad UGC at scale |
| **Arcads** | API (waitlisted historically) | library of realistic UGC actors | per-video/subscription | High-converting UGC ad style |
| **Synthesia** | API | corporate avatars, 140+ languages | enterprise seat + API | Polished corporate/explainer, strong localization |

**HeyGen v2 request skeleton (verified shape):**
```jsonc
POST https://api.heygen.com/v2/video/generate
Headers: { "X-Api-Key": "<key>", "Content-Type": "application/json" }
{
  "video_inputs": [{
    "character": { "type": "avatar", "avatar_id": "<id>", "avatar_style": "normal" },
    "voice":     { "type": "text", "input_text": "<script>", "voice_id": "<id>", "speed": 1.0 },
    "background":{ "type": "color", "value": "#0a0a0a" }
  }],
  "dimension": { "width": 1080, "height": 1080 },   // 1:1 for LinkedIn feed
  "title": "brutal-ad-...", "test": false
}
// → { "data": { "video_id": "..." } }
// Poll GET /v1/video_status.get?video_id=... → status: processing|completed|failed, video_url
```
`⚠️ VERIFY` field names against current v2 (or migrate to v3) docs before coding — HeyGen renamed several fields for v3. For DE, use `voice.type:"audio"` with an ElevenLabs-generated German track (`audio_url`) instead of HeyGen TTS to keep voice on-brand. **Recommendation ⚑:** wrap HeyGen behind a small `AvatarProvider` (not in CANON's contract set) or as a specialized `VideoProvider` with `params.kind:'avatar'`; talking-head is a distinct modality from generative clips.

---

## 4. ElevenLabs — audio (VO + SFX + music) (CANON-locked)

Env: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_*` (per language/persona). Auth header: **`xi-api-key`**.

### 4.1 TTS — Create Speech (verified)
```jsonc
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128
Headers: { "xi-api-key": "<key>", "Content-Type": "application/json" }
{
  "text": "Zwölfhundert Kanzleien vertrauen ...",   // DE: numbers PRE-SPELLED (see 4.4)
  "model_id": "eleven_multilingual_v2",             // default
  "language_code": "de",                            // ISO-639-1, enforces language
  "voice_settings": {
    "stability": 0.5, "similarity_boost": 0.75,
    "style": 0.0, "use_speaker_boost": true, "speed": 1.0
  },
  "seed": 12345,                                     // deterministic → reproducible VO
  "previous_text": "...", "next_text": "...",        // cross-chunk prosody continuity
  "apply_text_normalization": "auto"                 // "auto" | "on" | "off"
}
// → 200 audio/mpeg (binary). Persist to Supabase/R2, feed to Remotion <Audio>.
```
Also: `POST /v1/text-to-speech/{voice_id}/stream` (streaming) and `.../with-timestamps` → **character/word timestamps** (use these to auto-generate perfectly-aligned burned-in captions — see §5).

### 4.2 Model IDs (verified)
| `model_id` | Use |
|---|---|
| **`eleven_multilingual_v2`** | **default** — natural, emotionally-aware, multilingual (DE+EN). Brutal sober VO |
| `eleven_v3` | most expressive/emotional range; audio-tag control. Use for punchier sound-on cuts |
| `eleven_turbo_v2_5` / `eleven_flash_v2_5` | low-latency/cheap; fine for drafts | `⚠️ VERIFY` current low-latency slug |

### 4.3 SFX & Music (same key)
- **SFX:** `POST https://api.elevenlabs.io/v1/sound-generation` — `{ "text": "muted keyboard click, subtle whoosh", "duration_seconds": 2.0 }` → audio bytes. Cinematic one-shots for transitions/stingers.
- **Music:** `POST https://api.elevenlabs.io/v1/music/compose` (and `/compose-detailed`, `/create-composition-plan`) — prompt or composition plan (intro/verse/outro sections). Use a **low, sober bed** consistent with the documentary register; keep it muted-first (bed only matters on the sound-on variant). `⚠️ VERIFY` endpoints + commercial-license terms of generated music for paid ads.

### 4.4 ⚠️ CRITICAL DE caveat — number & symbol spelling
ElevenLabs frequently mispronounces **numbers, dates, currency, acronyms** in German (renders "12" as English "twelve" or defaults to another language). **Documented fix:** spell every number/date/symbol out in words in the target language *before* sending. This is exactly CANON §7's `LocalizationAgent` rule ("TTS-safe number spelling, e.g. 'zwölfhundert'"). **Build rule:** the `LocalizationAgent` must emit TTS-normalized strings (numbers → German words, "%" → "Prozent", "€1.200" → "eintausendzweihundert Euro") for the VO track, while the *on-screen* caption/text layer keeps the numeral for legibility. Optionally set `apply_text_normalization:"on"`, but **do not rely on it for DE** — pre-spell. `⚠️ VERIFY` current normalization behavior.

---

## 5. Remotion — assembly + burned-in subtitles + render (CANON-locked)

Lives in `packages/render` (Remotion project). Composition spec is the canonical `AdDocument.type='video'` payload (CANON §5): layer/subtitle/audio tracks + a Remotion composition id.

### 5.1 Composition building blocks
- **`<OffthreadVideo src={clipUrl} />`** — embed generated Kling/Seedance/etc. clips. v4+ uses the FFmpeg C API (≈2× faster) with a frame cache (`offthreadVideoCacheSizeInBytes`, default ½ system RAM). Preferred over `<Video>` for rendering.
- **`<Audio src={voUrl} />`** — the ElevenLabs VO (primary), plus a low `<Audio volume={0.15}>` music bed and SFX one-shots; Remotion mixes them at render.
- **Brand cards / lower-thirds / CTA / logo / legal** — **React/HTML+CSS layers**, driven by the layer tree and the Brand Kit (Playfair Display + Inter, gold `#cba65e` / lime `#b6e64a`). This is the CANON load-bearing rule applied to video: **text is a composited vector/text layer, never baked into the model output.**
- **Burned-in captions (muted-first, the story-carrier):**
  - Package **`@remotion/captions`**: `parseSrt()` → `Caption[]`; **`createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds })`** → paged/word-highlight captions. Native subtitle support since **v4.0.216**.
  - Best source of timing = ElevenLabs **`with-timestamps`** (word-level) → build `Caption[]` directly (no Whisper needed). Fallback: `@remotion/install-whisper-cpp` `convertToCaptions()`.
  - Render captions as an always-on styled layer (high-contrast, safe-zone aware) → **burned into pixels** because LinkedIn autoplays **muted**. (Remotion's own guidance: square feed videos for X/LinkedIn should burn subtitles in.)

### 5.2 Render — local (default) and Lambda (scale)
**Local (Node)** — `packages/render`:
```ts
import { renderMedia, selectComposition } from '@remotion/renderer';
const comp = await selectComposition({ serveUrl, id: 'BrutalAd', inputProps });
await renderMedia({
  composition: comp, serveUrl, codec: 'h264',
  outputLocation: `out/${variantId}.mp4`, inputProps,
  // ≤200 MB control: crf, x264 preset, pixel format
  crf: 23, // ↑ crf = smaller file; tune to hit ≤200 MB
});
```
**Lambda (parallel/scale)** — `@remotion/lambda`:
```ts
import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda/client';
const { bucketName, renderId } = await renderMediaOnLambda({
  region: 'us-east-1', functionName: 'remotion-render-xxxx',
  serveUrl: 'https://<site>.s3.<region>.amazonaws.com/sites/<hash>',
  composition: 'BrutalAd', codec: 'h264', inputProps,
  // outName / outputBucket optional; default → renders/{renderId}/out.mp4
});
// poll getRenderProgress({ renderId, bucketName, functionName, region }) → { done, outputFile }
```
Default Lambda: **2048 MB RAM, 10 GB disk** (Remotion 5.0+). Distributes frames across many Lambdas; you pay only while rendering.

### 5.3 Cost & licensing (verified)
- **Render cost is tiny:** 1-min local-source video ≈ **$0.017**; 10-min HD remote ≈ **$0.10**; 10 s 4K ≈ **$0.013** (warm Lambda) + S3 egress/storage/CloudWatch.
- **⚠️ LICENSE — Remotion Company License required for teams of 4+.** Remotion is source-available with a **company license** obligation once your company has **4+ people** (or is funded past a threshold). Brutal Ads is a commercial multi-tenant product → **BUDGET FOR A REMOTION COMPANY LICENSE.** `⚠️ VERIFY` current thresholds/pricing at remotion.pro before shipping commercially. This is the single most important non-API commitment in this stack.

---

## 6. End-to-end video pipeline (generate → VO → assemble → render → spec-check)

```
Brief (video)                                     [agents: Strategist→Copywriter→ArtDirector]
  │  storyboard: N shots, first 3 s = stopping power (CANON §8)
  ▼
1) LocalizationAgent  → DE/EN script + TTS-normalized VO strings (numbers pre-spelled, §4.4)
                        + on-screen caption strings (numerals kept, for legibility)
  ▼
2) VideoProvider (ProviderBus.video, per §0 policy)
     • default: Kling i2v on the COMPOSITED still  (imagery only; brand text stays as layers)
     • face-recurring: Kling 3.0 Omni elements
     • dialogue sound-on: Veo 3.1
     create → poll → download clips → persist to Supabase/R2
  ▼
3) AudioProvider (ElevenLabs)
     • VO: /v1/text-to-speech/{voice_id}  (multilingual_v2, seed, with-timestamps)
     • optional: SFX (/v1/sound-generation) + music bed (/v1/music/compose)
  ▼
4) Captions:  ElevenLabs word-timestamps → Caption[]  → createTikTokStyleCaptions()
  ▼
5) Remotion assembly (packages/render):
     <OffthreadVideo> clips + <Audio> VO/bed/SFX + brand cards/CTA/logo/legal layers
     + burned-in caption layer (muted-first) ; ratios 1:1 / 4:5 / 16:9 via smart re-layout
  ▼
6) Render:  renderMedia (local) OR renderMediaOnLambda (scale)  → MP4 (h264)
  ▼
7) Spec-check (exporter gate, CANON §8):
     ✓ ratio ∈ {1:1, 4:5, 16:9}   ✓ file ≤ 200 MB (tune crf/preset/bitrate if over)
     ✓ burned-in subs present & legible in safe zones   ✓ muted-first (plays without audio)
     ✓ first-3-s stopping power   ✓ BrandGuardian pass (palette/voice/disclaimer/localization)
  ▼
8) EngagementAnalyst → EngagementPredictor.score(VideoRef): firstThreeSeconds, stoppingPower,
     predictedCtrBand{low,high,confidence}  (bands + confidence; commercial saliency path,
     TRIBE v2 flag-gated R&D only — CANON §9)  → human-approve gate → ship
```

**Hitting ≤200 MB (client's proven paid limit):** short (≤~15–30 s) + h264 + tune `crf` (↑ = smaller) / x264 `preset` / target bitrate. A 1:1 or 4:5 15 s clip at sane bitrate is well under 200 MB. Add an explicit `probeFileSize()` step; if over, re-encode at higher crf before marking the `Render` complete.

**Lineage (CANON §5):** every video `Variant` records `provider, model, model_version, seed, prompt, negative_prompt` for **each clip**, plus the VO `voice_id`/`model_id`/`seed`, and the Remotion `composition` id + input-props hash. Cache key `(provider, model, version, prompt, seed, params)` per CANON §4.

---

## 7. Provider policy table (drop-in for `ProviderBus.video` / `.audio`)

```ts
// job.kind → ranked driver ids (router picks first available; manual override always wins)
const VIDEO_POLICY = {
  broll_t2v:        ['kling-v2.5-turbo', 'seedance-2.0', 'veo-3.1-fast'],
  animate_still_i2v:['kling-i2v-v2.5',   'seedance-2.0-i2v', 'runway-gen4-turbo'],
  face_consistency: ['kling-3.0-omni',   'veo-3.1'],           // elements/reference imgs
  dialogue_soundon: ['veo-3.1',          'kling-3.0-omni'],    // real in-frame audio
  premium_motion:   ['runway-gen4-turbo','luma-ray2', 'kling-v2.6-pro'],
  cheap_volume:     ['hailuo-minimax',   'seedance-2.0', 'luma-ray2-flash'],
  avatar_ugc:       ['heygen',           'creatify', 'arcads'], // AvatarProvider lane
} as const;

const AUDIO_POLICY = {
  voiceover: ['elevenlabs:eleven_multilingual_v2', 'elevenlabs:eleven_v3'],
  sfx:       ['elevenlabs:sound-generation'],
  music:     ['elevenlabs:music-compose'],
} as const;
```
All drivers implement CANON's `VideoProvider` / `AudioProvider`; each is registered by `id` and selected via policy + fallback (CANON §6). **⚑ RECOMMENDATION:** add an **`avatar_ugc`** lane and a thin `AvatarProvider` shape (or `VideoProvider` with `params.kind:'avatar'`) — talking-head UGC (HeyGen/Creatify/Arcads) is a distinct job type not currently enumerated in CANON's contracts, and it is a strong LinkedIn B2B format worth first-classing.

---

## 8. "VERIFY before coding" checklist (do these first)
1. **Kling host + model slugs** — confirm the client's key targets `api.klingai.com` (vs a region host vs a proxy); confirm exact `model_name` strings for v2.5-turbo / v2.6 / v3 / 3.0-omni, and whether i2v takes `aspect_ratio` or inherits it.
2. **Kling 3.0 Omni "elements"** — is multi-image element/voice-binding a separate endpoint or params on image2video? Confirm on official docs.
3. **Kling pricing** — current per-second rates at kling.ai/dev/pricing (moves often).
4. **Veo 3.1** — `veo-3.0-*` sunset **2026-06-30**; use `veo-3.1-generate-preview` / `-fast-` / `-lite-` via `:predictLongRunning`; confirm 8 s cap, resolutions, `personGeneration` region rules, per-second price.
5. **Runway** — Gen-4 Aleph sunsets **2026-07-30** → Aleph 2.0; confirm Gen-4 Turbo credit rate ($0.01/credit).
6. **Seedance** — 2.0 is current (1.0 Pro legacy); confirm Fal/Replicate slug + per-token/second price.
7. **HeyGen** — v1/v2 operational until **2026-10-31**; decide v2 now vs v3 wallet API; confirm exact `/v2/video/generate` field names + polling response.
8. **ElevenLabs** — confirm `eleven_multilingual_v2` still default; confirm `with-timestamps` endpoint shape; **DE number pre-spelling is mandatory**; verify Music API **commercial license** for paid ads.
9. **Remotion** — **Company License** required (4+ people / funded); confirm captions API (`@remotion/captions`, `createTikTokStyleCaptions`, native subs since v4.0.216); confirm Lambda region/memory + IAM setup.
10. **≤200 MB** — validate the crf/preset that keeps 1:1 & 4:5 & 16:9 clips under limit; add automated `probeFileSize` gate.

---

## Sources
- Kling Open Platform — Authentication (JWT HS256): https://kling.ai/document-api/api/get-started/authentication
- Kling API reference / endpoints & task flow: https://starpop.ai/blog/articles/kling-ai-documentation · https://klingapi.com/docs · https://www.segmind.com/models/kling-image2video/api
- Kling 3.0 Omni (elements, voice binding, native audio): https://kling.ai/quickstart/klingai-video-3-omni-model-user-guide · https://fal.ai/kling-3 · https://wavespeed.ai/blog/posts/kling-3-0-omni-explained/
- Kling pricing / API service: https://kling.ai/dev/pricing · https://www.eesel.ai/blog/kling-ai-pricing
- Veo 3.1 API + pricing: https://ai.google.dev/gemini-api/docs/veo · https://ai.google.dev/gemini-api/docs/video · https://ai.google.dev/gemini-api/docs/pricing · https://www.veo3ai.io/blog/veo-3-api-pricing-2026
- Seedance (Fal): https://fal.ai/models/fal-ai/bytedance/seedance/v1/pro/image-to-video · https://fal.ai/seedance-2.0 · https://www.atlascloud.ai/blog/case-studies/seedance-2.0-pricing-full-cost-breakdown-2026
- Runway API pricing: https://docs.dev.runwayml.com/guides/pricing/ · https://kie.ai/runway-api
- Luma / MiniMax / Pika pricing: https://www.eesel.ai/blog/luma-ai-pricing · https://aifreeforever.com/blog/best-ai-video-generation-models-pricing-benchmarks-api-access
- HeyGen API (v2/v3): https://docs.heygen.com/reference/create-an-avatar-video-v2 · https://developers.heygen.com/docs/pricing · https://help.heygen.com/en/articles/10060327-heygen-api-pricing-explained · https://github.com/tryAGI/HeyGen/blob/main/heygen.yaml
- ElevenLabs TTS/SFX/Music: https://elevenlabs.io/docs/api-reference/text-to-speech/convert · https://elevenlabs.io/docs/overview/models · https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert · https://elevenlabs.io/docs/api-reference/music/compose
- ElevenLabs DE number caveat: https://help.elevenlabs.io/hc/en-us/articles/14888917355409-Why-are-numbers-dates-symbols-and-acronyms-not-properly-pronounced-or-spoken-in-the-correct-language · https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
- Remotion render / Lambda / captions / cost / license: https://www.remotion.dev/docs/renderer/render-media · https://www.remotion.dev/docs/lambda/rendermediaonlambda · https://www.remotion.dev/docs/captions/api · https://www.remotion.dev/docs/captions/create-tiktok-style-captions · https://www.remotion.dev/docs/lambda/cost-example
