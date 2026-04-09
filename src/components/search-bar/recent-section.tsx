import { FileTextIcon, XIcon } from "lucide-react";
import { lazy, Suspense } from "react";
import type { HistoryItem } from "@/hooks/use-history";
import { SectionHeader } from "./section-header";

// The clear-all confirmation dialog pulls in radix alert-dialog and is
// only reachable after the user opens the search dropdown and clicks
// Clear. Split it off so it stays out of the first-paint chunk.
const ClearAllButton = lazy(() => import("./clear-all-button"));

interface RecentSectionProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onRemove: (item: HistoryItem) => void;
  onClearAll: () => void;
  clearDialogOpen: boolean;
  onClearDialogOpenChange: (open: boolean) => void;
}

export function RecentSection({
  items,
  onSelect,
  onRemove,
  onClearAll,
  clearDialogOpen,
  onClearDialogOpenChange,
}: RecentSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between px-3 pb-2 pt-1">
        <SectionHeader label="Recent" />
        <Suspense fallback={null}>
          <ClearAllButton
            onConfirm={onClearAll}
            open={clearDialogOpen}
            onOpenChange={onClearDialogOpenChange}
          />
        </Suspense>
      </div>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li
            key={item.id}
            className="group hover:bg-muted flex items-center gap-2.5 rounded-2xl px-2.5 py-2.5"
          >
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(item);
              }}
              className="flex flex-1 items-center gap-3 text-left focus-visible:outline-none"
              aria-label={`Load weather for ${item.displayName}`}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-foreground/15 text-foreground/60">
                <FileTextIcon className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="font-display font-normal text-base text-foreground tracking-tight">
                {item.displayName}
              </span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onRemove(item);
              }}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-foreground/40 opacity-0 transition hover:bg-foreground/10 hover:text-foreground/80 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
              aria-label={`Remove ${item.displayName} from history`}
            >
              <XIcon className="size-4" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

