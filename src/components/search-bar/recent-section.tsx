import { ClockIcon, XIcon } from "lucide-react";
import { lazy, Suspense } from "react";
import type { HistoryItem } from "@/hooks/use-history";
import { SectionHeader } from "./section-header";

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
      <div className="flex items-center justify-between px-3 pb-1.5 pt-2">
        <SectionHeader label="Recent" />
        <Suspense fallback={<div className="h-7 px-2" />}>
          <ClearAllButton
            onConfirm={onClearAll}
            open={clearDialogOpen}
            onOpenChange={onClearDialogOpenChange}
          />
        </Suspense>
      </div>
      <ul className="flex flex-col gap-0.5">
        {items.map((item, i) => (
          <li
            key={item.id}
            className={`item-stagger item-d-${Math.min(i, 4)} group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors duration-150 hover:bg-foreground/[0.05]`}
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
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] transition-colors duration-150 group-hover:bg-foreground/[0.08]">
                <ClockIcon className="size-3.5 text-foreground/40" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="font-display text-[15px] font-normal tracking-tight text-foreground/80 transition-colors duration-150 group-hover:text-foreground">
                {item.displayName}
              </span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onRemove(item);
              }}
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-foreground/30 opacity-0 transition-all duration-150 hover:bg-foreground/[0.08] hover:text-foreground/60 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
              aria-label={`Remove ${item.displayName} from history`}
            >
              <XIcon className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
