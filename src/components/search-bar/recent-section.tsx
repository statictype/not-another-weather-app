import { ClockIcon, XIcon } from "lucide-react";
import { lazy, Suspense } from "react";
import type { HistoryItem } from "@/hooks/use-history";
import { SectionHeader } from "./section-header";

const ClearAllButton = lazy(() => import("./clear-all-button"));

interface RecentSectionProps {
  isMobileOpen: boolean;
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onRemove: (item: HistoryItem) => void;
  onClearAll: () => void;
  clearDialogOpen: boolean;
  onClearDialogOpenChange: (open: boolean) => void;
}

export function RecentSection({
  isMobileOpen,
  items,
  onSelect,
  onRemove,
  onClearAll,
  clearDialogOpen,
  onClearDialogOpenChange,
}: RecentSectionProps) {
  return (
    <div>
      <div
        className={
          isMobileOpen
            ? "flex items-center justify-between px-5 pb-2 pt-4"
            : "flex items-center justify-between px-3 pb-1.5 pt-2"
        }
      >
        <SectionHeader label="Recent" />
        <Suspense fallback={<div className="h-7 px-2" />}>
          <ClearAllButton
            onConfirm={onClearAll}
            open={clearDialogOpen}
            onOpenChange={onClearDialogOpenChange}
          />
        </Suspense>
      </div>

      {isMobileOpen ? (
        <div className="relative">
          <ul
            className="scrollbar-none flex gap-3 overflow-x-auto px-5 pb-4"
            style={{ scrollSnapType: "x mandatory", scrollPaddingInlineStart: "20px", WebkitOverflowScrolling: "touch" }}
          >
            {items.map((item, i) => (
              <li
                key={item.id}
                className={`item-stagger item-d-${Math.min(i, 4)} shrink-0 snap-start`}
              >
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(item);
                  }}
                  className="carousel-card group relative flex h-[76px] w-[148px] flex-col justify-between rounded-xl p-3 transition-all duration-200 active:scale-[0.97]"
                >
                  <span className="flex size-6 items-center justify-center rounded-lg bg-foreground/[0.06]">
                    <ClockIcon className="size-3 text-foreground/35" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="font-display truncate text-left text-[13px] font-medium tracking-tight text-foreground/75">
                    {item.displayName}
                  </span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove(item);
                  }}
                  className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground/30 transition-all duration-150 active:scale-90 active:bg-foreground/[0.12]"
                  aria-label={`Remove ${item.displayName} from history`}
                >
                  <XIcon className="size-2.5" strokeWidth={2.5} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="carousel-fade pointer-events-none absolute inset-y-0 right-0 w-10" aria-hidden="true" />
        </div>
      ) : (
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
      )}
    </div>
  );
}
