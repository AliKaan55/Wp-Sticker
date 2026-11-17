"use client";

import { useEffect, useState } from "react";
import { formatBytes } from "@/lib/utils/format";
import { canShareFiles, isAbortError } from "@/lib/utils/share";
import type { ConvertedFile } from "@/types/api";
import { DetailItem } from "@/components/ui/DetailItem";

interface ResultPanelProps {
  result: ConvertedFile;
}

export function ResultPanel({ result }: ResultPanelProps) {
  const fileType = result.extension.toUpperCase();
  const [canShare, setCanShare] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "sharing" | "error">("idle");

  useEffect(() => {
    // iOS Safari ignores the <a download> attribute for blob: URLs — tapping
    // the download button there just opens/displays the file instead of
    // saving it, which is why people end up long-pressing the preview and
    // using "Save Image" instead. For an animated WEBP sticker, iOS's
    // Photos library can't store animated WEBP at all, so that save
    // silently flattens it to a single static frame — the file this app
    // produced was fine, but the save step wasn't. The Web Share API's
    // native share sheet (with a "Save to Files" option) keeps the real
    // file byte-for-byte, so it's offered first wherever the browser
    // actually supports sharing files; <a download> stays as a fallback.
    setShareState("idle");
    const file = new File([result.blob], result.filename, { type: result.mimeType });
    setCanShare(canShareFiles([file]));
  }, [result.blob, result.filename, result.mimeType]);

  const handleShare = async () => {
    setShareState("sharing");
    try {
      const file = new File([result.blob], result.filename, { type: result.mimeType });
      await navigator.share({ files: [file] });
      setShareState("idle");
    } catch (error) {
      // The person just closed the share sheet — not a real error.
      setShareState(isAbortError(error) ? "idle" : "error");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="checkerboard flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-border p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.url}
          alt="Dönüştürülen sonuç"
          width={result.width}
          height={result.height}
          className="max-h-80 w-auto max-w-full object-contain"
        />
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DetailItem label="Dosya türü" value={fileType} />
        <DetailItem label="Çözünürlük" value={`${result.width} × ${result.height} px`} />
        <DetailItem label="Dosya boyutu" value={formatBytes(result.sizeBytes)} />
      </dl>

      {result.warnings.map((warning) => (
        <p
          key={warning}
          className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning"
        >
          {warning}
        </p>
      ))}

      {canShare ? (
        <button
          type="button"
          onClick={handleShare}
          disabled={shareState === "sharing"}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {shareState === "sharing" ? "Paylaşılıyor..." : `${fileType} dosyasını kaydet / paylaş`}
        </button>
      ) : null}

      {shareState === "error" ? (
        <p className="text-center text-sm text-danger">
          Paylaşma başarısız oldu. Aşağıdaki &quot;indir&quot; düğmesini deneyin.
        </p>
      ) : null}

      <a
        href={result.url}
        download={result.filename}
        className={
          canShare
            ? "flex w-full items-center justify-center gap-2 rounded-xl border border-border px-6 py-4 text-base font-medium text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            : "flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        }
      >
        {fileType} dosyasını indir
      </a>

      {canShare ? (
        <p className="text-center text-xs text-muted">
          iPhone&apos;da animasyonun bozulmaması için paylaşım menüsünden &quot;Dosyalara Kaydet&quot;i
          seçin — &quot;Resimleri Kaydet&quot; animasyonlu WEBP&apos;i Fotoğraflar uygulamasında statik
          bir kareye çevirir.
        </p>
      ) : null}

      <p className="break-all text-center text-sm text-muted">{result.filename}</p>
    </div>
  );
}
