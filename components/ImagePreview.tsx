"use client";

import { useState } from "react";
import { formatBytes, getFileTypeLabel } from "@/lib/utils/format";
import type { CropRect, MediaKind } from "@/types/media";
import { CropTool } from "@/components/CropTool";
import { DetailItem } from "@/components/ui/DetailItem";
import { Spinner } from "@/components/ui/Spinner";

interface ImagePreviewProps {
  src: string;
  fileName: string;
  fileSize: number;
  mediaKind: MediaKind;
  disabled?: boolean;
  onRemove: () => void;
  // Manual crop tool: when enabled, a draggable rectangle is drawn over the
  // media once its natural dimensions are known, and onCropChange reports
  // the selected region in the media's own (already EXIF/rotation-corrected)
  // pixel space — the same space the server applies the crop in.
  cropEnabled?: boolean;
  crop?: CropRect | null;
  onCropChange?: (crop: CropRect | null) => void;
}

interface PreviewState {
  readonly src: string;
  readonly status: "loaded" | "error";
  readonly width: number;
  readonly height: number;
}

export function ImagePreview({
  src,
  fileName,
  fileSize,
  mediaKind,
  disabled = false,
  onRemove,
  cropEnabled = false,
  crop = null,
  onCropChange,
}: ImagePreviewProps) {
  const [state, setState] = useState<PreviewState | null>(null);
  const current = state?.src === src ? state : null;
  const isLoading = current === null;
  const hasFailed = current?.status === "error";
  // Crop mode needs the media's natural size before it can draw the
  // overlay, so it only takes over once the normal load path below has
  // already run once and populated `current`.
  const showCropTool = cropEnabled && current?.status === "loaded" && Boolean(onCropChange);

  const resolution = current?.status === "loaded"
    ? `${current.width} × ${current.height} px`
    : hasFailed
      ? "Okunamadı"
      : "Hesaplanıyor...";

  return (
    <div className="flex flex-col gap-4">
      <div className="checkerboard relative flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-border p-2">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted">
            <Spinner className="h-8 w-8" label="Önizleme yükleniyor" />
          </div>
        ) : null}

        {hasFailed ? (
          <p className="px-4 text-center text-sm text-muted">
            Bu dosya tarayıcıda önizlenemiyor.
          </p>
        ) : null}

        {showCropTool && current ? (
          // Crop mode: the box's aspect ratio is forced to match the
          // media's own natural dimensions exactly (no object-contain
          // letterboxing), so CropTool's percentage-based coordinates line
          // up 1:1 with real source pixels.
          <div
            className="relative max-h-80 w-full"
            style={{ aspectRatio: `${current.width} / ${current.height}` }}
          >
            {mediaKind === "video" ? (
              <video
                src={src}
                muted
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={`${fileName} önizlemesi`} className="absolute inset-0 h-full w-full" />
            )}
            <CropTool
              naturalWidth={current.width}
              naturalHeight={current.height}
              crop={crop}
              disabled={disabled}
              onChange={(next) => onCropChange?.(next)}
            />
          </div>
        ) : mediaKind === "video" ? (
          <video
            src={src}
            controls
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) =>
              setState({
                src,
                status: "loaded",
                width: event.currentTarget.videoWidth,
                height: event.currentTarget.videoHeight,
              })
            }
            onError={() => setState({ src, status: "error", width: 0, height: 0 })}
            className={`max-h-80 w-auto max-w-full ${isLoading || hasFailed ? "hidden" : ""}`}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`${fileName} önizlemesi`}
            onLoad={(event) =>
              setState({
                src,
                status: "loaded",
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            onError={() => setState({ src, status: "error", width: 0, height: 0 })}
            className={`max-h-80 w-auto max-w-full object-contain ${isLoading || hasFailed ? "hidden" : ""}`}
          />
        )}
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DetailItem label="Dosya türü" value={getFileTypeLabel(fileName)} />
        <DetailItem label="Çözünürlük" value={resolution} />
        <DetailItem label="Dosya boyutu" value={formatBytes(fileSize)} />
      </dl>

      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium text-foreground">{fileName}</p>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-danger hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          Medyayı kaldır
        </button>
      </div>
    </div>
  );
}
