
import type { MediaMimeType } from "@/types/media";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const EBML_SIGNATURE = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

export function detectMediaType(buffer: Buffer): MediaMimeType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  if (buffer.length >= 6) {
    const header = buffer.subarray(0, 6).toString("ascii");
    if (header === "GIF87a" || header === "GIF89a") {
      return "image/gif";
    }
  }

  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    // "ftyp" is used by several ISO-BMFF-based formats, not just MP4 (e.g.
    // HEIC/HEIF/AVIF images and QuickTime .mov). Only treat it as MP4 when
    // the major brand is actually one of the known MP4/M4V brands, otherwise
    // this misdetects those other formats as video and breaks conversion
    // further down the pipeline.
    const NON_VIDEO_BRANDS = new Set([
      "qt  ",
      "heic",
      "heix",
      "heim",
      "heis",
      "hevc",
      "hevx",
      "hevm",
      "hevs",
      "mif1",
      "msf1",
      "avif",
      "avis",
      "crx ",
    ]);
    if (!NON_VIDEO_BRANDS.has(brand)) {
      return "video/mp4";
    }
  }

  if (
    buffer.length >= 4 &&
    buffer.subarray(0, 4).equals(EBML_SIGNATURE) &&
    buffer.subarray(0, Math.min(buffer.length, 64)).includes("webm")
  ) {
    return "video/webm";
  }

  return null;
}


