import { Spinner } from "@/components/ui/Spinner";

interface ConvertButtonProps {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  label?: string;
  loadingLabel?: string;
}

export function ConvertButton({
  disabled,
  loading,
  onClick,
  label = "Dönüştür",
  loadingLabel = "Dönüştürülüyor...",
}: ConvertButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
    >
      {loading ? (
        <>
          <Spinner className="h-5 w-5" label={loadingLabel} />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}
