import sharp from 'sharp';

// docs/06 §8.1 — LinkedIn single-image spec gate: ≤5 MB (CANON §8).
// Quality-descent loop: try descending JPEG qualities until the buffer fits.

export const LINKEDIN_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export interface EncodeResult {
  buffer: Buffer;
  bytes: number;
  width: number;
  height: number;
  quality: number;         // the JPEG quality that fit (100 = png passthrough)
  mimeType: 'image/jpeg' | 'image/png';
}

export async function encodeImageUnder5MB(
  input: Buffer,
  opts?: { maxBytes?: number; preferPng?: boolean },
): Promise<EncodeResult> {
  const maxBytes = opts?.maxBytes ?? LINKEDIN_IMAGE_MAX_BYTES;
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (opts?.preferPng && input.byteLength <= maxBytes) {
    return { buffer: input, bytes: input.byteLength, width, height, quality: 100, mimeType: 'image/png' };
  }

  for (const quality of [92, 88, 84, 80, 75, 70, 65, 60]) {
    const buffer = await sharp(input).jpeg({ quality, mozjpeg: true }).toBuffer();
    if (buffer.byteLength <= maxBytes) {
      return { buffer, bytes: buffer.byteLength, width, height, quality, mimeType: 'image/jpeg' };
    }
  }
  throw new Error(
    `encodeImageUnder5MB: cannot fit ${width}x${height} under ${maxBytes} bytes even at quality 60 — downscale the canvas`,
  );
}
