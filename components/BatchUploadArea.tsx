"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import { FILE_INPUT_ACCEPT, MAX_FILE_SIZE_LABEL } from "@/lib/constants";

interface BatchUploadAreaProps {
  disabled?: boolean;
  onFilesSelected: (files: FileList | File[]) => void;
}

export function BatchUploadArea({ disabled = false, onFilesSelected }: BatchUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const openPicker = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFilesSelected(event.target.files);
    }
    event.target.value = "";
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) {
      return;
    }
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      onFilesSelected(event.dataTransfer.files);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Birden fazla dosya yükleyin. Sürükleyip bırakın veya göz atmak için Enter tuşuna basın."
      onClick={openPicker}
      onKeyDown={handleKeyDown}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        isDragging ? "border-primary bg-primary/10" : "border-border bg-background hover:border-muted",
        disabled ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none h-10 w-10 text-primary"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 16V4m0 0L7.500 8.500M12 4l4.500 4.500" />
        <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </svg>
      <p className="pointer-events-none text-base font-medium text-foreground">
        Birden fazla dosyayı buraya bırakın veya göz atmak için dokunun
      </p>
      <p className="pointer-events-none text-sm text-muted">
        JPG, PNG, WEBP, GIF, MP4 veya WEBM, dosya başına en fazla {MAX_FILE_SIZE_LABEL}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        multiple
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        tabIndex={-1}
      />
    </div>
  );
}
