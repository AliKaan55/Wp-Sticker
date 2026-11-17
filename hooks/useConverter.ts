
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError } from "@/lib/services/api-client-utils";
import { convertMedia } from "@/lib/services/conversion-client";
import { buildOutputFilename } from "@/lib/utils/format";
import type { ConversionStatus, ConvertedFile } from "@/types/api";
import type { CropRect, OutputType } from "@/types/media";

export interface UseConverterReturn {
  status: ConversionStatus;
  result: ConvertedFile | null;
  error: string | null;
  isProcessing: boolean;
  convert: (
    file: File,
    dimension: number,
    outputType: OutputType,
    crop?: CropRect | null,
  ) => Promise<void>;
  reset: () => void;
  dismissError: () => void;
}

export function useConverter(): UseConverterReturn {
  const [status, setStatus] = useState<ConversionStatus>("idle");
  const [result, setResult] = useState<ConvertedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const urlRef = useRef<string | null>(null);

  const revokeUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(() => revokeUrl, [revokeUrl]);

  const reset = useCallback(() => {
    if (busyRef.current) {
      return;
    }
    revokeUrl();
    setResult(null);
    setError(null);
    setStatus("idle");
  }, [revokeUrl]);

  const dismissError = useCallback(() => setError(null), []);

  const convert = useCallback(
    async (
      file: File,
      dimension: number,
      outputType: OutputType,
      crop: CropRect | null = null,
    ): Promise<void> => {
      if (busyRef.current) {
        return;
      }

      busyRef.current = true;
      revokeUrl();
      setResult(null);
      setError(null);
      setStatus("processing");

      try {
        const output = await convertMedia(file, dimension, outputType, crop);
        const url = URL.createObjectURL(output.blob);
        urlRef.current = url;

        setResult({
          ...output,
          url,
          // Use the server's actual output width, not the requested
          // dimension: "Orijinal" (0) gets clamped to 512 for sticker
          // output, and the filename should reflect what was really made.
          filename: buildOutputFilename(file.name, outputType, output.width, output.extension),
        });
        setStatus("success");
      } catch (caught) {
        const message =
          caught instanceof ApiClientError
            ? caught.message
            : "Dönüştürme sırasında bir sorun oluştu. Lütfen tekrar deneyin.";
        setError(message);
        setStatus("error");
      } finally {
        busyRef.current = false;
      }
    },
    [revokeUrl],
  );

  return {
    status,
    result,
    error,
    isProcessing: status === "processing",
    convert,
    reset,
    dismissError,
  };
}


