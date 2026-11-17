
import { IMPORT_ENDPOINT, IMPORT_META_HEADER } from "@/lib/constants";
import { isMediaMimeType } from "@/lib/utils/media";
import type { ImportedMediaMeta } from "@/types/api";
import type { MediaKind } from "@/types/media";
import { ApiClientError, NETWORK_ERROR_MESSAGE, readApiErrorMessage } from "./api-client-utils";

const UNEXPECTED_RESPONSE_MESSAGE = "Sunucudan beklenmeyen bir yanıt alındı. Lütfen tekrar deneyin.";

function isMediaKind(value: unknown): value is MediaKind {
  return value === "image" || value === "gif" || value === "video";
}

function parseImportMeta(header: string | null): ImportedMediaMeta {
  if (!header) {
    throw new ApiClientError(UNEXPECTED_RESPONSE_MESSAGE);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(header);
  } catch {
    throw new ApiClientError(UNEXPECTED_RESPONSE_MESSAGE);
  }

  if (typeof parsed === "object" && parsed !== null) {
    const candidate = parsed as Record<string, unknown>;
    const { mimeType, kind, sizeBytes, filename } = candidate;
    if (
      typeof mimeType === "string" &&
      isMediaMimeType(mimeType) &&
      isMediaKind(kind) &&
      typeof sizeBytes === "number" &&
      typeof filename === "string"
    ) {
      return { mimeType, kind, sizeBytes, filename };
    }
  }

  throw new ApiClientError(UNEXPECTED_RESPONSE_MESSAGE);
}

export async function fetchMediaFromUrl(url: string): Promise<File> {
  let response: Response;
  try {
    response = await fetch(IMPORT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new ApiClientError(NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) {
    throw new ApiClientError(
      await readApiErrorMessage(response, "Medya içe aktarılamadı. Lütfen tekrar deneyin."),
    );
  }

  const meta = parseImportMeta(response.headers.get(IMPORT_META_HEADER));
  const blob = await response.blob();

  return new File([blob], meta.filename, { type: meta.mimeType });
}


