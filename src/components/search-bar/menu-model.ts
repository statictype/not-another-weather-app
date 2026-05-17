import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";
import { MIN_SUGGESTION_LENGTH } from "./constants";

/**
 * Pure description of the search menu's contents, given an input value
 * and the upstream data tiers. Both the desktop list and the mobile
 * chip-grid render directly off this model — the branching ladder
 * (recents above, suggestions below, keep-typing/no-results hints)
 * lives here, not duplicated across two layouts.
 *
 * Side-effect free: `buildMenuModel` is a pure function with no React
 * dependency, tested in isolation.
 */

export type ActionKind = "location" | "random";

export type NavigableItem =
  | { kind: "recent"; key: string; item: HistoryItem }
  | { kind: "suggestion"; key: string; item: SuggestionItem }
  | { kind: "action"; key: string; action: ActionKind };

/**
 * A renderable strip in the scrollable area of the menu. Actions live
 * separately in `MenuModel.actions` because both layouts render them
 * as a fixed footer rather than as a scrolling section.
 */
export type MenuSection =
  | { kind: "recent"; items: HistoryItem[] }
  | { kind: "suggestions"; items: SuggestionItem[]; showHeader: boolean }
  | { kind: "suggestions-loading" }
  | { kind: "empty-results" }
  | { kind: "keep-typing" };

export interface MenuModel {
  /** Scrollable area, top-to-bottom. */
  sections: MenuSection[];
  /** Fixed footer actions (`location`, `random`). Always two items. */
  actions: NavigableItem[];
  /**
   * Flat keyboard-nav order: all city rows in `sections`, followed by
   * `actions`. The hook walks this list for arrow-key navigation; the
   * default focus lands on the first item with `kind: "recent"` or
   * `"suggestion"` (never an action — see `defaultFocusKey`).
   */
  navigable: NavigableItem[];
  /**
   * The first city row's key, used as the default focus target. Null
   * if there are no city rows (e.g. cold start with no history, or
   * len ≥ 3 with no suggestions and no matching recents).
   */
  defaultFocusKey: string | null;
}

export interface BuildMenuModelArgs {
  /** Trimmed input value. */
  value: string;
  recentItems: HistoryItem[];
  suggestions: SuggestionItem[];
  isSuggestionsLoading: boolean;
}

export function suggestionToQuery(item: SuggestionItem): string {
  return item.region
    ? `${item.name}, ${item.region}, ${item.country}`
    : `${item.name}, ${item.country}`;
}

const LOCATION_ACTION: NavigableItem = {
  kind: "action",
  key: "action:location",
  action: "location",
};
const RANDOM_ACTION: NavigableItem = {
  kind: "action",
  key: "action:random",
  action: "random",
};

export function buildMenuModel({
  value,
  recentItems,
  suggestions,
  isSuggestionsLoading,
}: BuildMenuModelArgs): MenuModel {
  const len = value.length;
  const filteredRecent =
    len === 0
      ? recentItems
      : recentItems.filter((item) => item.displayName.toLowerCase().includes(value.toLowerCase()));

  const sections: MenuSection[] = [];

  if (filteredRecent.length > 0) {
    sections.push({ kind: "recent", items: filteredRecent });
  }

  if (len >= MIN_SUGGESTION_LENGTH) {
    if (isSuggestionsLoading) {
      sections.push({ kind: "suggestions-loading" });
    } else if (suggestions.length > 0) {
      sections.push({
        kind: "suggestions",
        items: suggestions,
        showHeader: filteredRecent.length > 0,
      });
    } else if (filteredRecent.length === 0) {
      sections.push({ kind: "empty-results" });
    }
  } else if (len > 0) {
    sections.push({ kind: "keep-typing" });
  }

  const actions: NavigableItem[] = [LOCATION_ACTION, RANDOM_ACTION];

  const navigable: NavigableItem[] = [];
  for (const item of filteredRecent) {
    navigable.push({ kind: "recent", key: `recent:${item.id}`, item });
  }
  if (len >= MIN_SUGGESTION_LENGTH && !isSuggestionsLoading) {
    for (const item of suggestions) {
      navigable.push({ kind: "suggestion", key: `suggestion:${item.id}`, item });
    }
  }
  navigable.push(...actions);

  const defaultFocusKey =
    navigable.find((i) => i.kind === "recent" || i.kind === "suggestion")?.key ?? null;

  return { sections, actions, navigable, defaultFocusKey };
}
