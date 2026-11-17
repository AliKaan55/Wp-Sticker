
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ANIMATED_ENCODE_ATTEMPTS,
  ANIMATED_STICKER_MAX_BYTES,
  ANIMATED_STICKER_MAX_SECONDS,
  FFMPEG_ATTEMPT_TIMEOUT_MS,
  FFMPEG_MAX_CONCURRENT,
  FFMPEG_TOTAL_TIMEOUT_MS,
} from "@/lib/constants";
import { AppError } from "@/lib/utils/errors";
import { getMediaInfo, isMediaMimeType } from "@/lib/utils/media";
import type {
  ConversionResult,
  CropRect,
  MediaInput,
  MediaProcessor,
} from "@/types/media";
import { getFfmpegPath, probeMedia, runFfmpeg, type ProbeResult } from "../ffmpeg";
import type { ProcessOptions } from "../media-service";

// Clamps a requested crop rect to ffmpeg's crop=w:h:x:y filter syntax,
// bounded by the probed (coded, pre-rotation) video dimensions when known.
// Note: for videos with rotation metadata (common with phone recordings),
// ffmpeg's -i output reports the coded size, not the display-oriented one,
// so crop coordinates may be slightly off for such files — a known
// limitation rather than something this clamps away.
function buildCropFilter(crop: CropRect | null | undefined, probe: ProbeResult): string | null {
  if (!crop) return null;

  let x = Math.max(0, Math.round(crop.x));
  let y = Math.max(0, Math.round(crop.y));
  let width = Math.max(1, Math.round(crop.width));
  let height = Math.max(1, Math.round(crop.height));

  if (probe.width !== null && probe.height !== null) {
    x = Math.min(x, Math.max(0, probe.width - 1));
    y = Math.min(y, Math.max(0, probe.height - 1));
    width = Math.min(width, probe.width - x);
    height = Math.min(height, probe.height - y);
  }

  if (width <= 0 || height <= 0) return null;
  return `crop=${width}:${height}:${x}:${y}`;
}

const VIDEO_MIME_TYPES: readonly string[] = ["video/mp4", "video/webm"];
const BASE_ARGS: readonly string[] = ["-hide_banner", "-loglevel", "error", "-y"];

let activeJobs = 0;

function corruptError(): AppError {
  return new AppError("CORRUPT_IMAGE", "Bu medya okunamadı. Dosya bozuk olabilir.", 422);
}

function timeoutError(): AppError {
  return new AppError("CONVERSION_FAILED", "Dönüştürme çok uzun sürdü.", 504);
}

function buildAnimatedArgs(
  inputPath: string,
  outputPath: string,
  dimension: number,
  fps: number,
  quality: number,
  cropFilter: string | null,
): string[] {
  const filter = [
    ...(cropFilter ? [cropFilter] : []),
    `fps=${fps}`,
    "format=rgba",
    `scale=${dimension}:${dimension}:force_original_aspect_ratio=decrease:flags=lanczos`,
    `pad=${dimension}:${dimension}:(ow-iw)/2:(oh-ih)/2:color=black@0`,
  ].join(",");

  return [
    ...BASE_ARGS,
    "-t", String(ANIMATED_STICKER_MAX_SECONDS),
    "-i", inputPath,
    "-an",
    "-vf", filter,
    "-c:v", "libwebp_anim",
    "-lossless", "0",
    "-quality", String(quality),
    "-compression_level", "4",
    "-loop", "0",
    outputPath,
  ];
}

export class FfmpegProcessor implements MediaProcessor {
  readonly id = "ffmpeg";
  private readonly stillProcessor: MediaProcessor;

  constructor(stillProcessor: MediaProcessor) {
    this.stillProcessor = stillProcessor;
  }

  supports(input: MediaInput, options: ProcessOptions): boolean {
    if (getFfmpegPath() === null) return false;
    if (VIDEO_MIME_TYPES.includes(input.mimeType)) return true;
    return input.mimeType === "image/gif";
  }

