
import type { ApiErrorCode } from "@/types/api";

export const ERROR_STATUS: Readonly<Record<ApiErrorCode, number>> = {
  MISSING_FILE: 400,
  EMPTY_FILE: 400,
  INVALID_FORMAT: 400,
  FILE_TOO_LARGE: 413,
  INVALID_OPTIONS: 400,
  CORRUPT_IMAGE: 422,
  UNSUPPORTED_MEDIA: 415,
  CONVERSION_FAILED: 500,
  SERVER_ERROR: 500,
  INVALID_URL: 400,
  BLOCKED_HOST: 403,
  MEDIA_NOT_ACCESSIBLE: 404,
  FETCH_FAILED: 502,
  FETCH_TIMEOUT: 504,
  REMOTE_ERROR: 502,
};

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status: number = ERROR_STATUS[code]) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}


