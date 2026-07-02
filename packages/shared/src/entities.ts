import { z } from 'zod';
import {
  ActorKind, AdDocumentType, AdRatio, AgentName, AgentRunStatus, AssetKind, EngagementBackend,
  ExperimentStatus, JobStatus, LocaleCode, MemberRole, Modality, RenderKind, RenderStatus, VariantStatus,
} from './enums';
import { BrandKitData } from './brand-kit';
import { BriefNormalized, Strategy } from './brief';
import { EngagementScores } from './engagement';
import { LayerTree } from './layer-tree';
import { VideoComposition } from './video';

// docs/03 §12.5 — row schemas, 1:1 camelCase mirrors of the DDL (§2–§5).
// Timestamps are ISO strings at the app boundary. Zod is authoritative over generated DB types.

const uuid = z.string().uuid();
const ts = z.string();

export const Workspace = z.object({
  id: uuid, name: z.string(), slug: z.string(), defaultLocale: LocaleCode,
  spendCapUsdMonthly: z.number(), spendUsedUsdMonthly: z.number(),
  spendCapUsdPerBrief: z.number(),                                   // L8
  settings: z.record(z.string(), z.unknown()),
  createdAt: ts, updatedAt: ts, deletedAt: ts.nullable(),
});

export const WorkspaceMember = z.object({
  id: uuid, workspaceId: uuid, userId: uuid, role: MemberRole,
  invitedBy: uuid.nullable(), createdAt: ts, updatedAt: ts,
});

export const BrandKit = z.object({
  id: uuid, workspaceId: uuid, version: z.number().int(), name: z.string(),
  isActive: z.boolean(), data: BrandKitData,
  createdBy: uuid.nullable(), createdByKind: ActorKind, createdAt: ts, updatedAt: ts,
});

export const Campaign = z.object({
  id: uuid, workspaceId: uuid, name: z.string(), objective: z.string().nullable(),
  status: z.string(), createdBy: uuid.nullable(), createdByKind: ActorKind,
  createdAt: ts, updatedAt: ts, deletedAt: ts.nullable(),
});

export const Brief = z.object({
  id: uuid, workspaceId: uuid, campaignId: uuid,
  rawInput: z.string(),
  normalized: BriefNormalized.partial().or(z.record(z.string(), z.unknown())),   // {} until IntakeAgent runs
  strategy: Strategy.partial().or(z.record(z.string(), z.unknown())),            // {} until Strategist runs
  targetLocale: LocaleCode, targetType: AdDocumentType,
  brandKitId: uuid.nullable(),
  createdBy: uuid.nullable(), createdByKind: ActorKind,
  createdAt: ts, updatedAt: ts, deletedAt: ts.nullable(),
});

export const AdDocument = z.object({
  id: uuid, workspaceId: uuid, briefId: uuid, type: AdDocumentType,
  title: z.string(), baseRatio: AdRatio,
  createdBy: uuid.nullable(), createdByKind: ActorKind,
  createdAt: ts, updatedAt: ts, deletedAt: ts.nullable(),
});

export const Variant = z.object({
  id: uuid, workspaceId: uuid, adDocumentId: uuid,
  layerTree: LayerTree.nullable(),
  videoComposition: VideoComposition.nullable(),
  status: VariantStatus, locale: LocaleCode, ratio: AdRatio,
  // lineage (CANON §5) —
  briefId: uuid, brandKitVersion: z.number().int(),
  provider: z.string().nullable(), model: z.string().nullable(), modelVersion: z.string().nullable(),
  seed: z.number().int().nullable(), prompt: z.string().nullable(), negativePrompt: z.string().nullable(),
  parentVariantId: uuid.nullable(),
  createdBy: uuid.nullable(), createdByKind: ActorKind, createdByAgent: AgentName.nullable(),
  engagement: EngagementScores,
  createdAt: ts, updatedAt: ts, deletedAt: ts.nullable(),
});

export const Slide = z.object({
  id: uuid, workspaceId: uuid, variantId: uuid,
  position: z.number().int(), role: z.string().nullable(),
  layerTree: LayerTree,
  createdAt: ts, updatedAt: ts,
});

export const Asset = z.object({
  id: uuid, workspaceId: uuid, kind: AssetKind,
  storageBucket: z.string(), storagePath: z.string(), mimeType: z.string(),
  width: z.number().int().nullable(), height: z.number().int().nullable(),
  durationMs: z.number().int().nullable(), bytes: z.number().nullable(),
  cacheKey: z.string().nullable(), provider: z.string().nullable(), model: z.string().nullable(),
  meta: z.record(z.string(), z.unknown()),
  createdBy: uuid.nullable(), createdByKind: ActorKind,
  createdAt: ts, updatedAt: ts, deletedAt: ts.nullable(),
});

