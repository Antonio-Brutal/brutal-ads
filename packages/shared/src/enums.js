import { z } from 'zod';
// Canonical enums (CANON §5, docs/03). These are the single source; the DB enums mirror them.
export const Format = z.enum(['1:1', '1.91:1', '4:5', '16:9', '9:16']);
export const AdDocumentType = z.enum(['single_image', 'carousel', 'video']);
export const AdDocumentStatus = z.enum(['draft', 'in_review', 'approved', 'archived']);
export const LayerType = z.enum(['image', 'text', 'logo', 'shape', 'cta', 'frame', 'legal', 'group', 'smart']);
// docs/03 §0.3 + CANON §12 L3 — the reconciled superset.
export const JobStatus = z.enum([
    'queued', 'dispatched', 'running', 'succeeded', 'failed', 'dead', 'cancelled', 'cached',
]);
// CANON §12 L3 — PDF-only document ads; PPTX is NOT a native render output.
export const RenderKind = z.enum(['png', 'jpg', 'pdf', 'svg']);
// CANON §12 L3 — agent run status includes budget_exceeded (never 'capped').
export const AgentRunStatus = z.enum([
    'queued', 'running', 'succeeded', 'failed', 'budget_exceeded',
]);
export const EngagementBackend = z.enum(['saliency', 'tribe_research']);
export const WorkspaceRole = z.enum(['owner', 'admin', 'editor', 'viewer']);
export const Locale = z.enum(['de', 'en']);
