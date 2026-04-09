export function SectionHeader({ label }: { label: string }) {
  return (
    <span className="font-display font-normal text-foreground/55 text-[11px] uppercase tracking-[0.18em]">
      {label}
    </span>
  );
}
