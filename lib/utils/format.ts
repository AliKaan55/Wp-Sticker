
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    const digits = kilobytes < 10 ? 2 : 1;
    return `${kilobytes.toLocaleString("tr-TR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })} KB`;
  }
  return `${(kilobytes / 1024).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MB`;
}

export function getBaseName(filename: string): string {
  const withoutExtension = filename.replace(/\.[^./\\]+$/, "");
  const cleaned = withoutExtension
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return cleaned.length > 0 ? cleaned.slice(0, 60) : "gorsel";
}

export function getFileTypeLabel(filename: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
  return match?.[1] ? match[1].toUpperCase() : "Bilinmiyor";
}

export function buildOutputFilename(
  originalName: string,
  outputType: "sticker" | "image" | "animation",
  dimension: number,
  extension: string,
): string {
  const base = getBaseName(originalName);
  const suffix =
    outputType === "sticker"
      ? "cikartma"
      : outputType === "animation"
        ? "animasyon"
        : "gorsel";
  return `${base}-${suffix}-${dimension}.${extension}`;
}


