import { normalizeQuery } from "@/lib/query";
import { type HistoryItem, MAX_HISTORY } from "./types";

export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `h_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function cap(items: HistoryItem[]): HistoryItem[] {
  return items.slice(0, MAX_HISTORY);
}

/** Dedupes by `normalizeQuery`, so History cannot split what the cache collapses. */
export function addHistoryItem(
  state: HistoryItem[],
  next: Omit<HistoryItem, "id" | "addedAt">,
): HistoryItem[] {
  const normalizedQuery = normalizeQuery(next.query);
  if (!normalizedQuery) return state;

  const filtered = state.filter((item) => normalizeQuery(item.query) !== normalizedQuery);
  const newItem: HistoryItem = {
    id: generateId(),
    query: next.query.trim(),
    displayName: next.displayName,
    addedAt: Date.now(),
  };
  return cap([newItem, ...filtered]);
}

export function removeHistoryItem(state: HistoryItem[], id: string): HistoryItem[] {
  return state.filter((item) => item.id !== id);
}

export function clearHistory(): HistoryItem[] {
  return [];
}

export function restoreHistoryItems(state: HistoryItem[], items: HistoryItem[]): HistoryItem[] {
  const existingIds = new Set(state.map((i) => i.id));
  const fresh = items.filter((i) => !existingIds.has(i.id));
  return cap([...fresh, ...state]);
}
