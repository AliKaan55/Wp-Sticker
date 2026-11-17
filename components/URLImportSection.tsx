"use client";

import { useId, useState } from "react";
import type { ChangeEvent, ClipboardEvent, FormEvent } from "react";
import { MAX_FILE_SIZE_LABEL } from "@/lib/constants";
import { useUrlImport } from "@/hooks/useUrlImport";
import { Spinner } from "@/components/ui/Spinner";

interface URLImportSectionProps {
  disabled?: boolean;
  onImported: (file: File) => void;
}

export function URLImportSection({ disabled = false, onImported }: URLImportSectionProps) {
  const [value, setValue] = useState("");
  const { isLoading, error, importUrl, clearError } = useUrlImport();
  const inputId = useId();
  const errorId = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    if (error) {
      clearError();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text");
    if (!pasted) {
      return;
    }
    event.preventDefault();
    setValue(pasted.trim());
    clearError();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || isLoading) {
      return;
    }
    const file = await importUrl(value);
    if (file) {
      setValue("");
      onImported(file);
    }
  };

  const blocked = disabled || isLoading;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <label htmlFor={inputId} className="sr-only">
        Medya bağlantısı
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={inputId}
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          disabled={blocked}
          placeholder="https://ornek.com/gorsel.jpg, https://x.com/…/status/… veya bir Giphy/Tenor bağlantısı"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={[
            "min-w-0 flex-1 rounded-xl border-2 bg-background px-4 py-3 text-base text-foreground placeholder:text-muted",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            "disabled:cursor-not-allowed disabled:opacity-60",
            error ? "border-danger" : "border-border",
          ].join(" ")}
        />
        <button
          type="submit"
          disabled={blocked || value.trim() === ""}
          aria-busy={isLoading}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
        >
          {isLoading ? (
            <>
              <Spinner className="h-5 w-5" label="Medya yükleniyor" />
              <span>Yükleniyor...</span>
            </>
          ) : (
            <span>Medyayı yükle</span>
          )}
        </button>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="break-words text-sm text-danger">
          {error}
        </p>
      ) : (
        <p className="text-sm text-muted">
          Doğrudan JPG, PNG, WEBP, GIF, MP4, WEBM bağlantıları; X (Twitter) gönderi bağlantıları; ve Giphy/Tenor GIF bağlantıları desteklenir. En fazla {MAX_FILE_SIZE_LABEL}.
        </p>
      )}
    </form>
  );
}
