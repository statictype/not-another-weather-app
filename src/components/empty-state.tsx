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
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="rounded-full bg-secondary p-6">
        <CloudSunIcon
          className="size-12 text-secondary-foreground"
          aria-hidden="true"
          strokeWidth={1.5}
        />
      </div>
      <div className="space-y-1">
        <h2 className="font-serif text-2xl tracking-tight">Where to?</h2>
        <p className="text-muted-foreground max-w-sm text-balance">
          Type a city name above to see today's forecast. Recent searches will appear below for
          one-click recall.
        </p>
      </div>
    </div>
  );
}
