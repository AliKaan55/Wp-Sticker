"use client";

import { useId, useState } from "react";
import type { ChangeEvent } from "react";
import { STICKER_PACK_MAX_COUNT, STICKER_PACK_MIN_COUNT } from "@/lib/constants";
import { buildStickerPackZip } from "@/lib/services/sticker-pack-client";
import { getBaseName } from "@/lib/utils/format";
import { canShareFiles, isAbortError } from "@/lib/utils/share";
import { Spinner } from "@/components/ui/Spinner";

interface StickerPackPanelProps {
  completedStickers: readonly { readonly blob: Blob; readonly filename: string }[];
  disabled?: boolean;
}

export function StickerPackPanel({ completedStickers, disabled = false }: StickerPackPanelProps) {
  const [packName, setPackName] = useState("Benim Paketim");
  const [publisher, setPublisher] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const publisherId = useId();

  const count = completedStickers.length;
  const tooFew = count < STICKER_PACK_MIN_COUNT;
  const tooMany = count > STICKER_PACK_MAX_COUNT;
  const canBuild = !tooFew && !tooMany && !disabled && !isBuilding;

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => setPackName(event.target.value);
  const handlePublisherChange = (event: ChangeEvent<HTMLInputElement>) => setPublisher(event.target.value);

  const handleDownload = async () => {
    if (!canBuild) {
      return;
    }
    setIsBuilding(true);
    setError(null);
    try {
      const zipBlob = await buildStickerPackZip({
        packName: packName.trim() || "Çıkartma Paketi",
        publisher: publisher.trim() || "Bilinmiyor",
        stickers: completedStickers,
      });
      const filename = `${getBaseName(packName || "cikartma-paketi")}.wastickers`;

      // iOS Safari ignores the <a download> attribute for blob: URLs, so a
      // programmatic click there just opens/previews the zip instead of
      // saving it. The Web Share API's native share sheet (with a "Save to
      // Files" option) actually saves the real file, so it's tried first
      // wherever the browser supports sharing files.
      const file = new File([zipBlob], filename, { type: "application/zip" });
      if (canShareFiles([file])) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (shareError) {
          if (isAbortError(shareError)) {
            return;
          }
          // Fall through to the classic download link below.
        }
      }

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Paket oluşturulamadı. Tekrar deneyin.");
    } finally {
      setIsBuilding(false);
    }
  };

  let hint: string | null = null;
  if (tooFew) {
    hint = `Paket oluşturmak için en az ${STICKER_PACK_MIN_COUNT} tamamlanmış çıkartma gerekir (şu an ${count}).`;
  } else if (tooMany) {
    hint = `Bir pakette en fazla ${STICKER_PACK_MAX_COUNT} çıkartma olabilir (şu an ${count}). Fazla olanları kaldırın.`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={nameId} className="text-sm font-medium text-foreground">
            Paket adı
          </label>
          <input
            id={nameId}
            type="text"
            value={packName}
            onChange={handleNameChange}
            disabled={disabled || isBuilding}
            maxLength={128}
            className="rounded-xl border-2 border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={publisherId} className="text-sm font-medium text-foreground">
            Yayıncı
          </label>
          <input
            id={publisherId}
            type="text"
            value={publisher}
            onChange={handlePublisherChange}
            disabled={disabled || isBuilding}
            maxLength={128}
            placeholder="Adınız ya da markanız"
            className="rounded-xl border-2 border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>

      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button
        type="button"
        onClick={handleDownload}
        disabled={!canBuild}
        aria-busy={isBuilding}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
      >
        {isBuilding ? (
          <>
            <Spinner className="h-5 w-5" label="Paket hazırlanıyor" />
            <span>Paket hazırlanıyor...</span>
          </>
        ) : (
          <span>Paketi indir (.wastickers, {count} çıkartma)</span>
        )}
      </button>
      <p className="text-xs text-muted">
        Bu dosya; çıkartmaları, bir tepsi (tray) ikonunu ve bir açıklama dosyasını (pack.json) tek bir
        ZIP&apos;te toplar. Hangi üçüncü taraf &quot;sticker maker&quot; uygulamasının bunu doğrudan içe
        aktarabildiği uygulamadan uygulamaya değişir; aktarmazsa çıkartmaları tek tek de ekleyebilirsiniz.
        iPhone&apos;da paylaşım menüsü açılırsa &quot;Dosyalara Kaydet&quot;i seçin.
      </p>
    </div>
  );
}
