import { XIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId } from "react";
import type { SuggestionItem } from "@/api/types";
import { Menu } from "@/components/search-bar/menu";
import type { NavigableItem } from "@/components/search-bar/menu-model";
import { SearchField } from "@/components/search-bar/search-field";
import { useSearchMenu } from "@/components/search-bar/use-search-menu";
import { UnitToggle } from "@/components/unit-toggle";
import type { HistoryItem } from "@/hooks/use-history";
import {
  PANEL_REGION_DELAY,
  PANEL_REGION_IN,
  PANEL_REGION_OFFSET,
  PANEL_STAGGER,
  REDUCED_MOTION_FADE,
} from "@/lib/motion/constants";
import { ICON_BUTTON, type NavPlacement } from "./contract";
import { NavIconButton } from "./nav-trigger";
import type { PendingSelection } from "./pending-selection";

export type NavIntent = "search" | "settings";

interface NavPanelProps {
  intent: NavIntent;
  placement: NavPlacement;
  recentItems: HistoryItem[];
  suggestions: SuggestionItem[];
  isSuggestionsLoading: boolean;
  errorMessage: string | null;
  pending: PendingSelection | null;
  onValueChange: (next: string) => void;
  onSuggestionSelect: (item: SuggestionItem) => void;
  onRecentSelect: (item: HistoryItem) => void;
  onRecentRemove: (item: HistoryItem) => void;
  onRecentClearAll: () => void;
  onLocationRequest: () => void;
  onRandomSelect: () => void;
  onCommit: (item: NavigableItem) => void;
  onClose: () => void;
}

/**
 * Three regions: the field pinned at the top beside the mark and the close
 * control, the menu scrolling between them, the unit toggle pinned as a footer.
 *
 * Mounts and unmounts with the open state. There is no field in the closed bar,
 * so there is no caret, selection or IME state to carry across.
 */
export function NavPanel({
  intent,
  placement,
  recentItems,
  suggestions,
  isSuggestionsLoading,
  errorMessage,
  pending,
  onValueChange,
  onSuggestionSelect,
  onRecentSelect,
  onRecentRemove,
  onRecentClearAll,
  onLocationRequest,
  onRandomSelect,
  onCommit,
  onClose,
}: NavPanelProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const reduced = useReducedMotion() === true;

  const menu = useSearchMenu({
    recentItems,
    suggestions,
    isSuggestionsLoading,
    onSuggestionSelect,
    onRecentSelect,
    onLocationRequest,
    onRandomSelect,
    onValueChange,
    onCommit,
    onClose,
  });

  // The panel owns the query string. Nothing outside it should keep fetching
  // suggestions for a field that no longer exists.
  useEffect(() => {
    return () => onValueChange("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      <Region index={0} placement={placement} reduced={reduced} className="shrink-0 px-3 pt-3">
        <SearchField
          id={inputId}
          errorId={errorId}
          errorMessage={errorMessage}
          disabled={pending !== null}
          autoFocus={intent === "search"}
          inputRef={menu.inputRef}
          inputProps={menu.inputProps}
          formProps={menu.formProps}
          leading={<div aria-hidden="true" className="shrink-0" style={{ width: ICON_BUTTON }} />}
          trailing={
            <NavIconButton
              icon={XIcon}
              label="Close"
              onClick={onClose}
              autoFocus={intent === "settings"}
            />
          }
        />
      </Region>

      <Region
        index={1}
        placement={placement}
        reduced={reduced}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        aria-busy={pending !== null}
      >
        <Menu
          model={menu.model}
          focusedKey={menu.focusedKey}
          pendingKey={pending?.key ?? null}
          hoverKey={menu.hoverKey}
          selectRecent={menu.selectRecent}
          selectSuggestion={menu.selectSuggestion}
          requestLocation={menu.requestLocation}
          selectRandom={menu.selectRandom}
          onRecentRemove={onRecentRemove}
          onRecentClearAll={onRecentClearAll}
          isDialogOpen={menu.isDialogOpen}
          setDialogOpen={menu.setDialogOpen}
        />
      </Region>

      <Region
        index={2}
        placement={placement}
        reduced={reduced}
        className="border-foreground/10 flex shrink-0 items-center justify-between border-t px-6 py-2.5"
      >
        <span className="label-section" aria-hidden="true">
          Units
        </span>
        <UnitToggle />
      </Region>
    </div>
  );
}

/** The regions arrive in reading order, travelling the short way along the axis
 *  the container just grew on. */
function Region({
  index,
  placement,
  reduced,
  className,
  children,
  ...rest
}: {
  index: number;
  placement: NavPlacement;
  reduced: boolean;
  className: string;
  children: ReactNode;
} & { "aria-busy"?: boolean }) {
  const from =
    placement.edge === "left"
      ? { x: -PANEL_REGION_OFFSET }
      : { y: placement.edge === "bottom" ? PANEL_REGION_OFFSET : -PANEL_REGION_OFFSET };

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, ...from }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={
        reduced
          ? REDUCED_MOTION_FADE
          : { ...PANEL_REGION_IN, delay: PANEL_REGION_DELAY + index * PANEL_STAGGER }
      }
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
