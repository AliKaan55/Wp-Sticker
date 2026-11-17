
import { NextResponse } from "next/server";
import { META_HEADER } from "@/lib/constants";
import { getMediaProcessingService } from "@/lib/services/media";
import { AppError } from "@/lib/utils/errors";
import { errorResponse } from "@/lib/utils/http";
import { detectMediaType } from "@/lib/utils/sniff";
import { parseConversionOptions, parseCropOption, validateFileMeta } from "@/lib/utils/validation";
import type { ConversionMeta } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new AppError(
        "MISSING_FILE",
        "Yükleme okunamadı. Görseli yeniden seçip tekrar deneyin.",
        400,
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new AppError("MISSING_FILE", "Hiç görsel yüklenmedi. Önce bir görsel seçin.", 400);
    }

    const validation = validateFileMeta({ name: file.name, type: file.type, size: file.size });
    if (!validation.ok) {
      const status = validation.code === "FILE_TOO_LARGE" ? 413 : 400;
      throw new AppError(validation.code, validation.message, status);
    }

    const options = parseConversionOptions(formData.get("size"), formData.get("output"));
    const crop = parseCropOption(formData.get("crop"));

    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedType = detectMediaType(buffer);
    if (!detectedType) {
      throw new AppError("INVALID_FORMAT", "Bu dosya geçerli bir görsel değil.", 400);
    }

    const result = await getMediaProcessingService().process(
      { buffer, mimeType: detectedType, filename: file.name },
      options,
      crop,
    );

    const meta: ConversionMeta = {
      width: result.width,
      height: result.height,
      sizeBytes: result.sizeBytes,
      warnings: result.warnings.map((warning) => encodeURIComponent(warning)),
    };

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Length": String(result.sizeBytes),
        "Cache-Control": "no-store",
        [META_HEADER]: JSON.stringify(meta),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}


