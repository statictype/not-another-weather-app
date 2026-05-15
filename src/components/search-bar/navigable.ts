import type { SuggestionItem } from "@/api/types";
import type { HistoryItem } from "@/hooks/use-history";

export type ActionKind = "location" | "random";

export type NavigableItem =
  | { kind: "recent"; key: string; item: HistoryItem }
  | { kind: "suggestion"; key: string; item: SuggestionItem }
  | { kind: "action"; key: string; action: ActionKind };

interface BuildArgs {
  recent: HistoryItem[];
  suggestions: SuggestionItem[];
}

export function buildNavigableItems({ recent, suggestions }: BuildArgs): NavigableItem[] {
  const items: NavigableItem[] = [];
  for (const item of recent) {
    items.push({ kind: "recent", key: `recent:${item.id}`, item });
  }
  for (const item of suggestions) {
    items.push({ kind: "suggestion", key: `suggestion:${item.id}`, item });
  }
  items.push({ kind: "action", key: "action:location", action: "location" });
  items.push({ kind: "action", key: "action:random", action: "random" });
  return items;
}

export function suggestionToQuery(item: SuggestionItem): string {
  return item.region
    ? `${item.name}, ${item.region}, ${item.country}`
    : `${item.name}, ${item.country}`;
}
