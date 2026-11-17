import { OUTPUT_OPTIONS } from "@/lib/constants";
import type { OutputType } from "@/types/media";
import { OptionCard } from "@/components/ui/OptionCard";

interface OutputSelectorProps {
  value: OutputType;
  disabled?: boolean;
  onChange: (type: OutputType) => void;
}

export function OutputSelector({ value, disabled = false, onChange }: OutputSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Çıktı türü" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {OUTPUT_OPTIONS.map((option) => (
        <OptionCard
          key={option.type}
          title={option.label}
          description={option.description}
          selected={value === option.type}
          disabled={disabled}
          onSelect={() => onChange(option.type)}
        />
      ))}
    </div>
  );
}
