
import { GIPHY_API_BASE, GIPHY_HOSTS, JSON_CONTENT_TYPES, JSON_RESPONSE_MAX_BYTES } from "@/lib/constants";
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

// Giphy page URLs look like https://giphy.com/gifs/some-slug-words-<ID>, or
// occasionally just https://giphy.com/gifs/<ID> with no slug words. The ID
// is always the trailing alphanumeric run after the last hyphen (or the
// whole last path segment, if it has no hyphen).
export function parseGiphyId(url: URL): string | null {
  const lastSegment = url.pathname.split("/").filter(Boolean).pop();
  if (!lastSegment) {
    return null;
  }
  const afterLastDash = lastSegment.includes("-") ? lastSegment.split("-").pop() : lastSegment;
  if (!afterLastDash || !/^[a-zA-Z0-9]{4,40}$/.test(afterLastDash)) {
    return null;
  }
  return afterLastDash;
}

function getApiKey(): string {
  const key = process.env.GIPHY_API_KEY;
  if (!key) {
    throw new AppError(
      "SERVER_ERROR",
      "Sunucu yapılandırması eksik: GIPHY_API_KEY tanımlı değil.",
      500,
    );
  }
  return key;
}

async function fetchGiphyJson(id: string, context: ResolveContext): Promise<unknown> {
  const endpoint = new URL(`${GIPHY_API_BASE}${encodeURIComponent(id)}`);
  endpoint.searchParams.set("api_key", getApiKey());

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
      throw new AppError("MEDIA_NOT_ACCESSIBLE", "Bu Giphy bağlantısı bulunamadı ya da kaldırılmış.");
    }
    if (error instanceof AppError && error.code === "UNSUPPORTED_MEDIA") {
      throw new AppError("FETCH_FAILED", "Giphy'den beklenmeyen bir yanıt alındı. Daha sonra tekrar deneyin.");
    }
    throw error;
  }

  try {
    return JSON.parse(body.toString("utf8")) as unknown;
  } catch {
    throw new AppError("FETCH_FAILED", "Giphy'den gelen yanıt okunamadı. Daha sonra tekrar deneyin.");
  }
}

function toCandidateUrls(data: unknown): URL[] {
  if (!isRecord(data) || !isRecord(data.data) || !isRecord(data.data.images)) {
    return [];
  }

  const images = data.data.images as UnknownRecord;
  const rawUrls: string[] = [];

  for (const key of ["original", "downsized_large", "fixed_height"]) {
    const variant = images[key];
    if (!isRecord(variant)) continue;
    const mp4 = asString(variant.mp4);
    if (mp4) rawUrls.push(mp4);
    const gifUrl = asString(variant.url);
    if (gifUrl) rawUrls.push(gifUrl);
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

export const giphyResolver: MediaUrlResolver = {
  id: "giphy",

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!GIPHY_HOSTS.includes(host)) return false;
    // Direct media.giphy.com / i.giphy.com CDN links are already fetchable
    // as-is (plain image/gif or video/mp4), so only intercept the giphy.com
    // *page* URLs that need the API to find the real media link.
    return host === "giphy.com";
  },

  async resolve(url: URL, context: ResolveContext): Promise<ResolvedMedia> {
    const id = parseGiphyId(url);
    if (!id) {
      throw new AppError(
        "INVALID_URL",
        "Bu Giphy bağlantısı bir GIF'e işaret etmiyor. Bir GIF sayfası bağlantısı yapıştırın.",
      );
    }

    const data = await fetchGiphyJson(id, context);
    const candidates = toCandidateUrls(data);
    if (candidates.length === 0) {
      throw new AppError("UNSUPPORTED_MEDIA", "Bu Giphy GIF'inin medya adresi okunamadı.");
    }

    return { candidates, filenameHint: `giphy-${id}` };
  },
};
