import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";
import { MIN_SUGGESTION_LENGTH } from "./constants";

export type ActionKind = "location" | "random";

export type NavigableItem =
  | { kind: "recent"; key: string; item: HistoryItem }
  | { kind: "suggestion"; key: string; item: SuggestionItem }
  | { kind: "action"; key: string; action: ActionKind };

export type MenuSection =
  | { kind: "recent"; items: HistoryItem[] }
  | { kind: "suggestions"; items: SuggestionItem[]; showHeader: boolean }
  | { kind: "suggestions-loading" }
  | { kind: "empty-results" }
  | { kind: "keep-typing" };

export interface MenuModel {
  sections: MenuSection[];
  actions: NavigableItem[];
  navigable: NavigableItem[];
  defaultFocusKey: string | null;
}

export interface BuildMenuModelArgs {
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
