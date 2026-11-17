interface ErrorAlertProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger"
    >
      <p className="min-w-0 break-words">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Hatayı kapat"
        className="shrink-0 rounded-md px-2 py-0.5 text-lg leading-none text-danger hover:bg-danger/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger"
      >
        &times;
      </button>
    </div>
  );
}
