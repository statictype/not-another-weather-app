export function SectionHeader({ label }: { label: string }) {
  return (
    <span className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/35">
      {label}
    </span>
  );
}
