// Feature-detects whether this browser can share actual files through the
// Web Share API (as opposed to just text/links). Safari (iOS 15+ and
// recent macOS) supports sharing files this way; most desktop Chromium
// browsers don't implement it at all, which is fine since <a download>
// already works reliably there.
export function canShareFiles(files: readonly File[]): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") {
    return false;
  }
  try {
    return navigator.canShare({ files: files as File[] });
  } catch {
    return false;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
