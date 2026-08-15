import { SearchIcon } from "lucide-react";
import { useEffect, useId } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { SuggestionItem } from "@/api/types";
import type { WeatherClientError } from "@/api/weather";
import { Input } from "@/components/ui/input";
import type { HistoryItem } from "@/hooks/use-history";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Menu } from "./menu";
import { SearchError } from "./search-error";
import { searchErrorMessage } from "./search-error-model";
import { useSearchMenu } from "./use-search-menu";

interface SearchBarProps {
  recentItems: HistoryItem[];
  suggestions: SuggestionItem[];
  isSuggestionsLoading: boolean;
  error: WeatherClientError | null;
  activeQuery: string | null;
  onValueChange: (next: string) => void;
  onSuggestionSelect: (item: SuggestionItem) => void;
  onRecentSelect: (item: HistoryItem) => void;
  onRecentRemove: (item: HistoryItem) => void;
  onRecentClearAll: () => void;
  onLocationRequest: () => void;
  onRandomSelect: () => void;
  /** Fires with the mobile overlay's state, which spans the whole header. */
  onOpenChange?: (isMobileOverlay: boolean) => void;
}

const cancelTransition = { type: "spring" as const, stiffness: 400, damping: 30 };
const cancelExitTransition = { type: "spring" as const, stiffness: 500, damping: 40 };
const layoutTransition = { type: "spring" as const, stiffness: 500, damping: 40 };

const menuDesktopVariants = {
  hidden: { opacity: 0, y: -6, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.985 },
};
const menuMobileVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
};
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * The Input stays in document flow in every state — no position swap, no
 * remount. The mobile overlay animates around it, so y position is stable
 * across focus/blur, and the surface grows leftward over the emoji by animating
 * a negative marginLeft (values below are emoji width + header gap per
 * breakpoint). See RFC 011.
 */
const SLIDE_XS = 56;
const SLIDE_SM = 80;
const SLIDE_MD = 96;

export function SearchBar({
  recentItems,
  suggestions,
  isSuggestionsLoading,
  error,
  activeQuery,
  onValueChange,
  onSuggestionSelect,
  onRecentSelect,
  onRecentRemove,
  onRecentClearAll,
  onLocationRequest,
  onRandomSelect,
  onOpenChange,
}: SearchBarProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const errorMessage = searchErrorMessage(error, activeQuery);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isMd = useMediaQuery("(min-width: 768px)");
  const isSm = useMediaQuery("(min-width: 640px)");
  const {
    isOpen,
    model,
    focusedKey,
    inputRef,
    inputProps,
    formProps,
    cancel,
    hoverKey,
    selectRecent,
    selectSuggestion,
    requestLocation,
    selectRandom,
    isDialogOpen,
    setDialogOpen,
  } = useSearchMenu({
    recentItems,
    suggestions,
    isSuggestionsLoading,
    onSuggestionSelect,
    onRecentSelect,
    onLocationRequest,
    onRandomSelect,
    onValueChange,
  });

  const isMobileOverlay = !isDesktop && isOpen;
  const slideLeft = isMobileOverlay ? (isMd ? SLIDE_MD : isSm ? SLIDE_SM : SLIDE_XS) : 0;

  useEffect(() => {
    onOpenChange?.(isMobileOverlay);
  }, [isMobileOverlay, onOpenChange]);

  useEffect(() => {
    if (!isMobileOverlay) return;
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isMobileOverlay]);

  const menuProps = {
    model,
    focusedKey,
    hoverKey,
    selectRecent,
    selectSuggestion,
    requestLocation,
    selectRandom,
    onRecentRemove,
    onRecentClearAll,
    isDialogOpen,
    setDialogOpen,
  };

  return (
    <search>
      <form {...formProps}>
        <label htmlFor={inputId} className="sr-only">
          Search city
        </label>

        <AnimatePresence>
          {isMobileOverlay && (
            <motion.div
              key="backdrop"
              className="mobile-search-overlay fixed inset-0 z-30"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        <div className="relative z-40 flex items-center">
          <motion.div
            layout
            transition={layoutTransition}
            animate={{ marginLeft: -slideLeft }}
            className="search-surface flex flex-1 items-center gap-3 rounded-[1.75rem] px-5 py-3 lg:gap-3.5 lg:py-3.5"
          >
            <SearchIcon
              className="size-[18px] shrink-0 text-foreground/55 [.night_&]:text-foreground/60 lg:size-5"
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
              {...inputProps}
              aria-describedby={errorMessage ? errorId : undefined}
              className="h-auto flex-1 border-0 bg-transparent p-0 text-lg font-normal tracking-tight shadow-none placeholder:text-foreground/70 focus-visible:ring-0 lg:text-xl"
            />
          </motion.div>

          <AnimatePresence>
            {isMobileOverlay && (
              <motion.button
                key="cancel"
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  cancel();
                }}
                className="shrink-0 overflow-hidden whitespace-nowrap text-sm font-medium text-foreground/70 active:text-foreground/85"
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{
                  opacity: 1,
                  width: "auto",
                  marginLeft: 12,
                  transition: cancelTransition,
                }}
                exit={{
                  opacity: 0,
                  width: 0,
                  marginLeft: 0,
                  transition: cancelExitTransition,
                }}
              >
                Cancel
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <SearchError id={errorId} message={errorMessage} />

        <AnimatePresence>
          {isOpen &&
            (isMobileOverlay ? (
              <motion.div
                key="menu-mobile"
                className="search-dropdown-desktop fixed inset-x-4 bottom-4 top-[5.5rem] z-40 flex flex-col overflow-hidden rounded-2xl sm:top-[7.5rem]"
                variants={menuMobileVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.18 }}
              >
                <Menu {...menuProps} />
              </motion.div>
            ) : (
              <motion.div
                key="menu-desktop"
                role="listbox"
                className="search-dropdown-desktop absolute left-0 right-0 top-full z-40 mt-3 flex max-h-[460px] flex-col overflow-hidden rounded-2xl"
                variants={menuDesktopVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
                style={{ transformOrigin: "top center" }}
              >
                <Menu {...menuProps} />
              </motion.div>
            ))}
        </AnimatePresence>
      </form>
    </search>
  );
}
