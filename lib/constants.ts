
import type {
  MediaMimeType,
  OutputOption,
  SizeOption,
} from "@/types/media";

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_FILE_SIZE_LABEL = "20 MB";

export const MEDIA_MIME_TYPES: readonly MediaMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
];

export const MEDIA_EXTENSIONS: readonly string[] = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".mp4",
  ".webm",
];

export const PROCESSABLE_MIME_TYPES: readonly MediaMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const FILE_INPUT_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";

// Sentinel dimension meaning "don't resize, keep the source's own
// resolution". 0 is never a real width/height, so it's safe to use here.
export const ORIGINAL_DIMENSION = 0;

// WhatsApp stickers (static and animated) must be a square canvas, so
// "Orijinal" isn't a valid choice for those output types. When it's picked
// anyway, we fall back to this size instead of failing the conversion.
export const STICKER_FALLBACK_DIMENSION = 512;

export const SIZE_OPTIONS: readonly SizeOption[] = [
  { key: "small", label: "Küçük", dimension: 256 },
  { key: "medium", label: "Orta", dimension: 384 },
  { key: "large", label: "Büyük", dimension: 512 },
  { key: "original", label: "Orijinal", dimension: ORIGINAL_DIMENSION },
];

export const DEFAULT_SIZE_KEY = "large" as const;

export const OUTPUT_OPTIONS: readonly OutputOption[] = [
  {
    type: "sticker",
    label: "WhatsApp Çıkartması",
    description: "Şeffaf WEBP. Video ve GIF'ler animasyonlu çıkartma olur",
    extension: "webp",
    mimeType: "image/webp",
  },
  {
    type: "image",
    label: "WhatsApp Görseli",
    description: "Seçilen boyuta sığdırılmış (veya orijinal boyutta) PNG (video ve GIF'te ilk kare)",
    extension: "png",
    mimeType: "image/png",
  },
  {
    type: "animation",
    label: "Animasyonlu Çıkartma (WebP)",
    description: "WhatsApp'ta çıkartma olarak kullanmak için animasyonlu WebP",
    extension: "webp",
    mimeType: "image/webp",
  },
];

export const DEFAULT_OUTPUT_TYPE = "sticker" as const;

export const STICKER_MAX_BYTES = 100 * 1024;
export const ANIMATED_STICKER_MAX_BYTES = 500 * 1024;
export const ANIMATED_STICKER_MAX_SECONDS = 10;

export interface AnimatedEncodeAttempt {
  readonly fps: number;
  readonly quality: number;
}

export const ANIMATED_ENCODE_ATTEMPTS: readonly AnimatedEncodeAttempt[] = [
  { fps: 15, quality: 65 },
  { fps: 15, quality: 45 },
  { fps: 12, quality: 35 },
  { fps: 10, quality: 25 },
  { fps: 8, quality: 15 },
];

export const FFMPEG_ATTEMPT_TIMEOUT_MS = 25_000;
export const FFMPEG_TOTAL_TIMEOUT_MS = 50_000;
export const FFMPEG_MAX_CONCURRENT = 2;
export const STICKER_QUALITY_STEPS: readonly number[] = [90, 80, 70, 60, 50, 40, 30, 20];

export const CONVERT_ENDPOINT = "/api/convert";
export const META_HEADER = "X-Media-Meta";
export const IMPORT_ENDPOINT = "/api/import-url";
export const IMPORT_META_HEADER = "X-Import-Meta";
export const URL_MAX_LENGTH = 2048;
export const URL_IMPORT_TIMEOUT_MS = 15_000;
export const URL_IMPORT_TIMEOUT_SECONDS = 15;
export const URL_IMPORT_MAX_REDIRECTS = 6;

export const IMPORT_DECLARED_CONTENT_TYPES: readonly string[] = [
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/octet-stream",
  "binary/octet-stream",
];

export const X_STATUS_HOSTS: readonly string[] = [
  "x.com",
  "twitter.com",
  "mobile.x.com",
  "mobile.twitter.com",
  "fxtwitter.com",
  "vxtwitter.com",
  "fixupx.com",
];

export const SYNDICATION_ENDPOINT = "https://cdn.syndication.twimg.com/tweet-result";
export const JSON_RESPONSE_MAX_BYTES = 2 * 1024 * 1024;

export const JSON_CONTENT_TYPES: readonly string[] = [
  "application/json",
  "text/plain",
  "application/octet-stream",
];

// Giphy: https://developers.giphy.com/dashboard/ üzerinden ücretsiz API
// anahtarı alıp GIPHY_API_KEY ortam değişkenine koyun.
export const GIPHY_HOSTS: readonly string[] = ["giphy.com", "media.giphy.com", "i.giphy.com"];
export const GIPHY_API_BASE = "https://api.giphy.com/v1/gifs/";

// Tenor: https://developers.google.com/tenor/guides/quickstart üzerinden
// ücretsiz API anahtarı alıp TENOR_API_KEY ortam değişkenine koyun.
export const TENOR_HOSTS: readonly string[] = ["tenor.com", "media.tenor.com", "c.tenor.com"];
export const TENOR_API_BASE = "https://tenor.googleapis.com/v2/posts";
export const TENOR_CLIENT_KEY = "whatsapp-sticker-converter";

// WhatsApp'ın kendi çıkartma paketi kuralları: bir pakette en az 3, en
// fazla 30 çıkartma olabilir.
export const STICKER_PACK_MIN_COUNT = 3;
export const STICKER_PACK_MAX_COUNT = 30;
export const STICKER_PACK_TRAY_DIMENSION = 96;

// Toplu dönüştürmede aynı anda en fazla kaç dosyanın işlendiği (tarayıcıdan
// sunucuya aynı anda çok fazla istek gitmesini önlemek için).
export const BATCH_CONCURRENCY = 2;
export const BATCH_MAX_FILES = 30;

