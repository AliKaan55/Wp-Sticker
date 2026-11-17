"use client";

import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { CropRect } from "@/types/media";

interface CropToolProps {
  naturalWidth: number;
  naturalHeight: number;
  crop: CropRect | null;
  disabled?: boolean;
  onChange: (crop: CropRect | null) => void;
}

type Handle = "nw" | "ne" | "sw" | "se";

type DragState =
  | { kind: "create"; startX: number; startY: number }
  | { kind: "move"; startX: number; startY: number; origin: CropRect }
  | { kind: "resize"; handle: Handle; startX: number; startY: number; origin: CropRect };

const MIN_SIZE = 16;

function clampRect(rect: CropRect, naturalWidth: number, naturalHeight: number): CropRect {
  const width = Math.min(Math.max(rect.width, MIN_SIZE), naturalWidth);
  const height = Math.min(Math.max(rect.height, MIN_SIZE), naturalHeight);
  const x = Math.min(Math.max(rect.x, 0), Math.max(0, naturalWidth - width));
  const y = Math.min(Math.max(rect.y, 0), Math.max(0, naturalHeight - height));
  return { x, y, width, height };
}

// Draws a draggable/resizable rectangle over a media element to let the
// person pick their own crop region. The wrapping container (see
// ImagePreview) is sized to exactly match the media's own aspect ratio, so
// percentage-based coordinates here line up 1:1 with the source's own pixel
// space — no separate scale math needed for rendering, only for turning
// pointer movement (in screen pixels) into natural-pixel deltas.
export function CropTool({ naturalWidth, naturalHeight, crop, disabled = false, onChange }: CropToolProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const toNatural = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) {
        return { x: 0, y: 0 };
      }
      return {
        x: ((clientX - rect.left) / rect.width) * naturalWidth,
        y: ((clientY - rect.top) / rect.height) * naturalHeight,
      };
    },
    [naturalWidth, naturalHeight],
  );

  const getScale = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      return { scaleX: 1, scaleY: 1 };
    }
    return { scaleX: naturalWidth / rect.width, scaleY: naturalHeight / rect.height };
  }, [naturalWidth, naturalHeight]);

  const beginCreate = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    const point = toNatural(event.clientX, event.clientY);
    dragRef.current = { kind: "create", startX: point.x, startY: point.y };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const beginMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || !crop) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { kind: "move", startX: event.clientX, startY: event.clientY, origin: crop };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const beginResize = (handle: Handle) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || !crop) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { kind: "resize", handle, startX: event.clientX, startY: event.clientY, origin: crop };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    event.preventDefault();

    if (drag.kind === "create") {
      const point = toNatural(event.clientX, event.clientY);
      onChange(
        clampRect(
          {
            x: Math.min(drag.startX, point.x),
            y: Math.min(drag.startY, point.y),
            width: Math.abs(point.x - drag.startX),
            height: Math.abs(point.y - drag.startY),
          },
          naturalWidth,
          naturalHeight,
        ),
      );
      return;
    }

    const { scaleX, scaleY } = getScale();
    const dx = (event.clientX - drag.startX) * scaleX;
    const dy = (event.clientY - drag.startY) * scaleY;
    const origin = drag.origin;

    if (drag.kind === "move") {
      onChange(
        clampRect({ ...origin, x: origin.x + dx, y: origin.y + dy }, naturalWidth, naturalHeight),
      );
      return;
    }

    let next: CropRect = origin;
    switch (drag.handle) {
      case "se":
        next = { ...origin, width: origin.width + dx, height: origin.height + dy };
        break;
      case "sw":
        next = { x: origin.x + dx, y: origin.y, width: origin.width - dx, height: origin.height + dy };
        break;
      case "ne":
        next = { x: origin.x, y: origin.y + dy, width: origin.width + dx, height: origin.height - dy };
        break;
      case "nw":
        next = { x: origin.x + dx, y: origin.y + dy, width: origin.width - dx, height: origin.height - dy };
        break;
    }
    onChange(clampRect(next, naturalWidth, naturalHeight));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      // Pointer may already have been released (e.g. pointercancel) — fine to ignore.
    }
  };

  const toPercent = (value: number, total: number) => `${Math.max(0, Math.min(100, (value / total) * 100))}%`;

  return (
    <div
      ref={containerRef}
      onPointerDown={beginCreate}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`absolute inset-0 touch-none select-none ${disabled ? "" : "cursor-crosshair"}`}
    >
      {!crop ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 text-center text-sm font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
          Kırpmak istediğiniz alanı sürükleyerek seçin
        </div>
      ) : null}

      {crop ? (
        <div
          onPointerDown={beginMove}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`absolute border-2 border-primary bg-primary/10 ${disabled ? "" : "cursor-move"}`}
          style={{
            left: toPercent(crop.x, naturalWidth),
            top: toPercent(crop.y, naturalHeight),
            width: toPercent(crop.width, naturalWidth),
            height: toPercent(crop.height, naturalHeight),
          }}
        >
          {(["nw", "ne", "sw", "se"] as const).map((handle) => (
            <div
              key={handle}
              onPointerDown={beginResize(handle)}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className={[
                "absolute h-5 w-5 rounded-full border-2 border-primary bg-white shadow",
                handle.includes("n") ? "-top-2.5" : "-bottom-2.5",
                handle.includes("w") ? "-left-2.5" : "-right-2.5",
                handle === "nw" || handle === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize",
                disabled ? "pointer-events-none opacity-50" : "",
              ].join(" ")}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
