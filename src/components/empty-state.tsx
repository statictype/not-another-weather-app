/**
 * Premium empty state — shown when no city is selected.
 *
 * Lets the sky gradient breathe through with a soft animated glow orb
 * drifting behind large, airy typography. No card container — the
 * atmosphere *is* the container.
 */
export function EmptyState() {
  return (
    <div className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-6 sm:min-h-[50vh]">
      {/* Ambient glow orb — slow drift + color shift */}
      <div className="empty-orb pointer-events-none absolute" aria-hidden="true" />

      {/* Secondary orb for depth */}
      <div className="empty-orb-secondary pointer-events-none absolute" aria-hidden="true" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <h2 className="font-display text-foreground/85 max-w-lg text-center text-4xl leading-[1.05] font-extralight tracking-tight sm:text-6xl lg:text-7xl">
          What's the weather like?
        </h2>

        <p className="font-display text-foreground/40 text-sm font-normal uppercase tracking-[0.25em]">
          Search a city to find out
        </p>
      </div>
    </div>
  );
}