  async process(input: MediaInput, options: ProcessOptions): Promise<ConversionResult> {
    const binary = getFfmpegPath();
    if (binary === null || !isMediaMimeType(input.mimeType)) {
      throw new AppError("UNSUPPORTED_MEDIA", "Sunucuda FFmpeg bulunamadı.");
    }

    if (activeJobs >= FFMPEG_MAX_CONCURRENT) {
      throw new AppError("SERVER_ERROR", "Sunucu şu anda yoğun. Tekrar deneyin.", 503);
    }

    activeJobs += 1;
    const workDir = await mkdtemp(join(tmpdir(), "wsc-"));

    try {
      const inputPath = join(workDir, `input.${getMediaInfo(input.mimeType).extension}`);
      await writeFile(inputPath, input.buffer);

      const probe = await probeMedia(binary, inputPath, FFMPEG_ATTEMPT_TIMEOUT_MS);
      if (!probe.hasVideo) {
        throw new AppError("CORRUPT_IMAGE", "Okunabilir bir medya akışı bulunamadı.", 422);
      }

      if (options.outputType === "sticker" || options.outputType === "animation") {
        return await this.encodeAnimatedSticker(binary, inputPath, workDir, options, probe);
      }

      return await this.extractFirstFrame(binary, inputPath, workDir, input, options);
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error("FFmpeg hatası:", error);
      throw new AppError("CONVERSION_FAILED", "Medya dönüştürülemedi.", 500);
    } finally {
      activeJobs -= 1;
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private async encodeAnimatedSticker(
    binary: string,
    inputPath: string,
    workDir: string,
    options: ProcessOptions,
    probe: ProbeResult,
  ): Promise<ConversionResult> {
    const outputPath = join(workDir, "output.webp");
    const startedAt = Date.now();
    const cropFilter = buildCropFilter(options.crop, probe);
    const durationSeconds = probe.durationSeconds;
    let best: Buffer | null = null;

    for (const attempt of ANIMATED_ENCODE_ATTEMPTS) {
      const remaining = FFMPEG_TOTAL_TIMEOUT_MS - (Date.now() - startedAt);
      if (remaining <= 0) break;

      const run = await runFfmpeg(
        binary,
        buildAnimatedArgs(
          inputPath,
          outputPath,
          options.dimension,
          attempt.fps,
          attempt.quality,
          cropFilter,
        ),
        Math.min(FFMPEG_ATTEMPT_TIMEOUT_MS, remaining),
      );

      if (run.timedOut) {
        if (best === null) throw timeoutError();
        break;
      }
      if (run.exitCode !== 0) throw corruptError();

      best = await readFile(outputPath);
      if (best.length <= ANIMATED_STICKER_MAX_BYTES) break;
    }

    if (best === null) throw timeoutError();

    const warnings: string[] = [];
    if (durationSeconds !== null && durationSeconds > ANIMATED_STICKER_MAX_SECONDS) {
      warnings.push(`Medya ${ANIMATED_STICKER_MAX_SECONDS} saniyeye kısaltıldı.`);
    }
    if (best.length > ANIMATED_STICKER_MAX_BYTES) {
      warnings.push("Bu çıkartma 500 KB'den büyük. WhatsApp reddedebilir.");
    }

    return {
      buffer: best,
      mimeType: "image/webp",
      extension: "webp",
      width: options.dimension,
      height: options.dimension,
      sizeBytes: best.length,
      warnings,
    };
  }

  private async extractFirstFrame(
    binary: string,
    inputPath: string,
    workDir: string,
    input: MediaInput,
    options: ProcessOptions,
  ): Promise<ConversionResult> {
    const framePath = join(workDir, "frame.png");

    const run = await runFfmpeg(
      binary,
      [...BASE_ARGS, "-i", inputPath, "-frames:v", "1", framePath],
      FFMPEG_ATTEMPT_TIMEOUT_MS,
    );

    if (run.timedOut) throw timeoutError();
    if (run.exitCode !== 0) throw corruptError();

    const frame = await readFile(framePath);
    const result = await this.stillProcessor.process(
      { buffer: frame, mimeType: "image/png", filename: input.filename },
      options,
    );

    return {
      ...result,
      warnings: ["Videonun yalnızca ilk karesi kullanıldı.", ...result.warnings],
    };
  }
}

