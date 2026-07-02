import { createInstance } from 'polotno-node';
import type { PolotnoStoreJSON } from './toPolotno';

// docs/06 §7.2 — polotno-node headless render (store JSON → PNG/JPG/PDF).
// API verified against polotno-node 2.15 typings: createInstance({key}) →
// instance.jsonToBlob(json, {mimeType, pixelRatio, quality}) → Buffer;
// jsonToPDFBase64 for PDF. SVG has no direct headless helper — deferred to P7
// (via instance.run + store.toSVG) per the doc's VERIFY note.
// Unlicensed keys render with a Polotno watermark — acceptable in $0 dev mode;
// set POLOTNO_API_KEY (docs/11) before commercial exports.

const PUBLIC_DEV_KEY = 'nFA5H9elEytDyPyvKL7T'; // Polotno's public localhost demo key ($0 dev mode)

export type StaticFormat = 'png' | 'jpg' | 'pdf' | 'svg';

export interface RenderStaticSpec {
  storeJson: PolotnoStoreJSON;
  format: StaticFormat;              // render_kind (docs/03) — no pptx (CANON §12 L3)
  pixelRatio?: number;               // 1 → canvas.width === render.width
  quality?: number;                  // jpg quality 0–1 (polotno-node convention)
  ignoreBackground?: boolean;
}

type PolotnoInstance = Awaited<ReturnType<typeof createInstance>>;
let shared: PolotnoInstance | null = null;

async function getInstance(): Promise<PolotnoInstance> {
  if (!shared) {
    shared = await createInstance({ key: process.env.POLOTNO_API_KEY || PUBLIC_DEV_KEY });
  }
  return shared;
}

/** Close the shared headless browser (tests / graceful shutdown). */
export async function closeRenderInstance(): Promise<void> {
  if (shared) { await shared.close(); shared = null; }
}

export async function renderStatic(spec: RenderStaticSpec): Promise<Buffer> {
  const instance = await getInstance();
  const opts = {
    pixelRatio: spec.pixelRatio ?? 1,
    ignoreBackground: spec.ignoreBackground ?? false,
    skipFontError: false,
    fontLoadTimeout: 20000,
    assetLoadTimeout: 30000,
  };
  switch (spec.format) {
    case 'png':
      return instance.jsonToBlob(spec.storeJson, { ...opts, mimeType: 'image/png' });
    case 'jpg':
      return instance.jsonToBlob(spec.storeJson, { ...opts, mimeType: 'image/jpeg', quality: spec.quality ?? 0.92 });
    case 'pdf': {
      const b64 = await instance.jsonToPDFBase64(spec.storeJson, opts);
      return Buffer.from(b64, 'base64');
    }
    case 'svg':
      throw new Error('renderStatic: svg export lands in P7 (instance.run + store.toSVG — docs/06 §7.2 VERIFY)');
  }
}
