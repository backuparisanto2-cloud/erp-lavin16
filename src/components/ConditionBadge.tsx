const styles: Record<string, string> = {
  Baik: "border-success/40 text-success bg-success/8",
  "Perlu Perbaikan": "border-warning/50 text-warning bg-warning/10",
  Rusak: "border-destructive/40 text-destructive bg-destructive/8",
};

export function ConditionBadge({ condition }: { condition: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        styles[condition] ?? "border-gold-line text-muted-foreground"
      }`}
    >
      {condition}
    </span>
  );
}
