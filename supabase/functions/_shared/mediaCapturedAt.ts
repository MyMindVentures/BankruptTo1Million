import exifr from "npm:exifr@7.1.3";

/** ISO-8601 UTC string, or null when file metadata has no capture time. */
export async function extractCapturedAtIso(
  bytes: Uint8Array,
  mimeType: string,
): Promise<string | null> {
  try {
    if (mimeType.startsWith("image/") || looksLikeImage(bytes)) {
      const fromExif = await extractImageCapturedAt(bytes);
      if (fromExif) return fromExif;
    }
    if (
      mimeType.startsWith("video/")
      || mimeType === "application/mp4"
      || looksLikeMp4(bytes)
    ) {
      return extractMp4CapturedAt(bytes);
    }
  } catch {
    return null;
  }
  return null;
}

async function extractImageCapturedAt(bytes: Uint8Array): Promise<string | null> {
  const parsed = await exifr.parse(bytes, {
    pick: [
      "DateTimeOriginal",
      "CreateDate",
      "DateTimeDigitized",
    ],
    translateValues: true,
  }) as Record<string, unknown> | undefined;

  if (!parsed) return null;

  const date =
    asDate(parsed.DateTimeOriginal)
    ?? asDate(parsed.CreateDate)
    ?? asDate(parsed.DateTimeDigitized);

  if (!date) return null;
  return date.toISOString();
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim().replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function looksLikeImage(bytes: Uint8Array): boolean {
  if (bytes.length < 3) return false;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  if (
    bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return true;
  return false;
}

function looksLikeMp4(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
}

/**
 * Read MP4/QuickTime mvhd creation time (seconds since 1904-01-01 UTC).
 * Skips the Mac epoch zero sentinel.
 */
function extractMp4CapturedAt(bytes: Uint8Array): string | null {
  const mvhd = findBox(bytes, "mvhd");
  if (!mvhd) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset + mvhd.offset, mvhd.size);
  if (mvhd.size < 20) return null;

  const version = view.getUint8(0);
  let creationSeconds: number;
  if (version === 1) {
    if (mvhd.size < 28) return null;
    const high = view.getUint32(4);
    const low = view.getUint32(8);
    if (high !== 0) return null;
    creationSeconds = low;
  } else {
    creationSeconds = view.getUint32(4);
  }

  if (!creationSeconds) return null;

  const MAC_EPOCH_MS = Date.UTC(1904, 0, 1);
  const date = new Date(MAC_EPOCH_MS + creationSeconds * 1000);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  if (year < 1990 || year > 2100) return null;
  return date.toISOString();
}

function findBox(
  bytes: Uint8Array,
  type: string,
): { offset: number; size: number } | null {
  let offset = 0;
  const typeBytes = new TextEncoder().encode(type);
  const containers = ["moov", "trak", "mdia", "minf", "stbl"];

  while (offset + 8 <= bytes.length) {
    const size = readUint32(bytes, offset);
    if (size < 8 || offset + size > bytes.length) return null;

    const boxType = bytes.subarray(offset + 4, offset + 8);
    const payloadOffset = offset + 8;
    const payloadSize = size - 8;

    if (equalBytes(boxType, typeBytes)) {
      return { offset: payloadOffset, size: payloadSize };
    }

    const typeName = new TextDecoder().decode(boxType);
    if (containers.includes(typeName)) {
      const nested = findBox(bytes.subarray(payloadOffset, payloadOffset + payloadSize), type);
      if (nested) {
        return {
          offset: payloadOffset + nested.offset,
          size: nested.size,
        };
      }
    }

    offset += size;
  }

  return null;
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset]! << 24)
    | (bytes[offset + 1]! << 16)
    | (bytes[offset + 2]! << 8)
    | bytes[offset + 3]!
  ) >>> 0;
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
