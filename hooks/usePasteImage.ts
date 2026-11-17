"use client";

import { useEffect } from "react";

const PASTED_FILENAME = "pano-goruntusu.png";

// Listens for Ctrl+V anywhere on the page and, if the clipboard holds an
// image (a screenshot or a copied picture), hands it to onImage as a File —
// skipping the file picker entirely. Ignores pastes aimed at a text field
// elsewhere on the page (the URL-import input, say) so normal text pasting
// still works as expected.
export function usePasteImage(onImage: (file: File) => void, disabled = false): void {
  useEffect(() => {
    if (disabled) {
      return;
    }

    function handlePaste(event: ClipboardEvent): void {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) {
            continue;
          }
          event.preventDefault();
          // Clipboard images usually arrive with a generic name (or none at
          // all); give them a real filename so downstream extension/label
          // logic has something sensible to work with.
          const named =
            file.name && !/^image\.(png|jpe?g|webp|gif)$/i.test(file.name)
              ? file
              : new File([file], PASTED_FILENAME, { type: file.type || "image/png" });
          onImage(named);
          return;
        }
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onImage, disabled]);
}
