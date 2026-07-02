import { z } from 'zod';

// docs/03 §12.1 — string-literal unions matching the pg enums (§0.3). Single source of truth.

export const ActorKind         = z.enum(['human','agent','system']);
export const MemberRole        = z.enum(['owner','admin','editor','viewer']);
export const AdDocumentType    = z.enum(['single_image','carousel','video']);        // CANON §5
export const AdRatio           = z.enum(['1:1','1.91:1','4:5','16:9','9:16']);        // CANON §6
export const VariantStatus     = z.enum(['draft','generating','ready','failed','approved','archived']);
export const Modality          = z.enum(['image','video','audio']);                   // CANON §6
export const JobStatus         = z.enum(['queued','dispatched','running','succeeded','failed','dead','cancelled','cached']); // L3 frozen superset
export const RenderKind        = z.enum(['png','jpg','pdf','svg']);                    // L3: no pptx
export const RenderStatus      = z.enum(['queued','running','succeeded','failed']);
export const EngagementBackend = z.enum(['saliency','tribe_research']);               // CANON §10
export const LocaleCode        = z.enum(['de','en']);                                 // CANON §1
export const LayerType         = z.enum(['image','text','logo','shape','cta','frame','legal','group','smart']); // CANON §5
export const AgentName         = z.enum(['IntakeAgent','Strategist','Copywriter','ArtDirector',
  'CarouselArchitect','CompositorPlanner','BrandGuardian','Critic','EngagementAnalyst','EditorAgent',
  'LocalizationAgent']);                                                              // CANON §7 (+⚑R-A1)
export const AgentRunStatus    = z.enum(['running','succeeded','failed','refused','budget_exceeded']);
export const ExperimentStatus  = z.enum(['draft','running','paused','completed','archived']);
export const AssetKind         = z.enum(['generated_image','uploaded_image','logo','video_clip','audio_vo',
  'audio_sfx','audio_music','saliency_map','export','other']);

export type ActorKind         = z.infer<typeof ActorKind>;
export type MemberRole        = z.infer<typeof MemberRole>;
export type AdDocumentType    = z.infer<typeof AdDocumentType>;
export type AdRatio           = z.infer<typeof AdRatio>;
export type VariantStatus     = z.infer<typeof VariantStatus>;
export type Modality          = z.infer<typeof Modality>;
export type JobStatus         = z.infer<typeof JobStatus>;
export type RenderKind        = z.infer<typeof RenderKind>;
export type RenderStatus      = z.infer<typeof RenderStatus>;
export type EngagementBackend = z.infer<typeof EngagementBackend>;
export type LocaleCode        = z.infer<typeof LocaleCode>;
export type LayerType         = z.infer<typeof LayerType>;
export type AgentName         = z.infer<typeof AgentName>;
export type AgentRunStatus    = z.infer<typeof AgentRunStatus>;
export type ExperimentStatus  = z.infer<typeof ExperimentStatus>;
export type AssetKind         = z.infer<typeof AssetKind>;
