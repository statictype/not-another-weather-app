import { CloudSunIcon } from "lucide-react";

/**
 * The first thing a user sees when there's nothing to show.
 *
 * Shown when no fetch has ever succeeded for this session — either a
 * brand-new visitor with no history, or a returning visitor whose
 * auto-load failed silently. Intentionally inviting rather than
 * apologetic.
 */
export function EmptyState() {
  return (
    <div className="card-surface flex flex-col items-center justify-center gap-6 rounded-[2rem] px-6 py-24 text-center">
      <div className="rounded-3xl bg-gradient-to-br from-sky-300 to-blue-500 p-8 text-white shadow-[0_20px_40px_-15px_rgba(56,140,255,0.6)]">
        <CloudSunIcon className="size-16" aria-hidden="true" strokeWidth={2} />
      </div>
      <div className="space-y-2">
        <h2 className="font-display font-light text-3xl tracking-tight">
          Pick a city to begin
        </h2>
        <p className="text-foreground/60 mx-auto max-w-md text-balance">
          Search above or tap a recent destination.
        </p>
      </div>
    </div>
  );
}
