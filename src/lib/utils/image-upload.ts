/**
 * Server-side validation for user-uploaded images (completion photos and
 * site maps). The browser-supplied MIME type and file name are never trusted:
 * the type is detected from the file's magic bytes and the stored extension
 * and content type are derived from that (#79).
 */

export type DetectedImage = { contentType: string; extension: string };

/** Content types the image proxy is willing to serve inline. */
export const SAFE_IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const MAX_COMPLETION_PHOTO_BYTES = 10 * 1024 * 1024;

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, i) => bytes[offset + i] === byte);

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

/** Identifies JPEG, PNG, WebP and HEIC/HEIF by their leading bytes. */
export function detectImageType(bytes: Uint8Array): DetectedImage | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff]))
    return { contentType: "image/jpeg", extension: "jpg" };

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return { contentType: "image/png", extension: "png" };

  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 12) === "WEBP"
  )
    return { contentType: "image/webp", extension: "webp" };

  // ISO-BMFF: [size][ "ftyp" ][ major brand ]
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12);
    if (["heic", "heix", "heim", "heis"].includes(brand))
      return { contentType: "image/heic", extension: "heic" };
    if (["mif1", "msf1", "heif"].includes(brand))
      return { contentType: "image/heif", extension: "heif" };
  }

  return null;
}

/** Reads the first bytes of an uploaded file and detects its image type. */
export async function detectUploadedImage(
  file: Blob,
): Promise<DetectedImage | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return detectImageType(head);
}
