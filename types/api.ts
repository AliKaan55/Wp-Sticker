
import type { MediaKind, MediaMimeType, OutputType } from "./media";

export type ApiErrorCode =
  | "MISSING_FILE"
  | "EMPTY_FILE"
  | "INVALID_FORMAT"
  | "FILE_TOO_LARGE"
  | "INVALID_OPTIONS"
  | "CORRUPT_IMAGE"
  | "UNSUPPORTED_MEDIA"
  | "CONVERSION_FAILED"
  | "SERVER_ERROR"
  | "INVALID_URL"
  | "BLOCKED_HOST"
  | "MEDIA_NOT_ACCESSIBLE"
  | "FETCH_FAILED"
  | "FETCH_TIMEOUT"
  | "REMOTE_ERROR";

export interface ApiErrorBody {
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
  };
}

export interface ConversionMeta {
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
  readonly warnings: readonly string[];
}

export interface ConversionOutput extends ConversionMeta {
  readonly blob: Blob;
  readonly mimeType: string;
  readonly extension: string;
  readonly outputType: OutputType;
}

export interface ConvertedFile extends ConversionOutput {
  readonly url: string;
  readonly filename: string;
}

export type ConversionStatus = "idle" | "processing" | "success" | "error";

export interface ImportedMediaMeta {
  readonly mimeType: MediaMimeType;
  readonly kind: MediaKind;
  readonly sizeBytes: number;
  readonly filename: string;
}


