import { SearchIcon } from "lucide-react";
import { type FormEvent, type AnimationEvent, useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";
import { useMediaQuery } from "@/hooks/use-media-query";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [hasFocus, setHasFocus] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showSelectPrompt, setShowSelectPrompt] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clipVars, setClipVars] = useState<React.CSSProperties | undefined>(undefined);

  const trimmed = value.trim();
  const len = trimmed.length;

  const filteredRecent =
    len === 0
      ? recentItems
      : recentItems.filter((item) =>
          item.displayName.toLowerCase().includes(trimmed.toLowerCase()),
        );

  const isMobileOpen = !isDesktop && (hasFocus || isClosing);
  const showDropdown = clearDialogOpen || hasFocus;

  // Body scroll lock + neutralize ancestor animations that create
  // containing blocks (the header's `rise` animation retains a computed
  // transform which breaks `position: fixed` on the overlay).
  useEffect(() => {
    if (!isMobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const header = containerRef.current?.closest("header");
    if (header instanceof HTMLElement) {
      header.style.animation = "none";
    }

    return () => {
      document.body.style.overflow = prev;
      if (header instanceof HTMLElement) {
        header.style.animation = "";
      }
    };
  }, [isMobileOpen]);

  function handleFocus() {
    if (!isDesktop && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setClipVars({
        "--clip-top": `${r.top}px`,
        "--clip-right": `${window.innerWidth - r.right}px`,
        "--clip-bottom": `${window.innerHeight - r.bottom}px`,
        "--clip-left": `${r.left}px`,
      } as React.CSSProperties);
    }
    setHasFocus(true);
  }

  function handleBlur() {
    if (isDesktop) setHasFocus(false);
  }

  function handleClose() {
    setIsClosing(true);
  }

  function handleAnimationEnd(e: AnimationEvent) {
    if (e.animationName === "overlay-collapse") {
      setIsClosing(false);
      setHasFocus(false);
      setShowSelectPrompt(false);
      onValueChange("");
      inputRef.current?.blur();
    }
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
    if (isDesktop) {
      inputRef.current?.blur();
    } else {
      handleClose();
    }
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
        <div
          ref={containerRef}
          className={
            isMobileOpen
              ? `mobile-search-overlay fixed inset-0 z-50 flex flex-col${
                  isClosing ? " overlay-exit" : " overlay-enter"
                }`
              : "relative"
          }
          style={isMobileOpen ? clipVars : undefined}
          onAnimationEnd={handleAnimationEnd}
        >
          <div
            className={
              isMobileOpen
                ? "flex shrink-0 items-center gap-3 px-5 pb-3 pt-[max(1.5rem,env(safe-area-inset-top))]"
                : ""
            }
          >
            <div
              className={`card-surface flex items-center gap-4 rounded-3xl px-6 py-4 transition-all duration-300${
                isMobileOpen ? " flex-1" : ""
              }${
                hasFocus && !isMobileOpen
                  ? " ring-[3px] ring-sky-400/25 [.night_&]:ring-sky-300/15"
                  : ""
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
                onFocus={handleFocus}
                onBlur={handleBlur}
                className="font-display font-light h-auto flex-1 border-0 bg-transparent p-0 text-2xl tracking-tight shadow-none placeholder:font-light placeholder:text-foreground/35 focus-visible:ring-0 sm:text-3xl"
              />
            </div>

            {isMobileOpen && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleClose();
                }}
                className="shrink-0 text-[15px] font-medium text-foreground/50 transition-colors duration-150 active:text-foreground/70"
              >
                Cancel
              </button>
            )}
          </div>

          {showDropdown && (
            <SearchDropdown
              isMobileOpen={isMobileOpen}
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
        </div>
      </form>
    </search>
  );
}
