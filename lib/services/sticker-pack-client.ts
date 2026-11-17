
import JSZip from "jszip";
import { STICKER_PACK_TRAY_DIMENSION } from "@/lib/constants";

export interface StickerPackInput {
  readonly packName: string;
  readonly publisher: string;
  readonly stickers: readonly { readonly blob: Blob; readonly filename: string }[];
}

const DEFAULT_EMOJIS: readonly string[] = ["😀"];

function slugify(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.length > 0 ? cleaned.slice(0, 40) : "sticker-pack";
}

// Builds a 96x96 PNG tray icon from the first sticker. WhatsApp-style
// sticker-pack importers expect the tray icon as a small square PNG.
async function buildTrayIcon(firstSticker: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(firstSticker);
  const canvas = document.createElement("canvas");
  canvas.width = STICKER_PACK_TRAY_DIMENSION;
  canvas.height = STICKER_PACK_TRAY_DIMENSION;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Tepsi ikonu oluşturulamadı: canvas bağlamı alınamadı.");
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Tepsi ikonu PNG'ye dönüştürülemedi."));
      }
    }, "image/png");
  });
}

// Bundles converted stickers into a single downloadable zip (named with a
// .wastickers extension by convention). There's no single official
// cross-app standard for this file beyond WhatsApp's own Android/iOS SDK
// integration, so different third-party "sticker maker" apps may expect
// slightly different internal layouts. This uses the layout most of those
// community apps recognize: NN.webp sticker files, a tray.png icon, and a
// pack.json manifest listing them — and is useful as a single bundled
// download even for an app that only accepts stickers one at a time.
export async function buildStickerPackZip(input: StickerPackInput): Promise<Blob> {
  if (input.stickers.length === 0) {
    throw new Error("Pakete eklenecek çıkartma yok.");
  }

  const zip = new JSZip();
  const identifier = slugify(input.packName);

  const stickerEntries = input.stickers.map((sticker, index) => ({
    imageFile: `${String(index + 1).padStart(2, "0")}.webp`,
    emojis: DEFAULT_EMOJIS,
    blob: sticker.blob,
  }));

  for (const entry of stickerEntries) {
    zip.file(entry.imageFile, entry.blob);
  }

  // Destructure rather than index with `[0]`: under a tsconfig with
  // noUncheckedIndexedAccess enabled (as Vercel's build used, even though
  // the length check above already guarantees this at runtime), a plain
  // array index still types as possibly-undefined and TypeScript can't
  // narrow it away — but it CAN narrow an explicitly-checked local binding.
  const [firstEntry] = stickerEntries;
  if (!firstEntry) {
    throw new Error("Pakete eklenecek çıkartma yok.");
  }

  const trayIcon = await buildTrayIcon(firstEntry.blob);
  zip.file("tray.png", trayIcon);

  zip.file(
    "pack.json",
    JSON.stringify(
      {
        identifier,
        name: input.packName,
        publisher: input.publisher,
        trayImage: "tray.png",
        stickers: stickerEntries.map((entry) => ({
          imageFile: entry.imageFile,
          emojis: entry.emojis,
        })),
      },
      null,
      2,
    ),
  );

  return await zip.generateAsync({ type: "blob" });
}
