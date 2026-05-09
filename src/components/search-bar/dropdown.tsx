import { KeyboardIcon, LocateFixedIcon, ShuffleIcon } from "lucide-react";
import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";
import { MIN_SUGGESTION_LENGTH } from "./constants";
import { RecentSection } from "./recent-section";
import { SuggestionsList, SuggestionsLoading } from "./suggestions-list";

interface SearchDropdownProps {
  trimmed: string;
  filteredRecent: HistoryItem[];
  allRecent: HistoryItem[];
  suggestions: SuggestionItem[];
  isSuggestionsLoading: boolean;
  showSelectPrompt: boolean;
  onRecentSelect: (item: HistoryItem) => void;
  onRecentRemove: (item: HistoryItem) => void;
  onRecentClearAll: () => void;
  clearDialogOpen: boolean;
  onClearDialogOpenChange: (open: boolean) => void;
  onSuggestionSelect: (item: SuggestionItem) => void;
  onLocationRequest: () => void;
  onRandomSelect: () => void;
}

export function SearchDropdown({
  trimmed,
  filteredRecent,
  allRecent,
  suggestions,
  isSuggestionsLoading,
  showSelectPrompt,
  onRecentSelect,
  onRecentRemove,
  onRecentClearAll,
  clearDialogOpen,
  onClearDialogOpenChange,
  onSuggestionSelect,
  onLocationRequest,
  onRandomSelect,
}: SearchDropdownProps) {
  const len = trimmed.length;

  return (
    <div className="search-dropdown dropdown-enter absolute left-0 right-0 top-full z-20 mt-3 max-h-[60vh] overflow-y-auto overflow-x-hidden rounded-2xl p-2">
      {len === 0 && allRecent.length > 0 && (
        <RecentSection
          items={allRecent}
          onSelect={onRecentSelect}
          onRemove={onRecentRemove}
          onClearAll={onRecentClearAll}
          clearDialogOpen={clearDialogOpen}
          onClearDialogOpenChange={onClearDialogOpenChange}
        />
      )}

      {len > 0 && len < MIN_SUGGESTION_LENGTH && (
        <>
          {filteredRecent.length > 0 && (
            <RecentSection
              items={filteredRecent}
              onSelect={onRecentSelect}
              onRemove={onRecentRemove}
              onClearAll={onRecentClearAll}
              clearDialogOpen={clearDialogOpen}
              onClearDialogOpenChange={onClearDialogOpenChange}
            />
          )}
          <div className="flex items-center gap-2.5 px-3 py-3">
            <KeyboardIcon className="size-4 text-foreground/30" strokeWidth={1.75} aria-hidden="true" />
            <p className="text-[13px] font-medium text-foreground/40">
              Keep typing for city suggestions…
            </p>
          </div>
        </>
      )}

      {len >= MIN_SUGGESTION_LENGTH && (
        <>
          {filteredRecent.length > 0 && (
            <RecentSection
              items={filteredRecent}
              onSelect={onRecentSelect}
              onRemove={onRecentRemove}
              onClearAll={onRecentClearAll}
              clearDialogOpen={clearDialogOpen}
              onClearDialogOpenChange={onClearDialogOpenChange}
            />
          )}

          {isSuggestionsLoading ? (
            <SuggestionsLoading />
          ) : suggestions.length > 0 ? (
            <SuggestionsList
              items={suggestions}
              showHeader={filteredRecent.length > 0}
              onSelect={onSuggestionSelect}
            />
          ) : filteredRecent.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-6">
              <p className="text-sm font-medium text-foreground/50">No cities found</p>
              <p className="text-xs text-foreground/30">Try a different spelling</p>
            </div>
          ) : null}

          {showSelectPrompt && (
            <p role="alert" className="px-4 pt-1 pb-2 text-[13px] font-medium text-destructive">
              Select a city from the list
            </p>
          )}
        </>
      )}

      <div className="mt-1 flex items-center gap-1.5 px-1 pb-1 pt-1">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onLocationRequest();
          }}
          className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground/[0.04] py-2.5 text-[13px] font-medium text-foreground/45 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-foreground/[0.08] hover:text-foreground/70 active:scale-[0.97]"
        >
          <LocateFixedIcon
            className="size-3.5 transition-transform duration-300 group-hover:scale-110"
            strokeWidth={2}
            aria-hidden="true"
          />
          My location
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onRandomSelect();
          }}
          className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground/[0.04] py-2.5 text-[13px] font-medium text-foreground/45 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-foreground/[0.08] hover:text-foreground/70 active:scale-[0.97]"
        >
          <ShuffleIcon
            className="size-3.5 transition-transform duration-300 group-hover:rotate-180"
            strokeWidth={2}
            aria-hidden="true"
          />
          Surprise me
        </button>
      </div>
    </div>
  );
}
