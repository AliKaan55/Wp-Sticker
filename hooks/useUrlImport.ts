
"use client";

import { useCallback, useRef, useState } from "react";
import { ApiClientError } from "@/lib/services/api-client-utils";
import { fetchMediaFromUrl } from "@/lib/services/import-client";
import { parseImportUrl } from "@/lib/utils/url-validation";

export interface UseUrlImportReturn {
  isLoading: boolean;
  error: string | null;
  importUrl: (rawUrl: string) => Promise<File | null>;
  clearError: () => void;
}

export function useUrlImport(): UseUrlImportReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const importUrl = useCallback(async (rawUrl: string): Promise<File | null> => {
    if (busyRef.current) {
      return null;
    }

    setError(null);

    const validation = parseImportUrl(rawUrl);
    if (!validation.ok) {
      setError(validation.message);
      return null;
    }

    busyRef.current = true;
    setIsLoading(true);

    try {
      return await fetchMediaFromUrl(validation.url.href);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError
          ? caught.message
          : "Medya içe aktarılamadı. Lütfen tekrar deneyin.",
      );
      return null;
    } finally {
      busyRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { isLoading, error, importUrl, clearError };
}


