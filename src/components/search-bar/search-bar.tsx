import { SearchIcon } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { Input } from "@/components/ui/input";
import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MIN_SUGGESTION_LENGTH } from "./constants";
import { DesktopDropdown } from "./desktop-dropdown";
import { SearchDropdown } from "./dropdown";
import { buildNavigableItems } from "./navigable";

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
  // The user's explicit selection. `focusedKey` (below) falls back to
  // the first navigable item when this is null or no longer matches a
  // visible row — so we never need a setState-in-effect to reset it.
  const [explicitKey, setExplicitKey] = useState<string | null>(null);

  const trimmed = value.trim();
  const len = trimmed.length;

  const filteredRecent =
    len === 0
      ? recentItems
      : recentItems.filter((item) =>
          item.displayName.toLowerCase().includes(trimmed.toLowerCase()),
        );

  const navigableItems = useMemo(
    () =>
      buildNavigableItems({
        recent: filteredRecent,
        suggestions: len >= MIN_SUGGESTION_LENGTH ? suggestions : [],
      }),
    [filteredRecent, suggestions, len],
  );

  // Desktop only: fall back to the first city row (recent or suggestion)
  // when no explicit pick is set. Actions are reachable via arrow keys
  // but never auto-focused — otherwise typing gibberish would put the
  // cursor on "Use my location" and Enter would run it. Mobile keeps
  // focusedKey null so Enter falls through to the validation prompt.
  const fallbackKey =
    navigableItems.find((i) => i.kind === "recent" || i.kind === "suggestion")
      ?.key ?? null;
  const focusedKey = isDesktop
    ? explicitKey && navigableItems.some((i) => i.key === explicitKey)
      ? explicitKey
      : fallbackKey
    : null;

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
    if (focusedKey) {
      runFocused();
      return;
    }
    if (len >= MIN_SUGGESTION_LENGTH) {
      setShowSelectPrompt(true);
    }
  }

  function runFocused() {
    const item = navigableItems.find((i) => i.key === focusedKey);
    if (!item) return;
    if (item.kind === "recent") {
      handleRecentSelect(item.item);
    } else if (item.kind === "suggestion") {
      handleSuggestionSelect(item.item);
    } else if (item.action === "location") {
      handleLocationRequest();
    } else {
      handleRandomSelect();
    }
  }

  function moveFocus(delta: 1 | -1) {
    if (navigableItems.length === 0) return;
    const idx = navigableItems.findIndex((i) => i.key === focusedKey);
    const nextIdx =
      idx === -1
        ? delta === 1
          ? 0
          : navigableItems.length - 1
        : Math.max(0, Math.min(navigableItems.length - 1, idx + delta));
    const nextKey = navigableItems[nextIdx]?.key;
    if (nextKey) setExplicitKey(nextKey);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isDesktop) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(-1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
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
              className="fixed inset-0 z-50 flex flex-col"
            >
              <motion.div
                className="mobile-search-overlay absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.06, delay: 0.22 } }}
                transition={{ duration: 0.2 }}
              />

              <div className="relative flex shrink-0 items-center gap-3 px-5 pb-3 pt-6 sm:pt-8">
                <motion.div
                  className="search-surface flex flex-1 items-center gap-3 rounded-[1.75rem] px-5 py-3"
                  initial={{ x: 40 }}
                  animate={{ x: 0, transition: spring }}
                  exit={{
                    x: 52,
                    opacity: 0,
                    transition: {
                      x: { type: "spring", stiffness: 400, damping: 30 },
                      opacity: { duration: 0.06, delay: 0.22 },
                    },
                  }}
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
                  animate={{ opacity: 1, x: 0, transition: spring }}
                  exit={{ opacity: 0, x: 16, transition: { duration: 0.12 } }}
                >
                  Cancel
                </motion.button>
              </div>

              <motion.div
                className="relative flex flex-1 flex-col overflow-hidden"
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.12 }}
              >
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
                  onKeyDown={handleKeyDown}
                  className="font-display h-auto flex-1 border-0 bg-transparent p-0 text-lg font-normal tracking-tight shadow-none placeholder:text-foreground/30 focus-visible:ring-0 lg:text-xl"
                />
              </div>

              <AnimatePresence>
                {showDropdown && (
                  <DesktopDropdown
                    navigableItems={navigableItems}
                    focusedKey={focusedKey}
                    setFocusedKey={setExplicitKey}
                    trimmed={trimmed}
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
