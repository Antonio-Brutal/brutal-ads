import type { LayerTree, RenderKind } from '@brutal/shared';

// @brutal/render — the SINGLE public render facade (CANON §12 L5, docs/06).
// The editor preview and headless export share ONE render model (Polotno store JSON) for parity.
// `renderDocument` dispatches to internal renderStatic / renderPdf / renderVideoLocal / encodeImageUnder5MB.
// PDF is the sole v1 document-ad format; PPTX is NOT a native output (CANON §12 L3).

export interface RenderSpec {
  kind: RenderKind;                         // 'png' | 'jpg' | 'pdf' | 'svg'
  tree?: LayerTree;                         // single-image / one slide
  slides?: LayerTree[];                     // carousel → multi-page PDF
  format?: string;                          // target aspect id, e.g. '1:1'
  maxBytes?: number;                        // e.g. 5 MB for LinkedIn single image
}

export interface RenderResult {
  kind: RenderKind;
  bytes: Uint8Array;
  width?: number;
  height?: number;
  byteLength: number;
}

/** TODO(factory): implement per docs/06 (polotno-node headless + sharp ≤5MB + pdf-lib for document ads). */
export async function renderDocument(_spec: RenderSpec): Promise<RenderResult> {
  throw new Error('renderDocument: not implemented — build per docs/06');
}

/** Video ads render via a Remotion project (docs/06 §video, docs/09 video pipeline). */
export async function renderVideoLocal(): Promise<RenderResult> {
  throw new Error('renderVideoLocal: not implemented — build per docs/06 (Remotion)');
}
