
import { ORIGINAL_DIMENSION, STICKER_FALLBACK_DIMENSION } from "@/lib/constants";
import { AppError } from "@/lib/utils/errors";
import type {
  ConversionOptions,
  ConversionResult,
  CropRect,
  MediaInput,
  MediaProcessor,
} from "@/types/media";
import { FfmpegProcessor } from "./processors/ffmpeg-processor";
import { ImageProcessor } from "./processors/image-processor";

// What a processor's process() actually receives: the opaque ConversionOptions
// plus an optional crop rect, merged in here rather than added to the
// ConversionOptions type itself.
export type ProcessOptions = ConversionOptions & { readonly crop?: CropRect | null };

export class MediaProcessingService {
  private readonly processors: readonly MediaProcessor[];

  constructor(processors: readonly MediaProcessor[]) {
    this.processors = processors;
  }

  async process(
    input: MediaInput,
    options: ConversionOptions,
    crop: CropRect | null = null,
  ): Promise<ConversionResult> {
    // WhatsApp stickers (static and animated) must be a square canvas, so
    // "Orijinal" (don't resize) isn't a valid choice for those output types.
    // Fall back to the standard sticker size instead of failing outright,
    // and say so in the result's warnings.
    const isSticker = options.outputType === "sticker" || options.outputType === "animation";
    const needsClamp = isSticker && options.dimension === ORIGINAL_DIMENSION;
    const effectiveOptions: ProcessOptions = {
      ...options,
      dimension: needsClamp ? STICKER_FALLBACK_DIMENSION : options.dimension,
      crop,
    };

    const processor = this.processors.find((candidate) =>
      candidate.supports(input, effectiveOptions),
    );

    if (!processor) {
      throw new AppError(
        "UNSUPPORTED_MEDIA",
        "Bu medya türü şu an dönüştürülemiyor. Video desteği için sunucuda FFmpeg bulunmalı.",
        415,
      );
    }

    const result = await processor.process(input, effectiveOptions);
    if (!needsClamp) {
      return result;
    }

    return {
      ...result,
      warnings: [
        "Çıkartmalar kare olmak zorunda olduğu için orijinal boyut yerine 512×512 kullanıldı.",
        ...result.warnings,
      ],
    };
  }
}

let instance: MediaProcessingService | undefined;

export function getMediaProcessingService(): MediaProcessingService {
  if (!instance) {
    const imageProcessor = new ImageProcessor();
    instance = new MediaProcessingService([new FfmpegProcessor(imageProcessor), imageProcessor]);
  }
  return instance;
}

