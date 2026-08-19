import { XIcon } from "lucide-react";
import { useEffect, useId } from "react";
import type { SuggestionItem } from "@/api/types";
import { Menu } from "@/components/search-bar/menu";
import type { NavigableItem } from "@/components/search-bar/menu-model";
import { SearchField } from "@/components/search-bar/search-field";
import { useSearchMenu } from "@/components/search-bar/use-search-menu";
import { UnitToggle } from "@/components/unit-toggle";
import type { HistoryItem } from "@/hooks/use-history";
import { cn } from "@/lib/utils";
import { GLYPH_SIZE, GLYPH_STROKE, ICON_BUTTON, type NavPlacement } from "./contract";
import { NavMark } from "./nav-bar";
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
 * Three regions: the field pinned at the top with the close control, the menu
 * scrolling between them, the unit toggle pinned as a footer.
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
  const isRail = placement.edge === "left";

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
    <div className={cn("flex h-full w-full flex-col gap-3 p-3", isRail && "pt-3")}>
      <div className="flex shrink-0 items-center gap-3">
        <NavMark />
        <div className="min-w-0 flex-1">
          <SearchField
            id={inputId}
            errorId={errorId}
            errorMessage={errorMessage}
            disabled={pending !== null}
            autoFocus={intent === "search"}
            inputRef={menu.inputRef}
            inputProps={menu.inputProps}
            formProps={menu.formProps}
            trailing={
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                autoFocus={intent === "settings"}
                className="flex shrink-0 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
                style={{ width: ICON_BUTTON, height: ICON_BUTTON }}
              >
                <XIcon size={GLYPH_SIZE} strokeWidth={GLYPH_STROKE} aria-hidden="true" />
              </button>
            }
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-busy={pending !== null}>
        <Menu
          model={menu.model}
          focusedKey={menu.focusedKey}
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
      </div>

      <div className="flex shrink-0 items-center justify-end border-t border-foreground/10 pt-3">
        <UnitToggle />
      </div>
    </div>
  );
}
