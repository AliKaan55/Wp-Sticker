
import { URL_IMPORT_TIMEOUT_MS } from "@/lib/constants";
import { getBaseName } from "@/lib/utils/format";
import { getMediaInfo } from "@/lib/utils/media";
import { AppError } from "@/lib/utils/errors";
import { detectMediaType } from "@/lib/utils/sniff";
import { parseImportUrl } from "@/lib/utils/url-validation";
import type { MediaKind, MediaMimeType } from "@/types/media";
import { findResolver } from "./resolvers";
import type { ResolveContext } from "./resolvers";
import { safeFetch } from "./safe-fetch";
import type { FetchedMedia } from "./safe-fetch";

export interface ImportedMedia {
  readonly buffer: Buffer;
  readonly mimeType: MediaMimeType;
  readonly kind: MediaKind;
  readonly extension: string;
  readonly filename: string;
  readonly sizeBytes: number;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function filenameFromUrl(url: URL): string {
  const lastSegment = url.pathname.split("/").filter(Boolean).pop() ?? "";
  return decodeSegment(lastSegment);
}

// Codes that mean "this particular candidate URL didn't pan out" rather than
// "the request itself is invalid/unsafe". For these we fall through to the
// next candidate (e.g. a lower-bitrate video variant, or the original image
// instead of the "large" one) instead of failing the whole import outright.
const RETRYABLE_CANDIDATE_CODES = new Set([
  "FILE_TOO_LARGE",
  "MEDIA_NOT_ACCESSIBLE",
  "UNSUPPORTED_MEDIA",
  "REMOTE_ERROR",
  "FETCH_FAILED",
  "FETCH_TIMEOUT",
]);

async function downloadFirstAvailable(
  candidates: readonly URL[],
  context: ResolveContext,
): Promise<FetchedMedia> {
  let lastError: unknown = null;

  for (const candidate of candidates) {
    if (context.remainingMs() <= 0) {
      break;
    }

    try {
      return await safeFetch(candidate, { timeoutMs: context.remainingMs() });
    } catch (error) {
      lastError = error;
      const canTryNext = error instanceof AppError && RETRYABLE_CANDIDATE_CODES.has(error.code);
      if (!canTryNext) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new AppError("FETCH_FAILED", "Medya indirilemedi. Tekrar deneyin.");
}

export async function importMediaFromUrl(rawUrl: string): Promise<ImportedMedia> {
  const parsed = parseImportUrl(rawUrl);
  if (!parsed.ok) {
    throw new AppError(parsed.code, parsed.message);
  }

  const deadline = Date.now() + URL_IMPORT_TIMEOUT_MS;
  const context: ResolveContext = {
    remainingMs: () => Math.max(0, deadline - Date.now()),
  };

  const resolver = findResolver(parsed.url);
  const resolved = resolver ? await resolver.resolve(parsed.url, context) : null;
  const candidates = resolved ? resolved.candidates : [parsed.url];

  const fetched = await downloadFirstAvailable(candidates, context);

  const mimeType = detectMediaType(fetched.buffer);
  if (!mimeType) {
    throw new AppError(
      "UNSUPPORTED_MEDIA",
      "Bu bağlantıdaki dosya türü desteklenmiyor. JPG, PNG, WEBP, GIF, MP4 veya WEBM kullanın.",
    );
  }

  const { kind, extension } = getMediaInfo(mimeType);
  const nameSource = resolved ? resolved.filenameHint : filenameFromUrl(fetched.finalUrl);

  return {
    buffer: fetched.buffer,
    mimeType,
    kind,
    extension,
    filename: `${getBaseName(nameSource)}.${extension}`,
    sizeBytes: fetched.buffer.length,
  };
}


