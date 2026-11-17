interface OptionCardProps {
  title: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function OptionCard({ title, description, selected, disabled = false, onSelect }: OptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={[
        "flex w-full flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-background hover:border-muted",
      ].join(" ")}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="text-base font-semibold text-foreground">{title}</span>
        <span
          aria-hidden="true"
          className={[
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
            selected ? "border-primary bg-primary" : "border-border",
          ].join(" ")}
        >
          {selected ? (
            <svg viewBox="0 0 20 20" className="h-3 w-3 text-foreground" fill="currentColor">
              <path d="M8.2 14.2 4.5 10.5l1.4-1.4 2.3 2.3 5.9-5.9 1.4 1.4z" />
            </svg>
          ) : null}
        </span>
      </span>
      <span className="text-sm text-muted">{description}</span>
    </button>
  );
}
