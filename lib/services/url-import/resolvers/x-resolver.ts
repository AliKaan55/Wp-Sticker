
import {
  JSON_CONTENT_TYPES,
  JSON_RESPONSE_MAX_BYTES,
  SYNDICATION_ENDPOINT,
  X_STATUS_HOSTS,
} from "@/lib/constants";
import { AppError } from "@/lib/utils/errors";
import { parseImportUrl } from "@/lib/utils/url-validation";
import { safeFetch } from "../safe-fetch";
import type { MediaUrlResolver, ResolveContext, ResolvedMedia } from "./types";

export type TweetMediaKind = "photo" | "video" | "gif";

export interface TweetMedia {
  readonly kind: TweetMediaKind;
  readonly imageUrl: string | null;
  readonly videoUrls: readonly string[];
}

export interface TweetReference {
  readonly tweetId: string;
  readonly mediaIndex: number;
}

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

export function getSyndicationToken(tweetId: string): string {
  return ((Number(tweetId) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

export function parseTweetReference(url: URL): TweetReference | null {
  const statusMatch = /\/status(?:es)?\/(\d{1,25})(?:[/?#]|$)/.exec(url.pathname);
  const tweetId = statusMatch?.[1];
  if (!tweetId) {
    return null;
  }
  const mediaMatch = /\/(?:photo|video)\/(\d{1,2})(?:[/?#]|$)/.exec(url.pathname);
  const requested = mediaMatch?.[1] ? Number.parseInt(mediaMatch[1], 10) : 1;
  return { tweetId, mediaIndex: Math.max(0, requested - 1) };
}

function extractVideoUrls(videoInfo: unknown): string[] {
  if (!isRecord(videoInfo)) {
    return [];
  }

  const variants: { url: string; bitrate: number }[] = [];
  for (const entry of asArray(videoInfo.variants)) {
    if (!isRecord(entry) || entry.content_type !== "video/mp4") {
      continue;
    }
    const variantUrl = asString(entry.url);
    if (variantUrl) {
      const bitrate = typeof entry.bitrate === "number" ? entry.bitrate : 0;
      variants.push({ url: variantUrl, bitrate });
    }
  }

  return variants.sort((a, b) => b.bitrate - a.bitrate).map((variant) => variant.url);
}

export function extractTweetMedia(data: unknown): TweetMedia[] {
  if (!isRecord(data)) {
    return [];
  }

  const result: TweetMedia[] = [];

  for (const entry of asArray(data.mediaDetails)) {
    if (!isRecord(entry)) {
      continue;
    }
    const imageUrl = asString(entry.media_url_https);

    if (entry.type === "photo" && imageUrl) {
      result.push({ kind: "photo", imageUrl, videoUrls: [] });
    } else if (entry.type === "video" || entry.type === "animated_gif") {
      const videoUrls = extractVideoUrls(entry.video_info);
      if (videoUrls.length > 0) {
        result.push({
          kind: entry.type === "video" ? "video" : "gif",
          imageUrl,
          videoUrls,
        });
      }
    }
  }

  if (result.length > 0) {
    return result;
  }

  for (const entry of asArray(data.photos)) {
    const photoUrl = isRecord(entry) ? asString(entry.url) : null;
    if (photoUrl) {
      result.push({ kind: "photo", imageUrl: photoUrl, videoUrls: [] });
    }
  }

  if (isRecord(data.video)) {
    const videoUrls = asArray(data.video.variants)
      .filter((entry): entry is UnknownRecord => isRecord(entry) && entry.type === "video/mp4")
      .map((entry) => asString(entry.src))
      .filter((src): src is string => src !== null);
    if (videoUrls.length > 0) {
      result.push({ kind: "video", imageUrl: asString(data.video.poster), videoUrls });
    }
  }

  return result;
}

function toCandidateUrls(media: TweetMedia): URL[] {
  const rawUrls: string[] = [];

  if (media.kind === "photo" && media.imageUrl) {
    try {
      const large = new URL(media.imageUrl);
      large.searchParams.set("name", "large");
      rawUrls.push(large.href);
    } catch {
      // Geçersiz adres; aşağıdaki doğrulama bunu eler.
    }
    rawUrls.push(media.imageUrl);
  } else {
    rawUrls.push(...media.videoUrls);
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

async function fetchTweetJson(tweetId: string, context: ResolveContext): Promise<unknown> {
  const endpoint = new URL(SYNDICATION_ENDPOINT);
  endpoint.searchParams.set("id", tweetId);
  endpoint.searchParams.set("lang", "en");
  endpoint.searchParams.set("token", getSyndicationToken(tweetId));

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
      throw new AppError(
        "MEDIA_NOT_ACCESSIBLE",
        "Bu X gönderisine ulaşılamadı. Gönderi silinmiş, gizli ya da hassas içerik nedeniyle kısıtlı olabilir.",
      );
    }
    if (error instanceof AppError && error.code === "UNSUPPORTED_MEDIA") {
      throw new AppError("FETCH_FAILED", "X'ten beklenmeyen bir yanıt alındı. Daha sonra tekrar deneyin.");
    }
    throw error;
  }

  try {
    return JSON.parse(body.toString("utf8")) as unknown;
  } catch {
    throw new AppError("FETCH_FAILED", "X'ten gelen yanıt okunamadı. Daha sonra tekrar deneyin.");
  }
}

export const xResolver: MediaUrlResolver = {
  id: "x",

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return X_STATUS_HOSTS.includes(host);
  },

  async resolve(url: URL, context: ResolveContext): Promise<ResolvedMedia> {
    const reference = parseTweetReference(url);
    if (!reference) {
      throw new AppError(
        "INVALID_URL",
        "Bu X bağlantısı bir gönderiye işaret etmiyor. Gönderi bağlantısını (…/status/…) yapıştırın.",
      );
    }

    const data = await fetchTweetJson(reference.tweetId, context);

    if (isRecord(data) && data.__typename === "TweetTombstone") {
      throw new AppError(
        "MEDIA_NOT_ACCESSIBLE",
        "Bu X gönderisi mevcut değil ya da görüntülenmesi kısıtlanmış.",
      );
    }

    const media = extractTweetMedia(data);
    if (media.length === 0) {
      throw new AppError(
        "UNSUPPORTED_MEDIA",
        "Bu gönderide görsel, GIF veya video bulunamadı.",
      );
    }

    const selected = media[reference.mediaIndex];
    if (!selected) {
      throw new AppError(
        "UNSUPPORTED_MEDIA",
        `Bu gönderide ${reference.mediaIndex + 1}. medya yok. Gönderide ${media.length} medya var.`,
      );
    }

    const candidates = toCandidateUrls(selected);
    if (candidates.length === 0) {
      throw new AppError("UNSUPPORTED_MEDIA", "Bu gönderideki medya adresi okunamadı.");
    }

    const suffix = media.length > 1 ? `-${reference.mediaIndex + 1}` : "";
    return { candidates, filenameHint: `x-${reference.tweetId}${suffix}` };
  },
};


