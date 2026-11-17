
import { NextResponse } from "next/server";
import { IMPORT_META_HEADER } from "@/lib/constants";
import { importMediaFromUrl } from "@/lib/services/url-import";
import { AppError } from "@/lib/utils/errors";
import { errorResponse } from "@/lib/utils/http";
import type { ImportedMediaMeta } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AppError("INVALID_URL", "İstek okunamadı. Bağlantıyı yeniden girip deneyin.", 400);
    }

    const url =
      typeof body === "object" && body !== null && "url" in body && typeof body.url === "string"
        ? body.url
        : null;

    if (url === null) {
      throw new AppError("INVALID_URL", "Lütfen bir bağlantı yapıştırın.", 400);
    }

    const media = await importMediaFromUrl(url);

    const meta: ImportedMediaMeta = {
      mimeType: media.mimeType,
      kind: media.kind,
      sizeBytes: media.sizeBytes,
      filename: media.filename,
    };

    return new NextResponse(new Uint8Array(media.buffer), {
      status: 200,
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(media.sizeBytes),
        "Cache-Control": "no-store",
        [IMPORT_META_HEADER]: JSON.stringify(meta),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}


