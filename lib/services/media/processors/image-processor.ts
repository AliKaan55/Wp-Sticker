
import sharp from "sharp";
import {
  ORIGINAL_DIMENSION,
  PROCESSABLE_MIME_TYPES,
  STICKER_MAX_BYTES,
  STICKER_QUALITY_STEPS,
} from "@/lib/constants";
import { AppError } from "@/lib/utils/errors";
import type {
  ConversionResult,
  CropRect,
  MediaInput,
  MediaProcessor,
} from "@/types/media";
import type { ProcessOptions } from "../media-service";

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 } as const;
const ANIMATED_GIF_WARNING = "Animasyonlu GIF'in yalnızca ilk karesi kullanıldı.";

interface RenderedFrame {
  readonly data: Buffer;
  readonly width: number;
  readonly height: number;
}

export class ImageProcessor implements MediaProcessor {
  readonly id = "image";

  supports(input: MediaInput): boolean {
    return (PROCESSABLE_MIME_TYPES as readonly string[]).includes(input.mimeType);
  }

  async process(input: MediaInput, options: ProcessOptions): Promise<ConversionResult> {
    try {
      const inputWarnings = await this.collectInputWarnings(input);
      const isSticker = options.outputType === "sticker" || options.outputType === "animation";
      const sourceBuffer = options.crop
        ? await this.applyCrop(input.buffer, options.crop)
        : input.buffer;
      // WhatsApp stickers must be a square canvas, so those are padded to
      // dimension x dimension. The plain "WhatsApp Görseli" (PNG) output has
      // no such requirement, so it keeps the source's own aspect ratio
      // instead of being squeezed/padded into a square.
      const frame = isSticker
        ? await this.renderSquareFrame(sourceBuffer, options.dimension)
        : await this.renderFittedFrame(sourceBuffer, options.dimension);

      const result = isSticker ? await this.encodeSticker(frame) : await this.encodePng(frame);

      return { ...result, warnings: [...inputWarnings, ...result.warnings] };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (
        error instanceof Error &&
        /unsupported image format|corrupt|truncated|bad seek|invalid|vips/i.test(error.message)
      ) {
        throw new AppError("CORRUPT_IMAGE", "Bu görsel okunamadı.", 422);
      }
      console.error("Görsel hatası:", error);
      throw new AppError("CONVERSION_FAILED", "Görsel dönüştürülemedi.", 500);
    }
  }

  // Crops before any resizing. Coordinates are in the source's own,
  // already-oriented pixel space — matching what the browser shows via the
  // <img>'s naturalWidth/naturalHeight — so rotation is applied first and
  // the crop region is clamped to the rotated image's actual bounds.
  private async applyCrop(buffer: Buffer, crop: CropRect): Promise<Buffer> {
    const metadata = await sharp(buffer, { failOn: "error" }).metadata();
    const orientation = metadata.orientation ?? 1;
    const swapped = orientation >= 5 && orientation <= 8;
    const naturalWidth = (swapped ? metadata.height : metadata.width) ?? 0;
    const naturalHeight = (swapped ? metadata.width : metadata.height) ?? 0;

    if (naturalWidth <= 0 || naturalHeight <= 0) {
      return buffer;
    }

    const left = Math.max(0, Math.min(Math.round(crop.x), naturalWidth - 1));
    const top = Math.max(0, Math.min(Math.round(crop.y), naturalHeight - 1));
    const width = Math.max(1, Math.min(Math.round(crop.width), naturalWidth - left));
    const height = Math.max(1, Math.min(Math.round(crop.height), naturalHeight - top));

    return sharp(buffer, { failOn: "error" })
      .rotate()
      .extract({ left, top, width, height })
      .toBuffer();
  }

  private async collectInputWarnings(input: MediaInput): Promise<string[]> {
    if (input.mimeType !== "image/gif") return [];
    const metadata = await sharp(input.buffer, { failOn: "error" }).metadata();
    return (metadata.pages ?? 1) > 1 ? [ANIMATED_GIF_WARNING] : [];
  }

  private async renderSquareFrame(buffer: Buffer, dimension: number): Promise<RenderedFrame> {
    const { data, info } = await sharp(buffer, { failOn: "error" })
      .rotate()
      .resize({
        width: dimension,
        height: dimension,
        fit: "contain",
        position: "centre",
        background: TRANSPARENT,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return { data, width: info.width, height: info.height };
  }

  private async renderFittedFrame(buffer: Buffer, dimension: number): Promise<RenderedFrame> {
    let pipeline = sharp(buffer, { failOn: "error" }).rotate();

    // dimension === ORIGINAL_DIMENSION means "keep the source's own
    // resolution" — skip resizing altogether instead of passing 0 to
    // sharp's resize(), which would throw.
    if (dimension !== ORIGINAL_DIMENSION) {
      pipeline = pipeline.resize({
        width: dimension,
        height: dimension,
        fit: "inside",
      });
    }

    const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    return { data, width: info.width, height: info.height };
  }

  private rebuild(frame: RenderedFrame): sharp.Sharp {
    return sharp(frame.data, {
      raw: { width: frame.width, height: frame.height, channels: 4 },
    });
  }

  private async encodeSticker(frame: RenderedFrame): Promise<ConversionResult> {
    let best: Buffer | null = null;

    for (const quality of STICKER_QUALITY_STEPS) {
      const encoded = await this.rebuild(frame)
        .webp({
          quality,
          alphaQuality: Math.max(quality, 50),
          effort: 6,
          smartSubsample: true,
        })
        .toBuffer();

      best = encoded;
      if (encoded.length <= STICKER_MAX_BYTES) break;
    }

    if (!best) throw new AppError("CONVERSION_FAILED", "Çıkartma oluşturulamadı.", 500);

    const warnings: string[] = [];
    if (best.length > STICKER_MAX_BYTES) {
      warnings.push("Bu çıkartma 100 KB'den büyük, WhatsApp reddedebilir.");
    }

    return {
      buffer: best,
      mimeType: "image/webp",
      extension: "webp",
      width: frame.width,
      height: frame.height,
      sizeBytes: best.length,
      warnings,
    };
  }

  private async encodePng(frame: RenderedFrame): Promise<ConversionResult> {
    const encoded = await this.rebuild(frame)
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    return {
      buffer: encoded,
      mimeType: "image/png",
      extension: "png",
      width: frame.width,
      height: frame.height,
      sizeBytes: encoded.length,
      warnings: [],
    };
  }
}

