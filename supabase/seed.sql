-- Brutal Ads seed — docs/03 §7.2 (Brutal workspace + brand kit v1) + local dev user.
-- Applied by `supabase db reset`. Idempotent (on conflict do nothing).

-- Seed the first/seed tenant (Brutal AI — CANON §0/§1) and its v1 brand kit.
insert into workspace (id, name, slug, default_locale)
values ('00000000-0000-0000-0000-000000000001','Brutal AI','brutal','de')
on conflict (id) do nothing;

-- Local dev user antonio@brutal.ai (owner of the seed workspace). Password is for LOCAL dev only.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, email_change, email_change_token_new, recovery_token)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1',
        'authenticated', 'authenticated', 'antonio@brutal.ai',
        crypt('brutal-local-dev', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into workspace_member (workspace_id, user_id, role)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner')
on conflict (workspace_id, user_id) do nothing;

-- L10: `acidLime` #c9ff2e below is a PLACEHOLDER app-chrome hex, NOT gate-load-bearing.
-- Brand-gate tests MUST NOT hard-assert this exact hex; confirm the real value with Antonio.
insert into brand_kit (workspace_id, version, name, is_active, created_by_kind, data)
values (
  '00000000-0000-0000-0000-000000000001', 1, 'Brutal Seed Kit', true, 'system',
  $${
    "palette": {
      "background": "#0a0a0a", "surface": "#141414", "text": "#f5f5f0", "muted": "#9a9a92",
      "accents": { "gold": "#cba65e", "lime": "#b6e64a", "acidLime": "#c9ff2e" },
      "allowed": ["#0a0a0a","#141414","#f5f5f0","#9a9a92","#cba65e","#b6e64a","#c9ff2e"],
      "sets": { "pe": ["#cba65e","#b6e64a"] }
    },
    "typography": {
      "display": { "family": "Playfair Display", "weights": [400,700,900], "source": "google" },
      "body":    { "family": "Inter", "weights": [400,500,600,700], "source": "google" },
      "scale":   { "headline": 72, "subhead": 40, "body": 28, "legal": 18, "cta": 32 }
    },
    "logos": [
      { "id": "wordmark", "lockup": "wordmark", "assetId": null, "minWidthPx": 160 },
      { "id": "symbol",   "lockup": "symbol",   "assetId": null, "minWidthPx": 48 }
    ],
    "voice": {
      "register": "sober, editorial, documentary — NOT hype AI",
      "person": "third",
      "bannedTerms": ["revolutionary","game-changer","10x","AI-powered magic","disrupt","unleash","supercharge"],
      "preferSpecificityOverCleverness": true
    },
    "disclaimers": {
      "legal_ai_de": { "de": "Rechtlicher Hinweis: Ergebnisse ersetzen keine anwaltliche Beratung.",
                       "en": "Legal notice: outputs do not constitute legal advice.", "required": true },
      "pe": { "de": "Kapitalanlagen bergen Risiken.", "en": "Investments carry risk.", "required": false }
    },
    "localization": { "locales": ["de","en"], "default": "de", "transcreate": true, "ttsNumberSpelling": true },
    "imagery": {
      "mood": "muted-first, documentary, dark palette, high-contrast subject",
      "negativePromptDefaults": "no text, no watermark, no logo, no captions, no lower-thirds",
      "aspectDefaults": { "single_image": "1:1", "carousel": "1:1", "video": "1:1" }
    },
    "safeZoneDefaults": { "profileOverlap": { "top": 0.12, "left": 0.0 }, "seeMoreFold": 0.85 }
  }$$::jsonb
)
on conflict (workspace_id, version) do nothing;
