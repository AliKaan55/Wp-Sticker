"use client";

import { useCallback, useMemo, useState } from "react";
import { BatchQueue } from "@/components/BatchQueue";
import { BatchUploadArea } from "@/components/BatchUploadArea";
import { ConvertButton } from "@/components/ConvertButton";
import { ErrorAlert } from "@/components/ErrorAlert";
import { Header } from "@/components/Header";
import { ImagePreview } from "@/components/ImagePreview";
import { OutputSelector } from "@/components/OutputSelector";
import { ResultPanel } from "@/components/ResultPanel";
import { SizeSelector } from "@/components/SizeSelector";
import { StickerPackPanel } from "@/components/StickerPackPanel";
import { UploadArea } from "@/components/UploadArea";
import { URLImportSection } from "@/components/URLImportSection";
import { Card } from "@/components/ui/Card";
import { DEFAULT_OUTPUT_TYPE, DEFAULT_SIZE_KEY, SIZE_OPTIONS } from "@/lib/constants";
import { useBatchConverter } from "@/hooks/useBatchConverter";
import { useConverter } from "@/hooks/useConverter";
import { useImageUpload } from "@/hooks/useImageUpload";
import { usePasteImage } from "@/hooks/usePasteImage";
import type { CropRect, OutputType, SizeKey } from "@/types/media";

