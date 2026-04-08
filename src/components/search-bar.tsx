import { FileTextIcon, MapPinIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";

const MIN_SUGGESTION_LENGTH = 3;

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

  const trimmed = value.trim();
  const len = trimmed.length;

  // Filter recent items by case-insensitive substring match when there's input.
  const filteredRecent =
    len === 0
      ? recentItems
      : recentItems.filter((item) =>
          item.displayName.toLowerCase().includes(trimmed.toLowerCase()),
        );

  const showDropdown =
    hasFocus && (recentItems.length > 0 || len > 0);

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
              className="size-7 shrink-0 text-sky-500"
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
              className="font-display font-light h-auto flex-1 border-0 bg-transparent p-0 text-xl tracking-tight shadow-none placeholder:font-light placeholder:text-foreground/35 focus-visible:ring-0 sm:text-2xl"
            />
            <kbd className="text-foreground/60 hidden rounded-lg bg-white/80 px-2.5 py-1.5 font-mono text-xs sm:inline-block">
              ↵
            </kbd>
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
              onSuggestionSelect={handleSuggestionSelect}
            />
          )}
        </div>
      </form>
    </search>
  );
}

function SearchDropdown({
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
}: {
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
}) {
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

function SectionHeader({ label }: { label: string }) {
  return (
    <span className="font-display font-normal text-foreground/55 text-[11px] uppercase tracking-[0.18em]">
      {label}
    </span>
  );
}

function RecentSection({
  items,
  onSelect,
  onRemove,
  onClearAll,
}: {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onRemove: (item: HistoryItem) => void;
  onClearAll: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-3 pb-2 pt-1">
        <SectionHeader label="Recent" />
        <ClearAllButton onConfirm={onClearAll} />
      </div>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li
            key={item.id}
            className="group hover:bg-muted flex items-center gap-3 rounded-2xl px-3 py-2.5"
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
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-foreground/15 text-foreground/60">
                <FileTextIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
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

function SuggestionsList({
  items,
  showHeader,
  onSelect,
}: {
  items: SuggestionItem[];
  showHeader: boolean;
  onSelect: (item: SuggestionItem) => void;
}) {
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

function SuggestionsLoading() {
  return (
    <ul className="flex flex-col">
      {[1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-foreground/15">
            <MapPinIcon className="size-4 text-foreground/20" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="h-4 w-40 animate-pulse rounded bg-foreground/10" />
        </li>
      ))}
    </ul>
  );
}

function ClearAllButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          className="text-foreground/55 hover:text-destructive h-7 px-2 text-xs uppercase tracking-wider"
        >
          <Trash2Icon className="size-3.5" aria-hidden="true" />
          Clear
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear all recent searches?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes every entry from your history. You'll be able to undo for a few seconds.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Clear all</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
