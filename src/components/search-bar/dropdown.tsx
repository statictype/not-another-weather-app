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
  onSuggestionSelect: (item: SuggestionItem) => void;
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
  onSuggestionSelect,
}: SearchDropdownProps) {
  const len = trimmed.length;

  return (
    <div className="bg-popover text-popover-foreground absolute left-0 right-0 top-full z-20 mt-2 max-h-[60vh] overflow-y-auto rounded-3xl border border-border p-3 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.25)]">
      {/* Empty input: show all recent searches */}
      {len === 0 && allRecent.length > 0 && (
        <RecentSection
          items={allRecent}
          onSelect={onRecentSelect}
          onRemove={onRecentRemove}
          onClearAll={onRecentClearAll}
        />
      )}

      {/* 1–2 chars: filtered recents + keep-typing hint */}
      {len > 0 && len < MIN_SUGGESTION_LENGTH && (
        <>
          {filteredRecent.length > 0 && (
            <RecentSection
              items={filteredRecent}
              onSelect={onRecentSelect}
              onRemove={onRecentRemove}
              onClearAll={onRecentClearAll}
            />
          )}
          <p className="px-3 py-3 text-sm text-foreground/50">
            Keep typing to see city suggestions…
          </p>
        </>
      )}

      {/* 3+ chars: filtered recents on top, then suggestions */}
      {len >= MIN_SUGGESTION_LENGTH && (
        <>
          {filteredRecent.length > 0 && (
            <RecentSection
              items={filteredRecent}
              onSelect={onRecentSelect}
              onRemove={onRecentRemove}
              onClearAll={onRecentClearAll}
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
          ) : !isSuggestionsLoading && filteredRecent.length === 0 ? (
            <p className="px-3 py-3 text-sm text-foreground/50">No cities found.</p>
          ) : null}

          {showSelectPrompt && (
            <p role="alert" className="px-3 pt-1 pb-2 text-sm text-destructive">
              Select a city from the list to search.
            </p>
          )}
        </>
      )}
    </div>
  );
}
