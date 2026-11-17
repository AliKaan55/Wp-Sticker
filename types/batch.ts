
import type { ConvertedFile } from "./api";
import type { MediaKind } from "./media";

export type BatchItemStatus = "queued" | "converting" | "done" | "error";

export interface BatchItem {
  readonly id: string;
  readonly file: File;
  readonly previewUrl: string;
  readonly mediaKind: MediaKind;
  readonly status: BatchItemStatus;
  readonly result: ConvertedFile | null;
  readonly error: string | null;
}