function Separator({ label }: { label: string }) {
  return (
    <div role="separator" aria-label={label} className="flex items-center gap-4">
      <span className="h-px flex-1 bg-border" />
      <span className="text-sm text-muted">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export default function HomePage() {
  const upload = useImageUpload();
  const converter = useConverter();
  const [sizeKey, setSizeKey] = useState<SizeKey>(DEFAULT_SIZE_KEY);
  const [outputType, setOutputType] = useState<OutputType>(DEFAULT_OUTPUT_TYPE);
  const [cropMode, setCropMode] = useState(false);
  const [crop, setCrop] = useState<CropRect | null>(null);

  const batch = useBatchConverter();
  const [batchSizeKey, setBatchSizeKey] = useState<SizeKey>(DEFAULT_SIZE_KEY);
  const [batchOutputType, setBatchOutputType] = useState<OutputType>(DEFAULT_OUTPUT_TYPE);

  const { selectFile } = upload;
  const { reset: resetResult } = converter;

  const handleFileSelected = useCallback(
    (file: File) => {
      if (selectFile(file)) {
        resetResult();
        setCropMode(false);
        setCrop(null);
      }
    },
    [selectFile, resetResult],
  );

  const handleMediaImported = useCallback(
    (file: File) => {
      if (selectFile(file)) {
        resetResult();
        setCropMode(false);
        setCrop(null);
      }
    },
    [selectFile, resetResult],
  );

  // Ctrl+V anywhere on the page drops a copied/screenshotted image straight
  // into the single-file flow, skipping the file picker.
  usePasteImage(handleFileSelected, converter.isProcessing);

  const handleRemove = () => {
    upload.clearFile();
    converter.reset();
    setCropMode(false);
    setCrop(null);
  };

  const handleToggleCropMode = () => {
    setCropMode((wasEnabled) => {
      const next = !wasEnabled;
      if (!next) {
        setCrop(null);
      }
      return next;
    });
  };

  const handleSizeChange = (key: SizeKey) => {
    setSizeKey(key);
    converter.reset();
  };

  const handleOutputChange = (type: OutputType) => {
    setOutputType(type);
    converter.reset();
  };

  const isAnimatedSource = upload.mediaKind === "video" || upload.mediaKind === "gif";
  const canConvert = upload.file !== null;

  const handleConvert = () => {
    const option = SIZE_OPTIONS.find((item) => item.key === sizeKey);
    if (!upload.file || !canConvert || !option) {
      return;
    }
    void converter.convert(upload.file, option.dimension, outputType, cropMode ? crop : null);
  };

  const isBusy = converter.isProcessing;
  const visibleError = upload.error ?? converter.error;
  const dismissVisibleError = upload.error ? upload.dismissError : converter.dismissError;

  let convertHint: string | null = null;
  if (!upload.file) {
    convertHint = "Dönüştürmek için bir dosya yükleyin veya bağlantıdan içe aktarın.";
  } else if (isBusy && isAnimatedSource && (outputType === "sticker" || outputType === "animation")) {
    convertHint = "Animasyon hazırlanıyor. Bu birkaç saniye sürebilir.";
  } else if (isAnimatedSource && outputType === "animation") {
    convertHint = "Animasyonlu WebP indirilecek. WhatsApp'ta çıkartma olarak kullanmak için bir çıkartma uygulamasıyla ekleyin.";
  } else if (isAnimatedSource && outputType === "sticker") {
    convertHint = "Animasyonlu çıkartma olarak dönüştürülecek (en fazla 10 saniye, hedef 500 KB).";
  } else if (isAnimatedSource) {
    convertHint = "Yalnızca ilk kare PNG olarak kaydedilecek.";
  }

  // --- Toplu üretim ---
  const handleBatchFilesSelected = (files: FileList | File[]) => {
    batch.addFiles(files);
  };

  const handleBatchConvertAll = () => {
    const option = SIZE_OPTIONS.find((item) => item.key === batchSizeKey);
    if (!option) {
      return;
    }
    void batch.convertAll(option.dimension, batchOutputType);
  };

  const hasQueuedOrErrored = batch.items.some(
    (item) => item.status === "queued" || item.status === "error",
  );

  const completedStickers = useMemo(
    () =>
      batch.items
        .filter((item) => item.status === "done" && item.result)
        .map((item) => ({ blob: item.result!.blob, filename: item.result!.filename })),
    [batch.items],
  );

  const showPackPanel =
    (batchOutputType === "sticker" || batchOutputType === "animation") && completedStickers.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <Header />

      {visibleError ? <ErrorAlert message={visibleError} onDismiss={dismissVisibleError} /> : null}

      <Card
        title="Bağlantıdan içe aktar"
        description="Bir medya bağlantısı, X (Twitter) gönderi bağlantısı ya da Giphy/Tenor GIF bağlantısı yapıştırın."
      >
        <URLImportSection disabled={isBusy} onImported={handleMediaImported} />
      </Card>

      <Separator label="veya" />

      <Card title="Dosya yükle" description="Bir görsel, GIF veya video seçin, ya da panodan Ctrl+V ile yapıştırın.">
        <UploadArea
          hasFile={upload.file !== null}
          disabled={isBusy}
          onFileSelected={handleFileSelected}
        />
      </Card>

      {upload.file && upload.previewUrl && upload.mediaKind ? (
        <Card title="Önizleme">
          <div className="flex flex-col gap-3">
            <ImagePreview
              src={upload.previewUrl}
              fileName={upload.file.name}
              fileSize={upload.file.size}
              mediaKind={upload.mediaKind}
              disabled={isBusy}
              onRemove={handleRemove}
              cropEnabled={cropMode}
              crop={crop}
              onCropChange={setCrop}
            />

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <button
                type="button"
                onClick={handleToggleCropMode}
                disabled={isBusy}
                aria-pressed={cropMode}
                className={[
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  cropMode
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground hover:border-primary hover:text-primary",
                ].join(" ")}
              >
                {cropMode ? "Kırpmayı kapat" : "Kırp"}
              </button>

              {cropMode && crop ? (
                <button
                  type="button"
                  onClick={() => setCrop(null)}
                  disabled={isBusy}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Sıfırla
                </button>
              ) : null}

              {cropMode ? (
                <p className="text-sm text-muted">
                  {crop
                    ? "Seçilen alan dönüştürmeden önce kırpılacak."
                    : "Kırpmak istediğiniz alanı önizleme üzerinde sürükleyerek seçin."}
                </p>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <Card
        title="Boyut"
        description="Görsel, seçtiğiniz boyuta sığdırılır; Orijinal'i seçerseniz yeniden boyutlandırılmaz. Çıkartma/Animasyon çıktısında WhatsApp kuralı gereği her zaman kare kullanılır."
      >
        <SizeSelector value={sizeKey} disabled={isBusy} onChange={handleSizeChange} />
      </Card>

      <Card title="Çıktı türü" description="İndirmek istediğiniz dosya türünü seçin.">
        <OutputSelector value={outputType} disabled={isBusy} onChange={handleOutputChange} />
      </Card>

      <div aria-live="polite" className="flex flex-col gap-2">
        <ConvertButton disabled={!canConvert} loading={isBusy} onClick={handleConvert} />
        {convertHint ? <p className="text-center text-sm text-muted">{convertHint}</p> : null}
      </div>

      {converter.result ? (
        <Card title="Sonuç" description="Dönüştürülen dosyanız hazır.">
          <ResultPanel result={converter.result} />
        </Card>
      ) : null}

      <Separator label="toplu üretim" />

      <Card
        title="Toplu Üretim ve Sticker Paketi"
        description="Birden fazla dosyayı aynı anda dönüştürün ve çıkartmaları tek bir pakette indirin."
      >
        <div className="flex flex-col gap-5">
          <BatchUploadArea disabled={batch.isConverting} onFilesSelected={handleBatchFilesSelected} />

          {batch.queueError ? (
            <ErrorAlert message={batch.queueError} onDismiss={batch.dismissQueueError} />
          ) : null}

          <BatchQueue items={batch.items} disabled={batch.isConverting} onRemove={batch.removeItem} />

          {batch.items.length > 0 ? (
            <>
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-sm font-medium text-foreground">Boyut</p>
                <SizeSelector
                  value={batchSizeKey}
                  disabled={batch.isConverting}
                  onChange={setBatchSizeKey}
                />
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-foreground">Çıktı türü</p>
                <OutputSelector
                  value={batchOutputType}
                  disabled={batch.isConverting}
                  onChange={setBatchOutputType}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <ConvertButton
                  disabled={!hasQueuedOrErrored}
                  loading={batch.isConverting}
                  onClick={handleBatchConvertAll}
                  label="Tümünü dönüştür"
                  loadingLabel="Dönüştürülüyor..."
                />
                <button
                  type="button"
                  onClick={batch.clearAll}
                  disabled={batch.isConverting}
                  className="rounded-xl border border-border px-6 py-4 text-base font-medium text-foreground transition-colors hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Tümünü temizle
                </button>
              </div>
            </>
          ) : null}

          {showPackPanel ? (
            <div className="border-t border-border pt-5">
              <StickerPackPanel completedStickers={completedStickers} disabled={batch.isConverting} />
            </div>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
