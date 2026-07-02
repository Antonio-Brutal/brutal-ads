// German-market fixture outputs for MockLlmProvider (keyed by agent name).
// Realistic, schema-valid, and on-brand (sober/documentary — no hype terms).

export const STUDIO_FIXTURES: Record<string, unknown> = {
  IntakeAgent: {
    audience: 'Managing Partner deutschsprachiger Kanzleien (10–100 Anwälte)',
    vertical: 'legal_ai_de',
    offer: 'KI, die deutsche Verträge in Minuten entwirft',
    proofPoints: ['1.200 Kanzleien', '40% schnelleres Entwerfen'],
    mandatoryLegal: ['legal_ai_de'],
    languages: ['de'],
    constraints: { mustInclude: [], mustAvoid: [] },
    clarifyingQuestions: [],
  },
  Strategist: {
    angle: 'Spezifik statt Hype: die exakte Zeitersparnis benennen',
    jtbd: 'Einen konformen deutschen Vertrag ohne Associate-Nachtschicht entwerfen',
    positioning: 'das nüchterne Werkzeug für Kanzleien, die KI-Hype misstrauen',
    keyMessage: '1.200 Kanzleien entwerfen 40% schneller — ohne Risiko',
    proofToLead: '40% schnelleres Entwerfen',
    recommendedType: 'single_image',
    recommendedVariantCount: 4,
  },
  Copywriter: {
    variants: [
      { hook: 'Managing Partner: Ihre Associates verbringen 60% der Zeit mit Entwürfen.',
        headline: 'Verträge entwerfen — 40% schneller.', cta: 'Demo buchen', kicker: '1.200 Kanzleien vertrauen Brutal' },
      { hook: 'Kanzleien, die KI-Hype misstrauen, nutzen trotzdem Brutal. Aus gutem Grund.',
        headline: 'Nüchtern. Präzise. Belegbar.', cta: 'Beleg ansehen', kicker: '40% schnelleres Entwerfen' },
      { hook: 'Der erste Entwurf entscheidet über die Nacht. Nicht mehr.',
        headline: 'Der erste Entwurf in Minuten.', cta: 'Jetzt testen', kicker: 'Für deutsche Kanzleien gebaut' },
      { hook: 'Was 1.200 Kanzleien anders machen als Ihre.',
        headline: '1.200 Kanzleien. Ein Werkzeug.', cta: 'Demo buchen', kicker: 'DSGVO-konform, EU-gehostet' },
    ],
  },
  ArtDirector: {
    directions: [
      { prompt: 'documentary photograph, senior lawyer at a dark oak desk reviewing paper contracts, moody window light, muted palette, high contrast',
        negativePrompt: 'no text, no watermark, no logo, no captions, no lower-thirds', jobKind: 'photoreal_bg' },
      { prompt: 'minimal still life, fountain pen resting on thick stacked legal documents, dark background, single warm highlight',
        negativePrompt: 'no text, no watermark, no logo, no captions, no lower-thirds', jobKind: 'photoreal_bg' },
      { prompt: 'architectural detail of a law firm library, dark wood shelves, shallow depth of field, documentary mood',
        negativePrompt: 'no text, no watermark, no logo, no captions, no lower-thirds', jobKind: 'photoreal_bg' },
      { prompt: 'abstract dark paper texture with a single gold seam of light, editorial, restrained',
        negativePrompt: 'no text, no watermark, no logo, no captions, no lower-thirds', jobKind: 'design_bg' },
    ],
  },
  EditorAgent: {
    id: 'lp_mock_1',
    variantId: '5bb54b3e-6c8f-4f2e-9a0e-9d1f2a3b4c5d',
    origin: 'chat',
    createdBy: 'agent',
    note: 'make the headline gold and shorter',
    ops: [
      { op: 'setText', layerId: 'ly_headline', text: 'Kürzer. Präziser.' },
      { op: 'setFill', layerId: 'ly_headline', fill: '#cba65e' },
    ],
  },
  LocalizationAgent: {
    locale: 'en',
    variants: [
      { hook: 'Managing partners: your associates spend 60% of their time on first drafts.',
        headline: 'Draft contracts — 40% faster.', cta: 'Book a demo', kicker: '1,200 firms trust Brutal' },
    ],
  },
  CarouselArchitect: {
    slides: [
      { role: 'hook',
        copy: { hook: 'Managing Partner: Ihre Associates verbringen 60% der Zeit mit Entwürfen.',
          headline: 'Die Nachtschicht vor jedem Vertrag.', cta: 'Weiter', kicker: 'Eine Zahl, die jede Kanzlei kennt' } },
      { role: 'reframe',
        copy: { hook: 'Das Problem ist nicht das Team. Es ist der erste Entwurf.',
          headline: 'Der erste Entwurf frisst die Marge.', cta: 'Weiter', kicker: '60% der Zeit: nicht abrechenbar' } },
      { role: 'reframe',
        copy: { hook: 'KI-Hype hilft niemandem. Ein nüchternes Werkzeug schon.',
          headline: 'Kein Hype. Ein Werkzeug.', cta: 'Weiter', kicker: 'Gebaut für deutsche Kanzleien' } },
      { role: 'proof',
        copy: { hook: '1.200 Kanzleien entwerfen heute 40% schneller.',
          headline: '40% schneller. Belegt.', cta: 'Beleg ansehen', kicker: '1.200 Kanzleien, DSGVO-konform' } },
      { role: 'close',
        copy: { hook: 'Der nächste Vertrag kann der erste ohne Nachtschicht sein.',
          headline: 'Der erste Entwurf in Minuten.', cta: 'Demo buchen', kicker: 'EU-gehostet, sofort startklar' } },
    ],
    continuityNote: 'Eskalationsbogen um die eine Zahl (60% → 40%): jede Slide verengt vom Schmerz zur belegten Lösung; gleiches Bildmotiv, wechselnde Ausschnitte.',
  },
};