export const Render = z.object({
  id: uuid, workspaceId: uuid, variantId: uuid,
  kind: RenderKind, ratio: AdRatio, status: RenderStatus,
  assetId: uuid.nullable(),
  width: z.number().int().nullable(), height: z.number().int().nullable(), bytes: z.number().nullable(),
  renderHash: z.string().nullable(), error: z.string().nullable(),
  createdAt: ts, updatedAt: ts,
});

export const GenerationJob = z.object({
  id: uuid, workspaceId: uuid, variantId: uuid.nullable(), briefId: uuid.nullable(),
  modality: Modality, jobKind: z.string(), status: JobStatus,
  provider: z.string().nullable(), model: z.string().nullable(), modelVersion: z.string().nullable(),
  spec: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()).nullable(),
  cacheKey: z.string().nullable(), cacheHit: z.boolean(),
  assetId: uuid.nullable(), progress: z.number(), attempts: z.number().int(),
  providerTaskId: z.string().nullable(), costUsd: z.number(), error: z.string().nullable(),
  moderation: z.record(z.string(), z.unknown()).nullable(),
  queuedAt: ts, startedAt: ts.nullable(), finishedAt: ts.nullable(),
});

export const AgentRun = z.object({
  id: uuid, workspaceId: uuid, briefId: uuid.nullable(), variantId: uuid.nullable(),
  agent: AgentName, status: AgentRunStatus, model: z.string(),
  input: z.record(z.string(), z.unknown()),
  output: z.record(z.string(), z.unknown()).nullable(),
  inputTokens: z.number().int(), outputTokens: z.number().int(),
  latencyMs: z.number().int().nullable(), costUsd: z.number(),
  iterateRound: z.number().int(),                                   // bounded auto-iterate ≤2 (CANON §7)
  parentRunId: uuid.nullable(), error: z.string().nullable(),
  createdAt: ts, finishedAt: ts.nullable(),
});

export const Experiment = z.object({
  id: uuid, workspaceId: uuid, campaignId: uuid.nullable(),
  name: z.string(), hypothesis: z.string().nullable(), status: ExperimentStatus,
  primaryMetric: z.string(), createdBy: uuid.nullable(),
  createdAt: ts, updatedAt: ts, deletedAt: ts.nullable(),
});

export const ExperimentArm = z.object({
  id: uuid, workspaceId: uuid, experimentId: uuid, variantId: uuid,
  label: z.string(), linkedinCreativeUrn: z.string().nullable(), createdAt: ts,
});

export const Result = z.object({
  id: uuid, workspaceId: uuid, experimentArmId: uuid,
  measuredAt: ts, impressions: z.number(), clicks: z.number(),
  ctr: z.number().nullable(), spendUsd: z.number().nullable(), cpcUsd: z.number().nullable(),
  conversions: z.number().nullable(), cvr: z.number().nullable(),
  source: z.string(), raw: z.record(z.string(), z.unknown()), createdAt: ts,
});

export const AuditLog = z.object({
  id: uuid, workspaceId: uuid, actorId: uuid.nullable(), actorKind: ActorKind,
  action: z.string(), targetTable: z.string().nullable(), targetId: uuid.nullable(),
  commercialUse: z.boolean(),                                       // R4 §6: TRIBE artifacts stamped false
  costUsd: z.number(), detail: z.record(z.string(), z.unknown()), createdAt: ts,
});

export type WorkspaceT = z.infer<typeof Workspace>;
export type WorkspaceMemberT = z.infer<typeof WorkspaceMember>;
export type BrandKitT = z.infer<typeof BrandKit>;
export type CampaignT = z.infer<typeof Campaign>;
export type BriefT = z.infer<typeof Brief>;
export type AdDocumentT = z.infer<typeof AdDocument>;
export type VariantT = z.infer<typeof Variant>;
export type SlideT = z.infer<typeof Slide>;
export type AssetT = z.infer<typeof Asset>;
export type RenderT = z.infer<typeof Render>;
export type GenerationJobT = z.infer<typeof GenerationJob>;
export type AgentRunT = z.infer<typeof AgentRun>;
export type ExperimentT = z.infer<typeof Experiment>;
export type ExperimentArmT = z.infer<typeof ExperimentArm>;
export type ResultT = z.infer<typeof Result>;
export type AuditLogT = z.infer<typeof AuditLog>;
