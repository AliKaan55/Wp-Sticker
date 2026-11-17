
import type { MediaKind, MediaMimeType } from "@/types/media";

interface MediaInfo {
  readonly kind: MediaKind;
  readonly extension: string;
}

const MEDIA_INFO: Readonly<Record<MediaMimeType, MediaInfo>> = {
  "image/jpeg": { kind: "image", extension: "jpg" },
  "image/png": { kind: "image", extension: "png" },
  "image/webp": { kind: "image", extension: "webp" },
  "image/gif": { kind: "gif", extension: "gif" },
  "video/mp4": { kind: "video", extension: "mp4" },
  "video/webm": { kind: "video", extension: "webm" },
};

const EXTENSION_KIND: Readonly<Record<string, MediaKind>> = {
  ".gif": "gif",
  ".mp4": "video",
  ".webm": "video",
};

export function isMediaMimeType(value: string): value is MediaMimeType {
  return Object.prototype.hasOwnProperty.call(MEDIA_INFO, value);
}

export function getMediaInfo(mimeType: MediaMimeType): MediaInfo {
  return MEDIA_INFO[mimeType];
}

export function getMediaKindFromFile(file: { readonly name: string; readonly type: string }): MediaKind {
  const mime = file.type.toLowerCase();
  if (isMediaMimeType(mime)) {
    return MEDIA_INFO[mime].kind;
  }
  const dotIndex = file.name.lastIndexOf(".");
  const extension = dotIndex === -1 ? "" : file.name.slice(dotIndex).toLowerCase();
  return EXTENSION_KIND[extension] ?? "image";
}


