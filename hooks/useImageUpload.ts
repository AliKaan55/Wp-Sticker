
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMediaKindFromFile } from "@/lib/utils/media";
import { validateFileMeta } from "@/lib/utils/validation";
import type { MediaKind } from "@/types/media";

export interface UseImageUploadReturn {
  file: File | null;
  mediaKind: MediaKind | null;
  previewUrl: string | null;
  error: string | null;
  selectFile: (candidate: File | null | undefined) => boolean;
  clearFile: () => void;
  dismissError: () => void;
}

export function useImageUpload(): UseImageUploadReturn {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const revokeUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(() => revokeUrl, [revokeUrl]);

  const mediaKind = useMemo<MediaKind | null>(
    () => (file ? getMediaKindFromFile(file) : null),
    [file],
  );

  const selectFile = useCallback(
    (candidate: File | null | undefined): boolean => {
      if (!candidate) {
        return false;
      }

      const validation = validateFileMeta({
        name: candidate.name,
        type: candidate.type,
        size: candidate.size,
      });

      if (!validation.ok) {
        setError(validation.message);
        return false;
      }

      revokeUrl();
      const url = URL.createObjectURL(candidate);
      urlRef.current = url;
      setFile(candidate);
      setPreviewUrl(url);
      setError(null);
      return true;
    },
    [revokeUrl],
  );

  const clearFile = useCallback(() => {
    revokeUrl();
    setFile(null);
    setPreviewUrl(null);
    setError(null);
  }, [revokeUrl]);

  const dismissError = useCallback(() => setError(null), []);

  return { file, mediaKind, previewUrl, error, selectFile, clearFile, dismissError };
}


