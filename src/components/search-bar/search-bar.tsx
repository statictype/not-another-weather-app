import { SearchIcon } from "lucide-react";
import { useEffect, useId } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { SuggestionItem } from "@/api/types";
import { Input } from "@/components/ui/input";
import type { HistoryItem } from "@/hooks/use-history";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Menu } from "./menu";
import { useSearchMenu } from "./use-search-menu";

interface SearchBarProps {
  recentItems: HistoryItem[];
  suggestions: SuggestionItem[];
  isSuggestionsLoading: boolean;
  /** Fires whenever the search input value changes. App.tsx reads this to drive autocomplete. */
  onValueChange: (next: string) => void;
  onSuggestionSelect: (item: SuggestionItem) => void;
  onRecentSelect: (item: HistoryItem) => void;
  onRecentRemove: (item: HistoryItem) => void;
  onRecentClearAll: () => void;
  onLocationRequest: () => void;
  onRandomSelect: () => void;
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
 * Composition: single Input element kept in document flow on every
 * state, one `useSearchMenu` state machine, one `<Menu>` renderer
 * shared across breakpoints.
 *
 * The mobile overlay (backdrop + Cancel) animates **around** the input
 * without moving it — the input's wrapper never becomes fixed, so y
 * position is stable across focus/blur. Cancel slides in via motion
 * `layout` so the input's width change is animated rather than a jump.
 *
 * The glass backdrop starts below the page header so the 😶‍🌫️ emoji
 * stays visible above the overlay. See RFC 011.
 */
// How far the search surface slides leftward to overlap the emoji when
// the mobile menu opens — emoji size + header gap at each breakpoint:
//   xs (<640): text-5xl emoji (3rem) + gap-2 (0.5rem) = 56px
//   sm (640+): text-7xl emoji (4.5rem) + gap-2 (0.5rem) = 80px
//   md (768+): text-7xl emoji (4.5rem) + md:gap-6 (1.5rem) = 96px
const SLIDE_XS = 56;
const SLIDE_SM = 80;
const SLIDE_MD = 96;

export function SearchBar({
  recentItems,
  suggestions,
  isSuggestionsLoading,
  onValueChange,
  onSuggestionSelect,
  onRecentSelect,
  onRecentRemove,
  onRecentClearAll,
  onLocationRequest,
  onRandomSelect,
}: SearchBarProps) {
  const inputId = useId();
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

        {/* Glass backdrop covering the full viewport. The emoji sits at
            z-auto in the header behind it; the input row + Cancel stack
            above via z-40. The 200 ms opacity ramp is what produces the
            old behaviour where the emoji's yellow briefly shines through
            the input's glass while the overlay is still translucent. */}
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

        {/* Input row stays in document flow — no position swap, no remount.
            When the mobile menu opens, the search surface grows leftward by
            animating a negative marginLeft. Flex re-distributes the freed
            space into the input's width, so the right edge stays put and
            the left edge slides over the emoji (the glass background lets
            the emoji's yellow shine through). Cancel animates its own
            width + marginLeft (rather than the parent's gap) so the right
            edge slides smoothly back when closing — no unmount jump. */}
        <div className="relative z-40 flex items-center">
          <motion.div
            layout
            transition={layoutTransition}
            animate={{ marginLeft: -slideLeft }}
            className="search-surface flex flex-1 items-center gap-3 rounded-[1.75rem] px-5 py-3 lg:gap-3.5 lg:py-3.5"
          >
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
              {...inputProps}
              className="font-display h-auto flex-1 border-0 bg-transparent p-0 text-lg font-normal tracking-tight shadow-none placeholder:text-foreground/30 focus-visible:ring-0 lg:text-xl"
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
                className="shrink-0 overflow-hidden whitespace-nowrap text-sm font-medium text-foreground/55 active:text-foreground/75"
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

        {/* Menu — positioned as an absolute dropdown on desktop, fixed
            full-area below the header on mobile-overlay. Same content
            either way; the wrapper picks the chrome. */}
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
