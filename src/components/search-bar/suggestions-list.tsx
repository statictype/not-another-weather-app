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
        <div className="px-3 pb-1.5 pt-3">
          <SectionHeader label="Suggestions" />
        </div>
      )}
      <ul className="flex flex-col gap-0.5">
        {items.map((item, i) => {
          const city = item.name;
          const rest = [item.region, item.country].filter(Boolean).join(", ");
          return (
            <li
              key={item.id}
              className={`item-stagger item-d-${Math.min(i, 4)} group`}
            >
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(item);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-150 hover:bg-foreground/[0.05] focus-visible:outline-none"
                aria-label={`Search weather for ${city}, ${rest}`}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 transition-colors duration-150 group-hover:bg-sky-500/[0.15] [.night_&]:bg-foreground/[0.06] [.night_&]:group-hover:bg-foreground/[0.1]">
                  <MapPinIcon className="size-3.5 text-sky-600/70 [.night_&]:text-foreground/45" strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-display truncate text-[15px] font-medium tracking-tight text-foreground/85 transition-colors duration-150 group-hover:text-foreground">
                    {city}
                  </span>
                  {rest && (
                    <span className="truncate text-[12px] text-foreground/40">
                      {rest}
                    </span>
                  )}
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
    <ul className="flex flex-col gap-0.5">
      {[1, 2, 3].map((i) => (
        <li key={i} className={`item-stagger item-d-${Math.min(i - 1, 4)} flex items-center gap-3 rounded-xl px-2 py-2`}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.04]">
            <MapPinIcon
              className="size-3.5 text-foreground/15"
              strokeWidth={2}
              aria-hidden="true"
            />
          </span>
          <div className="flex flex-col gap-1.5">
            <span className="h-3.5 w-32 animate-pulse rounded-md bg-foreground/[0.07]" />
            <span className="h-2.5 w-20 animate-pulse rounded-md bg-foreground/[0.04]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
