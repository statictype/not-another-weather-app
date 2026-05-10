export function SectionHeader({ label }: { label: string }) {
  return (
    <span className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-foreground/35">
      {label}
    </span>
  );
}
