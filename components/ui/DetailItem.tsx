interface DetailItemProps {
  label: string;
  value: string;
}

export function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 break-words text-base font-semibold text-foreground">{value}</dd>
    </div>
  );
}
