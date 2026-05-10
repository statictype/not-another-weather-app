import { SearchIcon } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Input } from "@/components/ui/input";
import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MIN_SUGGESTION_LENGTH } from "./constants";
import { SearchDropdown } from "./dropdown";

const spring = { type: "spring" as const, stiffness: 400, damping: 30 };

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
  onLocationRequest: () => void;
  onRandomSelect: () => void;
}

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
  onLocationRequest,
  onRandomSelect,
}: SearchBarProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [hasFocus, setHasFocus] = useState(false);
  const [showSelectPrompt, setShowSelectPrompt] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const trimmed = value.trim();
  const len = trimmed.length;

  const filteredRecent =
    len === 0
      ? recentItems
      : recentItems.filter((item) =>
          item.displayName.toLowerCase().includes(trimmed.toLowerCase()),
        );

  const isMobileOpen = !isDesktop && hasFocus;
  const showDropdown = clearDialogOpen || hasFocus;

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", isMobileOpen);

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isMobileOpen]);

  function handleFocus() {
    setHasFocus(true);
  }

  function handleBlur() {
    if (isDesktop) setHasFocus(false);
  }

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

  function closeSearch() {
    setShowSelectPrompt(false);
    onValueChange("");
    setHasFocus(false);
    inputRef.current?.blur();
  }

  function handleRecentSelect(item: HistoryItem) {
    closeSearch();
    onRecentSelect(item);
  }

  function handleSuggestionSelect(item: SuggestionItem) {
    closeSearch();
    onSuggestionSelect(item);
  }

  function handleLocationRequest() {
    closeSearch();
    onLocationRequest();
  }

  function handleRandomSelect() {
    closeSearch();
    onRandomSelect();
  }

  return (
    <search>
      <form onSubmit={handleSubmit}>
        <label htmlFor={inputId} className="sr-only">
          Search city
        </label>

        <AnimatePresence>
          {isMobileOpen ? (
            <motion.div
              key="mobile-overlay"
              className="mobile-search-overlay fixed inset-0 z-50 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-6 sm:pt-8">
                <motion.div
                  className="search-surface flex flex-1 items-center gap-3 rounded-[1.75rem] px-5 py-3"
                  initial={{ x: 40 }}
                  animate={{ x: 0 }}
                  exit={{ x: 40 }}
                  transition={spring}
                >
                  <SearchIcon
                    className="size-[18px] shrink-0 text-foreground/30 [.night_&]:text-foreground/35"
                    strokeWidth={2.25}
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
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className="font-display h-auto flex-1 border-0 bg-transparent p-0 text-lg font-normal tracking-tight shadow-none placeholder:text-foreground/30 focus-visible:ring-0"
                  />
                </motion.div>

                <motion.button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    closeSearch();
                  }}
                  className="shrink-0 text-sm font-medium text-foreground/50 active:text-foreground/70"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={spring}
                >
                  Cancel
                </motion.button>
              </div>

              {showDropdown && (
                <SearchDropdown
                  isMobileOpen
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
                  onLocationRequest={handleLocationRequest}
                  onRandomSelect={handleRandomSelect}
                />
              )}
            </motion.div>
          ) : (
            <div className="relative">
              <div className="search-surface flex items-center gap-3 rounded-[1.75rem] px-5 py-3 lg:gap-3.5 lg:py-3.5">
                <SearchIcon
                  className="size-[18px] shrink-0 text-foreground/30 [.night_&]:text-foreground/35 lg:size-5"
                  strokeWidth={2.25}
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
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  className="font-display h-auto flex-1 border-0 bg-transparent p-0 text-lg font-normal tracking-tight shadow-none placeholder:text-foreground/30 focus-visible:ring-0 lg:text-xl"
                />
              </div>

              <AnimatePresence>
                {showDropdown && (
                  <SearchDropdown
                    isMobileOpen={false}
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
                    onLocationRequest={handleLocationRequest}
                    onRandomSelect={handleRandomSelect}
                  />
                )}
              </AnimatePresence>
            </div>
          )}
        </AnimatePresence>
      </form>
    </search>
  );
}
