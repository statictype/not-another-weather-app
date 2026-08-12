import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  /** The accessible name. Names the action, not the state — `aria-pressed` carries the state. */
  label: string;
  children: ReactNode;
}

/**
 * The tile-level view switch, shared by the Astro tile's sun/moon pair and the
 * Hourly tile's temp/precip pair.
 *
 * One idiom, one definition. Both tiles sit in the same grid, so a second
 * toggle shape would teach a competing gesture for the same job, and a copy
 * would leave two places to fix.
 *
 * `aria-pressed` rather than a tablist: these switch what a tile shows, not
 * which panel of a tabbed region is mounted, and a two-button tablist would
 * take the arrow keys away from the strip it sits above.
 */
export function TabButton({ active, onClick, label, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-9 items-center justify-center rounded-full transition-colors",
        active
          ? "bg-foreground/10 text-foreground"
          : "text-foreground/55 hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
