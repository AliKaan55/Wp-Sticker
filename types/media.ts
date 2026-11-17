
// These core media/processor types were referenced throughout the codebase
// (import type { ... } from "@/types/media") but were never actually
// declared here, which silently compiled before only because `import type`
// is erased at runtime — `tsc --noEmit` / `next build` would fail on them.
// Reconstructed from how every call site actually uses them.
export type MediaKind = "image" | "gif" | "video";

export type MediaMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "video/mp4"
  | "video/webm";

export interface MediaInput {
  readonly buffer: Buffer;
  readonly mimeType: MediaMimeType;
  readonly filename: string;
}

export interface ConversionOptions {
  // 0 (ORIGINAL_DIMENSION) means "keep the source's own resolution".
  readonly dimension: number;
  readonly outputType: OutputType;
}

export interface ConversionResult {
  readonly buffer: Buffer;
  readonly mimeType: string;
  readonly extension: string;
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
  readonly warnings: string[];
}

export interface MediaProcessor {
  readonly id: string;
  supports(input: MediaInput, options: ConversionOptions): boolean;
  process(input: MediaInput, options: ConversionOptions): Promise<ConversionResult>;
}

export type OutputType = "sticker" | "image" | "animation";
export interface OutputOption {
  readonly type: OutputType;
  readonly label: string;
  readonly description: string;
  readonly extension: string;
  readonly mimeType: string;
}

export interface SizeOption {
  readonly key: "small" | "medium" | "large" | "original";
  readonly label: string;
  // 0 (ORIGINAL_DIMENSION in lib/constants.ts) means "keep the source's own
  // resolution, don't resize".
  readonly dimension: number;
}

export type SizeKey = SizeOption["key"];

// A crop rectangle in the SOURCE media's own pixel coordinates (after any
// orientation correction), with (x, y) as the top-left corner. Used to let
// the user pick a region of interest before resizing/padding.
export interface CropRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

