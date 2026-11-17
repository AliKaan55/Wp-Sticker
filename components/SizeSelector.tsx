import { SIZE_OPTIONS } from "@/lib/constants";
import type { SizeKey } from "@/types/media";
import { OptionCard } from "@/components/ui/OptionCard";

interface SizeSelectorProps {
  value: SizeKey;
  disabled?: boolean;
  onChange: (key: SizeKey) => void;
}

export function SizeSelector({ value, disabled = false, onChange }: SizeSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Çıktı boyutu" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {SIZE_OPTIONS.map((option) => (
        <OptionCard
          key={option.key}
          title={option.label}
          description={`${option.dimension} \u00d7 ${option.dimension} px`}
          selected={value === option.key}
          disabled={disabled}
          onSelect={() => onChange(option.key)}
        />
      ))}
    </div>
  );
}
