
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import {
  IMPORT_DECLARED_CONTENT_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  URL_IMPORT_MAX_REDIRECTS,
  URL_IMPORT_TIMEOUT_MS,
  URL_IMPORT_TIMEOUT_SECONDS,
} from "@/lib/constants";
import { AppError } from "@/lib/utils/errors";
import { isBlockedAddress } from "@/lib/utils/ip-guard";
import {
  BLOCKED_HOST_MESSAGE,
  parseImportUrl,
  stripIpv6Brackets,
} from "@/lib/utils/url-validation";

export interface SafeFetchOptions {
  readonly timeoutMs?: number;
  readonly maxBytes?: number;
  readonly maxRedirects?: number;
  readonly accept?: string;
  readonly allowedContentTypes?: readonly string[];
}

export interface FetchedMedia {
  readonly buffer: Buffer;
  readonly contentType: string | null;
  readonly finalUrl: URL;
}

interface RequestPolicy {
  readonly headers: http.OutgoingHttpHeaders;
  readonly allowedContentTypes: readonly string[];
  readonly maxBytes: number;
}

interface BodyOutcome {
  readonly kind: "body";
  readonly buffer: Buffer;
  readonly contentType: string | null;
}

interface RedirectOutcome {
  readonly kind: "redirect";
  readonly location: string;
}

type HopOutcome = BodyOutcome | RedirectOutcome;

const BLOCKED_ERROR_CODE = "EBLOCKED";

const DEFAULT_ACCEPT = "image/*,video/mp4,video/webm;q=0.9,*/*;q=0.5";

// Several popular image/video CDNs (Reddit, Pinterest, Imgur, ...) reject
// requests whose User-Agent clearly identifies a bot/script with a 403,
// even though the content is public. A realistic browser UA avoids those
// false negatives while still being a perfectly honest, generic identifier.
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function createBlockedError(): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error("Blocked address");
  error.code = BLOCKED_ERROR_CODE;
  return error;
}

const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.promises
    .lookup(hostname, {
      all: true,
      verbatim: true,
      family: options.family,
      hints: options.hints,
    })
    .then((addresses) => {
      const first = addresses[0];
      if (!first || addresses.some((entry) => isBlockedAddress(entry.address))) {
        callback(createBlockedError(), "", 0);
        return;
      }
      if (options.all) {
        callback(null, addresses);
        return;
      }
      callback(null, first.address, first.family);
    })
    .catch((error: NodeJS.ErrnoException) => {
      callback(error, "", 0);
    });
};

function tooLargeError(): AppError {
  return new AppError(
    "FILE_TOO_LARGE",
    `Medya çok büyük. İzin verilen en büyük boyut ${MAX_FILE_SIZE_LABEL}.`,
  );
}

function statusToError(status: number): AppError {
  if (status >= 500) {
    return new AppError(
      "REMOTE_ERROR",
      `Uzak sunucu bir hata verdi (HTTP ${status}). Daha sonra tekrar deneyin.`,
    );
  }
  if (status === 429) {
    return new AppError(
      "REMOTE_ERROR",
      "Uzak sunucu çok fazla istek aldığını bildirdi (HTTP 429). Biraz bekleyip tekrar deneyin.",
    );
  }
  return new AppError(
    "MEDIA_NOT_ACCESSIBLE",
    `Medyaya erişilemedi (HTTP ${status}). Bağlantının herkese açık olduğundan emin olun.`,
  );
}

function headerValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function normalizeContentType(contentType: string): string {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

function contentTypeError(contentType: string): AppError {
  const mime = normalizeContentType(contentType);
  if (mime === "text/html" || mime === "application/xhtml+xml") {
    return new AppError(
      "UNSUPPORTED_MEDIA",
      "Bu bağlantı bir web sayfasına çıkıyor, doğrudan bir medya dosyasına değil. Doğrudan görsel, GIF veya video bağlantısı ya da bir X (Twitter) gönderi bağlantısı kullanın.",
    );
  }
  return new AppError(
    "UNSUPPORTED_MEDIA",
    "Bu bağlantıdaki dosya türü desteklenmiyor. JPG, PNG, WEBP, GIF, MP4 veya WEBM kullanın.",
  );
}

function assertLiteralAddressAllowed(url: URL): void {
  const host = stripIpv6Brackets(url.hostname);
  if (net.isIP(host) !== 0 && isBlockedAddress(host)) {
    throw new AppError("BLOCKED_HOST", BLOCKED_HOST_MESSAGE);
  }
}

function resolveRedirect(location: string, base: URL): URL {
  let next: URL;
  try {
    next = new URL(location, base);
  } catch {
    throw new AppError("FETCH_FAILED", "Bağlantının yönlendirme adresi geçersiz.");
  }

  const validation = parseImportUrl(next.href);
  if (!validation.ok) {
    throw new AppError(validation.code, validation.message);
  }
  return validation.url;
}

function requestOnce(url: URL, signal: AbortSignal, policy: RequestPolicy): Promise<HopOutcome> {
  return new Promise<HopOutcome>((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;

    const request = transport.request(
      url,
      { method: "GET", headers: policy.headers, lookup: safeLookup, signal },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = headerValue(response.headers.location);

        if (status >= 300 && status < 400 && location) {
          response.resume();
          resolve({ kind: "redirect", location });
          return;
        }

        if (status < 200 || status >= 300) {
          response.resume();
          reject(statusToError(status));
          return;
        }

        const contentType = headerValue(response.headers["content-type"]);
        if (
          contentType &&
          !policy.allowedContentTypes.includes(normalizeContentType(contentType))
        ) {
          response.destroy();
          reject(contentTypeError(contentType));
          return;
        }

        const declaredLength = Number(headerValue(response.headers["content-length"]));
        if (Number.isFinite(declaredLength) && declaredLength > policy.maxBytes) {
          response.destroy();
          reject(tooLargeError());
          return;
        }

        const chunks: Buffer[] = [];
        let received = 0;

        response.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > policy.maxBytes) {
            response.destroy();
            reject(tooLargeError());
            return;
          }
          chunks.push(chunk);
        });

        response.on("end", () => {
          resolve({ kind: "body", buffer: Buffer.concat(chunks, received), contentType });
        });

        response.on("error", reject);

        response.on("close", () => {
          if (!response.complete) {
            reject(new AppError("FETCH_FAILED", "Bağlantı indirme sırasında kesildi. Tekrar deneyin."));
          }
        });
      },
    );

    request.on("error", reject);
    request.end();
  });
}

function translateFetchError(error: unknown, timedOut: boolean): AppError {
  if (timedOut) {
    return new AppError(
      "FETCH_TIMEOUT",
      `Uzak sunucu ${URL_IMPORT_TIMEOUT_SECONDS} saniye içinde yanıt vermedi. Daha sonra tekrar deneyin.`,
    );
  }

  if (error instanceof AppError) {
    return error;
  }

  const code = (error as NodeJS.ErrnoException | null)?.code;

  if (code === BLOCKED_ERROR_CODE) {
    return new AppError("BLOCKED_HOST", BLOCKED_HOST_MESSAGE);
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return new AppError("FETCH_FAILED", "Bu adres bulunamadı. Bağlantıyı kontrol edin.");
  }
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
    return new AppError(
      "FETCH_TIMEOUT",
      "Uzak sunucuya bağlanırken zaman aşımı oluştu. Daha sonra tekrar deneyin.",
    );
  }

  return new AppError(
    "FETCH_FAILED",
    "Uzak sunucuya bağlanılamadı. Adresi kontrol edip tekrar deneyin.",
  );
}

export async function safeFetch(
  startUrl: URL,
  options: SafeFetchOptions = {},
): Promise<FetchedMedia> {
  const timeoutMs = options.timeoutMs ?? URL_IMPORT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? URL_IMPORT_MAX_REDIRECTS;

  const policy: RequestPolicy = {
    maxBytes: options.maxBytes ?? MAX_FILE_SIZE_BYTES,
    allowedContentTypes: options.allowedContentTypes ?? IMPORT_DECLARED_CONTENT_TYPES,
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: options.accept ?? DEFAULT_ACCEPT,
      "Accept-Encoding": "identity",
    },
  };

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, Math.max(0, timeoutMs));

  try {
    let current = startUrl;

    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      assertLiteralAddressAllowed(current);

      const outcome = await requestOnce(current, controller.signal, policy);

      if (outcome.kind === "body") {
        return { buffer: outcome.buffer, contentType: outcome.contentType, finalUrl: current };
      }

      current = resolveRedirect(outcome.location, current);
    }

    throw new AppError("FETCH_FAILED", "Bağlantı çok fazla yönlendirme içeriyor.");
  } catch (error) {
    throw translateFetchError(error, timedOut);
  } finally {
    clearTimeout(timer);
  }
}


