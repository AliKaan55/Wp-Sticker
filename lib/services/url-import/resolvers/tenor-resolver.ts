
import {
  JSON_CONTENT_TYPES,
  JSON_RESPONSE_MAX_BYTES,
  TENOR_API_BASE,
  TENOR_CLIENT_KEY,
  TENOR_HOSTS,
} from "@/lib/constants";
import { AppError } from "@/lib/utils/errors";
import { parseImportUrl } from "@/lib/utils/url-validation";
import { safeFetch } from "../safe-fetch";
import type { MediaUrlResolver, ResolveContext, ResolvedMedia } from "./types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

// Tenor page URLs look like https://tenor.com/view/some-slug-words-gif-<ID>.
// The post ID is always the numeric run at the very end of the path.
export function parseTenorId(url: URL): string | null {
  const match = /-(\d+)\/?$/.exec(url.pathname);
  return match?.[1] ?? null;
}

function getApiKey(): string {
  const key = process.env.TENOR_API_KEY;
  if (!key) {
    throw new AppError(
      "SERVER_ERROR",
      "Sunucu yapılandırması eksik: TENOR_API_KEY tanımlı değil.",
      500,
    );
  }
  return key;
}

async function fetchTenorJson(id: string, context: ResolveContext): Promise<unknown> {
  const endpoint = new URL(TENOR_API_BASE);
  endpoint.searchParams.set("ids", id);
  endpoint.searchParams.set("key", getApiKey());
  endpoint.searchParams.set("client_key", TENOR_CLIENT_KEY);
  endpoint.searchParams.set("media_filter", "mp4,gif");

  let body: Buffer;
  try {
    const fetched = await safeFetch(endpoint, {
      timeoutMs: context.remainingMs(),
      maxBytes: JSON_RESPONSE_MAX_BYTES,
      accept: "application/json",
      allowedContentTypes: JSON_CONTENT_TYPES,
    });
    body = fetched.buffer;
  } catch (error) {
    if (error instanceof AppError && error.code === "MEDIA_NOT_ACCESSIBLE") {
      throw new AppError("MEDIA_NOT_ACCESSIBLE", "Bu Tenor bağlantısı bulunamadı ya da kaldırılmış.");
    }
    if (error instanceof AppError && error.code === "UNSUPPORTED_MEDIA") {
      throw new AppError("FETCH_FAILED", "Tenor'dan beklenmeyen bir yanıt alındı. Daha sonra tekrar deneyin.");
    }
    throw error;
  }

  try {
    return JSON.parse(body.toString("utf8")) as unknown;
  } catch {
    throw new AppError("FETCH_FAILED", "Tenor'dan gelen yanıt okunamadı. Daha sonra tekrar deneyin.");
  }
}

function toCandidateUrls(data: unknown): URL[] {
  if (!isRecord(data)) {
    return [];
  }

  const results = asArray(data.results);
  const first = results[0];
  if (!isRecord(first) || !isRecord(first.media_formats)) {
    return [];
  }

  const formats = first.media_formats as UnknownRecord;
  const rawUrls: string[] = [];

  for (const key of ["mp4", "gif", "mediumgif"]) {
    const variant = formats[key];
    if (isRecord(variant)) {
      const variantUrl = asString(variant.url);
      if (variantUrl) rawUrls.push(variantUrl);
    }
  }

  const candidates: URL[] = [];
  for (const raw of rawUrls) {
    const validation = parseImportUrl(raw);
    if (validation.ok) {
      candidates.push(validation.url);
    }
  }
  return candidates;
}

export const tenorResolver: MediaUrlResolver = {
  id: "tenor",

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!TENOR_HOSTS.includes(host)) return false;
    // media.tenor.com / c.tenor.com direct CDN links are already fetchable
    // as-is, so only intercept tenor.com *page* URLs that need the API.
    return host === "tenor.com";
  },

  async resolve(url: URL, context: ResolveContext): Promise<ResolvedMedia> {
    const id = parseTenorId(url);
    if (!id) {
      throw new AppError(
        "INVALID_URL",
        "Bu Tenor bağlantısı bir GIF'e işaret etmiyor. Bir GIF sayfası bağlantısı yapıştırın.",
      );
    }

    const data = await fetchTenorJson(id, context);
    const candidates = toCandidateUrls(data);
    if (candidates.length === 0) {
      throw new AppError("UNSUPPORTED_MEDIA", "Bu Tenor GIF'inin medya adresi okunamadı.");
    }

    return { candidates, filenameHint: `tenor-${id}` };
  },
};
