
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  MEDIA_EXTENSIONS,
  MEDIA_MIME_TYPES,
  OUTPUT_OPTIONS,
  SIZE_OPTIONS,
} from "@/lib/constants";
import type { ApiErrorCode } from "@/types/api";
import type { ConversionOptions, CropRect } from "@/types/media";
import { AppError } from "./errors";

// Sanity ceiling for crop values coming from the client, before we clamp
// them against the actual decoded media dimensions in the processors. This
// just rejects obviously bogus/abusive input early.
const MAX_CROP_PIXELS = 20_000;

export interface FileMeta {
  readonly name: string;
  readonly type: string;
  readonly size: number;
}

export type ValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: ApiErrorCode; readonly message: string };

const INVALID_FORMAT_MESSAGE =
  "Bu dosya türü desteklenmiyor. JPG, PNG, WEBP, GIF, MP4 veya WEBM kullanın.";

export function getExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index === -1 ? "" : filename.slice(index).toLowerCase();
}

export function validateFileMeta(file: FileMeta): ValidationResult {
  if (file.size === 0) {
    return {
      ok: false,
      code: "EMPTY_FILE",
      message: "Bu dosya boş. Lütfen başka bir dosya seçin.",
    };
  }

  const extensionAccepted = MEDIA_EXTENSIONS.includes(getExtension(file.name));
  const mime = file.type.toLowerCase();
  const mimeAccepted = mime === "" || (MEDIA_MIME_TYPES as readonly string[]).includes(mime);

  if (!extensionAccepted || !mimeAccepted) {
    return { ok: false, code: "INVALID_FORMAT", message: INVALID_FORMAT_MESSAGE };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: `Dosya çok büyük. İzin verilen en büyük boyut ${MAX_FILE_SIZE_LABEL}.`,
    };
  }

  return { ok: true };
}

export function parseConversionOptions(
  sizeValue: FormDataEntryValue | null,
  outputValue: FormDataEntryValue | null,
): ConversionOptions {
  const dimension = typeof sizeValue === "string" ? Number.parseInt(sizeValue, 10) : Number.NaN;
  const sizeAllowed = SIZE_OPTIONS.some((option) => option.dimension === dimension);
  if (!sizeAllowed) {
    throw new AppError(
      "INVALID_OPTIONS",
      "Geçerli bir boyut seçin: Küçük (256), Orta (384), Büyük (512) veya Orijinal.",
      400,
    );
  }

  const outputType = OUTPUT_OPTIONS.find((option) => option.type === outputValue)?.type;
  if (!outputType) {
    throw new AppError(
      "INVALID_OPTIONS",
      "Geçerli bir çıktı türü seçin: WhatsApp Çıkartması veya WhatsApp Görseli.",
      400,
    );
  }

  return { dimension, outputType };
}

export function parseCropOption(raw: FormDataEntryValue | null): CropRect | null {
  if (raw === null || raw === "") {
    return null;
  }
  if (typeof raw !== "string") {
    throw new AppError("INVALID_OPTIONS", "Kırpma bilgisi okunamadı.", 400);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError("INVALID_OPTIONS", "Kırpma bilgisi okunamadı.", 400);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new AppError("INVALID_OPTIONS", "Kırpma bilgisi okunamadı.", 400);
  }

  const { x, y, width, height } = parsed as Record<string, unknown>;
  const values = [x, y, width, height];
  const allFinite = values.every((value) => typeof value === "number" && Number.isFinite(value));
  if (!allFinite) {
    throw new AppError("INVALID_OPTIONS", "Kırpma bilgisi geçersiz.", 400);
  }

  const rect = { x: x as number, y: y as number, width: width as number, height: height as number };
  const withinBounds =
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.width > 0 &&
    rect.height > 0 &&
    rect.x + rect.width <= MAX_CROP_PIXELS &&
    rect.y + rect.height <= MAX_CROP_PIXELS;

  if (!withinBounds) {
    throw new AppError("INVALID_OPTIONS", "Kırpma alanı geçersiz.", 400);
  }

  return rect;
}


