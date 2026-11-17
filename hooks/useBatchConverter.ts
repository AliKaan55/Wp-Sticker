
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BATCH_CONCURRENCY, BATCH_MAX_FILES } from "@/lib/constants";
import { ApiClientError } from "@/lib/services/api-client-utils";
import { convertMedia } from "@/lib/services/conversion-client";
import { getMediaKindFromFile } from "@/lib/utils/media";
import { buildOutputFilename } from "@/lib/utils/format";
import { validateFileMeta } from "@/lib/utils/validation";
import type { BatchItem, BatchItemStatus } from "@/types/batch";
import type { OutputType } from "@/types/media";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface UseBatchConverterReturn {
  items: readonly BatchItem[];
  isConverting: boolean;
  queueError: string | null;
  addFiles: (files: FileList | File[]) => void;
  removeItem: (id: string) => void;
  clearAll: () => void;
  dismissQueueError: () => void;
  convertAll: (dimension: number, outputType: OutputType) => Promise<void>;
}

export function useBatchConverter(): UseBatchConverterReturn {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const itemsRef = useRef<BatchItem[]>([]);
  itemsRef.current = items;

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.previewUrl);
        if (item.result) {
          URL.revokeObjectURL(item.result.url);
        }
      }
    };
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<BatchItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) {
      return;
    }

    setItems((current) => {
      const room = BATCH_MAX_FILES - current.length;
      if (room <= 0) {
        setQueueError(`En fazla ${BATCH_MAX_FILES} dosya ekleyebilirsiniz.`);
        return current;
      }

      const accepted: BatchItem[] = [];
      let rejected = 0;

      for (const file of incoming.slice(0, room)) {
        const validation = validateFileMeta({ name: file.name, type: file.type, size: file.size });
        if (!validation.ok) {
          rejected += 1;
          continue;
        }
        accepted.push({
          id: createId(),
          file,
          previewUrl: URL.createObjectURL(file),
          mediaKind: getMediaKindFromFile(file),
          status: "queued",
          result: null,
          error: null,
        });
      }

      if (incoming.length > room) {
        setQueueError(`En fazla ${BATCH_MAX_FILES} dosya ekleyebilirsiniz, bazı dosyalar eklenmedi.`);
      } else if (rejected > 0) {
        setQueueError(`${rejected} dosya desteklenmeyen türde ya da çok büyük olduğu için eklenmedi.`);
      } else {
        setQueueError(null);
      }

      return [...current, ...accepted];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        if (target.result) {
          URL.revokeObjectURL(target.result.url);
        }
      }
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    for (const item of itemsRef.current) {
      URL.revokeObjectURL(item.previewUrl);
      if (item.result) {
        URL.revokeObjectURL(item.result.url);
      }
    }
    setItems([]);
    setQueueError(null);
  }, []);

  const dismissQueueError = useCallback(() => setQueueError(null), []);

  const convertAll = useCallback(
    async (dimension: number, outputType: OutputType): Promise<void> => {
      if (isConverting) {
        return;
      }

      const targets = itemsRef.current.filter(
        (item): item is BatchItem & { status: "queued" | "error" } =>
          item.status === "queued" || item.status === "error",
      );
      if (targets.length === 0) {
        return;
      }

      setIsConverting(true);

      const queue = [...targets];
      const worker = async (): Promise<void> => {
        for (;;) {
          const next = queue.shift();
          if (!next) return;

          updateItem(next.id, { status: "converting" satisfies BatchItemStatus, error: null });

          try {
            const output = await convertMedia(next.file, dimension, outputType);
            const url = URL.createObjectURL(output.blob);
            updateItem(next.id, {
              status: "done",
              result: {
                ...output,
                url,
                filename: buildOutputFilename(next.file.name, outputType, output.width, output.extension),
              },
              error: null,
            });
          } catch (caught) {
            const message =
              caught instanceof ApiClientError
                ? caught.message
                : "Dönüştürme sırasında bir sorun oluştu.";
            updateItem(next.id, { status: "error", error: message });
          }
        }
      };

      const workers = Array.from({ length: Math.min(BATCH_CONCURRENCY, queue.length) }, () => worker());
      await Promise.all(workers);

      setIsConverting(false);
    },
    [isConverting, updateItem],
  );

  return {
    items,
    isConverting,
    queueError,
    addFiles,
    removeItem,
    clearAll,
    dismissQueueError,
    convertAll,
  };
}
