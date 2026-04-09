import { SearchIcon } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";
import { MIN_SUGGESTION_LENGTH } from "./constants";
import { SearchDropdown } from "./dropdown";

interface SearchBarProps {
  value: string;
  onValueChange: (next: string) => void;
  recentItems: HistoryItem[];
  suggestions: SuggestionItem[];
  isSuggestionsLoading: boolean;
  onSuggestionSelect: (item: SuggestionItem) => void;
  onRecentSelect: (item: HistoryItem) => void;
  onRecentRemove: (item: HistoryItem) => void;
  onRecentClearAll: () => void;
}

/**
 * Search input with an adaptive dropdown:
 *   - focused + empty → recent searches
 *   - focused + 1–2 chars → filtered recents + "keep typing" hint
 *   - focused + 3+ chars → filtered recents on top, then city suggestions
 *
 * Weather is only fetched when the user explicitly selects a city (suggestion
 * or recent item). Typing alone never triggers a fetch.
 */
export function SearchBar({
  value,
  onValueChange,
  recentItems,
  suggestions,
  isSuggestionsLoading,
  onSuggestionSelect,
  onRecentSelect,
  onRecentRemove,
  onRecentClearAll,
}: SearchBarProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasFocus, setHasFocus] = useState(false);
  const [showSelectPrompt, setShowSelectPrompt] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const trimmed = value.trim();
  const len = trimmed.length;

  // Filter recent items by case-insensitive substring match when there's input.
  const filteredRecent =
    len === 0
      ? recentItems
      : recentItems.filter((item) =>
          item.displayName.toLowerCase().includes(trimmed.toLowerCase()),
        );

  const showDropdown = clearDialogOpen || (hasFocus && (recentItems.length > 0 || len > 0));

  function handleChange(next: string) {
    onValueChange(next);
    if (showSelectPrompt) setShowSelectPrompt(false);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (len >= MIN_SUGGESTION_LENGTH) {
      setShowSelectPrompt(true);
    }
  }

  function handleRecentSelect(item: HistoryItem) {
    setShowSelectPrompt(false);
    inputRef.current?.blur();
    onRecentSelect(item);
  }

  function handleSuggestionSelect(item: SuggestionItem) {
    setShowSelectPrompt(false);
    inputRef.current?.blur();
    onSuggestionSelect(item);
  }

  return (
    <search>
      <form onSubmit={handleSubmit}>
        <label htmlFor={inputId} className="sr-only">
          Search city
        </label>
        <div className="relative">
          <div
            className={`card-surface flex items-center gap-4 rounded-3xl px-6 py-4 transition-all ${
              hasFocus ? "ring-4 ring-sky-300/40" : ""
            }`}
          >
            <SearchIcon
              className="size-7 shrink-0 text-sky-500 [.night_&]:text-foreground/45"
              strokeWidth={2}
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              id={inputId}
              type="search"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search a city…"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => setHasFocus(true)}
              onBlur={() => setHasFocus(false)}
              className="font-display font-light h-auto flex-1 border-0 bg-transparent p-0 text-2xl tracking-tight shadow-none placeholder:font-light placeholder:text-foreground/35 focus-visible:ring-0 sm:text-3xl"
            />
          </div>

          {showDropdown && (
            <SearchDropdown
              trimmed={trimmed}
              filteredRecent={filteredRecent}
              allRecent={recentItems}
              suggestions={suggestions}
              isSuggestionsLoading={isSuggestionsLoading}
              showSelectPrompt={showSelectPrompt}
              onRecentSelect={handleRecentSelect}
              onRecentRemove={onRecentRemove}
              onRecentClearAll={onRecentClearAll}
              clearDialogOpen={clearDialogOpen}
              onClearDialogOpenChange={setClearDialogOpen}
              onSuggestionSelect={handleSuggestionSelect}
            />
          )}
        </div>
      </form>
    </search>
  );
}
