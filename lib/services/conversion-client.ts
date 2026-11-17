
import { CONVERT_ENDPOINT, META_HEADER, OUTPUT_OPTIONS } from "@/lib/constants";
import type { ConversionMeta, ConversionOutput } from "@/types/api";
import type { CropRect, OutputOption, OutputType } from "@/types/media";
import { ApiClientError, NETWORK_ERROR_MESSAGE, readApiErrorMessage } from "./api-client-utils";

function parseMeta(header: string | null, fallbackSize: number, dimension: number): ConversionMeta {
  const fallback: ConversionMeta = {
    width: dimension,
    height: dimension,
    sizeBytes: fallbackSize,
    warnings: [],
  };

  if (!header) {
    return fallback;
  }

  try {
    const parsed: unknown = JSON.parse(header);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "width" in parsed &&
      "height" in parsed &&
      "sizeBytes" in parsed &&
      "warnings" in parsed
    ) {
      const candidate = parsed as {
        width: unknown;
        height: unknown;
        sizeBytes: unknown;
        warnings: unknown;
      };
      if (
        typeof candidate.width === "number" &&
        typeof candidate.height === "number" &&
        typeof candidate.sizeBytes === "number" &&
        Array.isArray(candidate.warnings)
      ) {
        return {
          width: candidate.width,
          height: candidate.height,
          sizeBytes: candidate.sizeBytes,
          warnings: candidate.warnings
            .filter((item): item is string => typeof item === "string")
            .map((item) => decodeURIComponent(item)),
        };
      }
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function getOutputOption(outputType: OutputType): OutputOption {
  const option = OUTPUT_OPTIONS.find((item) => item.type === outputType);
  if (!option) {
    throw new ApiClientError("Bilinmeyen çıktı türü.");
  }
  return option;
}

export async function convertMedia(
  file: File,
  dimension: number,
  outputType: OutputType,
  crop: CropRect | null = null,
): Promise<ConversionOutput> {
  const body = new FormData();
  body.append("file", file);
  body.append("size", String(dimension));
  body.append("output", outputType);
  if (crop) {
    body.append("crop", JSON.stringify(crop));
  }

  let response: Response;
  try {
    response = await fetch(CONVERT_ENDPOINT, { method: "POST", body });
  } catch {
    throw new ApiClientError(NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) {
    throw new ApiClientError(
      await readApiErrorMessage(response, "Dönüştürme başarısız oldu. Lütfen tekrar deneyin."),
    );
  }

  const blob = await response.blob();
  const meta = parseMeta(response.headers.get(META_HEADER), blob.size, dimension);
  const option = getOutputOption(outputType);

  return {
    ...meta,
    blob,
    mimeType: option.mimeType,
    extension: option.extension,
    outputType,
  };
}

