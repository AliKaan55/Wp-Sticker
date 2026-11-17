import { formatBytes } from "@/lib/utils/format";
import type { ConvertedFile } from "@/types/api";
import { DetailItem } from "@/components/ui/DetailItem";

interface ResultPanelProps {
  result: ConvertedFile;
}

export function ResultPanel({ result }: ResultPanelProps) {
  const fileType = result.extension.toUpperCase();

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
        <DetailItem label="Çözünürlük" value={`${result.width} \u00d7 ${result.height} px`} />
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

      <a
        href={result.url}
        download={result.filename}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {fileType} dosyasını indir
      </a>
      <p className="break-all text-center text-sm text-muted">{result.filename}</p>
    </div>
  );
}
