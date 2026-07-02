import type { BrandKitDataT, LayerPatchOpT, LayerTreeT } from '@brutal/shared';

// ─────────────────────────────────────────────────────────────────────────────
// docs/05 BrandGuardian — MECHANICAL-first (pure code, no LLM for v1 checks):
// banned terms, palette membership, required disclaimers, headline char limit.
// Returns violations + safe autoFix ops (valid LayerPatchOp[]).
// ─────────────────────────────────────────────────────────────────────────────

export interface GuardianViolation {
  rule: 'banned_term' | 'off_palette' | 'missing_disclaimer' | 'headline_too_long';
  layerId?: string;
  detail: string;
  severity: 'error' | 'warn';
}

export interface GuardianResult {
  pass: boolean;
  violations: GuardianViolation[];
  autoFixes: LayerPatchOpT[];
}

type AnyLayer = Record<string, any> & { id: string; type: string };

function* walk(layers: AnyLayer[]): Generator<AnyLayer> {
  for (const l of layers) {
    yield l;
    if (l.type === 'group' && Array.isArray(l.children)) yield* walk(l.children);
  }
}

const nearestAllowed = (hex: string, allowed: string[]): string => allowed[0] ?? hex;

export function runBrandGuardian(tree: LayerTreeT, kit: BrandKitDataT): GuardianResult {
  const violations: GuardianViolation[] = [];
  const autoFixes: LayerPatchOpT[] = [];
  const allowed = new Set(kit.palette.allowed.map((c) => c.toLowerCase()));
  const banned = kit.voice.bannedTerms.map((t) => t.toLowerCase());
  const layers = [...walk(tree.layers as AnyLayer[])];

  for (const l of layers) {
    // banned terms across every text-bearing layer
    const text: string | undefined = l.text ?? (l.type === 'smart' ? l.template : undefined);
    if (typeof text === 'string') {
      for (const term of banned) {
        if (text.toLowerCase().includes(term)) {
          violations.push({ rule: 'banned_term', layerId: l.id, severity: 'error',
            detail: `'${term}' in ${l.id}: "${text.slice(0, 60)}"` });
        }
      }
    }
    // headline limit (CANON §8): ≤70 chars
    if (l.id === 'ly_headline' && typeof l.text === 'string' && l.text.length > 70) {
      violations.push({ rule: 'headline_too_long', layerId: l.id, severity: 'error',
        detail: `${l.text.length} chars (max 70)` });
    }
    // palette membership for vector fills/colors (imagery exempt)
    for (const prop of ['color', 'fill', 'textColor'] as const) {
      const v = l[prop];
      if (typeof v === 'string' && v.startsWith('#') && !allowed.has(v.toLowerCase())) {
        violations.push({ rule: 'off_palette', layerId: l.id, severity: 'warn',
          detail: `${prop}=${v} not in BrandKit palette` });
        autoFixes.push(prop === 'color' || prop === 'textColor'
          ? { op: 'setFill', layerId: l.id, fill: nearestAllowed(v, kit.palette.allowed) }
          : { op: 'setFill', layerId: l.id, fill: nearestAllowed(v, kit.palette.allowed) });
      }
    }
  }

  // required disclaimers must appear as legal layers (provenance via requiredBy).
  // Union of the explicit L7 list and inline `required: true` flags (docs/03 §7.1).
  const requiredKeys = new Set([
    ...kit.requiredDisclaimers,
    ...Object.entries(kit.disclaimers).filter(([, d]) => d.required).map(([k]) => k),
  ]);
  const present = new Set(layers.filter((l) => l.type === 'legal').map((l) => l.requiredBy));
  for (const key of requiredKeys) {
    if (!present.has(key)) {
      violations.push({ rule: 'missing_disclaimer', severity: 'error', detail: `required disclaimer '${key}' has no legal layer` });
    }
  }

  return { pass: !violations.some((v) => v.severity === 'error'), violations, autoFixes };
}
