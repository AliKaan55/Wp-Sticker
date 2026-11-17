import { formatBytes } from "@/lib/utils/format";
import type { BatchItem } from "@/types/batch";
import { Spinner } from "@/components/ui/Spinner";

interface BatchQueueProps {
  items: readonly BatchItem[];
  disabled?: boolean;
  onRemove: (id: string) => void;
}

function StatusBadge({ item }: { item: BatchItem }) {
  switch (item.status) {
    case "queued":
      return <span className="text-sm text-muted">Sırada</span>;
    case "converting":
      return (
        <span className="flex items-center gap-2 text-sm text-primary">
          <Spinner className="h-4 w-4" label="Dönüştürülüyor" />
          Dönüştürülüyor…
        </span>
      );
    case "done":
      return <span className="text-sm font-medium text-success">Hazır</span>;
    case "error":
      return <span className="text-sm font-medium text-danger">Hata</span>;
    default:
      return null;
  }
}

export function BatchQueue({ items, disabled = false, onRemove }: BatchQueueProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Henüz dosya eklenmedi.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="checkerboard flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border">
              {item.mediaKind === "video" ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={item.previewUrl} muted className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{item.file.name}</p>
              <p className="text-xs text-muted">{formatBytes(item.file.size)}</p>
              {item.status === "error" && item.error ? (
                <p className="mt-1 break-words text-xs text-danger">{item.error}</p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
            <StatusBadge item={item} />
            {item.status === "done" && item.result ? (
              <a
                href={item.result.url}
                download={item.result.filename}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                İndir
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              disabled={disabled}
              aria-label={`${item.file.name} dosyasını kaldır`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
            >
              Kaldır
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
