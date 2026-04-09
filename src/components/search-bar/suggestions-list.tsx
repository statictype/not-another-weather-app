import { MapPinIcon } from "lucide-react";
import type { SuggestionItem } from "@/api/types";
import { SectionHeader } from "./section-header";

interface SuggestionsListProps {
  items: SuggestionItem[];
  showHeader: boolean;
  onSelect: (item: SuggestionItem) => void;
}

export function SuggestionsList({ items, showHeader, onSelect }: SuggestionsListProps) {
  return (
    <div>
      {showHeader && (
        <div className="px-3 pb-2 pt-3">
          <SectionHeader label="Suggestions" />
        </div>
      )}
      <ul className="flex flex-col">
        {items.map((item) => {
          const label = [item.name, item.region, item.country].filter(Boolean).join(", ");
          return (
            <li
              key={item.id}
              className="hover:bg-muted flex items-center gap-3 rounded-2xl px-3 py-2.5"
            >
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(item);
                }}
                className="flex flex-1 items-center gap-3 text-left focus-visible:outline-none"
                aria-label={`Search weather for ${label}`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-foreground/15 text-foreground/60">
                  <MapPinIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="font-display font-normal text-base text-foreground tracking-tight">
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SuggestionsLoading() {
  return (
    <ul className="flex flex-col">
      {[1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-foreground/15">
            <MapPinIcon
              className="size-4 text-foreground/20"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </span>
          <span className="h-4 w-40 animate-pulse rounded bg-foreground/10" />
        </li>
      ))}
    </ul>
  );
}
